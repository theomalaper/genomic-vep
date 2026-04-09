"""
PyTorch Dataset for variant effect prediction.

Loads parquet files from prepare_dataset.py and tokenizes DNA sequences
using Nucleotide Transformer's tokenizer (6-mer tokenization).

Each sample returns:
- ref_ids, ref_mask: tokenized reference sequence
- alt_ids, alt_mask: tokenized alternate sequence
- label: 1 = pathogenic, 0 = benign
"""

import os

import pandas as pd
import torch
from torch.utils.data import DataLoader, Dataset
from transformers import AutoTokenizer, PreTrainedTokenizerBase

# InstaDeep's Nucleotide Transformer v2 (50M params — smallest, fast to fine-tune)
MODEL_NAME = "InstaDeepAI/nucleotide-transformer-v2-50m-multi-species"
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")


class VariantDataset(Dataset):
    """Dataset that tokenizes ref/alt DNA sequences for variant classification."""

    def __init__(self, split_type: str, tokenizer: PreTrainedTokenizerBase, max_length: int = 256) -> None:
        """
        Args:
            split: one of "train", "val", "test"
            tokenizer: HuggingFace tokenizer (shared across splits to avoid reloading)
            max_length: max token length (1001bp / 6 bases per token = ~167, pad to 256)
        """

        parquet_path = os.path.join(DATA_DIR, f"{split_type}.parquet")
        self.df = pd.read_parquet(parquet_path)
        self.tokenizer = tokenizer
        self.max_length = max_length

        print(f"Loaded {split_type}: {len(self.df)} samples")

    def __len__(self) -> int:
        return len(self.df)

    def __getitem__(self, idx: int) -> dict[str, torch.Tensor]:
        row = self.df.iloc[idx]

        ref_tokens = self.tokenizer(
            row["ref_seq"],
            padding="max_length",
            truncation=True,
            max_length=self.max_length,
            return_tensors="pt",
        )
        alt_tokens = self.tokenizer(
            row["alt_seq"],
            padding="max_length",
            truncation=True,
            max_length=self.max_length,
            return_tensors="pt",
        )

        return {
            "ref_ids": ref_tokens["input_ids"].squeeze(0),
            "ref_mask": ref_tokens["attention_mask"].squeeze(0),
            "alt_ids": alt_tokens["input_ids"].squeeze(0),
            "alt_mask": alt_tokens["attention_mask"].squeeze(0),
            "label": torch.tensor(row["label"], dtype=torch.float32),
        }


def create_dataloaders(batch_size: int = 32, num_workers: int = 0) -> tuple[DataLoader, DataLoader, DataLoader]:
    """Create train/val/test DataLoaders with a shared tokenizer."""
    print(f"Loading tokenizer from {MODEL_NAME}...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)
    print(f"Tokenizer loaded (vocab size: {tokenizer.vocab_size})")

    train_ds = VariantDataset("train", tokenizer=tokenizer)
    val_ds = VariantDataset("val", tokenizer=tokenizer)
    test_ds = VariantDataset("test", tokenizer=tokenizer)

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, num_workers=num_workers)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False, num_workers=num_workers)
    test_loader = DataLoader(test_ds, batch_size=batch_size, shuffle=False, num_workers=num_workers)

    return train_loader, val_loader, test_loader


if __name__ == "__main__":
    print("=== Dataset Test ===\n")

    train_loader, val_loader, test_loader = create_dataloaders(batch_size=4)

    print("\nFetching first batch...")
    batch = next(iter(train_loader))

    print("\nBatch shapes:")
    print(f"  ref_ids:      {batch['ref_ids'].shape}")
    print(f"  ref_mask:     {batch['ref_mask'].shape}")
    print(f"  alt_ids:      {batch['alt_ids'].shape}")
    print(f"  alt_mask:     {batch['alt_mask'].shape}")
    print(f"  labels:       {batch['label'].shape}")

    print(f"\nSample token IDs (first 10): {batch['ref_ids'][0][:10].tolist()}")
    print(f"Sample attention mask:        {batch['ref_mask'][0][:10].tolist()}")
    print(f"Sample labels:                {batch['label'].tolist()}")

    print("\nDataLoader sizes:")
    print(f"  Train: {len(train_loader)} batches")
    print(f"  Val:   {len(val_loader)} batches")
    print(f"  Test:  {len(test_loader)} batches")

    print("\n=== Test passed ===")
