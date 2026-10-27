// frontend/src/renderer/hooks/useLiveScan.js
// Drives a live scan from the widget window: opens the backend WebSocket,
// sends a screen capture every scan interval, and tracks the latest result.
//
// status: 'idle' | 'connecting' | 'scanning' | 'alert' | 'error'
//
// Frames are sent one at a time: the next capture is only sent after the
// backend answered the previous one, so slow inference can never build up a
// queue of stale frames.

import { useState, useCallback, useRef, useEffect } from 'react';

import { readableMessage } from '../utils/readableMessage';

const DEFAULT_INTERVAL_MS = 1000;
// An alert stays on screen this long after the last alerting frame, otherwise a
// one-second flash is easy to miss.
const ALERT_HOLD_MS = 5000;
// If the backend never answers a frame, give up waiting and send a new one.
const FRAME_TIMEOUT_MS = 15000;

// For frames it cannot analyse (no face found, decode failure) the backend
// replies with a neutral "real / 0.0" result whose model scores are all null.
// A genuine result always has at least one model score. Only used as a fallback
// for backends that do not send an explicit `face_detected` flag.
function hasModelScores(message) {
  const scores = message && message.per_model_scores;
  if (!scores) {
    return false;
  }
  return Object.values(scores).some((value) => value !== null && value !== undefined);
}

export function useLiveScan() {
  const [status, setStatus] = useState('idle');
  const [lastResult, setLastResult] = useState(null);
  const [alertResult, setAlertResult] = useState(null);
  const [error, setError] = useState(null);

  const sessionRef = useRef(null);
  // Bumped by stop()/unmount so a start() still awaiting the backend port
  // does not open a socket after it was cancelled.
  const generationRef = useRef(0);

  const endSession = useCallback((session) => {
    clearInterval(session.timer);
    clearTimeout(session.alertTimer);

    const { socket } = session;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;
    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      socket.close();
    }

    if (sessionRef.current === session) {
      sessionRef.current = null;
    }
  }, []);

  const fail = useCallback(
    (session, message) => {
      if (sessionRef.current !== session) {
        return;
      }
      endSession(session);
      setAlertResult(null);
      setError(message);
      setStatus('error');
    },
    [endSession],
  );

  const sendFrame = useCallback(
    async (session) => {
      const { socket } = session;
      if (sessionRef.current !== session || socket.readyState !== WebSocket.OPEN) {
        return;
      }
      if (session.inFlight && Date.now() - session.sentAt < FRAME_TIMEOUT_MS) {
        return;
      }

      session.inFlight = true;
      session.sentAt = Date.now();

      try {
        const image = await window.api.captureScreen();
        if (sessionRef.current !== session || socket.readyState !== WebSocket.OPEN) {
          return;
        }

        session.sequence += 1;
        socket.send(
          JSON.stringify({
            type: 'frame',
            sequence: session.sequence,
            timestamp: Date.now(),
            image,
          }),
        );
      } catch (err) {
        fail(session, readableMessage(err));
      }
    },
    [fail],
  );

  const handleMessage = useCallback(
    (session, raw) => {
      if (sessionRef.current !== session) {
        return;
      }

      let message;
      try {
        message = JSON.parse(raw);
      } catch {
        return;
      }

      if (message.type === 'connected') {
        const interval = Number(message.scan_interval_ms);
        const intervalMs = Number.isFinite(interval) && interval > 0 ? interval : DEFAULT_INTERVAL_MS;

        setStatus('scanning');
        sendFrame(session);
        session.timer = setInterval(() => sendFrame(session), intervalMs);
        return;
      }

      // 'history_update' messages are ignored here: the History tab refetches
      // the list whenever it is opened.
      if (message.type === 'result') {
        session.inFlight = false;

        const result = {
          label: message.label,
          confidence: message.confidence,
          alert: Boolean(message.alert),
          faceDetected:
            typeof message.face_detected === 'boolean'
              ? message.face_detected
              : hasModelScores(message),
        };
        setLastResult(result);

        if (result.alert) {
          session.alertActive = true;
          clearTimeout(session.alertTimer);
          session.alertTimer = setTimeout(() => {
            session.alertActive = false;
            if (sessionRef.current === session) {
              setAlertResult(null);
              setStatus('scanning');
            }
          }, ALERT_HOLD_MS);

          setAlertResult(result);
          setStatus('alert');
        } else if (!session.alertActive) {
          setStatus('scanning');
        }
      }
    },
    [sendFrame],
  );

  const start = useCallback(async () => {
    if (sessionRef.current) {
      return;
    }

    generationRef.current += 1;
    const generation = generationRef.current;

    setError(null);
    setLastResult(null);
    setAlertResult(null);
    setStatus('connecting');

    let socket;
    try {
      if (!window.api) {
        throw new Error('Electron bridge (window.api) is not available');
      }

      const port = await window.api.getBackendPort();
      if (generation !== generationRef.current) {
        return; // stopped while waiting for the port
      }
      if (!port) {
        throw new Error('Backend is not ready yet');
      }

      socket = new WebSocket(`ws://localhost:${port}/ws/live-scan?source=desktop_screen`);
    } catch (err) {
      setError(readableMessage(err));
      setStatus('error');
      return;
    }

    const session = {
      socket,
      timer: null,
      alertTimer: null,
      alertActive: false,
      inFlight: false,
      sentAt: 0,
      sequence: 0,
    };
    sessionRef.current = session;

    socket.onmessage = (event) => handleMessage(session, event.data);
    socket.onerror = () => fail(session, 'Could not connect to the live scan backend');
    socket.onclose = () => fail(session, 'Live scan connection closed');
  }, [fail, handleMessage]);

  const stop = useCallback(() => {
    generationRef.current += 1;
    if (sessionRef.current) {
      endSession(sessionRef.current);
    }
    setError(null);
    setLastResult(null);
    setAlertResult(null);
    setStatus('idle');
  }, [endSession]);

  // Close the socket and timers if the widget page is torn down mid-scan.
  useEffect(
    () => () => {
      generationRef.current += 1;
      if (sessionRef.current) {
        endSession(sessionRef.current);
      }
    },
    [endSession],
  );

  return { status, lastResult, alertResult, error, start, stop };
}