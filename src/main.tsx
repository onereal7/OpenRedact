import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Keep the tool available without a network connection.
//
// The service worker caches the application shell and its assets. A document
// is never fetched over the network, so nothing about the user's file is
// ever written to the cache.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  const register = () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("Service worker registration failed:", error);
    });
  };

  // The load event may already have fired by the time this module runs, in
  // which case the listener would never be called.
  if (document.readyState === "complete") {
    register();
  } else {
    window.addEventListener("load", register);
  }
}
