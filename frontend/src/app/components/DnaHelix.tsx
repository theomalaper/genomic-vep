"use client";

export default function DnaHelix({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Minimal double helix — two sinusoidal strands with connecting rungs */}
      <path
        d="M10 3C10 3 22 9 22 16C22 23 10 29 10 29"
        stroke="#3b82f6"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M22 3C22 3 10 9 10 16C10 23 22 29 22 29"
        stroke="#8b5cf6"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
