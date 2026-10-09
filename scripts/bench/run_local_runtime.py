#!/usr/bin/env python3
"""Benchmark an approved local llama.cpp invocation with synthetic redacted input only.

The harness intentionally does not download models, start network services, or substitute
development runtimes. It records an explicit ``not_measured`` result when the required
production runtime or reviewed model artifact is absent.
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import os
import re
import shutil
import statistics
import subprocess
import sys
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DENIED_KEYS = {
    "password", "secret", "apikey", "apisecret", "seed", "seedphrase", "privatekey",
    "notebody", "recoverycode", "totpseed", "masterkey", "recoveryphrase", "filecontents",
}
PROMPT_EVAL_PATTERN = re.compile(r"prompt eval time\s*=\s*([0-9.]+)\s*ms\s*/\s*(\d+)\s+tokens", re.I)
GENERATION_PATTERN = re.compile(
    r"(?m)^(?!.*prompt eval time).*?eval time\s*=\s*([0-9.]+)\s*ms\s*/\s*(\d+)\s+(?:runs|tokens).*?([0-9.]+)\s+tokens per second\)",
    re.I,
)


class BenchmarkError(ValueError):
    """Raised when benchmark input or runtime output violates the harness contract."""


def normalized_key(key: str) -> str:
    return re.sub(r"[_-]", "", key.lower())


def assert_synthetic_redacted_input(value: Any, path: str = "input") -> None:
    if isinstance(value, dict):
        for key, child in value.items():
            if normalized_key(str(key)) in DENIED_KEYS:
                raise BenchmarkError(f"Denied secret field '{key}' at {path}.{key}")
            assert_synthetic_redacted_input(child, f"{path}.{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            assert_synthetic_redacted_input(child, f"{path}[{index}]")


def parse_llama_cpp_output(raw: str) -> dict[str, float | int]:
    """Extract llama.cpp timing fields when the local binary prints them."""
    result: dict[str, float | int] = {}
    prompt = PROMPT_EVAL_PATTERN.search(raw)
    if prompt:
        result["prompt_eval_ms"] = float(prompt.group(1))
        result["prompt_tokens"] = int(prompt.group(2))
    generation = GENERATION_PATTERN.search(raw)
    if generation:
        result["generation_eval_ms"] = float(generation.group(1))
        result["generation_tokens"] = int(generation.group(2))
        result["generation_tokens_per_second"] = float(generation.group(3))
    return result


def summarize(values: list[float]) -> dict[str, float | int]:
    if not values:
        raise BenchmarkError("Cannot summarize zero measured runs")
    return {
        "count": len(values),
        "median": float(statistics.median(values)),
        "min": float(min(values)),
        "max": float(max(values)),
    }


def load_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise BenchmarkError(f"Unable to read JSON fixture '{path}': {error}") from error


def resolve_runtime(command: str | None) -> tuple[str | None, str | None]:
    if not command:
        return None, "No --runtime-command was supplied."
    resolved = shutil.which(command)
    if not resolved:
        return None, f"Runtime command '{command}' was not found on PATH."
    return resolved, None


def write_evidence(path: Path, evidence: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(evidence, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def build_command(runtime: str, runtime_args: list[str], model: Path, prompt_file: Path) -> list[str]:
    if "{prompt_file}" not in runtime_args:
        raise BenchmarkError("Runtime arguments must include {prompt_file} so every run consumes the synthetic fixture.")
    try:
        return [runtime, *(argument.format(model=str(model), prompt_file=str(prompt_file)) for argument in runtime_args)]
    except KeyError as error:
        raise BenchmarkError(f"Unsupported runtime argument placeholder: {error}") from error


def base_evidence(args: argparse.Namespace, fixture: Any) -> dict[str, Any]:
    return {
        "schema_version": "1.0",
        "task_id": "E-MR-03",
        "acceptance_criterion": "AC-E-MR-03-02",
        "recorded_at_utc": datetime.now(timezone.utc).isoformat(),
        "input": {
            "fixture": str(args.fixture),
            "synthetic": True,
            "redaction_check": "passed",
            "bytes": len(json.dumps(fixture, sort_keys=True).encode("utf-8")),
        },
        "configuration": {
            "runtime_command": args.runtime_command,
            "runtime_args": args.runtime_args,
            "model": str(args.model) if args.model else None,
            "warmup_runs": args.warmup_runs,
            "measured_runs_requested": args.runs,
            "timeout_seconds": args.timeout_seconds,
        },
        "memory_method": "Not measured: no child process was launched.",
    }


def process_working_set_bytes(pid: int) -> int | None:
    """Read current child-process working set without a third-party dependency."""
    if os.name == "nt":
        result = subprocess.run(
            ["tasklist", "/fi", f"PID eq {pid}", "/fo", "csv", "/nh"], capture_output=True, text=True, check=False
        )
        rows = list(csv.reader(io.StringIO(result.stdout)))
        if not rows or not rows[0] or rows[0][0].upper() == "INFO:":
            return None
        digits = re.sub(r"[^0-9]", "", rows[0][-1])
        return int(digits) * 1024 if digits else None
    status_path = Path(f"/proc/{pid}/status")
    if status_path.is_file():
        match = re.search(r"^VmRSS:\s+(\d+)\s+kB", status_path.read_text(encoding="utf-8"), re.M)
        return int(match.group(1)) * 1024 if match else None
    return None


def run_once(command: list[str], timeout_seconds: float) -> dict[str, Any]:
    started = time.perf_counter()
    process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    memory_samples: list[int] = []
    deadline = started + timeout_seconds
    while process.poll() is None:
        sample = process_working_set_bytes(process.pid)
        if sample is not None:
            memory_samples.append(sample)
        if time.perf_counter() >= deadline:
            process.kill()
            process.communicate()
            raise subprocess.TimeoutExpired(command, timeout_seconds)
        time.sleep(0.05)
    stdout, stderr = process.communicate()
    wall_ms = (time.perf_counter() - started) * 1000
    raw = (stdout or "") + ("\n" if stdout and stderr else "") + (stderr or "")
    return {
        "exit_code": process.returncode,
        "wall_clock_ms": wall_ms,
        "peak_working_set_bytes": max(memory_samples) if memory_samples else None,
        "llama_cpp_metrics": parse_llama_cpp_output(raw),
        "raw_output": raw,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Run reproducible local llama.cpp measurements on synthetic redacted input.")
    parser.add_argument("--runtime-command", help="Local llama.cpp executable, e.g. llama-cli")
    parser.add_argument("--model", type=Path, help="Approved local GGUF artifact path")
    parser.add_argument("--fixture", type=Path, default=Path("models/evaluation_fixtures.json"))
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--warmup-runs", type=int, default=2)
    parser.add_argument("--runs", type=int, default=10)
    parser.add_argument("--timeout-seconds", type=float, default=60)
    parser.add_argument("runtime_args", nargs=argparse.REMAINDER, help="Arguments after -- are passed to the local runtime.")
    args = parser.parse_args()

    if args.warmup_runs < 0 or args.runs < 10:
        parser.error("--warmup-runs must be non-negative and --runs must be at least 10")
    fixture = load_json(args.fixture)
    try:
        assert_synthetic_redacted_input(fixture)
    except BenchmarkError as error:
        parser.error(str(error))

    evidence = base_evidence(args, fixture)
    runtime, runtime_error = resolve_runtime(args.runtime_command)
    blockers: list[str] = []
    if runtime_error:
        blockers.append(runtime_error)
    if args.model is None:
        blockers.append("No --model path was supplied; no reviewed model artifact can be identified.")
    elif not args.model.is_file():
        blockers.append(f"Model artifact '{args.model}' does not exist as a local file.")
    if blockers:
        evidence.update({"status": "not_measured", "blockers": blockers, "raw_outputs": [], "measurements": []})
        write_evidence(args.output, evidence)
        print("NOT MEASURED: " + " ".join(blockers), file=sys.stderr)
        return 0

    evidence["memory_method"] = "Peak child-process working set sampled every 50 ms: tasklist on Windows, /proc/<pid>/status VmRSS on Linux."
    raw_outputs: list[dict[str, Any]] = []
    try:
        with tempfile.TemporaryDirectory(prefix="verma-bench-") as temporary_directory:
            prompt_file = Path(temporary_directory) / "synthetic-redacted-input.json"
            prompt_file.write_text(json.dumps(fixture, sort_keys=True), encoding="utf-8")
            command = build_command(runtime, args.runtime_args, args.model, prompt_file)
            for index in range(args.warmup_runs):
                warmup = run_once(command, args.timeout_seconds)
                raw_outputs.append({"phase": "warmup", "run": index + 1, **warmup})
                if warmup["exit_code"] != 0:
                    raise BenchmarkError(f"Warmup {index + 1} exited {warmup['exit_code']}")
            measurements: list[dict[str, Any]] = []
            for index in range(args.runs):
                measured = run_once(command, args.timeout_seconds)
                raw_outputs.append({"phase": "measured", "run": index + 1, **measured})
                if measured["exit_code"] != 0:
                    raise BenchmarkError(f"Measured run {index + 1} exited {measured['exit_code']}")
                measurements.append({key: value for key, value in measured.items() if key != "raw_output"})
    except (BenchmarkError, subprocess.TimeoutExpired) as error:
        evidence.update({"status": "not_measured", "blockers": [f"Runtime did not complete a valid benchmark: {error}"], "raw_outputs": raw_outputs, "measurements": []})
        write_evidence(args.output, evidence)
        print(f"NOT MEASURED: {error}", file=sys.stderr)
        return 1

    wall_clock = [float(item["wall_clock_ms"]) for item in measurements]
    evidence.update({
        "status": "measured",
        "raw_outputs": raw_outputs,
        "measurements": measurements,
        "summary_ms": summarize(wall_clock),
    })
    write_evidence(args.output, evidence)
    print(f"MEASURED: {args.runs} runs written to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
