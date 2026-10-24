// frontend/src/renderer/utils/readableMessage.js
// Turns an error from window.api (ipcRenderer.invoke) into a UI-friendly string.
//
// ipcRenderer.invoke rejects with "Error invoking remote method '<channel>':
// Error: <message>". Strip that wrapper so the UI shows only the message
// (which may still start with a backend "ERROR_CODE: " prefix).

export function readableMessage(err) {
  const raw = err instanceof Error ? err.message : String(err);
  return raw.replace(/^Error invoking remote method '[^']*': (?:Error: )?/, '');
}
