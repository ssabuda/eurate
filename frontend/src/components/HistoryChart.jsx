import { useRef, useState } from "react";

import { formatDate, formatRate } from "../lib/format";
import styles from "./HistoryChart.module.css";

const WIDTH = 1000;
const HEIGHT = 300;
const PAD = 10;

/** Line chart of rates (oldest first) with a hover readout. */
export default function HistoryChart({ data, label }) {
  const plotRef = useRef(null);
  const [hover, setHover] = useState(null);

  if (data.length < 2) {
    return <p className={styles.empty}>Not enough data in this range to draw a chart.</p>;
  }

  const values = data.map((d) => d.rate);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i) => (i / (data.length - 1)) * WIDTH;
  const y = (v) => HEIGHT - PAD - ((v - min) / span) * (HEIGHT - 2 * PAD);
  const points = data.map((d, i) => `${x(i).toFixed(1)},${y(d.rate).toFixed(1)}`).join(" ");

  const onPointerMove = (event) => {
    const box = plotRef.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    setHover(Math.round(ratio * (data.length - 1)));
  };

  const point = hover === null ? null : data[hover];
  const left = hover === null ? 0 : (hover / (data.length - 1)) * 100;
  const top = point ? (y(point.rate) / HEIGHT) * 100 : 0;

  return (
    <div className={styles.chart}>
      <div className={styles.yAxis} aria-hidden="true">
        <span>{formatRate(max)}</span>
        <span>{formatRate((max + min) / 2)}</span>
        <span>{formatRate(min)}</span>
      </div>
      <div className={styles.body}>
        <div
          ref={plotRef}
          className={styles.plot}
          onPointerMove={onPointerMove}
          onPointerLeave={() => setHover(null)}
        >
          <div className={styles.midline} />
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" role="img" aria-label={label} className={styles.svg}>
            <polygon points={`0,${HEIGHT} ${points} ${WIDTH},${HEIGHT}`} className={styles.area} />
            <polyline points={points} className={styles.line} vectorEffect="non-scaling-stroke" />
          </svg>
          {point && (
            <>
              <div className={styles.cursor} style={{ left: `${left}%` }} aria-hidden="true" />
              <div className={styles.dot} style={{ left: `${left}%`, top: `${top}%` }} aria-hidden="true" />
              <div
                className={styles.tooltip}
                style={{ left: `${left}%`, transform: `translateX(${left > 70 ? "-100%" : "0"})` }}
                aria-hidden="true"
              >
                <span className={styles.tooltipRate}>{formatRate(point.rate)}</span>
                <span>{formatDate(point.date)}</span>
              </div>
            </>
          )}
        </div>
        <div className={styles.xAxis} aria-hidden="true">
          <span>{formatDate(data[0].date)}</span>
          <span>{formatDate(data[data.length - 1].date)}</span>
        </div>
      </div>
    </div>
  );
}
