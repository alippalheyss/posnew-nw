import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import "./lib/i18n.ts"; // Import i18n configuration
import { AppProviderWithPriceDialog } from "./context/AppProviderWithPriceDialog.tsx"; // Import wrapper with price dialog

createRoot(document.getElementById("root")!).render(
  <AppProviderWithPriceDialog> {/* Wrap App with AppContextProvider + PriceFixDialog */}
    <App />
  </AppProviderWithPriceDialog>
);