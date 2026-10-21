import { Link } from "react-router-dom";

import ui from "../styles/ui.module.css";

export default function NotFoundPage() {
  return (
    <section className={`${ui.card}`} style={{ padding: 32, display: "flex", flexDirection: "column", gap: 12 }}>
      <h1 className={ui.sectionTitle}>Page not found</h1>
      <p className={ui.hint}>
        There is nothing at this address. <Link to="/">Back to today's rates</Link>
      </p>
    </section>
  );
}
