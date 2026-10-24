// frontend/src/renderer/utils/verdictConfidence.js
// Turns the backend's `confidence` into a number that matches the verdict.
//
// The backend's `confidence` is the FAKE probability: the label is "fake" when
// it is above the backend's threshold, otherwise "real". Showing it as-is next
// to a "real" verdict (e.g. "real (4%)") reads like low confidence in "real",
// so for display we use the probability of the label that won:
//   fake -> confidence
//   real -> 1 - confidence
// Returns a 0..1 number, or null when confidence is missing or not a number.

export function labelProbability(label, confidence) {
  if (typeof confidence !== 'number' || Number.isNaN(confidence)) {
    return null;
  }
  return label === 'fake' ? confidence : 1 - confidence;
}
