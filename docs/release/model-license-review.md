# Model license review

## E-MR-03 status

| Field | Review state |
| --- | --- |
| Review status | **OPEN** |
| Verma product direction | Fair-code, source-available; the final product license is not selected. |
| Application model license signal | Apache-2.0 is reported for Qwen3 0.6B, but the exact production GGUF and its provenance are **NOT VERIFIED**. |
| Compatibility result | No compatibility conclusion has been made. |

## Apache-2.0 and the fair-code direction

Apache-2.0 is a permissive license direction for an upstream model component.
Verma's fair-code/source-available direction instead concerns the licensing of
Verma's own code and product distribution. Those are distinct questions: a
reported Apache-2.0 upstream license does not, by itself, establish that a
specific GGUF can be redistributed with Verma or that it is compatible with a
final, still-unselected fair-code license.

## OPEN legal and release items

- **OPEN:** Select Verma's final fair-code/source-available license and obtain
  legal review of its distribution and commercial-use terms.
- **OPEN:** Identify the exact upstream GGUF, its version, source, and
  accompanying license/notice materials.
- **OPEN:** Verify the license and provenance from the exact artifact source;
  the unavailable GGUF is **NOT VERIFIED**.
- **OPEN:** Determine whether model redistribution, modification, packaging,
  notices, and attribution are permitted for Verma's intended release modes.
- **OPEN:** Record the reviewer, date, conclusion, and any required notices
  before moving the manifest from `tbd` to `selected`.

No release, download, bundling, or redistribution approval follows from this
document. These items remain open until qualified legal and release reviewers
record evidence for the selected artifact and final product license.

