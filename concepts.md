# Concepts Guide — autoresearch-genome

This file explains every concept you'll encounter while building this project. Read each section when the TODO references it (marked with 📖). These are written for someone who is new to genomics + ML — no jargon without explanation.

---

## Section 1 — The Data (Day 1)

*Read this before starting the data pipeline.*

### What is ClinVar?

ClinVar is a free public database run by the NIH. Doctors and labs around the world submit genetic variants they've found in patients, along with whether those variants are:
- **Pathogenic** — causes or contributes to disease
- **Benign** — harmless, normal human variation
- **Uncertain significance** — not enough evidence either way (we skip these)

Think of it as a giant spreadsheet: "at position X on chromosome Y, if you have a G instead of an A, it causes cystic fibrosis."

### What is a VCF file?

VCF (Variant Call Format) is the standard file format for storing genetic variants. Each line describes one variant:

```
#CHROM  POS     REF  ALT  ...
chr17   7674220 G    A    ...
```

This says: on chromosome 17, at position 7,674,220, the reference genome has a G, but this patient has an A. That's the variant.

### What is a reference genome?

The "reference genome" (GRCh38) is a consensus human genome — a single standardized DNA sequence that represents "typical" human DNA. It's ~3 billion letters long.

When we say a patient has a "variant at chr17:7674220 G>A", we mean: at that position, the reference genome has G, but this patient has A.

We need the reference genome to extract the DNA *context* around each variant — the surrounding bases that the model will look at.

### What are chromosomes?

Your DNA is organized into 23 pairs of chromosomes (chr1 through chr22 + chrX/chrY). They're just long stretches of DNA, ranging from ~50 million to ~250 million base pairs each.

We split our data by chromosome (not randomly) so that nearby variants don't leak between train and test sets. More on this in Section 2.

---

## Section 2 — Data Splitting (Day 2)

*Read this before splitting your dataset.*

### Why split by chromosome?

If variant A is at position 1,000 on chr17 and variant B is at position 1,050 on chr17, their DNA windows overlap almost completely. If A goes in training and B goes in testing, the model has essentially "seen" the test data. This is called **data leakage**.

By putting entire chromosomes into train vs test, we guarantee no overlap.

### What is data leakage?

Data leakage is when information from the test set accidentally gets into training. The model appears to perform well but actually just memorized the training data. In clinical AI this is especially dangerous — a model that looks great in testing but fails on real patients.

### How we split:
- **Train:** chr1–16 (most chromosomes, most variants)
- **Validation:** chr17 (tune hyperparameters against this)
- **Test:** chr18–22 (final evaluation, touch only once)

---

## Section 3 — Tokenization & Embeddings (Day 3)

*Read this before tokenizing sequences.*

### What is a tokenizer?

A tokenizer converts raw text (or DNA) into numbers that a model can process. For English text, "hello world" might become `[15496, 995]`. For DNA, the NT-v2 tokenizer converts sequences into token IDs.

NT-v2 uses **6-mer tokenization** — it reads DNA in chunks of 6 letters at a time. So `ATCGGA` is one token, `TTACGC` is another. The vocabulary has 4,096 possible 6-mers (4^6).

### What are embeddings?

Once DNA is tokenized, each token gets converted into a **vector** (a list of numbers, like `[0.23, -0.41, 0.87, ...]`). These vectors are called embeddings.

The magic: NT-v2 was pre-trained on billions of DNA sequences, so its embeddings already encode meaningful information about DNA. A token that appears in a promoter region will have a different embedding than the same token in junk DNA — because the model learned from context.

### Why use a transformer instead of classifying raw sequences directly?

You could skip the transformer and classify raw DNA directly — one-hot encode each base (A=1000, C=0100, etc.) and feed it to a simple neural network. But this performs poorly because:

1. **No context:** Each base is treated independently. The model has to learn from scratch that `GT-AG` at certain positions signals a splice site, that `TATAAA` is a promoter motif, etc.
2. **Not enough data:** With only 350k labeled variants, a model can't discover all the complex patterns that determine pathogenicity.

The transformer solves this because it was pre-trained (unsupervised) on billions of DNA sequences. It already knows what "normal" DNA looks like — splice sites, conserved regions, regulatory motifs. The embedding doesn't just say "this is a G" — it says "this is a G that's part of a conserved splice donor site near an exon boundary." All that biological context comes for free, and we just train a small classifier on top.

