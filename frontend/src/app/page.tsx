"use client";

import { useEffect, useRef, useState } from "react";
import AttributionHeatmap from "./components/AttributionHeatmap";
import DnaHelix from "./components/DnaHelix";
import ExampleVariants from "./components/ExampleVariants";
import MetricsPanel from "./components/MetricsPanel";
import PredictionResult from "./components/PredictionResult";
import ResultSkeleton from "./components/ResultSkeleton";
import SequenceDiff from "./components/SequenceDiff";

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
    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function HowItWorks() {
  const [open, setOpen] = useState(false);

  const steps = [
    { label: "Tokenize", detail: "DNA sequences are split into 6-mer tokens by the Nucleotide Transformer tokenizer" },
    { label: "Encode", detail: "Both REF and ALT sequences pass through the frozen NT-v2 (50M param) encoder to produce per-token hidden states" },
    { label: "Pool & Diff", detail: "Hidden states are mean-pooled into a single vector per sequence, then subtracted (ALT \u2212 REF) to isolate the mutation signal" },
    { label: "Classify", detail: "The embedding difference feeds into a trained classification head (768\u2192256\u21921) that outputs a pathogenicity probability" },
    { label: "Interpret", detail: "Integrated Gradients (50 interpolation steps) attributes the prediction back to individual tokens, showing which parts of the sequence drove the decision" },
  ];

  return (
    <div className="mt-12 rounded-xl border border-slate-700/50 bg-slate-800/20 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-800/40 transition-colors"
      >
        <span className="text-sm font-medium text-slate-400">How it works</span>
        <svg
          className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
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
          <div className="px-5 pb-5 pt-1">
            <div className="relative">
              {steps.map((step, i) => (
                <div key={step.label} className="flex gap-4 pb-5 last:pb-0">
                  <div className="flex flex-col items-center">
                    <div className="h-6 w-6 rounded-full bg-slate-700/80 flex items-center justify-center text-[10px] font-bold text-slate-300 shrink-0">
                      {i + 1}
                    </div>
                    {i < steps.length - 1 && <div className="w-px flex-1 bg-slate-700/50 mt-1" />}
                  </div>
                  <div className="pt-0.5">
                    <p className="text-sm font-medium text-slate-300">{step.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AttributionSummary({ tokens, attributions, label }: { tokens: string[]; attributions: number[]; label: string }) {
  if (!tokens.length || !attributions.length) return null;

  // Find top 3 tokens by attribution
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
    <p className="text-xs text-slate-500 mt-4 leading-relaxed">
      Tokens at {posStr} (<span className="text-slate-400 font-mono">{topTokens}</span>) contributed
      most to the <span className={label === "Pathogenic" ? "text-red-400" : "text-emerald-400"}>{label.toLowerCase()}</span> prediction.
    </p>
  );
}

export default function Home() {
  const [refSeq, setRefSeq] = useState("");
  const [altSeq, setAltSeq] = useState("");
  const [result, setResult] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Scroll results into view when they appear
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
    <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-16">
      {/* Header */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-3">
          <DnaHelix className="h-10 w-10" />
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Genomic VEP
          </h1>
        </div>
        <p className="text-slate-400 leading-relaxed max-w-2xl">
          Predict whether a DNA variant is pathogenic or benign using a
          fine-tuned Nucleotide Transformer, with per-token interpretability
          showing which parts of the sequence drive the prediction.
        </p>
        <div className="flex gap-4 mt-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            NT-v2 50M
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
            Integrated Gradients
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            ClinVar trained
          </span>
        </div>
      </div>

      {/* Example variants */}
      <div className="mb-10">
        <ExampleVariants onSelect={handleExampleSelect} disabled={loading} />
      </div>

      {/* Metrics */}
      <div className="mb-10">
        <MetricsPanel />
      </div>

      {/* Input */}
      <div className="space-y-5 mb-8">
        <div>
          <label
            htmlFor="ref-seq"
            className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2"
          >
            <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 font-mono">
              REF
            </span>
            Reference Sequence
          </label>
          <textarea
            id="ref-seq"
            value={refSeq}
            onChange={(e) => setRefSeq(e.target.value)}
            placeholder="ATCGATCGATCGATCG..."
            className="w-full h-24 px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-200 font-mono text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 resize-none transition-all"
          />
        </div>
        <div>
          <label
            htmlFor="alt-seq"
            className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2"
          >
            <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 font-mono">
              ALT
            </span>
            Alternate Sequence
          </label>
          <textarea
            id="alt-seq"
            value={altSeq}
            onChange={(e) => setAltSeq(e.target.value)}
            placeholder="ATCGATCAATCGATCG..."
            className="w-full h-24 px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-200 font-mono text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 resize-none transition-all"
          />
        </div>
      </div>

      {/* Sequence diff */}
      {refSeq && altSeq && (
        <div className="mb-6">
          <SequenceDiff refSeq={refSeq} altSeq={altSeq} />
        </div>
      )}

      {/* Predict button */}
      <button
        onClick={handlePredict}
        disabled={loading || !refSeq.trim() || !altSeq.trim()}
        className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30"
      >
        {loading ? (
          <>
            <Spinner />
            Analyzing variant...
          </>
        ) : (
          "Predict Variant Effect"
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="mt-6 p-4 rounded-xl bg-red-950/30 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !result && <ResultSkeleton />}

      {/* Results */}
      <div
        ref={resultsRef}
        className={`mt-10 space-y-8 transition-all duration-700 ease-out ${
          result
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-8 pointer-events-none h-0 overflow-hidden mt-0"
        }`}
      >
        {result && (
          <>
            <PredictionResult
              prediction={result.prediction}
              label={result.label}
            />
            <div className="p-6 rounded-xl bg-slate-800/40 border border-slate-700/50 animate-[fadeSlideUp_0.5s_ease-out_0.3s_both]">
              <AttributionHeatmap
                tokens={result.alt_tokens}
                attributions={result.attributions}
              />
              <AttributionSummary
                tokens={result.alt_tokens}
                attributions={result.attributions}
                label={result.label}
              />
            </div>
          </>
        )}
      </div>

      {/* How it works */}
      <HowItWorks />

      {/* Footer */}
      <div className="mt-16 pt-8 border-t border-slate-800 text-center text-xs text-slate-600">
        <p>
          Built with Nucleotide Transformer v2 &middot; Trained on ClinVar
          &middot; Not for clinical use
        </p>
        <a
          href="https://github.com/theomalaper/genomic-vep"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mt-2 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          View on GitHub
        </a>
      </div>
    </main>
  );
}
