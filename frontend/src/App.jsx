import { Navigate, Route, Routes } from "react-router-dom";

import Layout from "./components/Layout";
import { DEFAULT_CURRENCY } from "./lib/currencies";
import CurrencyPage from "./pages/CurrencyPage";
import NotFoundPage from "./pages/NotFoundPage";
import RecordsPage from "./pages/RecordsPage";
import TodayPage from "./pages/TodayPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<TodayPage />} />
        <Route path="currency" element={<Navigate to={`/currency/${DEFAULT_CURRENCY}`} replace />} />
        <Route path="currency/:code" element={<CurrencyPage />} />
        <Route path="records" element={<RecordsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
