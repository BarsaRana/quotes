import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./AppShell";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);
const Calculator = React.lazy(() => import("./pages/Calculator"));
const Quotes = React.lazy(() => import("./pages/Quotes"));
const QuotesDetail = React.lazy(() => import("./pages/QuotesDetail")); // <-- ADD THIS LINE
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const QuoteEditPage = React.lazy(() => import("./pages/QuoteEditPage")); 

function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/calculator" replace />} />
          <Route
            path="/calculator"
            element={
              <React.Suspense fallback={<div className="page-loading">Loading…</div>}>
                <Calculator />
              </React.Suspense>
            }
          />
          <Route
            path="/quotes"
            element={
              <React.Suspense fallback={<div className="page-loading">Loading…</div>}>
                <Quotes />
              </React.Suspense>
            }
          />
          <Route
            path="/quotes/:id"
            element={
              <React.Suspense fallback={<div className="page-loading">Loading…</div>}>
                <QuotesDetail />
              </React.Suspense>
            }
          />
          <Route
            path="/quotes/:id/edit"
            element={
              <React.Suspense fallback={<div className="page-loading">Loading…</div>}>
                <QuoteEditPage />
              </React.Suspense>
            }
          />
          <Route
            path="/dashboard"
            element={
              <React.Suspense fallback={<div className="page-loading">Loading…</div>}>
                <Dashboard />
              </React.Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/calculator" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);