### How tokenization works in code

The tokenizer takes a 1001bp DNA string and returns two things:
- **input_ids** — integer IDs for each 6-mer chunk, e.g. `[CLS, 1247, 3891, ..., PAD, PAD]`
- **attention_mask** — `[1, 1, 1, ..., 0, 0]` (1 = real token, 0 = padding to ignore)

We pad all sequences to 256 tokens (nearest power-of-2 above ~167 tokens). GPUs are optimized for power-of-2 dimensions, and all tensors in a batch must be the same length.

### From token IDs to embeddings

Each token ID individually maps to its own 768-dimensional embedding vector. A sequence of 167 tokens produces 167 separate embeddings — shape `(167, 768)`.

These per-token embeddings are then **mean-pooled** (averaged) into a single 768-dim vector representing the whole sequence. This is what gets fed to the classification head.

### Pre-training vs fine-tuning: who does what?

- **Pre-training (InstaDeep, not us):** Unsupervised. The model read billions of DNA sequences and learned to predict masked bases (fill-in-the-blank). It has no idea what "pathogenic" means — it just learned what DNA normally looks like.
- **Fine-tuning (us):** Supervised. We add a classification head, provide ClinVar labels, and train it to map embeddings → pathogenic/benign. The base model's DNA knowledge is frozen; we only train the small head on top.

### What is a Dataset and DataLoader?

A **Dataset** defines how to access one sample — load a row from the parquet file, tokenize the ref and alt sequences, return tensors.

A **DataLoader** wraps the Dataset and handles batching:
1. Groups samples together (e.g. 32 at a time) so the GPU processes them in parallel
2. Shuffles training data each epoch so the model doesn't memorize ordering (val/test stay unshuffled for reproducible evaluation)
3. Provides an iterator for the training loop: `for batch in train_loader:`

---

## Section 4 — Fine-Tuning (Day 4)

*Read this before fine-tuning NT-v2.*

### What is fine-tuning?

Fine-tuning takes a pre-trained model (which already understands DNA in general) and trains it a little bit more on your specific task (variant effect prediction).

Analogy: a doctor who went to medical school (pre-training) then specializes in cardiology (fine-tuning). Medical school gave them general knowledge; the specialization makes them useful for a specific job.

### Why freeze the base model?

NT-v2 has ~50 million parameters that took huge compute to train. If you update all of them on your small dataset (~50k variants), two bad things happen:
1. It takes forever
2. The model "forgets" its general DNA knowledge (catastrophic forgetting)

