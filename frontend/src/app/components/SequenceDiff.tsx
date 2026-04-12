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
    <div className="px-4 py-2.5 rounded-lg bg-slate-800/40 border border-slate-700/30 font-mono text-xs">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] uppercase tracking-wider text-slate-500">Sequence diff</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20">
          {diffCount} {diffCount === 1 ? "change" : "changes"}
        </span>
      </div>
      <div className="space-y-1 overflow-x-auto">
        <div className="flex items-center gap-2">
          <span className="text-slate-600 w-7 shrink-0 text-right">REF</span>
          <span className="flex flex-wrap">
            {Array.from({ length: maxLen }).map((_, i) => {
              const ch = refSeq[i] ?? "–";
              const isDiff = i >= minLen || refSeq[i] !== altSeq[i];
              return (
                <span
                  key={i}
                  className={isDiff ? "text-amber-400 bg-amber-500/10 rounded-sm px-px" : "text-slate-500 px-px"}
                >
                  {ch}
                </span>
              );
            })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-600 w-7 shrink-0 text-right">ALT</span>
          <span className="flex flex-wrap">
            {Array.from({ length: maxLen }).map((_, i) => {
              const ch = altSeq[i] ?? "–";
              const isDiff = i >= minLen || refSeq[i] !== altSeq[i];
              return (
                <span
                  key={i}
                  className={isDiff ? "text-amber-400 bg-amber-500/10 rounded-sm px-px" : "text-slate-500 px-px"}
                >
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
