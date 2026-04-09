"""Tests for the variant dataset and dataloaders."""

import torch
from transformers import AutoTokenizer

from src.data.dataset import MODEL_NAME, VariantDataset, create_dataloaders

BATCH_SIZE = 4


def get_tokenizer() -> AutoTokenizer:
    return AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)


def test_dataset_loads_all_splits():
    """Each split should load without errors and have samples."""
    tokenizer = get_tokenizer()
    for split in ["train", "val", "test"]:
        ds = VariantDataset(split, tokenizer=tokenizer)
        assert len(ds) > 0, f"{split} dataset is empty"


def test_sample_shape():
    """A single sample should have the expected keys and shapes."""
    tokenizer = get_tokenizer()
    ds = VariantDataset("val", tokenizer=tokenizer)
    sample = ds[0]

    assert set(sample.keys()) == {"ref_ids", "ref_mask", "alt_ids", "alt_mask", "label"}
    assert sample["ref_ids"].shape == (256,)
    assert sample["ref_mask"].shape == (256,)
    assert sample["alt_ids"].shape == (256,)
    assert sample["alt_mask"].shape == (256,)
    assert sample["label"].shape == ()


def test_label_values():
    """Labels should be 0.0 or 1.0."""
    tokenizer = get_tokenizer()
    ds = VariantDataset("val", tokenizer=tokenizer)
    for i in range(min(100, len(ds))):
        label = ds[i]["label"].item()
        assert label in (0.0, 1.0), f"Unexpected label: {label}"


def test_attention_mask_has_real_tokens():
    """Attention mask should have some 1s (real tokens) and some 0s (padding)."""
    tokenizer = get_tokenizer()
    ds = VariantDataset("val", tokenizer=tokenizer)
    mask = ds[0]["ref_mask"]
    assert mask.sum() > 0, "No real tokens in attention mask"
    assert mask.sum() < len(mask), "No padding — sequence may be too long"


def test_dataloader_batch_shape():
    """DataLoader should produce correctly shaped batches."""
    train_loader, _, _ = create_dataloaders(batch_size=BATCH_SIZE)
    batch = next(iter(train_loader))

    assert batch["ref_ids"].shape == (BATCH_SIZE, 256)
    assert batch["alt_ids"].shape == (BATCH_SIZE, 256)
    assert batch["label"].shape == (BATCH_SIZE,)


def test_ref_alt_differ_at_mutation():
    """Ref and alt token IDs should differ (the mutation changes at least one token)."""
    tokenizer = get_tokenizer()
    ds = VariantDataset("val", tokenizer=tokenizer)
    sample = ds[0]
    # They should not be identical — the alt has a different base at the center
    assert not torch.equal(sample["ref_ids"], sample["alt_ids"]), "Ref and alt sequences are identical"
