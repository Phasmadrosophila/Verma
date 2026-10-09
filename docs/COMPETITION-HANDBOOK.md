# AppBuildersPH Hackathon 2026: Local AI

## Overnight Execution Handbook

**Build window:** 6:00 PM to 10:00 AM sharp
**Submission deadline:** October 10 at 10:00 AM
**Code freeze:** October 10 at 10:00 AM
**Finalists announced:** October 10 at 1:00 PM

This handbook converts the competition rules into a build, validation, and submission plan for the final overnight sprint.

## 1. Mission

Build a working product that uses AI running locally on the user's device to solve a real problem.

The product must make a convincing case that local AI enables an experience that would be difficult, expensive, slow, private, or impossible with a cloud-only approach.

The most important product question is:

> Why does this product benefit from running AI locally?

Answer this question in the product, demo, video, and submission form.

## 2. What Counts as a Strong Entry

Prioritize these outcomes in order:

1. A reliable working product that can be demonstrated live.
2. A clear target user and genuine problem.
3. Local inference that is fundamental to the product, not a decorative feature.
4. A concrete explanation of the local advantage.
5. A short, convincing demo with minimal presentation overhead.

Possible product domains include productivity, developer tools, accessibility, education, finance, gaming, creative tools, enterprise tools, computer vision, personal assistants, and privacy tools.

## 3. Judging Scorecard

| Weight | Criterion | What judges need to see |
| ---: | --- | --- |
| 25% | Problem and Usefulness | A genuine problem and a clear target user |
| 25% | Local AI Implementation | Local inference is fundamental and provides a meaningful advantage |
| 20% | Technical Execution | The product works reliably enough for a live demonstration |
| 15% | Innovation | Local AI enables something meaningfully different or new |
| 15% | Product and Demo Quality | The UX is usable and the demonstration is convincing |

Half of the score is usefulness and how real the Local AI implementation is. Do not trade reliability for extra features late in the sprint.

## 4. Local AI Proof

Document the boundary between local and online functionality before submission.

### Runs locally

- Model name and version
- Model type: language, vision, speech, or other
- Runtime used, such as Ollama, LM Studio, llama.cpp, MLX, ONNX, PyTorch, TensorFlow, or WebGPU
- Input processing performed on-device
- Inference performed on-device
- Output generated on-device
- Hardware and operating system used for the demo
- Approximate latency, if measured honestly
- What remains functional with the network disabled

### Requires internet

- Authentication and account services
- Remote databases or synchronization
- Cloud APIs used as secondary components
- Hosting, deployment, or asset delivery
- Any other network dependency

Cloud APIs are allowed only as secondary components. The core Local AI functionality must not depend entirely on a cloud AI API.

### Evidence standard

- Never invent or inflate benchmarks.
- If a benchmark is shown, record the test device, model, input, number of runs, and measurement method.
- Be able to demonstrate or explain what still works offline.
- Label cloud-assisted features clearly instead of presenting them as local.

## 5. Allowed Technology

No specific model, framework, operating system, or hardware platform is required. Open-source language, vision, and speech models are allowed.

Examples include:

- **Inference and runtimes:** Ollama, LM Studio, llama.cpp, MLX
- **ML frameworks and backends:** ONNX, PyTorch, TensorFlow, WebGPU
- **Platform and hardware acceleration:** Core ML, AMD ROCm, DirectML, Hugging Face

Mobile apps and hardware-based projects are allowed.

## 6. Hard Rules

Violations can result in a disputed result or disqualification.

- The project must be substantially built during the hackathon.
- Do not receive assistance from people outside the hackathon.
- Do not use fake benchmarks.
- Disclose existing code and assets used.
- Disclose all models, frameworks, APIs, cloud services, and AI development tools used.

AI-assisted development tools, including Devin, are allowed when disclosed in the submission.

## 7. Required Submission Materials

The submission portal accepts one submission per team. There are no edits or resubmissions after submission, so complete and verify everything before clicking submit.

### Project

- [ ] Project name
- [ ] Short description
- [ ] Team member names
- [ ] Public GitHub repository
- [ ] Repository is public before 10:00 AM
- [ ] README explains setup, usage, local model, and known limitations

### Proof

- [ ] Demo video, ideally around one minute
- [ ] X or LinkedIn video URL
- [ ] Social post tags Devin / Cognition
- [ ] Social post includes `#AppBuildersPH`
- [ ] Breakdown of what runs locally
- [ ] Breakdown of what requires internet
- [ ] Honest performance information, if claimed

