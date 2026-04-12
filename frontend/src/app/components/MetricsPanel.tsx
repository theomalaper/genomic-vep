"use client";

import { useState } from "react";

interface Metric {
  name: string;
  value: number;
  description: string;
  format: "percent" | "decimal";
}

// Hardcoded until wired to /metrics endpoint
const MODEL_METRICS: Metric[] = [
  { name: "AUROC", value: 0.8046, description: "Area under ROC curve — overall ranking quality", format: "decimal" },
  { name: "Accuracy", value: 0.743, description: "Fraction of correct predictions at 0.5 threshold", format: "percent" },
  { name: "Precision", value: 0.681, description: "Of predicted pathogenic, how many truly are", format: "percent" },
  { name: "Recall", value: 0.712, description: "Of truly pathogenic, how many we caught", format: "percent" },
  { name: "F1", value: 0.696, description: "Harmonic mean of precision and recall", format: "decimal" },
];

function MetricRing({ value, color }: { value: number; color: string }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference * value;

  return (
    <svg width="68" height="68" className="shrink-0">
      <circle
        cx="34"
        cy="34"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        className="text-slate-700/50"
      />
      <circle
        cx="34"
        cy="34"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference}`}
        transform="rotate(-90 34 34)"
        className="transition-all duration-1000 ease-out"
      />
    </svg>
  );
}

const COLORS = ["#3b82f6", "#8b5cf6", "#06b6d4", "#f59e0b", "#10b981"];

export default function MetricsPanel() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex -space-x-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2 w-2 rounded-full ring-2 ring-slate-900"
                style={{ backgroundColor: COLORS[i] }}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-slate-300">Model Performance</span>
          <span className="text-xs text-slate-600 font-mono">NT-v2 50M</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500">
            AUROC <span className="text-slate-300 font-semibold tabular-nums">{MODEL_METRICS[0].value.toFixed(4)}</span>
          </span>
          <svg
            className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      <div
        className={`grid transition-all duration-300 ease-out ${
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5 pt-1">
            <div className="grid grid-cols-5 gap-3">
              {MODEL_METRICS.map((metric, i) => (
                <div key={metric.name} className="group relative flex flex-col items-center gap-2 py-3">
                  <div className="relative">
                    <MetricRing value={metric.value} color={COLORS[i]} />
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums text-slate-200">
                      {metric.format === "percent"
                        ? `${(metric.value * 100).toFixed(0)}%`
                        : metric.value.toFixed(2)}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-slate-400">{metric.name}</span>

                  {/* Tooltip */}
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-xl">
                    {metric.description}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between text-[10px] text-slate-600">
              <span>Evaluated on ClinVar test set (chr18–22)</span>
              <span>Training epoch 3/10</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
