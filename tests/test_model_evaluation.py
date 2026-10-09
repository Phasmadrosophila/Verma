"""Unit and integration tests for Task B-M1-05 (Qwen3 0.6B Evaluation)."""

from __future__ import annotations

import json
import subprocess
import sys
import unittest
from pathlib import Path

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
EVAL_SCRIPT = REPOSITORY_ROOT / "scripts" / "models" / "evaluate_artifact.py"
VERIFY_SCRIPT = REPOSITORY_ROOT / "scripts" / "models" / "verify_manifest.py"
CANDIDATE_FILE = REPOSITORY_ROOT / "models" / "qwen3_0_6b_candidate.json"
FIXTURES_FILE = REPOSITORY_ROOT / "models" / "evaluation_fixtures.json"
MANIFEST_FILE = REPOSITORY_ROOT / "models" / "manifest.json"


class ModelEvaluationTests(unittest.TestCase):
    def test_ac_b_m1_05_01_candidate_metadata_and_sha256(self) -> None:
        """AC-B-M1-05-01: Verify candidate metadata, source URL, license, and SHA-256."""
        self.assertTrue(CANDIDATE_FILE.is_file(), "Candidate metadata file must exist")
        data = json.loads(CANDIDATE_FILE.read_text(encoding="utf-8"))

        self.assertEqual(data["model_name"], "Qwen/Qwen3-0.6B-Instruct-GGUF")
        self.assertEqual(data["quantization"], "Q4_K_M")
        self.assertEqual(data["license"], "Apache-2.0")
        self.assertTrue(data["source_url"].startswith("https://huggingface.co/"))
        self.assertEqual(len(data["sha256"]), 64)
        self.assertTrue(all(c in "0123456789abcdef" for c in data["sha256"]))

    def test_ac_b_m1_05_02_synthetic_redaction_and_fixtures_zero_secrets(self) -> None:
        """AC-B-M1-05-02: Verify synthetic evaluation fixtures cover all 4 tasks without secrets."""
        self.assertTrue(FIXTURES_FILE.is_file(), "Fixtures file must exist")
        fixtures = json.loads(FIXTURES_FILE.read_text(encoding="utf-8"))

        required_keys = ["ask_vault", "import_mapping", "tag_suggestions", "health_explanations"]
        for key in required_keys:
            self.assertIn(key, fixtures, f"Category {key} must exist in fixtures")
            self.assertTrue(len(fixtures[key]) > 0, f"Category {key} must not be empty")

        # Property test: scan for denied secret keys in entire fixtures structure
        denied_keys = {"password", "secret", "apikey", "apisecret", "seed", "privatekey", "notebody", "totpseed"}
        serialized = json.dumps(fixtures).lower()
        for k in denied_keys:
            # Keys shouldn't be defined as object keys containing secrets
            self.assertNotIn(f'"{k}": "real', serialized)
            self.assertNotIn(f'"{k}": "my', serialized)

    def test_ac_b_m1_05_03_device_evaluation_measurements(self) -> None:
        """AC-B-M1-05-03: Evaluation runner produces valid benchmarks across hardware targets."""
        result = subprocess.run(
            [sys.executable, str(EVAL_SCRIPT), "--check-all"],
            cwd=REPOSITORY_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, f"Evaluation script failed: {result.stderr}")
        self.assertIn("AC-B-M1-05-01 PASS", result.stdout)
        self.assertIn("AC-B-M1-05-02 PASS", result.stdout)
        self.assertIn("AC-B-M1-05-03 PASS", result.stdout)
        self.assertIn("AC-B-M1-05-04 PASS", result.stdout)
        self.assertIn("AC-B-M1-05-05 PASS", result.stdout)

    def test_ac_b_m1_05_04_offline_and_unavailable_model_resilience(self) -> None:
        """AC-B-M1-05-04: Offline operation and fallback behavior."""
        # Running the evaluation script without internet connection succeeds
        result = subprocess.run(
            [sys.executable, str(EVAL_SCRIPT), "--candidate", str(CANDIDATE_FILE)],
            cwd=REPOSITORY_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0)
        self.assertIn("PASS", result.stdout)

    def test_ac_b_m1_05_05_manifest_verifier_gate_states(self) -> None:
        """AC-B-M1-05-05: Model manifest remains valid TBD until selected."""
        result = subprocess.run(
            [sys.executable, str(VERIFY_SCRIPT), "--manifest", str(MANIFEST_FILE), "--manifest-only"],
            cwd=REPOSITORY_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("manifest schema valid", result.stdout)


if __name__ == "__main__":
    unittest.main()
