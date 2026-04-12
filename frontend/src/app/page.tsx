"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AttributionHeatmap from "./components/AttributionHeatmap";
import DnaHelix from "./components/DnaHelix";
import ExampleVariants from "./components/ExampleVariants";
import MetricsPanel from "./components/MetricsPanel";
import PredictionResult from "./components/PredictionResult";
import ResultSkeleton from "./components/ResultSkeleton";
import SequenceDiff from "./components/SequenceDiff";
import SplashAnimation from "./components/SplashAnimation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const MOCK = process.env.NEXT_PUBLIC_MOCK === "true";

interface PredictionData {
  prediction: number;
  label: string;
  attributions: number[];
  alt_tokens: string[];
  ref_tokens: string[];
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function HowItWorks() {
  const [open, setOpen] = useState(false);

  const steps = [
    { label: "Tokenize", detail: "DNA sequences split into 6-mer tokens by the NT tokenizer" },
    { label: "Encode", detail: "REF and ALT pass through the frozen NT-v2 (50M) encoder" },
    { label: "Pool & Diff", detail: "Mean-pool hidden states, subtract ALT \u2212 REF to isolate mutation signal" },
    { label: "Classify", detail: "Embedding difference \u2192 trained head (768\u2192256\u21921) \u2192 pathogenicity probability" },
    { label: "Interpret", detail: "Integrated Gradients attributes the prediction back to individual tokens" },
  ];

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors"
      >
        <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>How it works</span>
        <svg
          className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          style={{ color: "var(--muted)" }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className={`grid transition-all duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pt-0.5">
            {steps.map((step, i) => (
              <div key={step.label} className="flex gap-3 pb-3 last:pb-0">
                <div className="flex flex-col items-center">
                  <div
                    className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                    style={{ background: "rgba(91,141,239,0.15)", color: "var(--accent)" }}
                  >
                    {i + 1}
                  </div>
                  {i < steps.length - 1 && <div className="w-px flex-1 mt-0.5" style={{ background: "var(--card-border)" }} />}
                </div>
                <div className="pt-0.5 min-w-0">
                  <p className="text-[11px] font-medium" style={{ color: "var(--foreground)" }}>{step.label}</p>
                  <p className="text-[10px] leading-snug" style={{ color: "var(--muted)" }}>{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AttributionSummary({ tokens, attributions, label }: { tokens: string[]; attributions: number[]; label: string }) {
  if (!tokens.length || !attributions.length) return null;

  const indexed = attributions.map((score, i) => ({ score, i }));
  indexed.sort((a, b) => b.score - a.score);
  const top = indexed.slice(0, 3);

  const topTokens = top.map((t) => tokens[t.i]).join(", ");
  const positions = top.map((t) => t.i);
  const isContiguous = positions.length > 1 && positions[positions.length - 1] - positions[0] === positions.length - 1;

  const posStr = isContiguous
    ? `positions ${positions[0]}\u2013${positions[positions.length - 1]}`
    : `positions ${positions.join(", ")}`;

  return (
    <p className="text-[10px] mt-3 leading-relaxed" style={{ color: "var(--muted)" }}>
      Tokens at {posStr} (<span className="font-mono" style={{ color: "var(--foreground)" }}>{topTokens}</span>) contributed
      most to the <span style={{ color: label === "Pathogenic" ? "#f87171" : "#4ade80" }}>{label.toLowerCase()}</span> prediction.
    </p>
  );
}

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const [refSeq, setRefSeq] = useState("");
  const [altSeq, setAltSeq] = useState("");
  const [result, setResult] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const handleSplashComplete = useCallback(() => setShowSplash(false), []);

  useEffect(() => {
    if (result) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 150);
    }
  }, [result]);

  async function handlePredict() {
    if (!refSeq.trim() || !altSeq.trim()) {
      setError("Both sequences are required");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (MOCK) {
        await new Promise((r) => setTimeout(r, 1200));
        const mockTokens = ["ATG", "CCT", "GAA", "TTC", "AGG", "CCA", "TTG", "GGA", "ACT", "CGT"];
        const mockScores = mockTokens.map(() => Math.random());
        const maxScore = Math.max(...mockScores);
        setResult({
          prediction: 0.82,
          label: "Pathogenic",
          attributions: mockScores.map((s) => s / maxScore),
          alt_tokens: mockTokens,
          ref_tokens: mockTokens,
        });
        return;
      }

      const res = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref_seq: refSeq, alt_seq: altSeq }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Server error: ${res.status}`);
      }

      const data: PredictionData = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleExampleSelect(ref: string, alt: string) {
    setRefSeq(ref);
    setAltSeq(alt);
    setResult(null);
    setError(null);
  }

  return (
    <>
      {showSplash && <SplashAnimation onComplete={handleSplashComplete} />}
      <div className="bg-glow" />
      <main className={`flex-1 max-w-4xl mx-auto w-full px-6 py-14 ${showSplash ? "opacity-0" : "animate-[fadeSlideUp_0.6s_ease-out_both]"}`}>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <DnaHelix className="h-9 w-9" />
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Genomic VEP
            </h1>
          </div>
          <p className="text-sm leading-relaxed max-w-xl" style={{ color: "var(--foreground)" }}>
            Predict variant pathogenicity with a fine-tuned Nucleotide Transformer
            and per-token interpretability via Integrated Gradients.
          </p>
          <div className="flex gap-3 mt-3 text-[10px]" style={{ color: "var(--muted)" }}>
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full" style={{ background: "var(--accent)" }} />
              NT-v2 50M
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full" style={{ background: "#7b6cf0" }} />
              Integrated Gradients
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full" style={{ background: "#4ade80" }} />
              ClinVar trained
            </span>
          </div>
        </div>

        {/* Model Performance + How it works */}
        <div className="space-y-3 mb-8">
          <MetricsPanel />
          <HowItWorks />
        </div>

        {/* Examples */}
        <div className="mb-6">
          <ExampleVariants onSelect={handleExampleSelect} disabled={loading} />
        </div>

        {/* REF + ALT side by side */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label htmlFor="ref-seq" className="flex items-center gap-2 text-xs font-medium mb-1.5" style={{ color: "var(--foreground)" }}>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(91,141,239,0.12)", color: "var(--accent)" }}>
                REF
              </span>
              Reference Sequence
            </label>
            <textarea
              id="ref-seq"
              value={refSeq}
              onChange={(e) => setRefSeq(e.target.value)}
              placeholder="ATCGATCGATCG..."
              className="input-field h-20"
            />
          </div>
          <div>
            <label htmlFor="alt-seq" className="flex items-center gap-2 text-xs font-medium mb-1.5" style={{ color: "var(--foreground)" }}>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(91,141,239,0.12)", color: "var(--accent)" }}>
                ALT
              </span>
              Alternate Sequence
            </label>
            <textarea
              id="alt-seq"
              value={altSeq}
              onChange={(e) => setAltSeq(e.target.value)}
              placeholder="ATCGATCAATCG..."
              className="input-field h-20"
            />
          </div>
        </div>

        {/* Sequence diff */}
        {refSeq && altSeq && (
          <div className="mb-4">
            <SequenceDiff refSeq={refSeq} altSeq={altSeq} />
          </div>
        )}

        {/* Predict button */}
        <button
          onClick={handlePredict}
          disabled={loading || !refSeq.trim() || !altSeq.trim()}
          className="btn-primary"
        >
          {loading ? (
            <>
              <Spinner />
              Analyzing...
            </>
          ) : (
            "Predict Variant Effect"
          )}
        </button>

        {/* Error */}
        {error && (
          <div className="mt-4 px-4 py-3 rounded-lg text-xs" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !result && <ResultSkeleton />}

        {/* Results */}
        <div
          ref={resultsRef}
          className={`mt-8 space-y-6 transition-all duration-700 ease-out ${
            result
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-6 pointer-events-none h-0 overflow-hidden mt-0"
          }`}
        >
          {result && (
            <>
              <PredictionResult prediction={result.prediction} label={result.label} />
              <div className="card p-5 animate-[fadeSlideUp_0.4s_ease-out_0.2s_both]">
                <AttributionHeatmap tokens={result.alt_tokens} attributions={result.attributions} />
                <AttributionSummary tokens={result.alt_tokens} attributions={result.attributions} label={result.label} />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-14 pt-6 text-center text-[10px]" style={{ borderTop: "1px solid var(--card-border)", color: "var(--subtle)" }}>
          <p>
            Built with Nucleotide Transformer v2 &middot; Trained on ClinVar
            &middot; Not for clinical use
          </p>
          <a
            href="https://github.com/theomalaper/genomic-vep"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-1.5 transition-colors"
            style={{ color: "var(--muted)" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--foreground)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--muted)"; }}
          >
            <svg className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            Source
          </a>
        </div>
      </main>
    </>
  );
}
