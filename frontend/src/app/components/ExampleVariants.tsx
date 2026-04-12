"use client";

interface Example {
  name: string;
  description: string;
  refSeq: string;
  altSeq: string;
  tag: "pathogenic" | "benign";
}

const EXAMPLES: Example[] = [
  {
    name: "BRCA2 Splice Site",
    description: "Known pathogenic variant disrupting a splice donor site",
    refSeq: "",
    altSeq: "",
    tag: "pathogenic",
  },
  {
    name: "TP53 Regulatory",
    description: "Pathogenic variant in TP53 promoter region",
    refSeq: "",
    altSeq: "",
    tag: "pathogenic",
  },
  {
    name: "Common Intergenic SNP",
    description: "Benign variant between genes, high population frequency",
    refSeq: "",
    altSeq: "",
    tag: "benign",
  },
  {
    name: "Intronic Variant",
    description: "Benign variant deep within an intron",
    refSeq: "",
    altSeq: "",
    tag: "benign",
  },
];

interface ExampleVariantsProps {
  onSelect: (refSeq: string, altSeq: string) => void;
  disabled: boolean;
}

export default function ExampleVariants({ onSelect, disabled }: ExampleVariantsProps) {
  return (
    <div>
      <h3 className="text-[10px] uppercase tracking-widest font-medium mb-2.5" style={{ color: "var(--subtle)" }}>
        Quick examples
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.name}
            onClick={() => onSelect(ex.refSeq, ex.altSeq)}
            disabled={disabled || !ex.refSeq}
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
            <div className="flex items-center gap-2 mb-0.5">
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
                {ex.tag}
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
