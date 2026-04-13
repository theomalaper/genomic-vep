"""
Run the trained classifier on the full test set and dump per-variant predictions.

Output: results/test_predictions.parquet with columns:
    chrom, pos, ref_allele, alt_allele, label, prob

Downstream scripts (calibration.py, cadd_baseline.py) read this parquet — no GPU needed.
"""

import argparse
import os
import sys

import pandas as pd
import torch
from torch.utils.data import DataLoader

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from src.data.dataset import VariantDataset
from src.model.classifier import VariantClassifier
from transformers import AutoTokenizer

MODEL_NAME = "InstaDeepAI/nucleotide-transformer-v2-50m-multi-species"
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")
RESULTS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "results")
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu")


def run_test(checkpoint_path: str, batch_size: int = 64) -> pd.DataFrame:
    print(f"Device: {DEVICE}")

    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)
    test_ds = VariantDataset("test", tokenizer=tokenizer)
    test_loader = DataLoader(test_ds, batch_size=batch_size, shuffle=False, num_workers=0)

    model = VariantClassifier().to(DEVICE)
    ckpt = torch.load(checkpoint_path, map_location=DEVICE, weights_only=False)
    model.head.load_state_dict(ckpt["head_state_dict"])
    model.eval()
    print(f"Loaded checkpoint: epoch {ckpt['epoch']}, val AUROC {ckpt['val_auroc']:.4f}")

    all_probs: list[float] = []
    all_labels: list[float] = []

    with torch.no_grad():
        for i, batch in enumerate(test_loader):
            logits = model(
                batch["ref_ids"].to(DEVICE), batch["ref_mask"].to(DEVICE),
                batch["alt_ids"].to(DEVICE), batch["alt_mask"].to(DEVICE),
            )
            probs = torch.sigmoid(logits).cpu().tolist()
            all_probs.extend(probs)
            all_labels.extend(batch["label"].tolist())

            if (i + 1) % 50 == 0:
                print(f"  batch {i + 1}/{len(test_loader)}")

    # test_loader was built with shuffle=False → row order matches test.parquet
    test_data = pd.read_parquet(os.path.join(DATA_DIR, "test.parquet"))
    assert len(test_data) == len(all_probs), f"length mismatch: {len(test_data)} vs {len(all_probs)}"

    out = pd.DataFrame({
        "chrom": test_data["chrom"].values,
        "pos": test_data["pos"].values,
        "ref_allele": test_data["ref_allele"].values,
        "alt_allele": test_data["alt_allele"].values,
        "label": all_labels,
        "prob": all_probs,
    })
    return out


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", type=str, required=True)
    parser.add_argument("--output", type=str, default=os.path.join(RESULTS_DIR, "test_predictions.parquet"))
    parser.add_argument("--batch-size", type=int, default=64)
    args = parser.parse_args()

    os.makedirs(RESULTS_DIR, exist_ok=True)
    df = run_test(args.checkpoint, batch_size=args.batch_size)
    df.to_parquet(args.output, index=False)
    print(f"\nSaved {len(df)} predictions to {args.output}")
    print(f"Pathogenic rate: {df['label'].mean():.3f}")
    print(f"Mean predicted prob: {df['prob'].mean():.3f}")
