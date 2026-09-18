import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import "./lib/i18n.ts"; // Import i18n configuration
import { AppProviderWithPriceDialog } from "./context/AppProviderWithPriceDialog.tsx"; // Import wrapper with price dialog
import { ThemeProvider } from "@/components/ThemeProvider";
import { registerSW } from "virtual:pwa-register";

// Auto-recover from stale dynamic module/chunk errors during new deployments
window.addEventListener("vite:preloadError", () => {
  const lastReload = sessionStorage.getItem("vite_preload_error_reload");
  const now = Date.now();
  if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
    sessionStorage.setItem("vite_preload_error_reload", now.toString());
    window.location.reload();
  }
});

// Auto-update service worker via VitePWA
const updateSW = registerSW({
  onNeedRefresh() {
    updateSW(true);
  },
  onOfflineReady() {
    console.log("App ready to work offline");
  },
});

// Clear legacy manual caches if any
if ("caches" in window) {
  caches.keys().then((names) => {
    names.forEach((name) => {
      if (name === "mvpos-cache-v1") {
        caches.delete(name);
      }
    });
  }).catch(() => {});
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
    <AppProviderWithPriceDialog> {/* Wrap App with AppContextProvider + PriceFixDialog */}
      <App />
    </AppProviderWithPriceDialog>
  </ThemeProvider>
);