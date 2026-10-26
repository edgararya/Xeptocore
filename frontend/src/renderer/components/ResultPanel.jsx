// frontend/src/renderer/components/ResultPanel.jsx
// Presentational card for a DetectionResult returned by the backend.

import { Fragment } from 'react';

import { labelProbability } from '../utils/verdictConfidence';

// Human-readable names for the per-model scores in DetectionResult.
const MODEL_LABELS = {
  mesonet_1: 'Meso4_DF',
  mesonet_2: 'Meso4_F2F',
  mesonet_3: 'MesoInception_DF',
  xception: 'XceptionNet',
};

const SCORE_KEYS = ['mesonet_1', 'mesonet_2', 'mesonet_3', 'xception'];

// Text + icon + color class, so the verdict never relies on color alone.
const VERDICTS = {
  real: { text: 'Real', icon: '✓' },
  fake: { text: 'Fake', icon: '✕' },
};

// Per-model scores / ela_score / blur_score are 0..1 floats (or null when a
// model did not load). Display them as percentages.
function percent(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'N/A';
  }
  return `${(value * 100).toFixed(1)}%`;
}

function ResultPanel({ result }) {
  if (!result) {
    return null;
  }

  // An unrecognised label is shown as "Unknown", never silently as "Real".
  const known = VERDICTS[result.label];
  const verdict = known || { text: 'Unknown', icon: '?' };
  const variant = known ? result.label : 'unknown';

  // The backend's `confidence` is the fake probability; show the probability of
  // the verdict that won instead, so "Real" never appears next to a tiny number.
  const probability = known ? labelProbability(result.label, result.confidence) : null;

  return (
    <section className={`result-panel result-panel--${variant}`} aria-live="polite">
      <header className="result-panel__header">
        <span className={`result-panel__verdict result-panel__verdict--${variant}`}>
          <span aria-hidden="true">{verdict.icon}</span> {verdict.text}
        </span>
        <span className="result-panel__confidence">
          Confidence: {percent(probability)}
        </span>
      </header>

      <details className="result-panel__details">
        <summary>Technical details</summary>

        <dl className="result-panel__scores">
          <dt>ELA</dt>
          <dd>{percent(result.ela_score)}</dd>

          <dt>Blur</dt>
          <dd>{percent(result.blur_score)}</dd>

          {SCORE_KEYS.map((key) => (
            <Fragment key={key}>
              <dt>{MODEL_LABELS[key]}</dt>
              <dd>{percent(result.per_model_scores?.[key])}</dd>
            </Fragment>
          ))}
        </dl>

        <p className="result-panel__note">
          Model scores are each model&apos;s probability that the media is fake.
        </p>
      </details>
    </section>
  );
}

export default ResultPanel;
