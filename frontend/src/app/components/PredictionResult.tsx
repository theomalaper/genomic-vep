"use client";

interface PredictionResultProps {
  prediction: number;
  label: string;
}

export default function PredictionResult({
  prediction,
  label,
}: PredictionResultProps) {
  const isPathogenic = label === "Pathogenic";
  const confidence = isPathogenic ? prediction : 1 - prediction;

  return (
    <div
      className={`rounded-xl p-6 border backdrop-blur-sm animate-[fadeSlideUp_0.5s_ease-out_both] ${
        isPathogenic
          ? "border-red-500/20 bg-red-950/10"
          : "border-emerald-500/20 bg-emerald-950/10"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">
            Prediction
          </p>
          <div className="flex items-center gap-3">
            <span
              className={`h-3 w-3 rounded-full ${
                isPathogenic ? "bg-red-500 shadow-lg shadow-red-500/50" : "bg-emerald-500 shadow-lg shadow-emerald-500/50"
              }`}
            />
            <p
              className={`text-3xl font-bold ${
                isPathogenic ? "text-red-400" : "text-emerald-400"
              }`}
            >
              {label}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">
            Confidence
          </p>
          <p className="text-3xl font-bold tabular-nums text-slate-200">
            {(confidence * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Probability bar */}
      <div className="mt-6">
        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
          <span>Benign</span>
          <span>Pathogenic</span>
        </div>
        <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              isPathogenic
                ? "bg-gradient-to-r from-red-600 to-red-400"
                : "bg-gradient-to-r from-emerald-600 to-emerald-400"
            }`}
            style={{ width: `${prediction * 100}%` }}
          />
        </div>
        <p className="text-xs text-slate-600 mt-1.5 text-center">
          P(pathogenic) = {prediction.toFixed(4)}
        </p>
      </div>
    </div>
  );
}
