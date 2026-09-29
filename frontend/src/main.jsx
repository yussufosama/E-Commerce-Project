import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import "./styles.css";
import "@fontsource/anton/latin-400.css";

const fragment = location.hash.slice(1);
let recovery = null;
if (
  fragment.startsWith("verify-email=") ||
  fragment.startsWith("reset-password=")
) {
  const verify = fragment.startsWith("verify-email=");
  recovery = {
    mode: verify ? "verify-complete" : "reset",
    token: fragment.slice(fragment.indexOf("=") + 1),
  };
  history.replaceState(null, "", location.pathname);
}
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App recovery={recovery} />
  </React.StrictMode>,
);
