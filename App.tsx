import { Routes, Route } from "react-router-dom";
import AppShell from "./AppShell";
import QuotesPage from "./Quotes";
import QuotesDetail from "./QuotesDetail";
import QuoteEditPage from "./QuoteEditPage";

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