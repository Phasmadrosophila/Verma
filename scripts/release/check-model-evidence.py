#!/usr/bin/env python3
"""Check E-MR-03 release evidence remains honest about unverified GGUFs."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


SHA256_DIGEST = re.compile(r"(?<![0-9a-f])[0-9a-f]{64}(?![0-9a-f])", re.IGNORECASE)


class EvidenceError(ValueError):
    """Release evidence is incomplete or makes a prohibited verification claim."""


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except FileNotFoundError as error:
        raise EvidenceError(f"evidence file not found: {path}") from error


def require(text: str, fragment: str, message: str) -> None:
    if fragment not in text:
        raise EvidenceError(message)


def check_inventory(inventory: str) -> None:
    require(
        inventory,
        "| Artifact availability | **NOT VERIFIED** |",
        "inventory must mark artifact availability as NOT VERIFIED",
    )
    if SHA256_DIGEST.search(inventory):
        raise EvidenceError("inventory must not contain a SHA-256 digest claim while the GGUF is NOT VERIFIED")
    require(
        inventory,
        "| SHA-256 | Not recorded; an unavailable artifact has no hash claim. |",
        "inventory must state that no SHA-256 is recorded for an unavailable artifact",
    )
    require(
        inventory,
        "| Selection status | Not selected |",
        "inventory must keep the model unselected",
    )


def check_license_review(license_review: str) -> None:
    require(license_review, "| Review status | **OPEN** |", "license review must state that the review is OPEN")
    require(license_review, "Apache-2.0", "license review must discuss Apache-2.0")
    require(license_review.lower(), "fair-code", "license review must discuss Verma's fair-code direction")
    require(
        license_review,
        "No compatibility conclusion has been made.",
        "license review must leave compatibility unresolved",
    )


def check_manifest(manifest_path: Path) -> None:
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except FileNotFoundError as error:
        raise EvidenceError(f"manifest not found: {manifest_path}") from error
    except json.JSONDecodeError as error:
        raise EvidenceError(f"manifest is not valid JSON: {error.msg}") from error
    models = manifest.get("models") if isinstance(manifest, dict) else None
    if not isinstance(models, list) or not models:
        raise EvidenceError("manifest must contain at least one model")
    if any(
        not isinstance(model, dict)
        or model.get("status") != "tbd"
        or model.get("sha256") != "TBD"
        for model in models
    ):
        raise EvidenceError("manifest must remain tbd with no SHA-256 claim for this release evidence")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--inventory", type=Path, default=Path("docs/release/model-inventory.md"))
    parser.add_argument("--license-review", type=Path, default=Path("docs/release/model-license-review.md"))
    parser.add_argument("--manifest", type=Path, default=Path("models/manifest.json"))
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        check_inventory(read_text(args.inventory))
        print("AC-E-MR-03-01 PASS: unavailable GGUF is NOT VERIFIED and has no SHA-256 claim")
        check_license_review(read_text(args.license_review))
        check_manifest(args.manifest)
        print("AC-E-MR-03-02 PASS: Apache-2.0 versus fair-code review remains OPEN")
    except EvidenceError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
