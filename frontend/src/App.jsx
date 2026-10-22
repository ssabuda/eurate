import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import Layout from "./components/Layout";
import { defaultCurrency } from "./lib/currencies";
import useBase from "./lib/useBase";
import CurrencyPage from "./pages/CurrencyPage";
import NotFoundPage from "./pages/NotFoundPage";
import RecordsPage from "./pages/RecordsPage";
import TodayPage from "./pages/TodayPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<TodayPage />} />
        <Route path="currency" element={<DefaultCurrency />} />
        <Route path="currency/:code" element={<CurrencyPage />} />
        <Route path="records" element={<RecordsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

function DefaultCurrency() {
  const [base] = useBase();
  const { search } = useLocation();
  return <Navigate to={`/currency/${defaultCurrency(base)}${search}`} replace />;
}
