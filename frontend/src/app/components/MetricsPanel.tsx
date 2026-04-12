"use client";

import { useState } from "react";

interface Metric {
  name: string;
  value: number;
  description: string;
  format: "percent" | "decimal";
}

const MODEL_METRICS: Metric[] = [
  { name: "AUROC", value: 0.8046, description: "Area under ROC curve — overall ranking quality", format: "decimal" },
  { name: "Accuracy", value: 0.743, description: "Fraction of correct predictions at 0.5 threshold", format: "percent" },
  { name: "Precision", value: 0.681, description: "Of predicted pathogenic, how many truly are", format: "percent" },
  { name: "Recall", value: 0.712, description: "Of truly pathogenic, how many we caught", format: "percent" },
  { name: "F1", value: 0.696, description: "Harmonic mean of precision and recall", format: "decimal" },
];

const BAR_COLORS = ["#5b8def", "#7b6cf0", "#4fc3d4", "#e0a040", "#45c9a0"];

export default function MetricsPanel() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors"
      >
        <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>Model Performance</span>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono" style={{ color: "var(--muted)" }}>
            AUROC{" "}
            <span className="font-semibold" style={{ color: "var(--foreground)" }}>
              {MODEL_METRICS[0].value.toFixed(2)}
            </span>
          </span>
          <svg
            className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            style={{ color: "var(--muted)" }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      <div className={`grid transition-all duration-300 ease-out ${expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <div className="px-4 pb-4 space-y-2.5">
            {MODEL_METRICS.map((metric, i) => (
              <div key={metric.name} className="group relative flex items-center gap-3">
                <span className="text-[11px] w-14 shrink-0" style={{ color: "var(--muted)" }}>{metric.name}</span>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(56,73,113,0.3)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${metric.value * 100}%`, backgroundColor: BAR_COLORS[i] }}
                  />
                </div>
                <span className="text-[11px] font-semibold tabular-nums w-10 text-right" style={{ color: "var(--foreground)" }}>
                  {metric.format === "percent"
                    ? `${(metric.value * 100).toFixed(0)}%`
                    : metric.value.toFixed(2)}
                </span>
                <div className="absolute left-0 -top-1 -translate-y-full px-2 py-1 rounded-md text-[10px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-xl" style={{ background: "var(--background)", border: "1px solid var(--card-border)", color: "var(--foreground)" }}>
                  {metric.description}
                </div>
              </div>
            ))}
            <p className="text-[10px] pt-1" style={{ color: "var(--subtle)" }}>
              ClinVar test set (chr18-22) &middot; Epoch 3/10
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
