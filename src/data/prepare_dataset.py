"""
Prepare the final dataset for model training.

For each ClinVar variant, this script:
1. Extracts a DNA window (default 1000bp) centered on the variant from the reference genome
2. Creates a 'ref' version (normal) and an 'alt' version (with the mutation swapped in)
3. Splits by chromosome to prevent data leakage
4. Saves as parquet files: train.parquet, val.parquet, test.parquet

Why split by chromosome?
    If two variants are close together on the same chromosome, their DNA windows overlap.
    If one goes in train and the other in test, the model has essentially 'seen' the test data.
    Splitting by chromosome guarantees zero overlap between train/val/test.
"""

import os
import csv

import pysam
import pandas as pd

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")
CLINVAR_CSV = os.path.join(DATA_DIR, "clinvar_variants.csv")
REFERENCE_PATH = os.path.join(DATA_DIR, "hg38.fa.gz")

# How much DNA context to include on each side of the variant
WINDOW_SIZE = 500  # 500 on each side = 1000bp total + 1 for the variant itself

# Chromosome splits — no overlap between train/val/test
TRAIN_CHROMS = {str(i) for i in range(1, 17)}       # chr1-16
VAL_CHROMS = {"17"}                                   # chr17
TEST_CHROMS = {str(i) for i in range(18, 23)} | {"X"} # chr18-22 + X


def load_variants():
    """Load parsed ClinVar variants from CSV."""
    variants = []
    with open(CLINVAR_CSV, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            row["pos"] = int(row["pos"])
            row["label"] = int(row["label"])
            variants.append(row)
    print(f"Loaded {len(variants)} variants from {CLINVAR_CSV}")
    return variants


def extract_windows(variants):
    """
    Extract DNA windows around each variant from the reference genome.

    For each variant at chromosome C, position P:
    - Pull bases from P-500 to P+500 from the reference genome
    - The base at position P should match the 'ref' allele (sanity check)
    - Create the 'alt' sequence by swapping in the alternate allele at the center

    Returns a list of dicts with: chrom, pos, ref, alt, label, ref_seq, alt_seq
    """
    print("Opening reference genome...")
    ref_genome = pysam.FastaFile(REFERENCE_PATH)

    # Check which chromosome naming convention the reference uses
    # UCSC uses "chr1", ClinVar uses "1" — we need to handle both
    ref_chroms = set(ref_genome.references)
    uses_chr_prefix = "chr1" in ref_chroms

    records = []
    skipped = 0

    for i, var in enumerate(variants):
        if i % 5000 == 0 and i > 0:
            print(f"  Processed {i}/{len(variants)} variants...")

        chrom = var["chrom"]
        pos = var["pos"]

        # Convert to reference genome's naming convention
        ref_chrom = f"chr{chrom}" if uses_chr_prefix else chrom

        # Check chromosome exists in reference
        if ref_chrom not in ref_chroms:
            skipped += 1
            continue

        chrom_length = ref_genome.get_reference_length(ref_chrom)

        # Calculate window boundaries
        # pos is 1-based in VCF, pysam uses 0-based
        center = pos - 1  # convert to 0-based
        start = center - WINDOW_SIZE
        end = center + WINDOW_SIZE + 1  # +1 to include the variant base

        # Skip if too close to chromosome edges
        if start < 0 or end > chrom_length:
            skipped += 1
            continue

        # Extract the reference sequence
        ref_seq = ref_genome.fetch(ref_chrom, start, end).upper()

        # Sanity check: the base at the center should match the ref allele
        center_idx = WINDOW_SIZE  # index of the variant in the window
        if ref_seq[center_idx] != var["ref"]:
            skipped += 1
            continue

        # Create the alternate sequence by swapping the variant base
        alt_seq = ref_seq[:center_idx] + var["alt"] + ref_seq[center_idx + 1:]

        records.append({
            "chrom": chrom,
            "pos": pos,
            "ref_allele": var["ref"],
            "alt_allele": var["alt"],
            "label": var["label"],
            "ref_seq": ref_seq,
            "alt_seq": alt_seq,
        })

    ref_genome.close()

    print(f"Extracted {len(records)} windows, skipped {skipped} variants")
    return records


def split_and_save(records):
    """Split records by chromosome and save as parquet files."""
    df = pd.DataFrame(records)

    train = df[df["chrom"].isin(TRAIN_CHROMS)]
    val = df[df["chrom"].isin(VAL_CHROMS)]
    test = df[df["chrom"].isin(TEST_CHROMS)]

    print(f"\nSplit sizes:")
    print(f"  Train: {len(train)} ({train['label'].mean():.1%} pathogenic)")
    print(f"  Val:   {len(val)} ({val['label'].mean():.1%} pathogenic)")
    print(f"  Test:  {len(test)} ({test['label'].mean():.1%} pathogenic)")

    train.to_parquet(os.path.join(DATA_DIR, "train.parquet"), index=False)
    val.to_parquet(os.path.join(DATA_DIR, "val.parquet"), index=False)
    test.to_parquet(os.path.join(DATA_DIR, "test.parquet"), index=False)

    print(f"\nSaved to {DATA_DIR}/{{train,val,test}}.parquet")


if __name__ == "__main__":
    variants = load_variants()
    records = extract_windows(variants)
    split_and_save(records)
