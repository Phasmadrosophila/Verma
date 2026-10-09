"""Tests for AC-A-M0-04-02 model manifest verification."""

from __future__ import annotations

import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
VERIFY_SCRIPT = REPOSITORY_ROOT / "scripts" / "models" / "verify_manifest.py"
MANIFEST = REPOSITORY_ROOT / "models" / "manifest.json"


class VerifyModelManifestTests(unittest.TestCase):
    def run_verifier(self, *args: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(VERIFY_SCRIPT), *args],
            cwd=REPOSITORY_ROOT,
            text=True,
            capture_output=True,
            check=False,
        )

    def selected_manifest(self, sha256: str) -> dict[str, object]:
        return {
            "schema_version": "1.0",
            "models": [
                {
                    "id": "synthetic-test-model",
                    "role": "text-generation",
                    "status": "selected",
                    "model_name": "synthetic/model",
                    "version": "1.0.0",
                    "sha256": sha256,
                    "license": "MIT",
                    "source_url": "https://example.invalid/model",
                    "artifact_path": "fixture.gguf",
                    "runtime": {"production": "llama.cpp", "development": "Ollama"},
                    "redistribution_review": "approved for test fixture only",
                }
            ],
        }

    def test_ac_a_m0_04_02_manifest_only_accepts_honest_tbd_entries(self) -> None:
        result = self.run_verifier("--manifest", str(MANIFEST), "--manifest-only")

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("manifest schema valid", result.stdout)
        self.assertIn("TBD model selection", result.stdout)

    def test_ac_a_m0_04_02_rejects_synthetic_hash_mismatch(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            artifact = temp_path / "fixture.gguf"
            artifact.write_bytes(b"synthetic model bytes")
            manifest = temp_path / "manifest.json"
            manifest.write_text(
                json.dumps(self.selected_manifest("0" * 64)), encoding="utf-8"
            )

            result = self.run_verifier(
                "--manifest", str(manifest), "--model-root", str(temp_path)
            )

        self.assertEqual(result.returncode, 1)
        self.assertIn("sha256 mismatch for synthetic-test-model", result.stderr)

    def test_ac_a_m0_04_02_accepts_matching_synthetic_hash(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            artifact = temp_path / "fixture.gguf"
            artifact.write_bytes(b"synthetic model bytes")
            digest = hashlib.sha256(artifact.read_bytes()).hexdigest()
            manifest = temp_path / "manifest.json"
            manifest.write_text(json.dumps(self.selected_manifest(digest)), encoding="utf-8")

            result = self.run_verifier(
                "--manifest", str(manifest), "--model-root", str(temp_path)
            )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("sha256 verified for synthetic-test-model", result.stdout)


if __name__ == "__main__":
    unittest.main()
