import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";

const saved = localStorage.getItem("tron-theme") || "dark";
document.documentElement.setAttribute("data-theme", saved);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