### Disclosures

- [ ] Models used
- [ ] Technologies and frameworks used
- [ ] APIs and cloud services used
- [ ] Existing code and assets used
- [ ] AI development tools used, including Devin if applicable
- [ ] Local AI advantage is stated directly

## 8. 6:00 PM to 10:00 AM Plan

Use the schedule as a constraint. Replace scope with reliability when time runs short.

| Time | Focus | Exit condition |
| --- | --- | --- |
| 6:00–7:00 PM | Lock the problem, target user, local advantage, and smallest viable demo | One-sentence pitch, user flow, and feature cut list |
| 7:00–10:00 PM | Build the end-to-end happy path and local inference path | A user can complete the core task from start to finish |
| 10:00 PM–12:00 AM | Integrate UI, model runtime, and essential data flow | Product is demoable without developer-only steps |
| 12:00–1:00 AM | First full demo recording and failure review | Known failures are listed; backup path exists |
| 1:00–3:00 AM | Fix reliability, loading states, errors, and offline behavior | Core flow survives repeated runs |
| 3:00–4:00 AM | Freeze feature scope and collect proof | No new nonessential features are planned |
| 4:00–6:00 AM | Write README and submission disclosures | Repository and local/cloud boundary are documented |
| 6:00–7:00 AM | Produce the final demo video and social post draft | Final video and URL are ready for review |
| 7:00–8:00 AM | Clean repository and verify public access | Fresh clone/setup path works or is documented |
| 8:00–9:00 AM | Full submission rehearsal | Every form answer and link is checked by a second person |
| 9:00–9:30 AM | Final fixes only | No scope expansion; only release-blocking fixes remain |
| 9:30–9:50 AM | Submit | Submission is completed before the final buffer |
| 9:50–10:00 AM | Confirm receipt and stop changing code | Submission confirmation is saved; code is frozen |

### Scope rule

At 3:00 AM, freeze the feature list. After that point, accept only changes that fix a crash, broken core flow, misleading claim, missing requirement, or submission blocker.

## 9. Demo Script

The demo should show the product working before explaining implementation details.

1. State the target user and problem in one sentence.
2. Show the user starting the core task.
3. Show the local AI feature producing a useful result.
4. Point out the local boundary and the user-visible benefit: privacy, speed, offline use, cost, latency, or device capability.
5. Show one realistic result or completed workflow.
6. End with the product name and one-sentence local AI advantage.

Keep the demo video around one minute. Prioritize a working product over a large number of slides.

## 10. Demo Day Format

- **5 minutes:** Pitch and live demo
- **3 minutes:** Judge Q&A
- **8 minutes total:** Per team

Prepare short answers for:

- Why must this run locally?
- What exactly runs locally?
- What requires the internet?
- Which model and runtime are used?
- What happens if the model is slow or unavailable?
- Who is the target user, and what evidence shows the problem is real?
- What was built during the hackathon?
- What would you build next with more time?

## 11. Final Verification Checklist

### Product

- [ ] Fresh launch succeeds
- [ ] Core flow works repeatedly
- [ ] Loading and error states are understandable
- [ ] Local model loads on the demo device
- [ ] Demo data is prepared and safe to show
- [ ] Network loss behavior is understood
- [ ] No unfinished controls or placeholder text are visible

### Repository

- [ ] GitHub repository is public
- [ ] README includes setup and run commands
- [ ] Required model download or runtime steps are documented
- [ ] Secrets and private credentials are removed
- [ ] Existing code and assets are disclosed
- [ ] Models, frameworks, APIs, and AI tools are disclosed
- [ ] Repository link opens in an incognito or logged-out window

### Submission

- [ ] Project name is consistent everywhere
- [ ] Short description explains the user problem
- [ ] Team members are complete
- [ ] Demo video plays from the submitted link
- [ ] X or LinkedIn post tags Devin / Cognition
- [ ] X or LinkedIn post includes `#AppBuildersPH`
- [ ] Local and internet components are separated clearly
- [ ] The answer to “Why local AI?” is explicit
- [ ] All links work
- [ ] Submission confirmation is saved

## 12. Official Links

- [Official website](https://appbuildersph.com/hackathon)
- [Hackathon page and submission portal](https://cerebralvalley.ai/e/appbuildersph-hackathon-2026)
- [Official Telegram group chat](https://t.me/+uxlZLV5_jEZjMDNl)

Build Day is fully remote, teams may continue building overnight, and competition questions should be posted in the official Telegram group chat.
