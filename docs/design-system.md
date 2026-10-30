# Design System: Xeptocore

The design tokens, components, and visual principles of Xeptocore. This document was first written as the reference for wireframes; it now describes **what has been implemented**, and marks the parts of the original design that are missing or different.

- Colour and typography tokens: `frontend/tailwind.config.js`
- Component styling (placeholder, built on `@apply`): `frontend/src/renderer/index.css`
- Flows and screens: [`FLOW_DIAGRAM.md`](FLOW_DIAGRAM.md)

---

## 1. Principles

- Colour is always paired with an icon and text, and never stands alone.
- Language is neutral and informative, not alarmist.
- Progressive disclosure: technical detail sits behind an element that can be opened.
- Numbers shown must agree with the verdict: the probability of the winning label ("Real, 96%"), not the raw fake probability.

## 2. Colour tokens

Semantic tokens are defined in `tailwind.config.js` as light/dark pairs:

| Token | Light | Dark | Used for |
|---|---|---|---|
| `brand` | `#0d9488` | `#2dd4bf` | Accent: primary buttons, the active tab, the "scan running" status |
| `safe` | `#16a34a` | `#4ade80` | The Real verdict |
| `warning` | `#d97706` | `#fbbf24` | An unknown label, error status |
| `danger` | `#dc2626` | `#f87171` | The Fake verdict, alerts, destructive buttons |
| `surface` | `#f9fafb` | `#1f2937` | Card and panel backgrounds |
| `border` | `#e5e7eb` | `#374151` | Dividing lines |

Dark mode follows the operating system theme (`darkMode: 'media'`). Because each colour is an explicit pair (not a CSS variable that switches automatically), every use is written with two classes:

```jsx
<span className="text-safe dark:text-safe-dark">Real</span>
```

## 3. Typography

System fonts (`-apple-system`, Segoe UI, Roboto, sans-serif); no custom fonts.

| Token | Size | Used for |
|---|---|---|
| `text-heading` | 20 px, semibold | The verdict in the result card |
| `text-subheading` | 16 px, medium | (not used yet) |
| `text-body` | 14 px | Base text |
| `text-caption` | 12 px | Captions, times, session summaries |

## 4. Iconography

The original design used Lucide (`lucide-react`). **It is not used yet**: the package is not installed, and every icon is currently a text character hidden from screen readers (`aria-hidden`), while the word next to it stays readable.

| Condition | Current icon | Original plan (Lucide) |
|---|---|---|
| Real | ✓ | `check-circle` |
| Fake | ✕ | `shield-alert` |
| Unknown | ? | `alert-triangle` |
| Alert in the widget | ⚠ | `shield-alert` |

Switching to SVG icons only means changing the markers in `ResultPanel.jsx`, `HistoryList.jsx`, and `LiveScanPanel.jsx`.

## 5. Components

| Component (design) | Implementation | File |
|---|---|---|
| ResultCard | **ResultPanel**: a card whose border follows the verdict, an icon and word for the verdict, "Confidence", and a `<details>` "Technical details" section with the ELA and blur scores and each model's score | `components/ResultPanel.jsx` |
| UploadDropzone | **UploadArea**: a dropzone (drag and drop or click, keyboard accessible), an image/video preview, and a Detect button | `components/UploadArea.jsx` |
| HistoryListItem | **HistoryList**: a row with the verdict, a probability (uploads) or a session summary `alerts/frames flagged, peak fake` (live scan), a source badge, a relative time, and a Delete button; a toolbar with Refresh and Clear all (two-step confirmation) | `components/HistoryList.jsx` |
| FloatingWidgetStatus | **LiveScanPanel**: a 280×88 px widget with a status dot, a title, a one-line detail, and a Stop/Close button | `components/LiveScanPanel.jsx` |
| AlertBanner | No separate component; an alert is the `alert` status of the widget (a pulsing red dot and the title "Possible deepfake") | `components/LiveScanPanel.jsx` |
| ConfidenceBadge | Not built; confidence is plain text | n/a |
| (new) LiveScanToggle | The Start/Stop Live Scan button with its status text in the main window | `components/LiveScanToggle.jsx` |

### Display rules in force

- A **verdict** is always an icon plus a word (`Real`, `Fake`, `Unknown`); colour only reinforces it.
- An **unknown label** is shown as `Unknown` in the `warning` colour, and is never quietly turned into `Real`.
- A **frame with no face** in the widget is shown as "No face detected", not as a "Real" result.
- The **history list** renders at most 100 rows, with a note of the total count.

## 6. Dark mode

Every token has a light/dark pair and follows the OS theme. There is no manual setting yet; if one is added later, change `darkMode` to `'class'`.

## 7. Accessibility

**Done:**
- Verdicts and statuses do not rely on colour alone.
- `role="status"` / `aria-live="polite"` on results, the live scan status, and the widget; `role="alert"` on error messages.
- The dropzone can be operated with the keyboard (Enter and Space); buttons that need a more specific name than their text (Delete on each entry, Stop/Close in the widget) use `aria-label`.
- Technical details use `<details>`, which can be opened with the keyboard.

**Not done:**
- Colour contrast has not been audited against WCAG.
- The tabs follow the ARIA tabs pattern, but arrow-key navigation (roving tabindex) is not implemented.
- Keyboard focus styles are not designed specially (they are still the browser defaults).

## 8. Differences from the original design

- Graduated alert severity (yellow and red) does not exist; today there is a single threshold (0.75).
- The Lucide icons are replaced by text characters for now.
- `ResultCard` became `ResultPanel`; `AlertBanner` and `ConfidenceBadge` are not separate components yet.
- The colour tokens are applied as designed; only the component styling is still a placeholder built on `@apply`.
