"use client";

function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-700/40 ${className}`} />;
}

export default function ResultSkeleton() {
  return (
    <div className="mt-10 space-y-8 animate-[fadeSlideUp_0.4s_ease-out_both]">
      {/* Prediction result skeleton */}
      <div className="rounded-xl p-6 border border-slate-700/30 bg-slate-800/20">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Pulse className="h-3 w-16" />
            <div className="flex items-center gap-3">
              <Pulse className="h-3 w-3 rounded-full" />
              <Pulse className="h-8 w-32" />
            </div>
          </div>
          <div className="space-y-2 flex flex-col items-end">
            <Pulse className="h-3 w-16" />
            <Pulse className="h-8 w-20" />
          </div>
        </div>
        <div className="mt-6 space-y-1.5">
          <div className="flex justify-between">
            <Pulse className="h-3 w-10" />
            <Pulse className="h-3 w-16" />
          </div>
          <Pulse className="h-2 w-full rounded-full" />
          <Pulse className="h-3 w-28 mx-auto" />
        </div>
      </div>

      {/* Attribution heatmap skeleton */}
      <div className="p-6 rounded-xl bg-slate-800/20 border border-slate-700/30">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-1.5">
            <Pulse className="h-4 w-28" />
            <Pulse className="h-3 w-48" />
          </div>
          <Pulse className="h-2 w-20 rounded-full" />
        </div>
        <div className="flex flex-wrap gap-[3px]">
          {[32, 36, 28, 40, 34, 30, 38, 32, 36, 28, 34, 40, 30, 36].map((w, i) => (
            <div
              key={i}
              className="animate-pulse rounded-md bg-slate-700/40 h-7"
              style={{ width: `${w}px` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
