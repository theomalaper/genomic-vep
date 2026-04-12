"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AttributionHeatmap from "./components/AttributionHeatmap";
import ExampleVariants from "./components/ExampleVariants";
import MetricsPanel from "./components/MetricsPanel";
import PredictionResult from "./components/PredictionResult";
import ResultSkeleton from "./components/ResultSkeleton";
import SequenceDiff from "./components/SequenceDiff";
import SplashAnimation from "./components/SplashAnimation";
import type { RealExample } from "./components/realExamples";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const MOCK = process.env.NEXT_PUBLIC_MOCK === "true";

let splashPlayed = false;

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
  const [showSplash, setShowSplash] = useState(!splashPlayed);
  const [refSeq, setRefSeq] = useState("");
  const [altSeq, setAltSeq] = useState("");
  const [result, setResult] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expectedLabel, setExpectedLabel] = useState<"Pathogenic" | "Benign" | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const handleSplashComplete = useCallback(() => {
    splashPlayed = true;
    setShowSplash(false);
  }, []);

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

  function handleExampleSelect(example: RealExample) {
    setRefSeq(example.refSeq);
    setAltSeq(example.altSeq);
    setExpectedLabel(example.trueLabel);
    setResult(null);
    setError(null);
  }

  return (
    <>
      {showSplash && <SplashAnimation onComplete={handleSplashComplete} />}
      <main className={`flex-1 max-w-4xl mx-auto w-full px-6 py-14 ${showSplash ? "opacity-0" : "animate-[fadeSlideUp_0.6s_ease-out_both]"}`}>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
            Genomic VEP
          </h1>
          <p className="text-sm leading-relaxed max-w-xl" style={{ color: "var(--foreground)" }}>
            Predict variant pathogenicity with a fine-tuned Nucleotide Transformer
            and per-token interpretability via Integrated Gradients.
          </p>
          <div className="flex gap-3 mt-3 text-[10px]" style={{ color: "var(--muted)" }}>
            <Link
              href="/model"
              className="flex items-center gap-1.5 hover:text-white transition-colors"
              title="See model card"
            >
              <span className="h-1 w-1 rounded-full" style={{ background: "var(--accent)" }} />
              NT-v2 50M
            </Link>
            <Link
              href="/model"
              className="flex items-center gap-1.5 hover:text-white transition-colors"
              title="See model card"
            >
              <span className="h-1 w-1 rounded-full" style={{ background: "#7b6cf0" }} />
              Integrated Gradients
            </Link>
            <Link
              href="/model"
              className="flex items-center gap-1.5 hover:text-white transition-colors"
              title="See model card"
            >
              <span className="h-1 w-1 rounded-full" style={{ background: "#4ade80" }} />
              ClinVar trained
            </Link>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label htmlFor="ref-seq" className="flex items-center gap-2 text-xs font-medium mb-1.5" style={{ color: "var(--foreground)" }}>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(91,141,239,0.12)", color: "var(--accent)" }}>
                REF
              </span>
              Reference Sequence
            </label>
            <div className="relative">
              <textarea
                id="ref-seq"
                value={refSeq}
                onChange={(e) => { setRefSeq(e.target.value); setExpectedLabel(null); }}
                placeholder="ATCGATCGATCG..."
                className="input-field h-20 pr-16"
              />
              <span className="absolute bottom-2 right-3 text-[10px] font-mono pointer-events-none" style={{ color: "var(--subtle)" }}>
                {refSeq.length.toLocaleString()} bp
              </span>
            </div>
          </div>
          <div>
            <label htmlFor="alt-seq" className="flex items-center gap-2 text-xs font-medium mb-1.5" style={{ color: "var(--foreground)" }}>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(91,141,239,0.12)", color: "var(--accent)" }}>
                ALT
              </span>
              Alternate Sequence
            </label>
            <div className="relative">
              <textarea
                id="alt-seq"
                value={altSeq}
                onChange={(e) => { setAltSeq(e.target.value); setExpectedLabel(null); }}
                placeholder="ATCGATCAATCG..."
                className="input-field h-20 pr-16"
              />
              <span className="absolute bottom-2 right-3 text-[10px] font-mono pointer-events-none" style={{ color: "var(--subtle)" }}>
                {altSeq.length.toLocaleString()} bp
              </span>
            </div>
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
              {expectedLabel && (
                <div
                  className="px-4 py-2.5 rounded-lg text-[11px] flex items-center gap-2 animate-[fadeSlideUp_0.4s_ease-out_0.1s_both]"
                  style={{
                    background: result.label === expectedLabel ? "rgba(74,222,128,0.08)" : "rgba(239,68,68,0.08)",
                    border: `1px solid ${result.label === expectedLabel ? "rgba(74,222,128,0.25)" : "rgba(239,68,68,0.25)"}`,
                    color: result.label === expectedLabel ? "#4ade80" : "#f87171",
                  }}
                >
                  <span className="font-semibold">{result.label === expectedLabel ? "✓ Correct" : "✗ Incorrect"}</span>
                  <span style={{ color: "var(--muted)" }}>
                    — ground truth (ClinVar): <span style={{ color: "var(--foreground)" }}>{expectedLabel}</span>
                  </span>
                </div>
              )}
              <div className="card p-5 animate-[fadeSlideUp_0.4s_ease-out_0.2s_both]">
                <AttributionHeatmap tokens={result.alt_tokens} attributions={result.attributions} />
                <AttributionSummary tokens={result.alt_tokens} attributions={result.attributions} label={result.label} />
              </div>
            </>
          )}
        </div>

      </main>
    </>
  );
}
