"use client";

interface AttributionHeatmapProps {
  tokens: string[];
  attributions: number[];
}

function getColor(score: number): string {
  // Blue (low) → Purple (mid) → Hot pink (high)
  if (score < 0.5) {
    const t = score * 2;
    const r = Math.round(30 + 100 * t);
    const g = Math.round(40 * (1 - t));
    const b = Math.round(120 + 60 * t);
    return `rgb(${r}, ${g}, ${b})`;
  }
  const t = (score - 0.5) * 2;
  const r = Math.round(130 + 120 * t);
  const g = Math.round(10 + 20 * t);
  const b = Math.round(180 - 80 * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export default function AttributionHeatmap({
  tokens,
  attributions,
}: AttributionHeatmapProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-slate-300">
            Token Attributions
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Hover for exact scores. Brighter tokens had more influence on the
            prediction.
          </p>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Low</span>
          <div
            className="h-2 w-20 rounded-full"
            style={{
              background:
                "linear-gradient(to right, rgb(30,40,120), rgb(130,10,180), rgb(250,30,100))",
            }}
          />
          <span>High</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-[3px] font-mono text-xs leading-none">
        {tokens.map((token, i) => {
          const score = attributions[i] ?? 0;
          return (
            <div key={i} className="relative group">
              <span
                className="px-1.5 py-1.5 rounded-md cursor-default inline-block transition-transform hover:scale-110 hover:z-10"
                style={{
                  backgroundColor: getColor(score),
                  color: score > 0.4 ? "white" : "#94a3b8",
                  opacity: 0.4 + score * 0.6,
                }}
              >
                {token}
              </span>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-xl">
                <span className="text-slate-400">Attribution:</span>{" "}
                <span className="font-semibold">{score.toFixed(4)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
