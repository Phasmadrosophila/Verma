# Offline visual E2E harness

Run `pnpm test:e2e:offline` from the repository root. The command starts the real Vite frontend and Hono API on randomized loopback ports, waits for their readiness, drives a fresh browser profile through the synthetic vault flow, and terminates every child process in its test cleanup.

The harness writes reviewable PNG checkpoints and a value-free `summary.json` under `.local/e2e/` (ignored by Git). It captures only pre-reveal UI states; the explicit-reveal action is asserted and closed without a screenshot, while every checkpoint rejects rendered synthetic secret-value patterns before saving the image.

Chrome is the only host prerequisite beyond the repository Node and pnpm requirements. Set `CHROME_PATH` when Chrome is not installed at the standard Windows path; the browser is launched headless with a fresh temporary profile and only visits loopback URLs.
