"""
Download the GRCh38 human reference genome (FASTA + index).

The reference genome is the 'normal' human DNA sequence.
We need it to extract the surrounding DNA context for each variant.

We use the UCSC version because it comes pre-indexed (the .fai file),
which lets us quickly jump to any position without loading the whole
3GB file into memory.

Output: data/hg38.fa.gz and data/hg38.fa.gz.fai
"""

import os
import urllib.request

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")

# UCSC GRCh38 reference — bgzip compressed with .fai index
# This is the same genome, just hosted by UCSC instead of NCBI
REFERENCE_URL = "https://hgdownload.soe.ucsc.edu/goldenPath/hg38/bigZips/hg38.fa.gz"
INDEX_URL = "https://hgdownload.soe.ucsc.edu/goldenPath/hg38/bigZips/hg38.fa.gz.fai"
GZI_URL = "https://hgdownload.soe.ucsc.edu/goldenPath/hg38/bigZips/hg38.fa.gz.gzi"

REFERENCE_PATH = os.path.join(DATA_DIR, "hg38.fa.gz")
INDEX_PATH = os.path.join(DATA_DIR, "hg38.fa.gz.fai")
GZI_PATH = os.path.join(DATA_DIR, "hg38.fa.gz.gzi")


def download_file(url, path, description):
    if os.path.exists(path):
        print(f"{description} already exists at {path}, skipping.")
        return

    print(f"Downloading {description} from {url}...")
    urllib.request.urlretrieve(url, path)
    print(f"Saved to {path}")


def download_reference():
    os.makedirs(DATA_DIR, exist_ok=True)

    # The .fa.gz is ~1GB compressed — this is the big download
    download_file(REFERENCE_URL, REFERENCE_PATH, "Reference genome (hg38.fa.gz)")

    # The .fai index is tiny (~10KB) — tells pysam where each chromosome starts
    download_file(INDEX_URL, INDEX_PATH, "FASTA index (hg38.fa.gz.fai)")

    # The .gzi index is needed for random access into bgzip files
    download_file(GZI_URL, GZI_PATH, "GZI index (hg38.fa.gz.gzi)")

    print("\nReference genome ready. You can now extract sequences using pysam.")
    print("Example:")
    print('  import pysam')
    print(f'  ref = pysam.FastaFile("{REFERENCE_PATH}")')
    print('  seq = ref.fetch("chr17", 7674220 - 500, 7674220 + 500)')
    print('  print(seq)  # 1000bp of DNA around position 7674220 on chr17')


if __name__ == "__main__":
    download_reference()
