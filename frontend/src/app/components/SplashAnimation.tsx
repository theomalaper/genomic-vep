"use client";

import { useEffect, useState } from "react";

export default function SplashAnimation({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"helix" | "fade">("helix");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("fade"), 1600);
    const t2 = setTimeout(() => onComplete(), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-500 ${
        phase === "fade" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{ background: "var(--background)" }}
    >
      <div className="flex flex-col items-center gap-5">
        {/* Animated helix */}
        <svg
          viewBox="0 0 80 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-24 w-16"
        >
          {/* Left strand */}
          <path
            d="M20 10C20 10 60 30 60 60C60 90 20 110 20 110"
            stroke="url(#splash-l)"
            strokeWidth="3"
            strokeLinecap="round"
            className="animate-[drawStrand_1.2s_ease-out_forwards]"
            strokeDasharray="200"
            strokeDashoffset="200"
          />
          {/* Right strand */}
          <path
            d="M60 10C60 10 20 30 20 60C20 90 60 110 60 110"
            stroke="url(#splash-r)"
            strokeWidth="3"
            strokeLinecap="round"
            className="animate-[drawStrand_1.2s_ease-out_0.15s_forwards]"
            strokeDasharray="200"
            strokeDashoffset="200"
          />
          {/* Rungs — fade in staggered */}
          {[24, 36, 48, 60, 72, 84, 96].map((y, i) => {
            const mid = 60;
            const t = (y - 10) / 100;
            const spread = Math.sin(t * Math.PI);
            const x1 = 40 - spread * 20;
            const x2 = 40 + spread * 20;
            return (
              <line
                key={y}
                x1={x1}
                y1={y}
                x2={x2}
                y2={y}
                stroke="rgba(91,141,239,0.25)"
                strokeWidth="2"
                strokeLinecap="round"
                className="animate-[fadeIn_0.3s_ease-out_forwards]"
                style={{ opacity: 0, animationDelay: `${0.4 + i * 0.1}s` }}
              />
            );
          })}
          <defs>
            <linearGradient id="splash-l" x1="20" y1="10" x2="20" y2="110">
              <stop stopColor="#5b8def" />
              <stop offset="1" stopColor="#7b6cf0" />
            </linearGradient>
            <linearGradient id="splash-r" x1="60" y1="10" x2="60" y2="110">
              <stop stopColor="#7b6cf0" />
              <stop offset="1" stopColor="#5b8def" />
            </linearGradient>
          </defs>
        </svg>

        {/* Title */}
        <div className="text-center animate-[fadeSlideUp_0.6s_ease-out_0.5s_both]">
          <h1 className="text-2xl font-bold tracking-tight text-white">Genomic VEP</h1>
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>Variant Effect Predictor</p>
        </div>
      </div>
    </div>
  );
}
