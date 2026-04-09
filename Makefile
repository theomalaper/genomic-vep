.PHONY: setup test lint format check data-clinvar data-reference data-prepare data-all train

# Setup
setup:
	python -m venv .venv
	.venv/bin/pip install --upgrade pip
	.venv/bin/pip install -r requirements.txt
	@echo "\nSetup complete. Run: source .venv/bin/activate"

# Code quality
lint:
	ruff check src/ tests/

format:
	ruff format src/ tests/

check: lint test

# Testing
test:
	python -m pytest tests/ -v

# Data pipeline
data-clinvar:
	python src/data/download_clinvar.py

data-reference:
	python src/data/download_reference.py

data-prepare:
	python src/data/prepare_dataset.py

data-all: data-clinvar data-reference data-prepare

# Training
train:
	python src/model/train.py
