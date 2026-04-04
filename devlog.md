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

