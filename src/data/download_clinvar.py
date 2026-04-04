"""
Download and parse ClinVar VCF into a clean CSV of pathogenic + benign variants.

ClinVar is a public database of clinically annotated genetic variants.
Each variant has a clinical significance label (pathogenic, benign, uncertain, etc.).
We only keep pathogenic and benign — the ones with clear labels.

Output: data/clinvar_variants.csv with columns:
    chrom, pos, ref, alt, label (1 = pathogenic, 0 = benign)
"""

import gzip
import os
import urllib.request
import csv

# ClinVar VCF — updated weekly by NCBI
CLINVAR_URL = "https://ftp.ncbi.nlm.nih.gov/pub/clinvar/vcf_GRCh38/clinvar.vcf.gz"
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")
VCF_PATH = os.path.join(DATA_DIR, "clinvar.vcf.gz")
OUTPUT_PATH = os.path.join(DATA_DIR, "clinvar_variants.csv")


def download_clinvar():
    os.makedirs(DATA_DIR, exist_ok=True)

    if os.path.exists(VCF_PATH):
        print(f"ClinVar VCF already exists at {VCF_PATH}, skipping download.")
        return

    print(f"Downloading ClinVar VCF from {CLINVAR_URL}...")
    print("This is ~80MB, may take a few minutes.")
    urllib.request.urlretrieve(CLINVAR_URL, VCF_PATH)
    print(f"Downloaded to {VCF_PATH}")


def parse_clinvar():
    """
    Parse the ClinVar VCF and extract pathogenic + benign single-nucleotide variants.

    We filter for:
    - Single nucleotide variants only (SNVs): ref and alt are both exactly 1 letter
    - Clinical significance is either "Pathogenic" or "Benign"
    - Standard chromosomes only (chr1-22, chrX)
    """

    print("Parsing ClinVar VCF...")
    VALID_CHROMS = {str(i) for i in range(1, 23)} | {"X"}

    # CLNSIG field labels
    PATHOGENIC_LABELS = {"Pathogenic", "Pathogenic/Likely_pathogenic"}
    BENIGN_LABELS = {"Benign", "Benign/Likely_benign"}
    
    PATHOGENIC_VAL = 1
    BENIGN_VAL = 0

    variants = []
    with gzip.open(VCF_PATH, "rt") as f:
        for line in f:
            # Skip header lines (start with #)
            if line.startswith("#"):
                continue

            fields = line.strip().split("\t")
            chrom = fields[0]
            pos = int(fields[1])
            ref = fields[3]
            alt = fields[4]
            info = fields[7]

            if chrom not in VALID_CHROMS:
                continue

            # Only single nucleotide variants (not insertions/deletions)
            if len(ref) != 1 or len(alt) != 1: 
                continue

            # Only valid DNA bases
            if ref not in "ACGT" or alt not in "ACGT":
                continue

            clinical_significance = None
            for entry in info.split(";"):
                if entry.startswith("CLNSIG="):
                    clinical_significance = entry.split("=")[1]
                    break

            if clinical_significance is None:
                continue

            if clinical_significance in PATHOGENIC_LABELS:
                label = PATHOGENIC_VAL
            elif clinical_significance in BENIGN_LABELS:
                label = BENIGN_VAL
            else:
                continue

            variants.append({
                "chrom": chrom,
                "pos": pos,
                "ref": ref,
                "alt": alt,
                "label": label,
            })

    print(f"Found {len(variants)} variants:")
    
    pathogenic_count = sum(1 for v in variants if v["label"] == PATHOGENIC_VAL)
    benign_count = len(variants) - pathogenic_count
    print(f"  Pathogenic: {pathogenic_count}")
    print(f"  Benign: {benign_count}")

    os.makedirs(DATA_DIR, exist_ok=True)
    with open(OUTPUT_PATH, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["chrom", "pos", "ref", "alt", "label"])
        writer.writeheader()
        writer.writerows(variants)

    print(f"Saved to {OUTPUT_PATH}")
    return variants


if __name__ == "__main__":
    download_clinvar()
    parse_clinvar()
