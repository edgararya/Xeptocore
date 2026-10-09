// frontend/src/renderer/hooks/useDetection.js
// Runs a single image/video file through the backend's deepfake detector.
//
// Callers (e.g. UploadArea) only ever pass the raw browser File object to
// detect(). This hook owns everything after that: resolving the File to a
// filesystem path (Electron 32+ removed File.path, so it has to go through
// webUtils in the preload script), invoking the IPC call, and tracking state.

import { useState, useCallback } from 'react';

// ipcRenderer.invoke rejects with "Error invoking remote method '<channel>':
// Error: <message>". Strip that wrapper so the UI shows only the message
// (which may still start with a backend "ERROR_CODE: " prefix).
function readableMessage(err) {
  const raw = err instanceof Error ? err.message : String(err);
  return raw.replace(/^Error invoking remote method '[^']*': (?:Error: )?/, '');
}

export function useDetection() {
  const [isDetecting, setIsDetecting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const detect = useCallback(async (file) => {
    setIsDetecting(true);
    setError(null);
    setResult(null);

    try {
      if (!window.api) {
        throw new Error('Electron bridge (window.api) is not available');
      }

      const filePath = await window.api.getPathForFile(file);
      const detection = await window.api.detectFile(filePath);
      setResult(detection);
    } catch (err) {
      setError(readableMessage(err));
    } finally {
      setIsDetecting(false);
    }
  }, []);

  return { detect, isDetecting, result, error };
}
