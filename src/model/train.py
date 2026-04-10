"""
Training loop for the variant effect classifier.

Trains the classification head (NT-v2 base stays frozen).
Uses BCEWithLogitsLoss with class weighting to handle the ~31/69 pathogenic/benign imbalance.
Evaluates AUROC on the validation set each epoch.
"""

import os
import sys

import torch
import torch.nn as nn
import wandb
from sklearn.metrics import roc_auc_score
from torch.utils.data import DataLoader

# Add project root to path so we can import from src/
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from src.data.dataset import create_dataloaders
from src.model.classifier import VariantClassifier

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu")
SAVE_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "checkpoints")


def train(epochs: int = 5, batch_size: int = 32, lr: float = 1e-3, pos_weight: float = 2.0) -> VariantClassifier:
    """
    Train the classifier.

    Args:
        epochs: number of training epochs
        batch_size: samples per batch
        lr: learning rate (only applied to the classification head)
        pos_weight: weight for pathogenic class in loss function (>1 upweights pathogenic
                    to compensate for class imbalance — ~31% pathogenic vs ~69% benign)
    """
    os.makedirs(SAVE_DIR, exist_ok=True)

    wandb.init(
        project="genomic-vep",
        config={"epochs": epochs, "batch_size": batch_size, "lr": lr, "pos_weight": pos_weight, "device": str(DEVICE)},
    )

    print(f"Device: {DEVICE}")
    print(f"Epochs: {epochs}, Batch size: {batch_size}, LR: {lr}, Pos weight: {pos_weight}")

    # Load data
    train_loader, val_loader, _ = create_dataloaders(batch_size=batch_size)

    # Create model — only the head is trainable
    model = VariantClassifier().to(DEVICE)

    # Only optimize the classification head parameters
    optimizer = torch.optim.Adam(model.head.parameters(), lr=lr)

    # Weighted loss to handle class imbalance
    criterion = nn.BCEWithLogitsLoss(pos_weight=torch.tensor([pos_weight], device=DEVICE))

    best_auroc = 0.0

    for epoch in range(1, epochs + 1):
        # --- Training ---
        model.train()
        total_loss = 0.0
        num_batches = 0

        for batch in train_loader:
            ref_ids = batch["ref_ids"].to(DEVICE)
            ref_mask = batch["ref_mask"].to(DEVICE)
            alt_ids = batch["alt_ids"].to(DEVICE)
            alt_mask = batch["alt_mask"].to(DEVICE)
            labels = batch["label"].to(DEVICE)

            logits = model(ref_ids, ref_mask, alt_ids, alt_mask)
            loss = criterion(logits, labels)

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

            total_loss += loss.item()
            num_batches += 1

            if num_batches % 100 == 0:
                print(f"  Epoch {epoch} | Batch {num_batches} | Loss: {loss.item():.4f}")
                wandb.log({"batch_loss": loss.item()})

        avg_loss = total_loss / num_batches

        # --- Validation ---
        val_auroc = evaluate(model, val_loader)

        wandb.log({"epoch": epoch, "train_loss": avg_loss, "val_auroc": val_auroc})
        print(f"Epoch {epoch}/{epochs} | Train loss: {avg_loss:.4f} | Val AUROC: {val_auroc:.4f}")

        # Save best model
        if val_auroc > best_auroc:
            best_auroc = val_auroc
            save_path = os.path.join(SAVE_DIR, "best_model.pth")
            torch.save(model.head.state_dict(), save_path)
            print(f"  Saved best model (AUROC: {best_auroc:.4f})")

    wandb.log({"best_val_auroc": best_auroc})
    wandb.finish()
    print(f"\nTraining complete. Best Val AUROC: {best_auroc:.4f}")
    return model


def evaluate(model: VariantClassifier, loader: DataLoader) -> float:
    """Evaluate model on a DataLoader, return AUROC."""
    model.eval()
    all_labels: list[float] = []
    all_probs: list[float] = []

    with torch.no_grad():
        for batch in loader:
            ref_ids = batch["ref_ids"].to(DEVICE)
            ref_mask = batch["ref_mask"].to(DEVICE)
            alt_ids = batch["alt_ids"].to(DEVICE)
            alt_mask = batch["alt_mask"].to(DEVICE)
            labels = batch["label"]

            logits = model(ref_ids, ref_mask, alt_ids, alt_mask)
            probs = torch.sigmoid(logits).cpu()

            all_labels.extend(labels.tolist())
            all_probs.extend(probs.tolist())

    return roc_auc_score(all_labels, all_probs)


if __name__ == "__main__":
    train()
