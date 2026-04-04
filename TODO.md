# autoresearch-genome — Project TODO

Check off items as you go. Steps marked 🔨 are things to build. Steps marked 📖 are concepts explained in `concepts.md`.

---

## Part 1 — Variant Effect Predictor (Days 1–9)

### Day 1 — Data Pipeline Setup
- [ ] 🔨 Create Python project structure + virtual environment
- [ ] 🔨 Download ClinVar VCF file (public, ~100MB)
- [ ] 🔨 Parse ClinVar: extract pathogenic + benign variants (chrom, position, ref allele, alt allele, label)
- [ ] 🔨 Download human reference genome (GRCh38, FASTA) — or just chr17 + chr13 to start small
- [ ] 🔨 Write `devlog.md` Day 1 entry
- [ ] 📖 Read: What is ClinVar? What is a VCF file? What is a reference genome? (`concepts.md` Section 1)

### Day 2 — Sequence Extraction
- [ ] 🔨 For each variant, extract ~1000bp DNA window centered on the variant position from the reference genome
- [ ] 🔨 Create two versions of each window: reference (normal) and alternate (with the mutation)
- [ ] 🔨 Split into train/val/test (by chromosome to avoid data leakage — e.g., chr1-16 train, chr17 val, chr18-22 test)
- [ ] 🔨 Save as a clean dataset (CSV or parquet with: chrom, pos, ref_seq, alt_seq, label)
- [ ] 🔨 Verify: print some examples, confirm the variant is in the middle of the window
- [ ] 📖 Read: Why split by chromosome? What is data leakage? (`concepts.md` Section 2)

### Day 3 — Tokenization + Dataset
- [ ] 🔨 Install `transformers` from HuggingFace
- [ ] 🔨 Load NT-v2 tokenizer: `AutoTokenizer.from_pretrained("InstaDeepAI/nucleotide-transformer-v2-50m-multi-species")`
- [ ] 🔨 Tokenize reference and alternate sequences
- [ ] 🔨 Build a PyTorch `Dataset` class that returns (ref_tokens, alt_tokens, label)
- [ ] 🔨 Build DataLoaders (batch size, shuffle, etc.)
- [ ] 🔨 Verify: print one batch, confirm tensor shapes look right
- [ ] 📖 Read: What is a tokenizer? What are embeddings? What is a DataLoader? (`concepts.md` Section 3)

### Day 4 — Fine-Tuning
- [ ] 🔨 Load pre-trained NT-v2: `AutoModel.from_pretrained(...)`
- [ ] 🔨 Freeze the base model weights (we only train the classification head)
- [ ] 🔨 Add a classification head on top: NT-v2 embeddings → linear layer → pathogenic/benign
- [ ] 🔨 Design input strategy: encode ref and alt separately, subtract embeddings, classify the difference
- [ ] 🔨 Write training loop (or use HuggingFace Trainer)
- [ ] 🔨 Train on Colab T4 — should take 30-60 min
- [ ] 🔨 Save the model checkpoint
- [ ] 📖 Read: What is fine-tuning? Why freeze the base? What is a classification head? (`concepts.md` Section 4)

### Day 5 — Evaluation
- [ ] 🔨 Run model on test set
- [ ] 🔨 Calculate metrics: AUROC, accuracy, precision, recall, F1
- [ ] 🔨 Plot ROC curve + confusion matrix
- [ ] 🔨 Compare to a random baseline and a simple baseline (e.g., conservation score)
- [ ] 🔨 Write `devlog.md` entry with results
- [ ] 📖 Read: What is AUROC? Why is it better than accuracy for this task? (`concepts.md` Section 5)

### Day 6 — Interpretability
- [ ] 🔨 Implement integrated gradients (or use `captum` library)
- [ ] 🔨 For a given variant prediction, compute attribution scores per base
- [ ] 🔨 Visualize: generate a sequence plot with bases colored by importance (red = important for pathogenic prediction)
- [ ] 🔨 Test on known pathogenic variants — do the attributions make biological sense?
- [ ] 🔨 Compare attention patterns between pathogenic vs benign predictions
- [ ] 📖 Read: What are integrated gradients? What is model interpretability? (`concepts.md` Section 6)

