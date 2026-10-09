# Release model inventory

This is the E-MR-03 release-evidence inventory. It records only evidence that
is available in this checkout; it is not an approval to download, bundle, or
redistribute a model.

| Field | Release evidence |
| --- | --- |
| Application model | Qwen3 0.6B (`qwen3:0.6b` through Ollama in development). |
| Production runtime | `llama.cpp` (planned); Ollama is development-only. |
| Exact GGUF artifact | No exact artifact has been selected or made available for review. |
| Artifact availability | **NOT VERIFIED** |
| SHA-256 | Not recorded; an unavailable artifact has no hash claim. |
| Selection status | Application model selected; exact production artifact not selected |
| Manifest state | `models/manifest.json` remains `tbd`. |

The candidate name and reported upstream characteristics are not a substitute
for an exact artifact. The release gate remains blocked until a reviewer has
the exact GGUF, records its provenance and digest from the received file, and
completes the required quality, security, and redistribution review.

## Evidence boundary

- No GGUF file is present in this repository's model artifact directory.
- This inventory intentionally does not copy a digest from an unverified
  download, report, or third-party listing.
- A future selected entry must be independently verified by the model manifest
  verifier before release evidence can describe it as verified.

