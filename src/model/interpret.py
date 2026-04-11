"""
Interpretability for variant effect predictions using Integrated Gradients.

Answers: "which bases in the sequence contributed most to the pathogenic prediction?"

Strategy: run IG on the token embeddings (before mean pooling), so each token
gets its own attribution score. We wrap the classifier's forward pass to accept
raw embeddings and do pooling + head internally.
"""

import torch
from captum.attr import IntegratedGradients
from transformers import AutoTokenizer

from src.model.classifier import MODEL_NAME, VariantClassifier


class _EmbeddingToLogit(torch.nn.Module):
    """Takes ref + alt hidden states, pools, diffs, and classifies.

    Captum needs a single forward function from input → scalar.
    It needs the gradients from input -> scalar whcih is broken in the VariantClassifier
    This bridges token-level embeddings to the final logit.
    """

    def __init__(self, head: torch.nn.Module) -> None:
        super().__init__()
        self.head = head

    def forward(
        self, alt_hidden: torch.Tensor, ref_hidden: torch.Tensor,
        ref_mask: torch.Tensor, alt_mask: torch.Tensor,
    ) -> torch.Tensor:
        # Mean pool (same as classifier.get_embedding but on raw hidden states)
        ref_m = ref_mask.unsqueeze(-1).float()
        alt_m = alt_mask.unsqueeze(-1).float()
        ref_emb = (ref_hidden * ref_m).sum(dim=1) / ref_m.sum(dim=1)
        alt_emb = (alt_hidden * alt_m).sum(dim=1) / alt_m.sum(dim=1)

        diff = alt_emb - ref_emb
        return self.head(diff).squeeze(-1)


class VariantInterpreter:
    """Wraps a trained VariantClassifier to produce per-token attributions."""

    def __init__(self, model: VariantClassifier, device: torch.device) -> None:
        self.model = model
        self.device = device
        self.model.eval()
        self.tokenizer = AutoTokenizer.from_pretrained(
            MODEL_NAME, trust_remote_code=True,
        )
        self._wrapper = _EmbeddingToLogit(model.head)

    def attribute(self, ref_seq: str, alt_seq: str, n_steps: int = 50) -> dict:
        """
        Compute per-token attributions for a single variant.

        Returns dict with prediction, ref/alt attributions, and token strings.
        """
        # Tokenize
        ref_tok = self.tokenizer(
            ref_seq, padding="max_length", truncation=True,
            max_length=256, return_tensors="pt",
        )
        alt_tok = self.tokenizer(
            alt_seq, padding="max_length", truncation=True,
            max_length=256, return_tensors="pt",
        )

        ref_ids = ref_tok["input_ids"].to(self.device)
        ref_mask = ref_tok["attention_mask"].to(self.device)
        alt_ids = alt_tok["input_ids"].to(self.device)
        alt_mask = alt_tok["attention_mask"].to(self.device)

        # Get token-level hidden states from frozen encoder
        with torch.no_grad():
            ref_hidden = self.model.encoder(
                input_ids=ref_ids, attention_mask=ref_mask,
            ).last_hidden_state
            alt_hidden = self.model.encoder(
                input_ids=alt_ids, attention_mask=alt_mask,
            ).last_hidden_state

        # Get prediction
        with torch.no_grad():
            logit = self._wrapper(alt_hidden, ref_hidden, ref_mask, alt_mask)
            prob = torch.sigmoid(logit).item()

        # IG on alt_hidden (what the mutation introduced)
        # Baseline: ref_hidden (no mutation = no change)
        alt_hidden = alt_hidden.detach().requires_grad_(True)
        ref_hidden_detached = ref_hidden.detach()

        ig = IntegratedGradients(self._wrapper)

        alt_attr = ig.attribute(
            alt_hidden,
            baselines=ref_hidden_detached,
            additional_forward_args=(ref_hidden_detached, ref_mask, alt_mask),
            n_steps=n_steps,
        )

        # Sum attribution across embedding dims → one score per token
        # shape: (1, seq_len, 768) → (seq_len,)
        alt_scores = alt_attr.squeeze(0).abs().sum(dim=-1).cpu().numpy()

        # Only keep real tokens (not padding)
        ref_len = int(ref_mask.sum().item())
        alt_len = int(alt_mask.sum().item())

        ref_token_ids = ref_ids.squeeze(0).cpu().tolist()[:ref_len]
        alt_token_ids = alt_ids.squeeze(0).cpu().tolist()[:alt_len]

        alt_scores = alt_scores[:alt_len]

        # Normalize to 0-1 range
        if alt_scores.max() > 0:
            alt_scores = alt_scores / alt_scores.max()

        return {
            "prediction": prob,
            "attributions": alt_scores.tolist(),
            "ref_tokens": self.tokenizer.convert_ids_to_tokens(ref_token_ids),
            "alt_tokens": self.tokenizer.convert_ids_to_tokens(alt_token_ids),
        }