Instead, you **freeze** the base (don't update those weights) and only train a small classification head on top. The base gives you rich embeddings; the head learns to classify them.

### What is a classification head?

It's a small neural network (usually just 1-2 linear layers) that sits on top of the frozen base model:

```
DNA sequence
    ↓
[NT-v2 base model — frozen, produces embeddings]
    ↓
[Classification head — trainable]
    ↓
Pathogenic or Benign (with confidence score)
```

### The input strategy: ref vs alt embeddings

For each variant, we:
1. Feed the **reference** sequence (normal DNA) through NT-v2 → get embedding_ref
2. Feed the **alternate** sequence (mutated DNA) through NT-v2 → get embedding_alt
3. Compute the **difference**: embedding_alt - embedding_ref
4. Feed that difference into the classification head

The difference vector captures "what changed" when the mutation was introduced. If the embeddings barely change, the variant probably doesn't matter. If they shift dramatically, it probably disrupts something important.

---

## Section 5 — Evaluation (Day 5)

*Read this before evaluating your model.*

### What is AUROC?

AUROC (Area Under the Receiver Operating Characteristic curve) measures how well your model separates pathogenic from benign variants, across all possible confidence thresholds.

- **AUROC = 1.0** — perfect separation
- **AUROC = 0.5** — random guessing
- **AUROC > 0.85** — good for this task
- **AUROC > 0.90** — very good

### Why AUROC instead of accuracy?

Your dataset is probably imbalanced — more benign variants than pathogenic. If 80% of variants are benign, a model that always says "benign" gets 80% accuracy but is completely useless.

AUROC doesn't have this problem. It evaluates the model's ranking ability: does it assign higher confidence to truly pathogenic variants than to benign ones?

### What is a ROC curve?

Plot the true positive rate (how many real pathogenic variants you catch) vs false positive rate (how many benign variants you incorrectly flag) at every threshold. The resulting curve shows the trade-off. The area under it is AUROC.

### What is a confusion matrix?

A 2x2 grid showing:
```
                 Predicted Benign  Predicted Pathogenic
Actually Benign      True Neg         False Pos
Actually Pathogenic  False Neg        True Pos
```

Tells you where the model makes mistakes. In clinical context, false negatives (missing a pathogenic variant) are worse than false positives (flagging a benign one).

---

## Section 6 — Interpretability (Day 6)

*Read this before implementing interpretability.*

### Why interpretability matters

A model that says "this variant is pathogenic, 94% confidence" is useful. A model that says "this variant is pathogenic, 94% confidence, **because these 5 bases near the mutation are part of a splice site**" is 10x more useful. Clinicians need to understand *why* to trust the prediction.

### What are integrated gradients?

A method to assign an "importance score" to each input feature (each DNA base). The idea:

1. Start with a "blank" input (all zeros)
2. Gradually interpolate toward the real input
3. At each step, compute the gradient (how much does changing this base affect the output?)
4. Average those gradients across all steps

The result: a number for each base in the sequence. High number = this base strongly influenced the prediction. You visualize this as a color map over the DNA sequence.

### What is the `captum` library?

A PyTorch library by Meta that implements integrated gradients (and other interpretability methods) in a few lines of code. You don't need to implement the math yourself — just call `IntegratedGradients(model)` and pass in your input.

### What to look for

When you run interpretability on known pathogenic variants, check:
- Do the high-importance bases overlap with known functional elements (splice sites, promoter motifs)?
- Is the variant itself highlighted, or is it the surrounding context?
- Do benign variants show low attribution scores overall?

If yes, your model learned something biologically real — not just a statistical shortcut.

---

## Section 7 — autoresearch (Day 10)

*Read this before starting Part 2.*

### How does autoresearch work?

It's a loop:

```
1. AI agent reads train.py (or in our case, the fine-tuning script)
2. Agent proposes a change ("try a lower learning rate")
3. Agent patches the code
4. Code runs for a fixed time (5 minutes)
5. Evaluate: did val_bpb improve? (for us: did AUROC improve?)
6. If yes → keep the change (git commit)
   If no → revert (git checkout)
7. Go to step 1
```

The agent is Claude — it reads the code, reasons about what might help, and tries it. Over an overnight run (~90 experiments), it discovers optimizations that a human might take weeks to find.

### What will the agent optimize?

For our variant effect predictor, the agent can try:
- Different learning rates
- Different classification head architectures (bigger/smaller, dropout, etc.)
- Unfreezing some layers of NT-v2 (partial fine-tuning)
- Different embedding comparison strategies (subtraction vs concatenation vs attention)
- Different sequence window sizes (500bp vs 1000bp vs 2000bp)
- Data augmentation (reverse complement sequences)

### What is program.md?

A markdown file that instructs the agent. It tells Claude:
- What the task is
- What file it can modify
- What metric to optimize (AUROC on validation set)
- What constraints to follow (don't exceed 5 min per run, don't change the data, etc.)

Think of it as a job description for the AI researcher.

---

## Section 8 — Dashboard Architecture (Days 7–8, 13)

*Read this when building the frontend.*

### Why FastAPI + Next.js?

FastAPI (Python) serves the model — it loads the trained model and runs inference when you submit a variant. Next.js (React) is the frontend — it renders the UI and talks to FastAPI.

Why not just one? The model runs in Python/PyTorch. The UI runs in JavaScript/React. FastAPI bridges them with a REST API.

### What is a WebSocket?

A normal HTTP request is one-shot: browser asks, server responds, done. A WebSocket is a persistent connection — the server can push data to the browser whenever it wants. This is how the autoresearch dashboard shows real-time updates without the browser constantly polling.

### The flow for Part 1 (simple):
```
User inputs variant → Next.js → POST /api/predict → FastAPI → model → prediction + attributions → Next.js → renders result
```

### The flow for Part 2 (real-time):
```
autoresearch loop writes logs → watcher.py detects changes → server.py broadcasts over WebSocket → Next.js renders live updates
```

---

*This file will be updated with more concepts as we encounter them during the build.*
