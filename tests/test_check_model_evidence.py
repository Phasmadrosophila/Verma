"""Mechanical release-evidence checks for E-MR-03."""

from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
CHECKER = REPOSITORY_ROOT / "scripts" / "release" / "check-model-evidence.py"
INVENTORY = REPOSITORY_ROOT / "docs" / "release" / "model-inventory.md"
LICENSE_REVIEW = REPOSITORY_ROOT / "docs" / "release" / "model-license-review.md"
MANIFEST = REPOSITORY_ROOT / "models" / "manifest.json"


class CheckModelEvidenceTests(unittest.TestCase):
    def run_checker(
        self,
        inventory: Path = INVENTORY,
        license_review: Path = LICENSE_REVIEW,
        manifest: Path = MANIFEST,
    ) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [
                sys.executable,
                str(CHECKER),
                "--inventory",
                str(inventory),
                "--license-review",
                str(license_review),
                "--manifest",
                str(manifest),
            ],
            cwd=REPOSITORY_ROOT,
            text=True,
            capture_output=True,
            check=False,
        )

    def test_ac_e_mr_03_01_marks_unavailable_gguf_not_verified_without_sha_claim(self) -> None:
        result = self.run_checker()

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("AC-E-MR-03-01 PASS", result.stdout)

    def test_ac_e_mr_03_02_keeps_license_compatibility_open(self) -> None:
        result = self.run_checker()

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("AC-E-MR-03-02 PASS", result.stdout)

    def test_ac_e_mr_03_01_rejects_an_inventory_with_a_sha256_claim(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            temporary_path = Path(temporary_directory)
            inventory = temporary_path / "inventory.md"
            inventory.write_text(
                "| Artifact availability | **NOT VERIFIED** |\n"
                "| SHA-256 | `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` |\n"
                "| Selection status | Not selected |\n",
                encoding="utf-8",
            )
            license_review = temporary_path / "license.md"
            license_review.write_text(
                "| Review status | **OPEN** |\nApache-2.0 and fair-code.\n"
                "No compatibility conclusion has been made.\n",
                encoding="utf-8",
            )

            result = self.run_checker(inventory, license_review)

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("must not contain a SHA-256 digest claim", result.stderr)

    def test_ac_e_mr_03_02_rejects_closed_license_review(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            temporary_path = Path(temporary_directory)
            inventory = temporary_path / "inventory.md"
            inventory.write_text(
                "| Artifact availability | **NOT VERIFIED** |\n"
                "| SHA-256 | Not recorded; an unavailable artifact has no hash claim. |\n"
                "| Selection status | Not selected |\n",
                encoding="utf-8",
            )
            license_review = temporary_path / "license.md"
            license_review.write_text(
                "| Review status | Closed |\nApache-2.0 and fair-code.\n"
                "No compatibility conclusion has been made.\n",
                encoding="utf-8",
            )

            result = self.run_checker(inventory, license_review)

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("must state that the review is OPEN", result.stderr)

    def test_ac_e_mr_03_01_rejects_a_selected_manifest_without_artifact_evidence(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            manifest = Path(temporary_directory) / "manifest.json"
            manifest.write_text(
                '{"models": [{"status": "selected", "sha256": "TBD"}]}',
                encoding="utf-8",
            )

            result = self.run_checker(manifest=manifest)

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("manifest must remain tbd", result.stderr)


if __name__ == "__main__":
    unittest.main()
