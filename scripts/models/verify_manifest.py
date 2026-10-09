#!/usr/bin/env python3
"""Validate Verma's model inventory and optionally verify downloaded artifacts."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any

SCHEMA_VERSION = "1.0"
SHA256_PATTERN = re.compile(r"^[0-9a-f]{64}$")
TBD = "TBD"
REQUIRED_FIELDS = {"id", "role", "status", "model_name", "version", "sha256", "license", "source_url", "artifact_path", "runtime", "redistribution_review"}
TBD_FIELDS = {"model_name", "version", "sha256", "license", "source_url", "artifact_path", "redistribution_review"}


class ManifestError(ValueError):
    """A manifest is malformed or violates the documented selection policy."""


def read_manifest(path: Path) -> dict[str, Any]:
    try:
        document = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as error:
        raise ManifestError(f"manifest not found: {path}") from error
    except json.JSONDecodeError as error:
        raise ManifestError(f"manifest is not valid JSON: {error.msg}") from error
    if not isinstance(document, dict):
        raise ManifestError("manifest root must be an object")
    return document


def validate_manifest(document: dict[str, Any]) -> list[dict[str, Any]]:
    """Validate the small, intentionally explicit manifest schema."""
    if document.get("schema_version") != SCHEMA_VERSION:
        raise ManifestError(f"schema_version must be {SCHEMA_VERSION!r}")
    models = document.get("models")
    if not isinstance(models, list) or not models:
        raise ManifestError("models must be a non-empty array")
    identifiers: set[str] = set()
    for index, model in enumerate(models):
        location = f"models[{index}]"
        if not isinstance(model, dict):
            raise ManifestError(f"{location} must be an object")
        missing = REQUIRED_FIELDS - model.keys()
        if missing:
            raise ManifestError(f"{location} is missing required fields: {', '.join(sorted(missing))}")
        model_id = model["id"]
        if not isinstance(model_id, str) or not re.fullmatch(r"[a-z0-9][a-z0-9-]*", model_id):
            raise ManifestError(f"{location}.id must be lowercase kebab-case")
        if model_id in identifiers:
            raise ManifestError(f"duplicate model id: {model_id}")
        identifiers.add(model_id)
        if model["role"] not in {"text-generation", "embedding"}:
            raise ManifestError(f"{model_id}.role must be text-generation or embedding")
        if model["status"] not in {"tbd", "selected"}:
            raise ManifestError(f"{model_id}.status must be tbd or selected")
        if model["runtime"] != {"production": "llama.cpp", "development": "Ollama"}:
            raise ManifestError(f"{model_id}.runtime must specify llama.cpp for production and Ollama for development")
        if model["status"] == "tbd":
            unresolved = [field for field in TBD_FIELDS if model[field] != TBD]
            if unresolved:
                raise ManifestError(f"{model_id} is tbd but fields are not honest TBD values: {', '.join(sorted(unresolved))}")
            continue
        for field in REQUIRED_FIELDS - {"runtime", "status"}:
            if not isinstance(model[field], str) or not model[field] or model[field] == TBD:
                raise ManifestError(f"{model_id}.{field} must be a selected, non-TBD string")
        if not SHA256_PATTERN.fullmatch(model["sha256"]):
            raise ManifestError(f"{model_id}.sha256 must be a lowercase SHA-256 hex digest")
        artifact_path = Path(model["artifact_path"])
        if artifact_path.is_absolute() or ".." in artifact_path.parts:
            raise ManifestError(f"{model_id}.artifact_path must be a relative path without traversal")
    return models


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as artifact:
        for chunk in iter(lambda: artifact.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def verify_artifacts(models: list[dict[str, Any]], model_root: Path) -> None:
    tbd_models = [model["id"] for model in models if model["status"] == "tbd"]
    if tbd_models:
        raise ManifestError("cannot verify artifacts while model selection is TBD: " + ", ".join(tbd_models))
    for model in models:
        artifact = model_root / model["artifact_path"]
        if not artifact.is_file():
            raise ManifestError(f"artifact missing for {model['id']}: {artifact}")
        if sha256_file(artifact) != model["sha256"]:
            raise ManifestError(f"sha256 mismatch for {model['id']}")
        print(f"sha256 verified for {model['id']}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=Path("models/manifest.json"))
    parser.add_argument("--model-root", type=Path, default=Path("models/artifacts"))
    parser.add_argument("--manifest-only", action="store_true", help="validate schema without requiring model files")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        models = validate_manifest(read_manifest(args.manifest))
        print("manifest schema valid")
        tbd_models = [model["id"] for model in models if model["status"] == "tbd"]
        if tbd_models:
            print("TBD model selection: " + ", ".join(tbd_models))
        if not args.manifest_only:
            verify_artifacts(models, args.model_root)
    except ManifestError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