### Days 7–8 — Dashboard (Next.js)
- [ ] 🔨 `npx create-next-app@14` with Tailwind
- [ ] 🔨 Build API route: POST `/api/predict` — accepts variant (chrom, pos, ref, alt) → returns prediction + confidence + attribution scores
- [ ] 🔨 Build FastAPI backend that loads the model and serves predictions
- [ ] 🔨 Build components:
  - [ ] `VariantInput.tsx` — form to input a variant (chromosome, position, ref, alt)
  - [ ] `PredictionResult.tsx` — pathogenic/benign badge with confidence score
  - [ ] `SequenceViewer.tsx` — DNA sequence with bases colored by attribution (the interpretability viz)
  - [ ] `MetricsPanel.tsx` — model performance metrics (AUROC, accuracy)
- [ ] 🔨 Connect frontend → FastAPI backend → model inference
- [ ] 🔨 Test with real ClinVar variants

### Day 9 — Polish Part 1
- [ ] 🔨 Write `README.md` for Part 1 (description, architecture, screenshot, how to run, results)
- [ ] 🔨 Write `results/part1_results.md` — summary of model performance
- [ ] 🔨 Save example predictions + interpretability screenshots
- [ ] 🔨 Clean up code, add comments to non-obvious parts
- [ ] 🔨 Push to GitHub
- [ ] 🔨 Write `devlog.md` Part 1 complete entry

---

## Part 2 — autoresearch Wrapper (Days 10–15)

### Day 10 — Understand autoresearch
- [ ] 🔨 Clone karpathy/autoresearch into project
- [ ] 📖 Read `train.py` top to bottom
- [ ] 📖 Read `program.md` — understand the agent's instructions
- [ ] 📖 Read the main loop — how it calls Claude, patches code, evaluates
- [ ] 🔨 Write `program_variant.md` — custom instructions for this task (optimize the fine-tuning of NT-v2 for variant effect prediction)
- [ ] 📖 Read: How does autoresearch work? (`concepts.md` Section 7)

### Days 11–12 — Backend Sidecar
- [ ] 🔨 Write `autoresearch-dash/server.py` — FastAPI + WebSocket broadcaster
- [ ] 🔨 Write `autoresearch-dash/watcher.py` — tails logs, watches results, reads git diffs
- [ ] 🔨 Write `autoresearch-dash/agent_runner.py` — Anthropic streaming API wrapper
- [ ] 🔨 Test with fake events to verify WebSocket pipeline works

### Day 13 — Dashboard Panels
- [ ] 🔨 Add autoresearch panels to existing Next.js app:
  - [ ] `ImprovementChart.tsx` — AUROC over experiments (green = kept, red = reverted)
  - [ ] `DiffViewer.tsx` — code diffs per experiment
  - [ ] `ReasoningPanel.tsx` — streaming AI chain-of-thought
  - [ ] `ExperimentTable.tsx` — full history
  - [ ] `Controls.tsx` — pause/resume
- [ ] 🔨 Wire WebSocket hook to autoresearch event stream

### Day 14 — Integration Test
- [ ] 🔨 Run short autoresearch loop on Colab (~2 hours, ~20 experiments)
- [ ] 🔨 Verify all events flow: logs → watcher → server → dashboard
- [ ] 🔨 Fix integration bugs
- [ ] 🔨 Write `devlog.md` entry

### Day 15 — Overnight Run + Final Polish
- [ ] 🔨 Spin up RunPod ($10 limit)
- [ ] 🔨 Run full overnight autoresearch loop
- [ ] 🔨 Save results to `results/autoresearch_results.tsv`
- [ ] 🔨 Screenshot dashboard → `results/dashboard_screenshot.png`
- [ ] 🔨 **Shut down RunPod**
- [ ] 🔨 Write `results/autoresearch_results.md` — what the agent discovered
- [ ] 🔨 Update `README.md` with Part 2 section
- [ ] 🔨 Final `devlog.md` entry
- [ ] 🔨 Push everything to GitHub

---

## Stretch Goals
- [ ] 🔨 Generation panel: given a pathogenic variant, suggest alternative mutations that restore function
- [ ] 🔨 Batch prediction: upload a VCF file, get predictions for all variants
- [ ] 🔨 Compare against CADD scores (a standard variant effect tool) as a benchmark
- [ ] 🔨 Cell-type-specific predictions (which tissues is this variant most damaging in?)
