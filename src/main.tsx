import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import "./lib/i18n.ts"; // Import i18n configuration
import { AppProviderWithPriceDialog } from "./context/AppProviderWithPriceDialog.tsx"; // Import wrapper with price dialog
import { ThemeProvider } from "@/components/ThemeProvider";
import { registerSW } from "virtual:pwa-register";

// Auto-update service worker
registerSW({ immediate: true });

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}



createRoot(document.getElementById("root")!).render(
  <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
    <AppProviderWithPriceDialog> {/* Wrap App with AppContextProvider + PriceFixDialog */}
      <App />
    </AppProviderWithPriceDialog>
  </ThemeProvider>
);