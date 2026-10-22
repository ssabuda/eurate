import { Link } from "react-router-dom";

import useBase, { withBase } from "../lib/useBase";
import ui from "../styles/ui.module.css";

export default function NotFoundPage() {
  const [base] = useBase();
  return (
    <section className={`${ui.card}`} style={{ padding: 32, display: "flex", flexDirection: "column", gap: 12 }}>
      <h1 className={ui.sectionTitle}>Page not found</h1>
      <p className={ui.hint}>
        There is nothing at this address. <Link to={withBase("/", base)}>Back to today's rates</Link>
      </p>
    </section>
  );
}
