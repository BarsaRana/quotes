import { Routes, Route } from "react-router-dom";
import AppShell from "./AppShell";
import QuotesPage from "./pages/Quotes";
import QuotesDetail from "./pages/QuotesDetail";
import QuoteEditPage from "./pages/QuoteEditPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route path="quotes" element={<QuotesPage />} />
        <Route path="quotes/:id/edit" element={<QuoteEditPage />} />
        <Route path="quotes/:id" element={<QuotesDetail />} />
        {/* other routes */}
      </Route>
    </Routes>
  );
}

export default App;