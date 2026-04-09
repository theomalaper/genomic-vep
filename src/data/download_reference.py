"""
Prepare the GRCh38 human reference genome for random access.

Expects: data/hg38.fa.gz (regular gzip, downloaded manually from UCSC)
  URL: https://hgdownload.soe.ucsc.edu/goldenPath/hg38/bigZips/hg38.fa.gz

Steps:
1. Decompress gzip → plain FASTA (~3GB)
2. Recompress with bgzip (block-gzip — allows random access, unlike regular gzip)
3. Generate .fai and .gzi index files so pysam can jump to any position instantly

Output: data/hg38.fa.gz (bgzip), data/hg38.fa.gz.fai, data/hg38.fa.gz.gzi
"""

import gzip
import os
import shutil

import pysam

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")
GZ_DOWNLOAD_PATH = os.path.join(DATA_DIR, "hg38.fa.gz")       # original gzip download
FA_PATH = os.path.join(DATA_DIR, "hg38.fa")                    # decompressed
BGZIP_PATH = os.path.join(DATA_DIR, "hg38.bgz")               # bgzip recompressed
FAI_PATH = BGZIP_PATH + ".fai"                                  # fasta index
GZI_PATH = BGZIP_PATH + ".gzi"                                  # bgzip index


def prepare_reference_data():
    """Decompress, recompress with bgzip, and index the reference genome."""
    os.makedirs(DATA_DIR, exist_ok=True)

    if os.path.exists(BGZIP_PATH) and os.path.exists(FAI_PATH) and os.path.exists(GZI_PATH):
        print("Reference genome already prepared. Skipping.")
        return

    if not os.path.exists(GZ_DOWNLOAD_PATH) and not os.path.exists(FA_PATH):
        print(f"ERROR: Please download the reference genome first.")
        print(f"  1. Download from: https://hgdownload.soe.ucsc.edu/goldenPath/hg38/bigZips/hg38.fa.gz")
        print(f"  2. Place it at: {os.path.abspath(GZ_DOWNLOAD_PATH)}")
        return

    if not os.path.exists(FA_PATH):
        print("Decompressing (gzip → FASTA)... this takes a few minutes.")
        with gzip.open(GZ_DOWNLOAD_PATH, "rb") as file_gz_in:
            with open(FA_PATH, "wb") as file_fa_out:
                shutil.copyfileobj(file_gz_in, file_fa_out)
        print(f"Decompressed to {FA_PATH}")

    if not os.path.exists(BGZIP_PATH):
        print("Recompressing with bgzip... this takes a few minutes.")
        pysam.tabix_compress(FA_PATH, BGZIP_PATH, force=True)
        print(f"Bgzip compressed to {BGZIP_PATH}")

    if os.path.exists(FA_PATH) and os.path.exists(BGZIP_PATH):
        os.remove(FA_PATH)
        print("Removed uncompressed FASTA (no longer needed).")

    if not os.path.exists(FAI_PATH):
        print("Generating FASTA index (.fai)...")
        pysam.faidx(BGZIP_PATH)
        print(f"Index created: {FAI_PATH}")

    if not os.path.exists(GZI_PATH):
        print("Note: .gzi index should have been created by faidx.")
        print("If missing, the file may need reindexing.")

    print("\nVerifying random access...")
    ref = pysam.FastaFile(BGZIP_PATH)
    test_seq = ref.fetch("chr1", 10000, 10020)
    ref.close()
    print(f"Test fetch chr1:10000-10020 = {test_seq}")
    print(f"Length: {len(test_seq)} bases")

    print("\nReference genome ready!")
    print(f"  FASTA:  {BGZIP_PATH}")
    print(f"  Index:  {FAI_PATH}")
    print(f"  GZI:    {GZI_PATH}")


if __name__ == "__main__":
    prepare_reference_data()
