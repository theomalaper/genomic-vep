"use client";

interface Example {
  name: string;
  description: string;
  refSeq: string;
  altSeq: string;
  tag: "pathogenic" | "benign";
}

// Placeholder — real sequences will be populated from the test dataset
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

export default function ExampleVariants({
  onSelect,
  disabled,
}: ExampleVariantsProps) {
  return (
    <div>
      <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-3">
        Quick examples
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.name}
            onClick={() => onSelect(ex.refSeq, ex.altSeq)}
            disabled={disabled || !ex.refSeq}
            className="group text-left p-3.5 rounded-xl border border-slate-700/50 hover:border-slate-600 bg-slate-800/30 hover:bg-slate-800/60 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-medium text-sm text-slate-200 group-hover:text-white transition-colors">
                {ex.name}
              </span>
              <span
                className={`text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                  ex.tag === "pathogenic"
                    ? "bg-red-500/10 text-red-400 ring-1 ring-red-500/20"
                    : "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"
                }`}
              >
                {ex.tag}
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {ex.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
