# devlog — genomic-vep

A running journal of the build process. Updated daily.

---

## Day 0 — 2026-04-02 (Planning)

**What happened:**
Spent the session planning. Started with Karpathy's autoresearch as the core idea, then pivoted after research showed the stronger portfolio play is a genomics-first project with autoresearch as an add-on.

**Final project:**
Non-coding variant effect predictor. Fine-tune Nucleotide Transformer v2 on ClinVar data to predict whether DNA variants are pathogenic or benign. Add interpretability (integrated gradients) so the model explains *why*. Part 2 wraps the fine-tuning with autoresearch for autonomous optimization.

**Key decisions:**
- Use NT-v2 (50M params) instead of training from scratch — 2026-era approach is fine-tuning foundation models, not building them
- Focus on non-coding variants — the 98% of DNA that doesn't code for proteins, where most disease-linked variants are poorly understood
- Split project into two independent parts: genomic predictor (standalone) + autoresearch wrapper (add-on)
- Next.js dashboard for both parts, Colab for GPU, RunPod one-time for overnight run

**Lesson learned:**
Start planning from the outcome (health tech portfolio piece), not the tool (autoresearch). Would have saved an hour.

**Next:** Start Day 1 — ClinVar data pipeline.


## Day 1 — 2026-04-03 to 2026-04-09 (Data Pipeline)

**What happened:**
Built the full data pipeline. Took longer than expected due to flaky reference genome downloads.

**Completed:**
- Parsed ClinVar VCF → 350,599 SNVs (110k pathogenic, 240k benign)
- Downloaded GRCh38 reference genome, recompressed with bgzip + indexed for random access
- Extracted 1001bp DNA windows per variant, split by chromosome into train/val/test parquets

**Output:** `train.parquet` (98MB, chr1-16), `val.parquet` (7.4MB, chr17), `test.parquet` (22MB, chr18-22+X)

**Lesson learned:**
Don't over-engineer download scripts. Manual browser download beat 50 lines of retry logic.

**Next:** Day 2 — Tokenization + PyTorch Dataset.


## Day 2-3 — 2026-04-10 to 2026-04-11 (Model + Training)

**What happened:**
Built the classifier and training loop. Ran training on Colab T4 — first run reached 0.80 AUROC by epoch 3 before the session disconnected. Checkpoint was lost because we only saved the best model, not every epoch.

**Completed:**
- VariantClassifier: frozen NT-v2 encoder + trainable 2-layer head (~197K params)
- Training loop with wandb logging, BCEWithLogitsLoss (pos_weight=2.0 for class imbalance)
- Robust checkpointing: saves latest.pth every epoch + best.pth on improvement, auto-resumes
- Colab notebook with wandb login, GPU verification, Drive data copy
- Interpretability module (integrated gradients via Captum) — attributes prediction to individual tokens

**Key fix:**
Added full checkpoint saving (head weights + optimizer state + epoch + AUROC) after losing 3 epochs of training to a Colab disconnect. Now auto-resumes from latest.pth.

**Lesson learned:**
Always save checkpoints every epoch on Colab — sessions die without warning. Save optimizer state too, not just weights.

**Next:** Day 4 — FastAPI backend + Next.js frontend.


## Day 4 — 2026-04-12 (Backend + Frontend Scaffold)

**What happened:**
Shifted from training to serving. Scaffolded the FastAPI inference backend and bootstrapped the Next.js frontend so the interpretability work has somewhere to live.

**Completed:**
- `src/api/server.py` — FastAPI app with CORS, lazy interpreter init, `/predict` and `/health` endpoints. Auto-selects CUDA → MPS → CPU at startup
- `PredictionResponse` schema returns prediction probability, label, and per-token attributions for both ref and alt sequences
- Reused `VariantInterpreter` (captum integrated gradients) directly — no duplication of model loading logic
- `frontend/` — Next.js 16 + React 19 + Tailwind v4 scaffolded via `create-next-app`
- Fixed a couple of lint issues in `src/model/interpret.py` surfaced while wiring the interpreter into the API

**Key decision:**
Kept the backend dumb — one endpoint, no batching, no caching. The autoresearch wrapper (Part 2) is the place for complex inference orchestration; Part 1 just needs something the dashboard can call.

**Lesson learned:**
Splitting frontend work into a git worktree so it can proceed in parallel without stepping on backend edits. Worth the five minutes of setup.

**Next:** Day 5 — evaluation metrics on the test set, then wire dashboard components to `/predict`.


