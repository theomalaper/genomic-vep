# genomic-vep

A non-coding variant effect predictor that fine-tunes [Nucleotide Transformer v2](https://huggingface.co/InstaDeepAI/nucleotide-transformer-v2-50m-multi-species) on [ClinVar](https://www.ncbi.nlm.nih.gov/clinvar/) data to predict whether DNA variants are pathogenic or benign — with interpretability showing *which sequence features* drive each prediction.

Part 2 wraps the fine-tuning pipeline with [Karpathy's autoresearch](https://github.com/karpathy/autoresearch) loop, enabling autonomous overnight optimization of the model.

## Why This Matters

Over 90% of disease-linked genetic variants are in **non-coding DNA** — the vast majority of the genome that doesn't directly code for proteins. For most of these variants, we don't know if they're harmful or harmless. This project tackles that problem using a genomic foundation model with explainable predictions.

## Architecture

```
ClinVar (labeled variants) + GRCh38 (reference genome)
        |
        v
  Data pipeline (extract 1000bp DNA windows around each variant)
        |
        v
  Nucleotide Transformer v2 (pre-trained, frozen)
  Encodes ref sequence and alt sequence into embeddings
        |
        v
  Classification head (trainable)
  Embedding difference → pathogenic / benign prediction
        |
        v
  Interpretability (integrated gradients)
  Per-base attribution scores → which bases drove the prediction
        |
        v
  Dashboard (Next.js)
  Input a variant → see prediction + confidence + sequence attribution heatmap
```

## Results

*Coming soon — model training in progress.*

<!-- After training, add:
- AUROC score
- Example predictions with interpretability visualizations
- Screenshot of the dashboard
-->

## Setup

### Prerequisites
- Python 3.10+
- Node.js 18+ (for the dashboard)
- HuggingFace account (free, for model access)

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/genomic-vep.git
cd genomic-vep
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Data Preparation

```bash
# Download ClinVar variants (~80MB)
python src/data/download_clinvar.py

# Download reference genome (~1GB)
python src/data/download_reference.py

# Extract DNA windows and split into train/val/test
python src/data/prepare_dataset.py
```

### Training

```bash
# Fine-tune NT-v2 on the variant dataset (requires GPU — use Colab or similar)
python src/model/train.py
```

### Dashboard

```bash
cd frontend
npm install
npm run dev
```

## Project Structure

```
genomic-vep/
├── src/
│   ├── data/
│   │   ├── download_clinvar.py      # Download + parse ClinVar VCF
│   │   ├── download_reference.py    # Download GRCh38 reference genome
│   │   └── prepare_dataset.py       # Extract DNA windows, split by chromosome
│   ├── model/
│   │   ├── dataset.py               # PyTorch Dataset class
│   │   ├── classifier.py            # NT-v2 + classification head
│   │   ├── train.py                 # Fine-tuning script
│   │   └── evaluate.py              # Metrics + plots
│   └── interpret/
│       └── attributions.py          # Integrated gradients
├── autoresearch-dash/               # Part 2: autoresearch wrapper
│   ├── server.py
│   ├── watcher.py
│   └── agent_runner.py
├── frontend/                        # Next.js dashboard
├── results/                         # Committed results + screenshots
├── data/                            # gitignored — downloaded data files
├── TODO.md                          # Build checklist
├── concepts.md                      # Learning guide for genomic ML concepts
├── devlog.md                        # Daily build journal
└── requirements.txt
```

## Tech Stack

| Layer | Tools |
|---|---|
| Pre-trained model | Nucleotide Transformer v2 50M (HuggingFace) |
| Data | ClinVar, GRCh38 reference genome |
| Training | PyTorch, HuggingFace Transformers |
| Interpretability | captum (integrated gradients) |
| Backend | FastAPI |
| Frontend | Next.js 14, Tailwind CSS, Recharts |
| Autonomous optimization | Karpathy's autoresearch (Part 2) |

## Context

This project complements [dermSAM](https://github.com/YOUR_USERNAME/dermSAM) (medical image segmentation) as part of a portfolio targeting health tech startups. Together they cover two different modalities — computer vision and genomic sequence modeling — demonstrating versatility across the biomedical AI stack.

## Dev Log

See [devlog.md](devlog.md) for a daily journal of the build process.

## License

MIT
