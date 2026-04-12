"use client";

export default function DnaHelix({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M10 3C10 3 22 9 22 16C22 23 10 29 10 29"
        stroke="url(#helix-l)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M22 3C22 3 10 9 10 16C10 23 22 29 22 29"
        stroke="url(#helix-r)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="helix-l" x1="10" y1="3" x2="10" y2="29">
          <stop stopColor="#5b8def" />
          <stop offset="1" stopColor="#7b6cf0" />
        </linearGradient>
        <linearGradient id="helix-r" x1="22" y1="3" x2="22" y2="29">
          <stop stopColor="#7b6cf0" />
          <stop offset="1" stopColor="#5b8def" />
        </linearGradient>
      </defs>
    </svg>
  );
}
