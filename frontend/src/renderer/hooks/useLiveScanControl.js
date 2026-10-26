// frontend/src/renderer/hooks/useLiveScanControl.js
// Remote control for live scan, used by the main window. The scan itself runs
// in the widget window (see useLiveScan); this hook only asks the main process
// to start/stop it and follows the status it broadcasts, so the button label
// stays right even when the scan is started or stopped from the tray or widget.
//
// status: 'idle' | 'connecting' | 'scanning' | 'alert' | 'error'

import { useState, useEffect, useCallback } from 'react';

const ACTIVE_STATUSES = ['connecting', 'scanning', 'alert'];

export function useLiveScanControl() {
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    if (!window.api) {
      return undefined;
    }

    let cancelled = false;

    // The scan may already be running (started from the tray before this window
    // opened), so ask for the current status instead of assuming "idle".
    window.api
      .getLiveScanState()
      .then((current) => {
        if (!cancelled && typeof current === 'string') {
          setStatus(current);
        }
      })
      .catch(() => {});

    const unsubscribe = window.api.onLiveScanState((next) => {
      if (typeof next === 'string') {
        setStatus(next);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const toggle = useCallback(() => {
    if (window.api) {
      window.api.toggleLiveScan();
    }
  }, []);

  return { status, isActive: ACTIVE_STATUSES.includes(status), toggle };
}
