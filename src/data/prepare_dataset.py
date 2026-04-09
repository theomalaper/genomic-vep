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

import csv
import os

import pandas as pd
import pysam

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")
CLINVAR_CSV = os.path.join(DATA_DIR, "clinvar_variants.csv")
REFERENCE_PATH = os.path.join(DATA_DIR, "hg38.bgz")

# 500bp captures nearby regulatory elements (promoters, splice sites, enhancers)
# that determine whether a mutation is harmful. 1001bp total fits well within
# Nucleotide Transformer's input limit (~6000 tokens at 6 bases/token = ~167 tokens).
DNA_WINDOW_SIZE = 500  # 500 on each side = 1001bp total (500 + variant + 500)
TRAIN_CHROMOSOMES = {str(chrom) for chrom in range(1, 17)}
VAL_CHROMOSOMES = {"17"}
TEST_CHROMOSOMES = {str(chrom) for chrom in range(18, 23)} | {"X"}


def load_variants():
    """Load parsed ClinVar variants from CSV."""
    variants = []

    with open(CLINVAR_CSV, "r") as variant_file:
        reader = csv.DictReader(variant_file)
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
    reference_genome = pysam.FastaFile(REFERENCE_PATH)

    # Check which chromosome naming convention the reference uses
    # UCSC uses "chr1", ClinVar uses "1" — we need to handle both
    ref_chroms = set(reference_genome.references)
    uses_chr_prefix = "chr1" in ref_chroms

    records = []
    skipped = 0

    for index, variant in enumerate(variants):
        if index % 50000 == 0 and index > 0:
            print(f"  Processed {index}/{len(variants)} variants...")

        chrom = variant["chrom"]
        pos = variant["pos"]
        ref_chrom = f"chr{chrom}" if uses_chr_prefix else chrom

        if ref_chrom not in ref_chroms:
            skipped += 1
            continue

        chrom_length = reference_genome.get_reference_length(ref_chrom)

        # Calculate window boundaries
        # pos is 1-based in VCF, pysam uses 0-based
        dna_sequence_center = pos - 1  # convert to 0-based
        dna_sequence_start = dna_sequence_center - DNA_WINDOW_SIZE
        dna_sequence_end = dna_sequence_center + DNA_WINDOW_SIZE + 1  # +1 to include the variant base

        if dna_sequence_start < 0 or dna_sequence_end > chrom_length:
            skipped += 1
            continue

        ref_seq = reference_genome.fetch(ref_chrom, dna_sequence_start, dna_sequence_end).upper()

        # Sanity check: the base at the center should match the ref allele
        center_index = DNA_WINDOW_SIZE
        if ref_seq[center_index] != variant["ref"]:
            skipped += 1
            continue

        alt_seq = ref_seq[:center_index] + variant["alt"] + ref_seq[center_index + 1:]

        records.append({
            "chrom": chrom,
            "pos": pos,
            "ref_allele": variant["ref"],
            "alt_allele": variant["alt"],
            "label": variant["label"],
            "ref_seq": ref_seq,
            "alt_seq": alt_seq,
        })

    reference_genome.close()

    print(f"Extracted {len(records)} windows, skipped {skipped} variants")
    return records


def split_and_save(records):
    """Split records by chromosome and save as parquet files."""
    df = pd.DataFrame(records)

    train = df[df["chrom"].isin(TRAIN_CHROMOSOMES)]
    val = df[df["chrom"].isin(VAL_CHROMOSOMES)]
    test = df[df["chrom"].isin(TEST_CHROMOSOMES)]

    overall_pathogenic_rate = df["label"].mean()

    print("\nSplit sizes:")
    print(f"  Train: {len(train)} ({train['label'].mean():.1%} pathogenic)")
    print(f"  Val:   {len(val)} ({val['label'].mean():.1%} pathogenic)")
    print(f"  Test:  {len(test)} ({test['label'].mean():.1%} pathogenic)")

    # Warn if any split's pathogenic rate deviates >10% from the overall rate
    for name, split in [("Train", train), ("Val", val), ("Test", test)]:
        split_rate = split["label"].mean()
        if abs(split_rate - overall_pathogenic_rate) > 0.10:
            print(f"\n  WARNING: {name} pathogenic rate ({split_rate:.1%}) deviates "
                  f"significantly from overall rate ({overall_pathogenic_rate:.1%}). "
                  f"Consider class weighting during training.")

    train.to_parquet(os.path.join(DATA_DIR, "train.parquet"), index=False)
    val.to_parquet(os.path.join(DATA_DIR, "val.parquet"), index=False)
    test.to_parquet(os.path.join(DATA_DIR, "test.parquet"), index=False)

    # Report the data format so downstream code knows what to expect
    print(f"\nSaved to {DATA_DIR}/{{train,val,test}}.parquet")
    print("\nRecord format (columns per row):")
    print("  chrom      — chromosome number (str, e.g. '7')")
    print("  pos        — genomic position (int, 1-based)")
    print("  ref_allele — normal base (str, e.g. 'A')")
    print("  alt_allele — mutated base (str, e.g. 'G')")
    print("  label      — 1 = pathogenic, 0 = benign (int)")
    print("  ref_seq    — 1001bp reference DNA window (str)")
    print("  alt_seq    — 1001bp alternate DNA window (str)")


if __name__ == "__main__":
    variants = load_variants()
    records = extract_windows(variants)
    split_and_save(records)
