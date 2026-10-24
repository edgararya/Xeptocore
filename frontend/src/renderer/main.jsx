// frontend/src/renderer/main.jsx
// Renderer entry point: mounts <App /> into index.html.

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import LiveScanPanel from "./components/LiveScanPanel";
import "./index.css";

// The always-on-top live scan widget loads this same page with the "#widget" hash.
const isWidget = window.location.hash === "#widget";

createRoot(document.getElementById("root")).render(
  <StrictMode>{isWidget ? <LiveScanPanel /> : <App />}</StrictMode>,
);
