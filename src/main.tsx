import "@fontsource-variable/outfit";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { unlockAudio } from "./audio";
import "./styles.css";

window.addEventListener("pointerdown", unlockAudio, { once: true, capture: true });
window.addEventListener("keydown", unlockAudio, { once: true, capture: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
