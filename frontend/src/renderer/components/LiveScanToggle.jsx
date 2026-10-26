// frontend/src/renderer/components/LiveScanToggle.jsx
// Start/stop button for live scan in the main window. The scan itself runs in
// the always-on-top widget that appears at the top-right of the screen.

import { useLiveScanControl } from '../hooks/useLiveScanControl';

// Status is spelled out in text, so it never relies on color alone.
const STATUS_TEXT = {
  idle: 'Live scan is off',
  connecting: 'Live scan is connecting…',
  scanning: 'Live scan is running',
  alert: 'Possible deepfake detected',
  error: 'Live scan error, see the widget',
};

function LiveScanToggle() {
  const { status, isActive, toggle } = useLiveScanControl();

  return (
    <div className="live-toggle">
      <span className={`live-toggle__status live-toggle__status--${status}`} role="status">
        {STATUS_TEXT[status] || STATUS_TEXT.idle}
      </span>

      <button type="button" className="live-toggle__button" onClick={toggle}>
        {isActive ? 'Stop Live Scan' : 'Start Live Scan'}
      </button>
    </div>
  );
}

export default LiveScanToggle;
