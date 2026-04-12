"use client";

interface AttributionHeatmapProps {
  tokens: string[];
  attributions: number[];
}

function getColor(score: number): string {
  // Deep navy (low) → Accent blue (mid) → Warm violet (high)
  if (score < 0.5) {
    const t = score * 2;
    const r = Math.round(22 + 69 * t);
    const g = Math.round(32 + 109 * t);
    const b = Math.round(56 + 183 * t);
    return `rgb(${r}, ${g}, ${b})`;
  }
  const t = (score - 0.5) * 2;
  const r = Math.round(91 + 72 * t);
  const g = Math.round(141 - 60 * t);
  const b = Math.round(239 - 15 * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export default function AttributionHeatmap({ tokens, attributions }: AttributionHeatmapProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
            Token Attributions
          </h3>
          <p className="text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>
            Brighter tokens had more influence on the prediction.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--muted)" }}>
          <span>Low</span>
          <div
            className="h-1.5 w-16 rounded-full"
            style={{
              background: "linear-gradient(to right, rgb(22,32,56), rgb(91,141,239), rgb(163,81,224))",
            }}
          />
          <span>High</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-px font-mono text-[11px] leading-none">
        {tokens.map((token, i) => {
          const score = attributions[i] ?? 0;
          return (
            <div key={i} className="relative group">
              <span
                className="px-1.5 py-1.5 rounded cursor-default inline-block transition-all duration-150 hover:scale-110 hover:z-10 hover:shadow-lg"
                style={{
                  backgroundColor: getColor(score),
                  color: score > 0.3 ? "rgba(255,255,255,0.9)" : "var(--muted)",
                  opacity: 0.55 + score * 0.45,
                }}
              >
                {token}
              </span>
              <div
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded-md text-[10px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-xl"
                style={{ background: "var(--background)", border: "1px solid var(--card-border)", color: "var(--foreground)" }}
              >
                <span style={{ color: "var(--muted)" }}>Score:</span>{" "}
                <span className="font-semibold">{score.toFixed(4)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
