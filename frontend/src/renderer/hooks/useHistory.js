// frontend/src/renderer/hooks/useHistory.js
// Loads detection history through the preload API and supports deleting entries.
//
// Components never touch window.api directly; like useDetection, this hook
// owns the IPC calls and the loading/error state.

import { useState, useCallback } from 'react';

import { readableMessage } from '../utils/readableMessage';

function requireApi() {
  if (!window.api) {
    throw new Error('Electron bridge (window.api) is not available');
  }
  return window.api;
}

export function useHistory() {
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await requireApi().getHistory();
      setEntries(Array.isArray(data?.entries) ? data.entries : []);
    } catch (err) {
      setError(readableMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const remove = useCallback(async (id) => {
    setError(null);

    try {
      await requireApi().deleteHistoryEntry(id);
      setEntries((current) => current.filter((entry) => entry.id !== id));
    } catch (err) {
      setError(readableMessage(err));
    }
  }, []);

  return { entries, isLoading, error, reload, remove };
}
