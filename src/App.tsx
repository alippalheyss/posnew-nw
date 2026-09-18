import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import POS from "./pages/POS";
import Products from "./pages/Products";
import Stock from "./pages/Stock";
import Customers from "./pages/Customers";
import Vendors from "./pages/Vendors";
import CreditOutstanding from "./pages/CreditOutstanding";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import DailySales from "./pages/DailySales";
import CreditInvoices from "./pages/CreditInvoices";
import SalesReports from "./pages/SalesReports";
import ExpiryAlerts from "./pages/ExpiryAlerts";
import GSTReports from "./pages/GSTReports";
import ShrinkageReport from "./pages/ShrinkageReport";
import Expenses from "./pages/Expenses";
import CustomerDisplay from "./pages/CustomerDisplay";
import LocalPurchaseWindow from "./components/LocalPurchaseWindow";
import MobilePurchase from "./pages/MobilePurchase";
import StockAudit from "./pages/StockAudit";
import ErrorBoundary from "./components/ErrorBoundary";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <LocalPurchaseWindow />
          <BrowserRouter>
            <Routes>
              {/* Public Route */}
              <Route path="/login" element={<Login />} />
              <Route path="/customer-display" element={<CustomerDisplay />} />

              {/* Standalone Mobile Routes (Direct full-screen on phones without desktop layout) */}
              <Route
                path="/mobile-purchase"
                element={
                  <ProtectedRoute>
                    <MobilePurchase />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/stock-audit"
                element={
                  <ProtectedRoute>
                    <StockAudit />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/audit"
                element={
                  <ProtectedRoute>
                    <StockAudit />
                  </ProtectedRoute>
                }
              />

              {/* Protected Routes */}
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Routes>
                        <Route path="/" element={<POS />} />
                        <Route path="/products" element={<Products />} />
                        <Route path="/stock" element={<Stock />} />
                        <Route path="/customers" element={<Customers />} />
                        <Route path="/vendors" element={<Vendors />} />
                        <Route path="/credit-outstanding" element={<CreditOutstanding />} />
                        <Route path="/admin" element={<Admin />} />
                        <Route path="/daily-sales" element={<DailySales />} />
                        <Route path="/credit-invoices" element={<CreditInvoices />} />
                        <Route path="/expenses" element={<Expenses />} />
                        <Route path="/sales-reports" element={<SalesReports />} />
                        <Route path="/expiry-alerts" element={<ExpiryAlerts />} />
                        <Route path="/gst-reports" element={<GSTReports />} />
                        <Route path="/shrinkage-report" element={<ShrinkageReport />} />
                        <Route path="/mobile-purchase" element={<MobilePurchase />} />
                        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Layout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;