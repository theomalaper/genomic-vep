"use client";

interface PredictionResultProps {
  prediction: number;
  label: string;
}

export default function PredictionResult({ prediction, label }: PredictionResultProps) {
  const isPathogenic = label === "Pathogenic";
  const confidence = isPathogenic ? prediction : 1 - prediction;
  const accentColor = isPathogenic ? "#f87171" : "#4ade80";

  return (
    <div
      className="card p-5 animate-[fadeSlideUp_0.4s_ease-out_both]"
      style={{ borderColor: isPathogenic ? "rgba(248,113,113,0.2)" : "rgba(74,222,128,0.2)" }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-medium mb-1" style={{ color: "var(--muted)" }}>
            Prediction
          </p>
          <div className="flex items-center gap-2.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: accentColor, boxShadow: `0 0 8px ${accentColor}60` }}
            />
            <p className="text-2xl font-bold tracking-tight" style={{ color: accentColor }}>
              {label}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest font-medium mb-1" style={{ color: "var(--muted)" }}>
            Confidence
          </p>
          <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--foreground)" }}>
            {(confidence * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex justify-between text-[10px] mb-1" style={{ color: "var(--muted)" }}>
          <span>Benign</span>
          <span>Pathogenic</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(56,73,113,0.3)" }}>
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${prediction * 100}%`,
              background: isPathogenic
                ? "linear-gradient(to right, #dc2626, #f87171)"
                : "linear-gradient(to right, #059669, #4ade80)",
            }}
          />
        </div>
        <p className="text-[10px] mt-1 text-center font-mono" style={{ color: "var(--subtle)" }}>
          P(pathogenic) = {prediction.toFixed(4)}
        </p>
      </div>
    </div>
  );
}
