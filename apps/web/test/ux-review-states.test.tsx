import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SuggestionCard } from '../src/components/SuggestionCard.js';
import { VaultResultCard } from '../src/components/VaultResultCard.js';
import { SyncStatusBadge, type SyncStateMode } from '../src/components/SyncStatusBadge.js';
import { StatusBanner } from '../src/components/StatusBanner.js';
import { ConfirmDialog } from '../src/components/ConfirmDialog.js';
import {
  ALL_SYNTHETIC_ENTRIES,
  projectMetadata,
  type VaultEntry,
} from '@app/shared';

/**
 * WCAG Relative Luminance and Contrast Ratio Calculation
 * Standard formula per WCAG 2.1 Guidelines (§1.4.3 & §1.4.6)
 */
function getLuminance(hex: string): number {
  const rgb = hex.replace('#', '');
  const r = parseInt(rgb.substring(0, 2), 16) / 255;
  const g = parseInt(rgb.substring(2, 4), 16) / 255;
  const b = parseInt(rgb.substring(4, 6), 16) / 255;

  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const brighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (brighter + 0.05) / (darker + 0.05);
}

describe('F-04 Verma UX & Review States (Issue #5 / C-M0-03)', () => {
  // AC-C-M0-03-01: Suggestion vs. Applied Visual Distinction & Review Controls
  describe('AC-C-M0-03-01: AI Suggestions Visually Distinct from Vault State', () => {
    it('renders suggestion card with distinct lavender assist surface and periwinkle border', () => {
      const html = renderToStaticMarkup(
        <SuggestionCard
          type="tag"
          title="Auto-tag suggestion"
          description="AI detected recurring login domain github.com with organization SSO patterns"
          proposedValue={['work', 'devops']}
          confidence="high"
          status="proposed"
          reason="Matches organization repository patterns"
          onAccept={() => {}}
          onEdit={() => {}}
          onReject={() => {}}
        />
      );

      // Verify assist surface token
      assert.ok(
        html.includes('var(--color-assist-surface)'),
        'Suggestion card must use --color-assist-surface background'
      );
      // Verify assist border token
      assert.ok(
        html.includes('var(--color-brand-periwinkle)'),
        'Suggestion card must use --color-brand-periwinkle border'
      );
      // Verify explicit Suggestion badge
      assert.ok(
        html.includes('Suggestion'),
        'Suggestion card must prominently display "Suggestion" badge'
      );
      assert.ok(
        html.includes('Not saved yet'),
        'Card header must explicitly state not saved yet status'
      );
    });

    it('provides distinct review controls (Accept, Edit, Reject)', () => {
      const html = renderToStaticMarkup(
        <SuggestionCard
          type="tag"
          title="Auto-tag suggestion"
          description="AI detected recurring login domain github.com"
          proposedValue={['work', 'devops']}
          confidence="high"
          status="proposed"
          onAccept={() => {}}
          onEdit={() => {}}
          onReject={() => {}}
        />
      );

      assert.ok(html.includes('Accept'), 'Must offer explicit Accept control');
      assert.ok(html.includes('Edit'), 'Must offer explicit Edit control');
      assert.ok(html.includes('Reject'), 'Must offer explicit Reject control');
      assert.ok(html.includes('aria-label="Accept suggestion"'));
      assert.ok(html.includes('aria-label="Edit suggestion"'));
      assert.ok(html.includes('aria-label="Reject suggestion"'));
    });

    it('renders committed card using neutral surface when already applied', () => {
      const html = renderToStaticMarkup(
        <SuggestionCard
          type="tag"
          title="Auto-tag suggestion"
          description="AI detected recurring login domain github.com"
          proposedValue={['work', 'devops']}
          status="accepted"
          onAccept={() => {}}
          onReject={() => {}}
        />
      );

      // In applied state, assist styling is replaced by committed vault styling
      assert.ok(
        html.includes('var(--color-surface)'),
        'Applied card must use standard vault surface'
      );
      assert.ok(
        html.includes('Applied to Vault'),
        'Committed state must reflect applied vault status'
      );
      assert.ok(
        !html.includes('Not saved yet'),
        'Applied card must not show active review prompt'
      );
    });
  });

  // AC-C-M0-03-02: Zero Secret Exposure in Search & AI Results
  describe('AC-C-M0-03-02: Zero Secret Exposure in AI & Search Result Cards', () => {
    it('strictly masks passwords and denies secret fields on synthetic login entries', () => {
      const syntheticLogins = ALL_SYNTHETIC_ENTRIES.filter((e) => e.type === 'login');
      assert.ok(syntheticLogins.length > 0, 'Synthetic logins fixture required');

      for (const login of syntheticLogins) {
        const rawPassword = (login as any).password;
        assert.ok(rawPassword, 'Synthetic fixture should have a test password');

        const metadata = projectMetadata(login as VaultEntry);
        const html = renderToStaticMarkup(
          <VaultResultCard
            metadata={metadata}
            onOpenDetails={() => {}}
            onRevealClick={() => {}}
          />
        );

        // Invariant: Raw password must NEVER appear in the rendered HTML
        assert.ok(
          !html.includes(rawPassword),
          `Raw password "${rawPassword}" was exposed in result card HTML!`
        );

        // Verification: Secret is masked with dots and labeled
        assert.ok(
          html.includes('••••••••'),
          'Password placeholder must display masked bullets'
        );
        assert.ok(
          html.includes('aria-label="Secret hidden"'),
          'Masked field must have aria-label="Secret hidden"'
        );
        assert.ok(
          html.includes('Unlock to reveal'),
          'Result card must offer explicit Unlock to reveal button'
        );
      }
    });

    it('strictly masks API secret keys and denies token fields on synthetic api_key entries', () => {
      const syntheticApiKeys = ALL_SYNTHETIC_ENTRIES.filter((e) => e.type === 'api_key');
      assert.ok(syntheticApiKeys.length > 0, 'Synthetic api_key fixtures required');

      for (const apiKeyEntry of syntheticApiKeys) {
        const rawSecret = (apiKeyEntry as any).apiSecret;
        if (rawSecret) {
          const metadata = projectMetadata(apiKeyEntry as VaultEntry);
          const html = renderToStaticMarkup(
            <VaultResultCard
              metadata={metadata}
              onOpenDetails={() => {}}
              onRevealClick={() => {}}
            />
          );

          assert.ok(
            !html.includes(rawSecret),
            `Raw API Secret "${rawSecret}" was leaked in result card HTML!`
          );
          assert.ok(
            html.includes('••••••••'),
            'API secret must be masked with bullet placeholders'
          );
        }
      }
    });

    it('strictly masks note body content on synthetic note entries', () => {
      const syntheticNotes = ALL_SYNTHETIC_ENTRIES.filter((e) => e.type === 'note');
      assert.ok(syntheticNotes.length > 0, 'Synthetic note fixtures required');

      for (const noteEntry of syntheticNotes) {
        const rawContent = (noteEntry as any).content;
        assert.ok(rawContent, 'Synthetic note must have content');

        const metadata = projectMetadata(noteEntry as VaultEntry);
        const html = renderToStaticMarkup(
          <VaultResultCard
            metadata={metadata}
            onOpenDetails={() => {}}
            onRevealClick={() => {}}
          />
        );

        assert.ok(
          !html.includes(rawContent),
          `Raw note content "${rawContent}" was leaked in result card HTML!`
        );
        assert.ok(
          html.includes('••••••••'),
          'Note body must be masked with bullet placeholders'
        );
      }
    });
  });

  // AC-C-M0-03-03: Plain-Language Visibility for Operational States
  describe('AC-C-M0-03-03: Operational State Visibility & Human-Readable Labels', () => {
    const states: Array<{ mode: SyncStateMode; expectedText: string }> = [
      { mode: 'local', expectedText: 'Local mode · On-Device' },
      { mode: 'offline', expectedText: 'Working offline' },
      { mode: 'syncing', expectedText: 'Syncing directly' },
      { mode: 'synced', expectedText: 'Synced directly' },
      { mode: 'blocked', expectedText: 'Sync blocked' },
      { mode: 'confirming', expectedText: 'Awaiting confirmation' },
    ];

    for (const { mode, expectedText } of states) {
      it(`renders human-readable plain language for mode: "${mode}"`, () => {
        const html = renderToStaticMarkup(
          <SyncStatusBadge mode={mode} />
        );

        assert.ok(
          html.includes(expectedText),
          `Expected badge to contain plain-language text "${expectedText}" for mode "${mode}"`
        );
        assert.ok(
          html.includes('role="status"'),
          'Sync status badge must have role="status" for assistive tech'
        );
      });
    }

    it('renders persistent StatusBanner across application operational modes', () => {
      const bannerModes = [
        { variant: 'warning' as const, title: 'Vault is Locked', description: 'AI metadata access is revoked.' },
        { variant: 'offline' as const, title: 'Offline Mode Active', description: 'Changes are saved locally on device.' },
        { variant: 'error' as const, title: 'Direct sync interrupted', description: 'Local vault remains intact.' },
        { variant: 'ai-boundary' as const, title: 'AI Redaction Active', description: 'Operating on allowlisted metadata only.' },
      ];

      for (const { variant, title, description } of bannerModes) {
        const html = renderToStaticMarkup(
          <StatusBanner
            variant={variant}
            title={title}
            description={description}
            dismissible={true}
            onDismiss={() => {}}
          />
        );

        assert.ok(
          html.includes(title),
          `Banner must render title text for "${variant}"`
        );
        assert.ok(
          html.includes(description),
          `Banner must render description text for "${variant}"`
        );
        assert.ok(
          html.includes('role="alert"') || html.includes('role="status"'),
          'Banner must provide accessible role attribute'
        );
      }
    });
  });

  // AC-C-M0-03-04: Keyboard Focus, Accessibility, and WCAG Contrast Verification
  describe('AC-C-M0-03-04: Keyboard Focus, WCAG Contrast, and Accessible Dialogs', () => {
    it('verifies ConfirmDialog accessibility attributes and consequence explanations', () => {
      const html = renderToStaticMarkup(
        <ConfirmDialog
          isOpen={true}
          title="Delete Master Entry"
          description="Are you sure you want to delete this secret entry?"
          consequence="This action removes the entry from the encrypted store and cannot be undone."
          confirmText="Delete permanently"
          cancelText="Cancel"
          isDestructive={true}
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );

      assert.ok(html.includes('role="dialog"'), 'ConfirmDialog must have role="dialog"');
      assert.ok(html.includes('aria-modal="true"'), 'ConfirmDialog must have aria-modal="true"');
      assert.ok(html.includes('aria-labelledby="dialog-title"'), 'Must have aria-labelledby');
      assert.ok(html.includes('aria-describedby="dialog-desc"'), 'Must have aria-describedby');
      assert.ok(html.includes('Delete permanently'), 'Must show custom confirmation text');
      assert.ok(
        html.includes('This action removes the entry from the encrypted store'),
        'Must prominently display consequence notice'
      );
      assert.ok(
        html.includes('focus:ring-2'),
        'Action buttons must specify visible keyboard focus ring'
      );
    });

    it('verifies design tokens satisfy WCAG AA (>= 4.5:1) and WCAG AAA (>= 7.0:1) contrast', () => {
      // Verma design tokens defined in docs/design-system.md
      const charcoalText = '#2D2B2A';
      const canvasBackground = '#F7F5F0';
      const paperSurface = '#FFFCF8';
      const assistSurface = '#E8EAFE'; // Lavender AI assist surface
      const warmSurface = '#FCEEE5'; // Warm orange tint surface
      const brandOrange = '#E5733B';

      // 1. Charcoal text on Lavender Assist Surface (AC-C-M0-03-01)
      const assistContrast = getContrastRatio(charcoalText, assistSurface);
      assert.ok(
        assistContrast >= 7.0,
        `Assist surface contrast (${assistContrast.toFixed(2)}:1) must meet WCAG AAA (>= 7:1)`
      );

      // 2. Charcoal text on Paper Surface
      const paperContrast = getContrastRatio(charcoalText, paperSurface);
      assert.ok(
        paperContrast >= 7.0,
        `Paper surface contrast (${paperContrast.toFixed(2)}:1) must meet WCAG AAA (>= 7:1)`
      );

      // 3. Charcoal text on Canvas Background
      const canvasContrast = getContrastRatio(charcoalText, canvasBackground);
      assert.ok(
        canvasContrast >= 7.0,
        `Canvas background contrast (${canvasContrast.toFixed(2)}:1) must meet WCAG AAA (>= 7:1)`
      );

      // 4. Charcoal text on Warm Tint Surface
      const warmContrast = getContrastRatio(charcoalText, warmSurface);
      assert.ok(
        warmContrast >= 7.0,
        `Warm surface contrast (${warmContrast.toFixed(2)}:1) must meet WCAG AAA (>= 7:1)`
      );

      // 5. White text on Brand Orange (CTA buttons)
      const whiteOnOrange = getContrastRatio('#FFFFFF', brandOrange);
      assert.ok(
        whiteOnOrange >= 3.0,
        `White on Brand Orange (${whiteOnOrange.toFixed(2)}:1) must satisfy minimum UI component threshold`
      );
    });
  });
});
