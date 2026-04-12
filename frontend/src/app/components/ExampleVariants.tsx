"use client";

import { REAL_EXAMPLES, type RealExample } from "./realExamples";

interface ExampleVariantsProps {
  onSelect: (example: RealExample) => void;
  disabled: boolean;
}

export default function ExampleVariants({ onSelect, disabled }: ExampleVariantsProps) {
  return (
    <div>
      <h3 className="text-[10px] uppercase tracking-widest font-medium mb-2.5" style={{ color: "var(--subtle)" }}>
        Quick examples <span className="normal-case tracking-normal" style={{ color: "var(--muted)" }}>— real held-out test variants with ground-truth labels</span>
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {REAL_EXAMPLES.map((ex) => (
          <button
            key={ex.name}
            onClick={() => onSelect(ex)}
            disabled={disabled}
            className="group text-left px-3 py-2.5 rounded-lg transition-all disabled:opacity-25 disabled:cursor-not-allowed"
            style={{
              background: "rgba(22,32,56,0.4)",
              border: "1px solid rgba(56,73,113,0.25)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(91,141,239,0.3)";
              e.currentTarget.style.background = "rgba(22,32,56,0.7)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(56,73,113,0.25)";
              e.currentTarget.style.background = "rgba(22,32,56,0.4)";
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
                {ex.name}
              </span>
              <span
                className="text-[9px] font-medium uppercase tracking-wider px-1.5 py-px rounded-full"
                style={{
                  background: ex.tag === "pathogenic" ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.12)",
                  color: ex.tag === "pathogenic" ? "#f87171" : "#4ade80",
                }}
              >
                truth: {ex.tag}
              </span>
            </div>
            <p className="text-[11px] leading-snug" style={{ color: "var(--muted)" }}>
              {ex.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
