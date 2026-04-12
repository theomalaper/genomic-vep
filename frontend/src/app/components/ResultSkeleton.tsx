"use client";

function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded ${className}`} style={{ background: "rgba(56,73,113,0.3)" }} />;
}

export default function ResultSkeleton() {
  return (
    <div className="mt-8 space-y-6 animate-[fadeSlideUp_0.3s_ease-out_both]">
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Pulse className="h-2.5 w-14" />
            <div className="flex items-center gap-2.5">
              <Pulse className="h-2.5 w-2.5 rounded-full" />
              <Pulse className="h-6 w-28" />
            </div>
          </div>
          <div className="space-y-2 flex flex-col items-end">
            <Pulse className="h-2.5 w-14" />
            <Pulse className="h-6 w-16" />
          </div>
        </div>
        <div className="mt-5 space-y-1">
          <div className="flex justify-between">
            <Pulse className="h-2.5 w-10" />
            <Pulse className="h-2.5 w-14" />
          </div>
          <Pulse className="h-1.5 w-full rounded-full" />
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <Pulse className="h-3.5 w-24" />
          <Pulse className="h-1.5 w-16 rounded-full" />
        </div>
        <div className="flex flex-wrap gap-px">
          {[32, 36, 28, 40, 34, 30, 38, 32, 36, 28, 34, 40, 30, 36].map((w, i) => (
            <div key={i} className="animate-pulse rounded h-6" style={{ width: `${w}px`, background: "rgba(56,73,113,0.3)" }} />
          ))}
        </div>
      </div>
    </div>
  );
}
