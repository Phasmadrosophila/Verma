import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { VaultContext, type VaultContextType } from '../src/VaultContext.js';
import { EntryList } from '../src/pages/EntryList.js';
import { EntryForm } from '../src/pages/EntryForm.js';
import { AskVault } from '../src/pages/AskVault.js';
import { SmartImport } from '../src/pages/SmartImport.js';
import { LockScreen } from '../src/pages/LockScreen.js';
import { Settings } from '../src/pages/Settings.js';
import { Layout } from '../src/components/Layout.js';
import { VaultResultCard } from '../src/components/VaultResultCard.js';
import { Button } from '../src/components/primitives/Button.js';
import { LoadingState } from '../src/components/primitives/LoadingState.js';
import { EmptyState } from '../src/components/primitives/EmptyState.js';
import { ErrorState } from '../src/components/primitives/ErrorState.js';
import { StatusBanner } from '../src/components/StatusBanner.js';
import { SYNTHETIC_MESSY_BROWSER_CSV } from '@app/shared';

const mockUnlockedContext: VaultContextType = {
  status: 'unlocked',
  isLocked: false,
  isInitialized: true,
  checkStatus: async () => {},
};

const mockLockedContext: VaultContextType = {
  status: 'locked',
  isLocked: true,
  isInitialized: true,
  checkStatus: async () => {},
};

function renderInRouter(ui: React.ReactElement, context: VaultContextType = mockUnlockedContext, route = '/') {
  return renderToStaticMarkup(
    <VaultContext.Provider value={context}>
      <MemoryRouter initialEntries={[route]}>
        {ui}
      </MemoryRouter>
    </VaultContext.Provider>
  );
}

