# The decisions behind a genomic variant effect predictor

*Draft — 2026-04-13. Day 5 of genomic-vep build.*

I've been building a non-coding variant effect predictor for the past week: fine-tune Nucleotide Transformer v2 on ClinVar, predict whether a DNA variant is pathogenic or benign, explain *why* with per-token Integrated Gradients, wrap the whole thing in a dashboard. Training is still running on Colab as I write this (epoch 5, val AUROC 0.8194, still climbing).

Rather than a play-by-play, I want to write about the decisions. Most ML writeups gloss over the *why* and jump to the result. But the result is uninteresting — the interesting part is the constraints that shaped it, and the constraints I'm still trying to satisfy.

## ML decisions

**Frozen encoder + small head.** NT-v2 has 50M parameters. ClinVar, after filtering to single-nucleotide variants with confident labels, gives me 264k training examples. Full fine-tuning on that ratio is a recipe for catastrophic forgetting of the genomic prior the base model already has. So the encoder stays frozen and only a ~197k-param head (768 → 256 → 1) is trained. This is the standard 2026 playbook for foundation models and the right tradeoff here: keep the pretraining signal, add task-specific capacity where you have the data to fit it.

**ALT − REF embedding difference.** The naive approach is to pass the ALT sequence through the model and classify. The problem is that 999 of the 1001 base pairs in the window are identical to REF — the model has to learn to ignore the shared context and focus on the mutation. Instead I embed both REF and ALT, mean-pool each, and feed `(ALT − REF)` to the head. This isolates the mutation signal by construction. The head no longer needs to learn "ignore the shared context" because the shared context cancels out in the subtraction.

**Chromosome-level split.** Variant-level random splits are the default and they're wrong here. Variants on the same gene are correlated through shared regulatory context and linkage disequilibrium, so a random split leaks information from train into test. Splitting by chromosome (chr1–16 train, chr17 val, chr18–22+X test) guarantees the test set shares zero sequence with training. AUROC on this split is the honest number.

**Class imbalance via `pos_weight`, not resampling.** 31% of the data is pathogenic. I use `BCEWithLogitsLoss(pos_weight=2.0)` instead of oversampling, because oversampling inflates the dataset with duplicates and makes every epoch longer without adding information. Weighted loss is the cleaner lever. AUROC as the eval metric because it's threshold-independent — I don't want to commit to an operating point yet.

## Interpretability decisions

**Integrated Gradients, not attention.** Attention weights are a famous bad explanation: they tell you where the model looked, not what changed the prediction. Integrated Gradients satisfies the *completeness* axiom — attributions sum to the difference between the model's output on the input and on a baseline. That's a property you can check, which matters when "explanation" is the whole selling point.

**Zero baseline in embedding space, 50 steps.** IG requires a baseline — a neutral input that the real input is compared against. For text/sequence models the standard choice is a zero-embedding baseline, which represents "no information." 50 integration steps is the empirical sweet spot between numerical accuracy and runtime; more steps doesn't change the attributions visibly.

**Gradient flow through a frozen encoder.** The encoder is set to `eval()` and runs inside `torch.no_grad` during normal training. Integrated Gradients needs gradients through the encoder, so I wrote a thin `_EmbeddingToLogit` wrapper that re-enables gradient flow just for the interpretability path without affecting training. Small detail, but it's the kind of thing that's easy to silently get wrong — if gradients don't actually flow, IG returns garbage and there's no error.

## Future decisions: verification

Rigor in ML is less about what you did and more about what you can *prove*. The things I still owe the project:

- **Calibration plot.** A reliability diagram is the single cheapest honest-check I can do. If the model outputs 0.82 but is right 60% of the time on examples it scores 0.82, the probability is meaningless and I should say so. Until I've plotted this, I don't know.
- **Baseline comparison.** CADD and phyloP have been the standard for a decade. The interesting claim is not "my model gets 0.82" — it's "my model beats CADD by X." Without the bar chart, the number is a floating point value with no semantic weight.
- **Attribution sanity check.** I claim the model learned biology; I haven't shown it. The cleanest proof is to pick a known splice-site variant and show that IG puts the mass on the GT/AG dinucleotide. If it doesn't, something is wrong with either the model or my IG wrapper and I need to know which.

## Future decisions: reproducibility

- **Chromosome split is a reproducibility decision, not just a statistical one.** Anyone who runs the pipeline gets the same 63,014 test variants. No random seed dependency.
- **Checkpoint every epoch, save optimizer state.** I lost three epochs to a Colab disconnect on the first run because I was only saving the best checkpoint. Now every epoch writes `latest.pth` with `head_state_dict + optimizer_state + epoch + val_auroc` and the training loop auto-resumes. Resumability is reproducibility in disguise — you can't reproduce a run you couldn't finish.
- **Pinned dependencies.** `transformers<4.45` because NT-v2's tokenizer broke on 4.45+. Without the pin, anyone cloning the repo six months from now gets a silent incompatibility. Pinning looks lazy and actually isn't.
- **Model card as provenance.** The `/model` page documents every number I report: training data source, split strategy, architecture, loss, optimizer, hardware, selection criterion. Not because it's nice to look at — because six months from now I won't remember, and neither will anyone reading the repo.

## Future decisions: ease of understanding

This is the dimension I under-weighted for the first four days and course-corrected on today.

- **Real held-out test examples, not placeholders.** The dashboard used to ship with four disabled example buttons with empty sequences. Now it loads real variants pulled from `test.parquet`, and the prediction result shows a "✓ Correct / ✗ Incorrect — ground truth: X" banner. A reader can click one button, see the model be right on a variant it's never seen, and walk away believing the model — without running anything, without reading the README, without trusting me. This is the highest-leverage change in the project by a wide margin.
- **Per-token heatmap, not a number.** A single probability is useless as an explanation. A heatmap over the tokenized ALT sequence, with mass concentrated on the tokens that drove the prediction, is a thing a non-ML biologist can look at and form an opinion about. Interpretability is only useful if the output is legible to the person who needs to act on it.
- **Honest limitations in the model card.** Six bullet points the model can't do: ancestry bias, single-nucleotide only, 1001bp context window, ClinVar label noise, calibration not verified, not validated against functional assays. Writing this section was uncomfortable because it's the part where you stop selling. But it's also the part that tells a health tech reader "this person will not ship a biased clinical model without noticing."

## The thing I'm figuring out

Most ML portfolio projects are *models*. The decision-making is buried — you have to read the code and reverse-engineer the *why*. I think the better portfolio project is one where the decisions are surfaced: the ML choices, the interpretability choices, the verification plan, the reproducibility guarantees, the readability of the output. Not because it's more work, but because it's a different axis of work. A model with 0.82 AUROC and no documentation is indistinguishable from a model with 0.82 AUROC and a lucky split. The difference is what you can *show*.

The rest of the week is the verification bullets above. Calibration plot, CADD baseline, attribution sanity check. Once those land, the project stops being "I trained a thing" and starts being "I built an honest thing and proved it works."

---

*Next: finish training, run full test-set eval, plot calibration, compare against CADD, deploy to HF Spaces.*
