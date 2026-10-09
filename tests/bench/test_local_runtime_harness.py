import importlib.util
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MODULE_PATH = ROOT / "scripts" / "bench" / "run_local_runtime.py"
SPEC = importlib.util.spec_from_file_location("local_runtime_bench", MODULE_PATH)
assert SPEC and SPEC.loader
HARNESS = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(HARNESS)


class LocalRuntimeHarnessParsingTests(unittest.TestCase):
    def test_parses_llama_cpp_timing_lines(self) -> None:
        raw = """llama_perf_context_print: prompt eval time = 120.00 ms / 24 tokens (5.00 ms per token, 200.00 tokens per second)\nllama_perf_context_print: eval time = 800.00 ms / 40 runs (20.00 ms per token, 50.00 tokens per second)\n"""

        metrics = HARNESS.parse_llama_cpp_output(raw)

        self.assertEqual(metrics["prompt_eval_ms"], 120.0)
        self.assertEqual(metrics["generation_tokens"], 40)
        self.assertEqual(metrics["generation_tokens_per_second"], 50.0)

    def test_rejects_fixture_with_denied_secret_field(self) -> None:
        with self.assertRaises(HARNESS.BenchmarkError):
            HARNESS.assert_synthetic_redacted_input({"title": "Example", "password": "not allowed"})

    def test_summarizes_ten_measured_runs(self) -> None:
        summary = HARNESS.summarize([10.0, 30.0, 20.0, 40.0, 50.0, 60.0, 70.0, 80.0, 90.0, 100.0])

        self.assertEqual(summary, {"count": 10, "median": 55.0, "min": 10.0, "max": 100.0})

    def test_requires_synthetic_input_placeholder(self) -> None:
        with self.assertRaises(HARNESS.BenchmarkError):
            HARNESS.build_command("llama-cli", ["-m", "{model}"], Path("model.gguf"), Path("fixture.json"))


if __name__ == "__main__":
    unittest.main()
