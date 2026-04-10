"""
Variant effect classifier built on Nucleotide Transformer v2.

Architecture:
    ref_seq → NT-v2 (frozen) → ref_embedding (768-dim)
    alt_seq → NT-v2 (frozen) → alt_embedding (768-dim)
    diff = alt_embedding - ref_embedding
    diff → Linear(768, 256) → ReLU → Dropout → Linear(256, 1) → sigmoid → pathogenic probability

The difference vector captures what changed when the mutation was introduced.
If embeddings barely change → variant likely benign.
If they shift dramatically → variant likely disrupts something important.
"""

import torch
import torch.nn as nn
from transformers import AutoModelForMaskedLM

MODEL_NAME = "InstaDeepAI/nucleotide-transformer-v2-50m-multi-species"


class VariantClassifier(nn.Module):
    """NT-v2 base (frozen) + trainable classification head."""

    def __init__(self, dropout: float = 0.1) -> None:
        super().__init__()

        # Load the full masked LM, then extract just the base encoder
        full_model = AutoModelForMaskedLM.from_pretrained(MODEL_NAME, trust_remote_code=True)
        self.encoder = full_model.esm
        del full_model

        for param in self.encoder.parameters():
            param.requires_grad = False

        hidden_size = self.encoder.config.hidden_size  # 768 for the 50M model

        # Classification head — takes the embedding difference and predicts pathogenicity
        self.head = nn.Sequential(
            nn.Linear(hidden_size, 256),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(256, 1),
        )

    def get_embedding(self, input_ids: torch.Tensor, attention_mask: torch.Tensor) -> torch.Tensor:
        """Run sequence through NT-v2 and return the mean-pooled embedding."""
        with torch.no_grad():
            outputs = self.encoder(input_ids=input_ids, attention_mask=attention_mask)

        # Mean pool over sequence length (ignoring padding tokens)
        hidden_states = outputs.last_hidden_state  # (batch, seq_len, 768)
        mask = attention_mask.unsqueeze(-1).float()  # (batch, seq_len, 1)
        pooled = (hidden_states * mask).sum(dim=1) / mask.sum(dim=1)  # (batch, 768)
        return pooled

    def forward(
        self, ref_ids: torch.Tensor, ref_mask: torch.Tensor, alt_ids: torch.Tensor, alt_mask: torch.Tensor
    ) -> torch.Tensor:
        """
        Forward pass: encode both sequences, compute difference, classify.

        Returns logits (raw, before sigmoid) for use with BCEWithLogitsLoss.
        """
        ref_emb = self.get_embedding(ref_ids, ref_mask)
        alt_emb = self.get_embedding(alt_ids, alt_mask)

        diff = alt_emb - ref_emb  # what changed due to the mutation
        logits = self.head(diff).squeeze(-1)  # (batch,)
        return logits


if __name__ == "__main__":
    # Quick test: create model and print parameter counts
    model = VariantClassifier()

    total = sum(p.numel() for p in model.parameters())
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)

    print(f"Total parameters:     {total:,}")
    print(f"Trainable parameters: {trainable:,}")
    print(f"Frozen parameters:    {total - trainable:,}")