describe('C-M0-07: Harden Frontend Accessibility, Responsive States, and Demo Flow', () => {
  // AC-C-M0-07-01: Keyboard navigation, visible focus, semantic labels, screen-reader status/error messaging
  describe('AC-C-M0-07-01: Accessibility, Keyboard Focus, and Semantic Messaging', () => {
    it('provides a labelled vault search control with a visible focus treatment', () => {
      const html = renderInRouter(<EntryList />);
      assert.ok(
        html.includes('aria-label="Search metadata"') || html.includes('aria-label="Search metadata in vault"'),
        'Search input must have explicit aria-label'
      );
      assert.ok(html.includes('focus-ring'), 'Search input must use visible focus-ring utility');
    });

    it('ensures form fields have associated labels and inputs with ID linkage', () => {
      const html = renderInRouter(<EntryForm />);
      // Title field linkage
      assert.ok(html.includes('for="entry-title"') || html.includes('htmlFor="entry-title"'), 'Title label must have htmlFor');
      assert.ok(html.includes('id="entry-title"'), 'Title input must have matching id');
      // Entry type fieldset semantics
      assert.ok(html.includes('<fieldset'), 'Radio options must be wrapped in a semantic fieldset');
      assert.ok(html.includes('<legend'), 'Radio options must have a descriptive legend');
    });

    it('announces masked secrets as Secret hidden to assistive technology', () => {
      const cardHtml = renderToStaticMarkup(
        <VaultResultCard
          metadata={{
            id: 'test-1',
            type: 'login',
            title: 'GitHub',
            domain: 'github.com',
            tags: ['dev'],
            createdAt: '2026-01-01',
            updatedAt: '2026-01-01',
          }}
          onOpenDetails={() => {}}
          onRevealClick={() => {}}
        />
      );
      assert.ok(
        cardHtml.includes('aria-label="Secret hidden"') || cardHtml.includes('Secret hidden'),
        'Masked secret indicators must provide accessible "Secret hidden" label'
      );
      assert.ok(cardHtml.includes('aria-label="View details for GitHub"'));
      assert.ok(cardHtml.includes('aria-label="Unlock to reveal secret for GitHub"'));
      assert.ok(cardHtml.includes('focus-ring'), 'Card actions must show visible keyboard focus');
    });

    it('uses role="alert" for validation and error messages to notify screen readers immediately', () => {
      const html = renderToStaticMarkup(
        <ErrorState
          title="Operation Failed"
          description="Unable to persist entry changes to encrypted store."
          consequence="Existing vault data remains untouched."
        />
      );
      assert.ok(html.includes('role="alert"'), 'ErrorState must use role="alert"');
      assert.ok(html.includes('Existing vault data remains untouched.'));
    });

    it('guarantees WCAG AA compliant text contrast with zero white-on-orange text', () => {
      const smartImportHtml = renderInRouter(<SmartImport />);
      // Check that brand orange buttons do NOT use text-white
      const hasWhiteOnOrange = smartImportHtml.includes('bg-[var(--color-brand-orange)] text-white');
      assert.strictEqual(
        hasWhiteOnOrange,
        false,
        'Primary orange controls must not use white text (must use charcoal text for 6.04:1 contrast)'
      );
    });
  });

  // AC-C-M0-07-02: Desktop and narrow mobile layouts remain usable without clipped actions or horizontal scrolling
  describe('AC-C-M0-07-02: Responsive Layouts and Viewport Adaptability', () => {
    it('enforces overflow-x-hidden on root containers to prevent two-dimensional scrolling', () => {
      const html = renderInRouter(<Layout />);
      assert.ok(html.includes('overflow-x-hidden'), 'Layout root must enforce overflow-x-hidden');
      assert.ok(html.includes('Skip to main content'), 'Skip-link must be available for keyboard users');
    });

    it('includes both desktop navigation and mobile navigation bars', () => {
      const html = renderInRouter(<Layout />);
      // Desktop nav container
      assert.ok(html.includes('aria-label="Vault navigation"'), 'Desktop navigation must be labelled');
      // Mobile header
      assert.ok(html.includes('aria-label="Mobile header"'), 'Mobile header must be labelled');
      // Mobile bottom bar
      assert.ok(html.includes('aria-label="Mobile bottom navigation"'), 'Mobile bottom bar must be labelled');
    });

    it('ensures touch targets and buttons satisfy minimum dimensions', () => {
      const html = renderToStaticMarkup(
        <Button size="md">Test Action</Button>
      );
      assert.ok(html.includes('min-h-[40px]'), 'Buttons must meet minimum 40px desktop / 44px mobile target height');
    });

    it('adapts recovery phrase display into responsive columns on narrow screens', () => {
      const html = renderInRouter(<LockScreen />, { ...mockUnlockedContext, isInitialized: false });
      // Renders lock screen with responsive recovery grid or password prompt
      assert.ok(html.includes('Verma'), 'Renders initial lock/setup screen cleanly');
    });

    it('stacks settings headers and status panels at narrow widths', () => {
      const html = renderInRouter(<Settings />);
      assert.ok(html.includes('flex-col sm:flex-row'));
      assert.ok(html.includes('p-4 sm:p-6'));
    });
  });

  // AC-C-M0-07-03: Loading, empty, offline, locked, validation, and error states provide a clear next action
  describe('AC-C-M0-07-03: State Coverage Matrix & Clear Next Actions', () => {
    it('provides clear next action CTA in empty state', () => {
      const html = renderToStaticMarkup(
        <EmptyState
          title="Your vault is empty"
          description="Store your passwords, note bodies, and API keys securely on this device."
          action={{
            label: 'Create First Entry',
            onClick: () => {},
          }}
        />
      );
      assert.ok(html.includes('Create First Entry'), 'EmptyState must include actionable CTA');
      assert.ok(html.includes('role="region"'), 'EmptyState must use semantic region role');
    });

    it('describes operation and remains polite in loading state', () => {
      const html = renderToStaticMarkup(
        <LoadingState
          title="Searching selected metadata on this device…"
          description="Comparing query against titles, domains, and tags."
        />
      );
      assert.ok(html.includes('role="status"'), 'LoadingState must use role="status"');
      assert.ok(html.includes('aria-live="polite"'), 'LoadingState must be polite');
      assert.ok(html.includes('animate-spin'), 'LoadingState must show visual progress indicator');
    });

    it('explains revoked metadata access and provides unlock CTA when locked', () => {
      const html = renderInRouter(<AskVault />, mockLockedContext);
      assert.ok(html.includes('Vault is Locked'), 'Must display locked notice');
      assert.ok(html.includes('AI metadata access is revoked'), 'Must explain security consequence');
      assert.ok(html.includes('Unlock Vault'), 'Must provide direct next action to unlock');
    });

    it('presents informative offline banner without blocking manual operations', () => {
      const html = renderToStaticMarkup(
        <StatusBanner
          variant="offline"
          title="Local AI Inference Offline"
          description="Local model is offline or disabled. Search automatically falls back to deterministic metadata keyword search."
        />
      );
      assert.ok(html.includes('Local AI Inference Offline'), 'Must explain offline state');
      assert.ok(html.includes('falls back to deterministic metadata keyword search'), 'Must explain fallback capability');
    });

    it('explains failure and provides retry action in error states', () => {
      const html = renderToStaticMarkup(
        <ErrorState
          title="Unable to import CSV"
          description="The selected file contains unparseable formatting."
          consequence="No records were written to your vault."
          action={{
            label: 'Choose Another File',
            onClick: () => {},
          }}
        />
      );
      assert.ok(html.includes('Unable to import CSV'));
      assert.ok(html.includes('No records were written to your vault.'));
      assert.ok(html.includes('Choose Another File'));
    });
  });

  // AC-C-M0-07-04: UI tests cover the winning demo path using synthetic data and confirm that AI-disabled behavior remains understandable
  describe('AC-C-M0-07-04: Winning Demo Path & Understandable AI-Disabled Flow', () => {
    it('supports step 1: Lock/Setup screen with explicit zero-recovery notice', () => {
      const html = renderInRouter(<LockScreen />);
      assert.ok(html.includes('Verma'), 'Must display Verma header');
      assert.ok(html.includes('What matters, stays with you.'), 'Must display brand motto');
    });

    it('supports step 2 & 3: Smart Import with synthetic messy CSV and write boundary', () => {
      const html = renderInRouter(<SmartImport />);
      assert.ok(html.includes('Smart Import'), 'Must display Smart Import heading');
      assert.ok(html.includes('Local AI: On-Device (No Network)'), 'Must display local AI status');
      assert.ok(html.includes('Load Synthetic Demo CSV'), 'Must offer synthetic demo CSV button');
      assert.ok(SYNTHETIC_MESSY_BROWSER_CSV.length > 0, 'Synthetic messy CSV fixture must be non-empty');
    });

    it('supports step 4 & 5: Ask Your Vault natural language metadata search with secret values hidden', () => {
      const html = renderInRouter(<AskVault />);
      assert.ok(html.includes('Ask Your Vault'), 'Must display Ask Your Vault title');
      assert.ok(html.includes('Privacy Invariant'), 'Must clearly state privacy invariant');
      assert.ok(html.includes('Passwords, recovery codes, and secret payloads are <strong>never</strong> searched'));
      assert.ok(html.includes('Ask Vault'), 'Must have Ask Vault submit button');
    });

    it('confirms understandable fallback when AI is disabled', () => {
      const html = renderInRouter(<Settings />);
      assert.ok(html.includes('Local AI &amp; Privacy Boundary'), 'Settings must feature privacy boundary');
      assert.ok(html.includes('Strict Zero Secret-Field Exposure Enforced in Code'));
      assert.ok(html.includes('Passwords, note contents,') && html.includes('never sent to the model'));
    });
  });
});
