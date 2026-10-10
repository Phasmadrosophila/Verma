# Reproduce the approved HTML previews

Task: C-MR-03 / #77. Use Node 22+ and the pinned pnpm 12.8.1.
Run commands from the repository root on the updated design branches.
For the combined landing + mobile preview, use the landing branch from PR #76.

```sh
pnpm install --frozen-lockfile
pnpm preview:landing
# Second terminal:
pnpm preview:mobile
```

For the local backend-connected experience, run the API as well:

```sh
# Terminal 1
pnpm dev
# Terminal 2
pnpm preview:landing
```

Then open `http://localhost:5127/download` or `http://localhost:5127/pricing`.
The **Launch Verma Local** and **Launch Basic** actions open `/app#vault`, which
is the mobile UI served by the landing server. Its `/api/*` requests stay on
the same machine and are proxied to the loopback Hono API at port 3000. If the
API is unavailable, the UI remains usable in its local browser-storage fallback;
`?demo=1` remains the isolated six-entry screenshot mode.

- Landing: http://localhost:5127/
- Mobile screenshot state: http://localhost:5128/?demo=1#vault
- Mobile onboarding: http://localhost:5128/?demo=1#welcome
- PR #76 also serves the mobile preview at http://localhost:5127/app?demo=1#vault.
- Use HTTP, not HTTPS. These local preview servers do not configure TLS.
- Custom port, same command on Windows/macOS/Linux: `pnpm preview:landing --port 6127`
  or `pnpm preview:mobile --port 6128`. CLI port overrides PORT; unset an old PORT
  environment variable to use the defaults. If a port is occupied, choose another.
- `preview:web` is a compatibility alias for the mobile HTML preview.
- `dev:web` launches the separate React desktop vault. `mobile:start` launches
  Expo. Neither is the HTML screenshot implementation.

Fonts and their OFL licenses are bundled under assets/fonts. Both servers serve
the same font files, without Google Fonts or another asset CDN at runtime.
The query `demo=1` ignores existing storage and never writes entries, passphrase,
or devices to browser storage. Refreshing resets its six synthetic entries;
normal-mode saved state is not deleted or changed. Keep demo=1 when navigating
between preview hashes. This is a UI prototype: use synthetic data only.

Use the same CSS viewport, 100% browser zoom, and the same page state to compare.
The mobile desktop frame is 424px wide with a maximum 860px height. At viewport
widths of 520px or less, the UI intentionally fills the viewport and hides the
simulated status bar. This is responsive behavior, not a missing asset.
The landing reference is approximately 1897 x 903; its phone demo and brand
animate, so a screenshot can capture a different frame. OS text rasterization
can differ even with the identical bundled font.

## Verification

- `pnpm check:previews`: font files, recursive HTML/CSS/module dependencies on
  fresh servers, CLI/custom ports, trailing-slash routes, and storage isolation.
- `node --test qa/*.test.mjs apps/mobile-preview/tests/*.test.mjs`: 13 checks pass
  on the combined landing branch.
- `pnpm run check`: all workspace type/syntax checks pass.
- `pnpm --filter @app/web run lint`: pass.
- Orca browser: mobile at 800 x 876, 390 x 844, and 320 x 700; six entries,
  bundled Fredoka/Parkinsans loaded, no document/device horizontal overflow.
- Landing at 390 x 844 and approximately 1897 x 903: no horizontal overflow,
  bundled fonts loaded, no broken images, no external render requests.
- Mobile screenshots inspected at desktop-frame and narrow widths.

Limitations: only this machine's Chromium browser was available. No physical
second machine, Safari, or Firefox run is claimed. Orca's wide screenshot capture
showed repeated tiles; DOM layout checks passed but a pixel-perfect comparison
at 1897px is not claimed. The legacy single-evaluation landing smoke script
failed its timed gallery-control assertion; separate inspection confirmed the
track can advance and controls update. Its full interaction suite is not claimed
as passed. CI status is reported separately by GitHub.
