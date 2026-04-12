"use client";

interface SequenceDiffProps {
  refSeq: string;
  altSeq: string;
}

export default function SequenceDiff({ refSeq, altSeq }: SequenceDiffProps) {
  if (!refSeq || !altSeq) return null;

  const minLen = Math.min(refSeq.length, altSeq.length);
  const maxLen = Math.max(refSeq.length, altSeq.length);
  let diffCount = 0;

  for (let i = 0; i < maxLen; i++) {
    if (i >= minLen || refSeq[i] !== altSeq[i]) diffCount++;
  }

  if (diffCount === 0) return null;

  return (
    <div className="card px-4 py-2.5 font-mono text-[11px]">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[9px] uppercase tracking-widest font-medium" style={{ color: "var(--muted)" }}>Diff</span>
        <span className="text-[9px] px-1.5 py-px rounded-full font-sans" style={{ background: "rgba(234,179,8,0.12)", color: "#facc15" }}>
          {diffCount} {diffCount === 1 ? "change" : "changes"}
        </span>
      </div>
      <div className="space-y-0.5 overflow-x-auto">
        <div className="flex items-center gap-2">
          <span className="w-6 shrink-0 text-right text-[10px]" style={{ color: "var(--subtle)" }}>REF</span>
          <span className="flex flex-wrap">
            {Array.from({ length: maxLen }).map((_, i) => {
              const ch = refSeq[i] ?? "\u2013";
              const isDiff = i >= minLen || refSeq[i] !== altSeq[i];
              return (
                <span key={i} className="px-px" style={{ color: isDiff ? "#facc15" : "var(--muted)", background: isDiff ? "rgba(234,179,8,0.1)" : "transparent", borderRadius: 2 }}>
                  {ch}
                </span>
              );
            })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-6 shrink-0 text-right text-[10px]" style={{ color: "var(--subtle)" }}>ALT</span>
          <span className="flex flex-wrap">
            {Array.from({ length: maxLen }).map((_, i) => {
              const ch = altSeq[i] ?? "\u2013";
              const isDiff = i >= minLen || refSeq[i] !== altSeq[i];
              return (
                <span key={i} className="px-px" style={{ color: isDiff ? "#facc15" : "var(--muted)", background: isDiff ? "rgba(234,179,8,0.1)" : "transparent", borderRadius: 2 }}>
                  {ch}
                </span>
              );
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
