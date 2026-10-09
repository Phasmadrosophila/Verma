# Verma — Marketing & Product Landing Page

The official marketing and showcase website for **Verma** ("A password manager you do not have to learn"), built with pure semantic HTML, vanilla CSS, and vanilla JavaScript without external dependencies.

## Quick Start

Requires Node.js 20 or newer. No external npm dependencies required.

```bash
# Start the preview server on port 3000
npm start
# or
node server.mjs
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Page Structure

The landing website consists of 6 thoughtful, responsive sections:

1. **Hero**: Product headline (*"Your digital life. A little lighter."*), phone mockup with real UI captures, floating reassurance badge, and value strip.
2. **Features Grid (`#features`)**: Three core pillars:
   - **01 / KEEP**: Everything has a little home.
   - **02 / ORGANIZE**: Bring the mess. Find a little order.
   - **03 / FIND**: On the tip of your tongue?
3. **App Showcase (`#inside`)**: Horizontal snap-scroll gallery previewing the 4 core app surfaces (*Your Vault*, *Ask Verma*, *Smart Import*, *Device Sync*) with keyboard-accessible previous/next controls.
4. **How It Works (`#how`)**: 3-step setup walkthrough (*Say hello*, *Bring things along*, *Make room for you*).
5. **Trust & Privacy Boundary (`#privacy`)**: Direct visual representation of Verma's core security model:
   - Metadata visible to assistant: titles, domains, tags.
   - Vault boundary: secrets and note contents remain strictly masked on-device.
6. **FAQ Accordion (`#questions`) & Call to Action**: Semantic disclosures answering scope, file formats, privacy, and account setup.

## Responsive Design

- Fully responsive across desktop (1440px), tablet (768px), and mobile (390px, 320px).
- Mobile navigation drawer with escape-key dismissal and focus restoration.
- Supports `prefers-reduced-motion: reduce`.
- Guaranteed zero horizontal overflow across all device widths.

## Checks & QA

```bash
# Verify JavaScript syntax
npm run check:landing
```

In-browser responsive checks can be run using `qa/landing-smoke.js`.
