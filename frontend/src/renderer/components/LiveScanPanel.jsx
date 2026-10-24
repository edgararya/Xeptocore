// frontend/src/renderer/components/LiveScanPanel.jsx
// UI of the always-on-top live scan widget window (main.jsx renders this for
// the "#widget" URL). Not a tab in the main window: the widget must stay
// visible while the user works in other apps, e.g. during a video call.
//
// Start/stop commands come from the tray menu (via the main process), and the
// current status is reported back so the tray label and widget visibility stay
// in sync.

import { useEffect } from 'react';

import { useLiveScan } from '../hooks/useLiveScan';
import { labelProbability } from '../utils/verdictConfidence';

const TITLES = {
  idle: 'Ready',
  connecting: 'Connecting…',
  scanning: 'Scanning…',
  alert: 'Possible deepfake',
  error: 'Live scan error',
};

function describeResult(result) {
  if (!result) {
    return 'Waiting for the first frame';
  }
  if (!result.faceDetected) {
    return 'No face detected';
  }

  const text = result.label === 'fake' ? 'Fake' : 'Real';
  const probability = labelProbability(result.label, result.confidence);
  return probability === null ? text : `${text} ${Math.round(probability * 100)}%`;
}

function detailFor(status, lastResult, alertResult, error) {
  switch (status) {
    case 'error':
      return error || 'Something went wrong';
    case 'connecting':
      return 'Starting live scan';
    case 'alert':
      return describeResult(alertResult);
    default:
      return describeResult(lastResult);
  }
}

function LiveScanPanel() {
  const { status, lastResult, alertResult, error, start, stop } = useLiveScan();

  useEffect(() => {
    if (window.api) {
      window.api.reportLiveScanStatus(status);
    }
  }, [status]);

  useEffect(() => {
    if (!window.api) {
      return undefined;
    }

    return window.api.onLiveScanCommand((command) => {
      if (command === 'start') {
        start();
      } else if (command === 'stop') {
        stop();
      }
    });
  }, [start, stop]);

  const detail = detailFor(status, lastResult, alertResult, error);

  return (
    <div className={`live-widget live-widget--${status}`} role="status" aria-live="polite">
      <span className="live-widget__dot" aria-hidden="true" />

      <div className="live-widget__text">
        <span className="live-widget__title">
          {status === 'alert' && <span aria-hidden="true">⚠ </span>}
          {TITLES[status]}
        </span>
        <span className="live-widget__detail" title={detail}>
          {detail}
        </span>
      </div>

      <button
        type="button"
        className="live-widget__stop"
        aria-label={status === 'error' ? 'Close live scan' : 'Stop live scan'}
        onClick={stop}
      >
        {status === 'error' ? 'Close' : 'Stop'}
      </button>
    </div>
  );
}

export default LiveScanPanel;