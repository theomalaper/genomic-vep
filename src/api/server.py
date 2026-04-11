"""
FastAPI backend for variant effect prediction.

Endpoints:
    POST /predict — accepts a variant, returns pathogenicity prediction + token attributions
    GET  /health  — health check
"""

import os
import sys

import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from src.model.classifier import VariantClassifier
from src.model.interpret import VariantInterpreter

app = FastAPI(title="Genomic VEP API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available()
    else "mps" if torch.backends.mps.is_available()
    else "cpu"
)

app.state.interpreter = None


class VariantRequest(BaseModel):
    ref_seq: str
    alt_seq: str


class PredictionResponse(BaseModel):
    prediction: float
    label: str
    attributions: list[float]
    alt_tokens: list[str]
    ref_tokens: list[str]


@app.on_event("startup")
def load_model() -> None:
    checkpoint_dir = os.environ.get(
        "CHECKPOINT_DIR",
        os.path.join(os.path.dirname(__file__), "..", "..", "checkpoints"),
    )
    best_path = os.path.join(checkpoint_dir, "best.pth")
    latest_path = os.path.join(checkpoint_dir, "latest.pth")

    ckpt_path = best_path if os.path.exists(best_path) else latest_path
    if not os.path.exists(ckpt_path):
        print("WARNING: No checkpoint found. /predict will fail.")
        return

    model = VariantClassifier().to(DEVICE)
    ckpt = torch.load(ckpt_path, map_location=DEVICE, weights_only=False)
    model.head.load_state_dict(ckpt["head_state_dict"])
    print(f"Loaded checkpoint: {ckpt_path} (AUROC: {ckpt['val_auroc']:.4f})")

    app.state.interpreter = VariantInterpreter(model, DEVICE)


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "model_loaded": app.state.interpreter is not None,
        "device": str(DEVICE),
    }


@app.post("/predict", response_model=PredictionResponse)
def predict(req: VariantRequest) -> PredictionResponse:
    if app.state.interpreter is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    result = app.state.interpreter.attribute(req.ref_seq, req.alt_seq)

    return PredictionResponse(
        prediction=result["prediction"],
        label="Pathogenic" if result["prediction"] > 0.5 else "Benign",
        attributions=result["attributions"],
        alt_tokens=result["alt_tokens"],
        ref_tokens=result["ref_tokens"],
    )
