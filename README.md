# Genomic VEP

**Variant Effect Predictor with interpretability.** Fine-tunes the [Nucleotide Transformer v2](https://huggingface.co/InstaDeepAI/nucleotide-transformer-v2-50m-multi-species) genomic foundation model on [ClinVar](https://www.ncbi.nlm.nih.gov/clinvar/) to classify DNA variants as pathogenic or benign, then uses [Integrated Gradients](https://arxiv.org/abs/1703.01365) to show *which sequence tokens* drove each prediction.

Full stack: PyTorch training pipeline → FastAPI inference server → Next.js dashboard with per-token attribution heatmap.

> **Live demo:** _coming soon (HF Spaces)_ · **Model card:** [/model](frontend/src/app/model) · **Dev log:** [devlog.md](devlog.md)

---

## Why This Matters

Over 90% of disease-linked genetic variants sit in **non-coding DNA** — the part of the genome that doesn't code for proteins, and that classical variant effect tools struggle with. Pathogenicity classification for non-coding variants is an open problem, and one that genomic foundation models (NT-v2, Evo, HyenaDNA) were built to tackle.

This project is a minimal, end-to-end working example of that approach: load a pre-trained genomic LM, freeze its weights, train a small classification head on real ClinVar data, and expose the predictions through an interpretable web interface a non-specialist can use.

---

## Results

| Metric          | Value  | Notes                              |
| --------------- | ------ | ---------------------------------- |
| Test AUROC      | ~0.82  | N=63,014 held-out variants         |
| Test size       | 63,014 | Chromosome-split, no leakage       |
| Train size      | 264,241 | 31% pathogenic / 69% benign       |
| Trainable params | ~197k | Head only — encoder frozen         |
| Inference latency | ~250ms | Single variant, CPU (M1)          |

Metrics updated live from the trained checkpoint. See [`results/`](results/) for full eval output.

**Ground-truth verification:** the frontend ships with 4 real held-out test variants with their ClinVar labels, so you can see the model's prediction agree (or disagree) with the true label directly in the UI.

---

## Architecture

```
ClinVar variants ─┐
                  ├──▶ extract 1000bp ref/alt windows ──▶ train/val/test splits
GRCh38 genome ────┘                                             │
                                                                ▼
                              Nucleotide Transformer v2 (frozen, 50M params)
                                  │                        │
                             ref embedding            alt embedding
                                  │                        │
                                  └──── mean-pool, diff ────┘
                                              │
                                     Classification head (768 → 256 → 1)
                                              │
                                     pathogenic / benign + probability
                                              │
                             ┌────────────────┴────────────────┐
                             ▼                                 ▼
                Integrated Gradients                     FastAPI /predict
                  (per-token attribution)                        │
                             │                                   ▼
                             └──────────────────▶ Next.js dashboard
```

**Key design decisions:**

- **Frozen encoder.** Fine-tuning all 50M params on 264k samples overfits fast and costs a lot of GPU time. Freezing and training a small head (~197k params) gives better generalization and ~30× faster training.
- **Embedding difference (alt − ref).** Isolates the mutation signal from the background sequence context. Without it, the head mostly learns "what sequence class this is" rather than "what changed".
- **Mean pooling.** Hidden states per token → single 768-dim vector. Simple, strong baseline.
- **Integrated Gradients, not attention.** IG gives axiom-satisfying attributions that account for model nonlinearities; raw attention is noisy and not faithful to the prediction.
- **Chromosome-level split.** Prevents variant-level leakage between train and test — a common bug in naive ClinVar splits that inflates reported AUROC.

---

## Repo Layout

```
genomic-vep/
├── src/
│   ├── data/                  # ClinVar download, GRCh38 window extraction, PyTorch dataset
│   ├── model/
│   │   ├── classifier.py      # NT-v2 + frozen encoder + classification head
│   │   ├── train.py           # Full training loop with auto-resume
│   │   └── interpret.py       # Integrated Gradients via captum
│   └── api/
│       └── server.py          # FastAPI /predict endpoint
├── frontend/                  # Next.js 16 + Tailwind v4 dashboard
│   └── src/app/
│       ├── page.tsx           # Main predictor UI
│       └── components/
│           ├── AttributionHeatmap.tsx
│           ├── MetricsPanel.tsx
│           ├── PredictionResult.tsx
│           └── realExamples.ts   # 4 real held-out test variants
├── data/                      # gitignored — ClinVar VCF, GRCh38, parquet splits
├── notebooks/                 # Colab training notebook
├── results/                   # Metrics, screenshots, eval output
└── devlog.md                  # Daily build journal
```

---

## Quickstart

### Prerequisites

- Python 3.10+
- Node 18+
- 1 GPU for training (Colab T4/A100 works), CPU for inference
- HuggingFace account (free, for NT-v2 access)

### Install

```bash
git clone https://github.com/theomalaper/genomic-vep.git
cd genomic-vep
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

### Data prep

```bash
python src/data/download_clinvar.py     # ~80MB
python src/data/download_reference.py   # ~1GB (GRCh38)
python src/data/prepare_dataset.py      # → data/{train,val,test}.parquet
```

### Train

Use `notebooks/train_colab.ipynb` on Colab (auto-resumes from `latest.pth` / `best.pth`). Local training:

```bash
python src/model/train.py
```

### Serve

```bash
# Backend
uvicorn src.api.server:app --reload --port 8000

# Frontend
cd frontend && npm install && npm run dev
```

Open `http://localhost:3000`, click a quick example, hit predict.

---

## Tech Stack

| Layer              | Tools                                                        |
| ------------------ | ------------------------------------------------------------ |
| Pretrained model   | Nucleotide Transformer v2 50M (HuggingFace, InstaDeepAI)     |
| Data               | ClinVar (NCBI) + GRCh38 reference genome                     |
| Training           | PyTorch, HuggingFace Transformers, Weights & Biases          |
| Interpretability   | captum (Integrated Gradients)                                |
| Backend            | FastAPI, Uvicorn                                             |
| Frontend           | Next.js 16, React 19, Tailwind CSS v4                        |

---

## Limitations

- Trained on ClinVar, which overrepresents European-ancestry variants and well-studied genes. Performance on underrepresented populations and novel genes is likely worse.
- Single-nucleotide substitutions only; no indels, CNVs, or structural variants.
- 1001bp context window centered on the variant; deeper intronic and long-range regulatory effects are partially out of scope.
- Not validated against functional assays (MPRA, CRISPR screens).
- **Not for clinical use** — research and educational purposes only.

See the [model card](frontend/src/app/model) for full documentation.

---

## Context

Part of a health-tech-focused ML portfolio alongside [dermSAM](https://github.com/theomalaper/dermSAM) (medical image segmentation). Together they cover vision and sequence modeling, two of the dominant modalities in biomedical AI.

## License

MIT
