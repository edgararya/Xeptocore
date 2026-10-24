// frontend/src/renderer/components/HistoryList.jsx
// Lists past detection results (file uploads and live scans), newest first.

import { useEffect } from 'react';

import { useHistory } from '../hooks/useHistory';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import { labelProbability } from '../utils/verdictConfidence';

// Text + icon + color class, so the verdict never relies on color alone.
const VERDICTS = {
  real: { text: 'Real', icon: '✓' },
  fake: { text: 'Fake', icon: '✕' },
};

const SOURCE_LABELS = {
  file_upload: 'Upload',
  desktop_screen: 'Live Scan',
};

// Live scan can save an entry every interval, so cap what is rendered.
const MAX_VISIBLE = 100;

function HistoryList({ isActive = true }) {
  const { entries, isLoading, error, reload, remove } = useHistory();

  // The panel stays mounted while its tab is hidden, so refetch every time the
  // tab becomes active; otherwise new results would not show up until restart.
  useEffect(() => {
    if (isActive) {
      reload();
    }
  }, [isActive, reload]);

  const sorted = [...entries].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  const visible = sorted.slice(0, MAX_VISIBLE);

  return (
    <div className="history-list">
      <div className="history-list__toolbar">
        <button
          type="button"
          className="history-list__refresh"
          onClick={reload}
          disabled={isLoading}
        >
          {isLoading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <p className="history-list__error" role="alert">
          {error}
        </p>
      )}

      {!isLoading && !error && entries.length === 0 && (
        <p className="history-list__empty">No detection history yet.</p>
      )}

      <ul className="history-list__items">
        {visible.map((entry) => {
          const known = VERDICTS[entry.label];
          const verdict = known || { text: 'Unknown', icon: '?' };
          const variant = known ? entry.label : 'unknown';
          const probability = known ? labelProbability(entry.label, entry.confidence) : null;
          const date = new Date(entry.timestamp);
          const hasDate = !Number.isNaN(date.getTime());

          return (
            <li key={entry.id} className={`history-item history-item--${variant}`}>
              <span className="history-item__status">
                <span aria-hidden="true">{verdict.icon}</span> {verdict.text}
              </span>

              {probability !== null && (
                <span className="history-item__confidence">
                  {Math.round(probability * 100)}%
                </span>
              )}

              <span className="history-item__source">
                {SOURCE_LABELS[entry.source] || entry.source}
              </span>

              {hasDate && (
                <time
                  className="history-item__time"
                  dateTime={date.toISOString()}
                  title={date.toLocaleString()}
                >
                  {formatRelativeTime(entry.timestamp)}
                </time>
              )}

              <button
                type="button"
                className="history-item__delete"
                aria-label={`Delete history entry ${entry.id}`}
                onClick={() => remove(entry.id)}
              >
                Delete
              </button>
            </li>
          );
        })}
      </ul>

      {sorted.length > MAX_VISIBLE && (
        <p className="history-list__note">
          Showing the latest {MAX_VISIBLE} of {sorted.length} entries.
        </p>
      )}
    </div>
  );
}

export default HistoryList;
