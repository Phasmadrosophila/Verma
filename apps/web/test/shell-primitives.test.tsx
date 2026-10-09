import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { Button } from '../src/components/primitives/Button.js';
import { InputField } from '../src/components/primitives/InputField.js';
import { EmptyState } from '../src/components/primitives/EmptyState.js';
import { LoadingState } from '../src/components/primitives/LoadingState.js';
import { ErrorState } from '../src/components/primitives/ErrorState.js';
import { Layout } from '../src/components/Layout.js';
import { Settings } from '../src/pages/Settings.js';
import { VaultContext, type VaultContextType } from '../src/VaultContext.js';
import {
  colors,
  spacing,
  radius,
  typography,
  breakpoints,
} from '../src/tokens.js';

const mockVaultContext: VaultContextType = {
  status: 'unlocked',
  isLocked: false,
  isInitialized: true,
  checkStatus: async () => {},
};

function renderWithShell(ui: React.ReactElement, initialPath = '/') {
  return renderToStaticMarkup(
    <VaultContext.Provider value={mockVaultContext}>
      <MemoryRouter initialEntries={[initialPath]}>
        {ui}
      </MemoryRouter>
    </VaultContext.Provider>
  );
}

describe('C-M0-04: Verma Frontend Shell & Design Primitives', () => {
  // AC-C-M0-04-01: Consistent shell for locked, unlocked, loading, empty, and error states
  describe('AC-C-M0-04-01: Consistent Shell State Primitives', () => {
    it('renders descriptive LoadingState with accessible status role', () => {
      const html = renderToStaticMarkup(
        <LoadingState
          title="Loading encrypted vault..."
          description="Decrypting keys and initializing on-device state."
        />
      );

      assert.ok(html.includes('role="status"'), 'LoadingState must have role="status"');
      assert.ok(html.includes('aria-live="polite"'), 'LoadingState must use polite live region');
      assert.ok(html.includes('Loading encrypted vault...'), 'Must render descriptive title');
      assert.ok(html.includes('Decrypting keys and initializing on-device state.'));
      assert.ok(html.includes('animate-spin'), 'Must display spinner indicator');
    });

    it('renders EmptyState with icon, title, description, and primary next step CTA', () => {
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

      assert.ok(html.includes('role="region"'), 'EmptyState must be an accessible region');
      assert.ok(html.includes('Your vault is empty'), 'Must display state title');
      assert.ok(html.includes('Create First Entry'), 'Must provide primary next step action');
      assert.ok(html.includes('bg-[var(--color-paper)]'), 'Must use Verma paper surface');
    });

    it('renders ErrorState with consequence notice, failure reason, and safe recovery', () => {
      const html = renderToStaticMarkup(
        <ErrorState
          title="Unable to open vault"
          description="The master key file could not be read."
          consequence="Your encrypted database remains untouched on disk."
          action={{
            label: 'Retry Unlock',
            onClick: () => {},
          }}
        />
      );

      assert.ok(html.includes('role="alert"'), 'ErrorState must use role="alert"');
      assert.ok(html.includes('Unable to open vault'), 'Must display error title');
      assert.ok(html.includes('Your encrypted database remains untouched on disk.'));
      assert.ok(html.includes('Retry Unlock'), 'Must provide safe recovery action');
    });
  });

  // AC-C-M0-04-02: Navigation exposes vault, search, import, settings, and lock without jargon
  describe('AC-C-M0-04-02: Navigation Frame and Actions', () => {
    it('exposes All Items, Ask Your Vault, Smart Import, Settings, and Lock Vault in shell', () => {
      const html = renderWithShell(<Layout />);

      // Core destinations
      assert.ok(html.includes('All Items'), 'Must link to All Items (vault)');
      assert.ok(html.includes('Ask Your Vault'), 'Must link to Ask Your Vault (search)');
      assert.ok(html.includes('Smart Import'), 'Must link to Smart Import');
      assert.ok(html.includes('Settings'), 'Must link to Settings');
      assert.ok(html.includes('Lock Vault'), 'Must expose Lock Vault action');

      // Keyboard shortcuts and skip link
      assert.ok(html.includes('Skip to main content'), 'Must provide keyboard skip link');
      assert.ok(html.includes('href="#main-content"'), 'Skip link must target #main-content');
      assert.ok(html.includes('⌘K'), 'Must show shortcut badge for Ask Your Vault');
      assert.ok(html.includes('⌘L'), 'Must show shortcut badge for Lock Vault');

      // Plain language invariants: No developer/backend implementation jargon in consumer nav
      assert.ok(!html.includes('SQLite'), 'Navigation must not expose SQLite database terms');
      assert.ok(!html.includes('SQLCipher'), 'Navigation must not expose SQLCipher terms');
      assert.ok(!html.includes('QUIC'), 'Navigation must not expose QUIC protocol terms');
      assert.ok(!html.includes('GGUF'), 'Navigation must not expose GGUF model terms');
    });

    it('renders Settings view with plain-language sections and zero technical jargon', () => {
      const html = renderToStaticMarkup(<Settings />);

      assert.ok(html.includes('Vault &amp; Security') || html.includes('Vault & Security'));
      assert.ok(html.includes('Direct Device Sync'));
      assert.ok(html.includes('Local AI &amp; Privacy Boundary') || html.includes('Local AI & Privacy Boundary'));
      assert.ok(html.includes('About Verma'));
      assert.ok(html.includes('Auto-lock timeout'));
      assert.ok(html.includes('A password manager you do not have to learn.'));

      // Consumer plain-language check
      assert.ok(!html.includes('SQLCipher'), 'Settings must not use technical jargon');
      assert.ok(!html.includes('QUIC UDP'), 'Settings must not expose raw transport protocols');
    });
  });

  // AC-C-M0-04-03: Shared tokens and primitives cover typography, color, spacing, focus, buttons, fields
  describe('AC-C-M0-04-03: Tokens & Primitives Design System Compliance', () => {
    it('exports complete color, spacing, radius, and breakpoint tokens', () => {
      // Colors
      assert.equal(colors.brandOrange, '#FE820E');
      assert.equal(colors.brandPeriwinkle, '#607FF3');
      assert.equal(colors.canvas, '#F7EDE3');
      assert.equal(colors.text, '#292621');
      assert.equal(colors.paper, '#FFFCF8');
      assert.equal(colors.surface, '#FFFFFF');
      assert.equal(colors.assistSurface, '#E8EAFE');

      // Spacing 8px rhythm
      assert.equal(spacing.space1, '4px');
      assert.equal(spacing.space2, '8px');
      assert.equal(spacing.space4, '16px');
      assert.equal(spacing.space8, '32px');

      // Radius
      assert.equal(radius.sm, '8px');
      assert.equal(radius.md, '12px');
      assert.equal(radius.lg, '24px');
      assert.equal(radius.pill, '999px');

      // Typography
      assert.ok(typography.sans.includes('Parkinsans'));
      assert.ok(typography.display.includes('Fredoka'));
      assert.ok(typography.mono.includes('IBM Plex Mono'));

      // Breakpoints
      assert.equal(breakpoints.md, '768px');
      assert.equal(breakpoints.desktopRef, '1312px');
    });

    it('renders Button with charcoal text on brand orange for WCAG 6.04:1 contrast', () => {
      const html = renderToStaticMarkup(
        <Button variant="primary" size="md">
          Save Entry
        </Button>
      );

      // Invariant: Primary button must pair brand orange with charcoal text
      assert.ok(html.includes('bg-[var(--color-brand-orange)]'));
      assert.ok(html.includes('text-[var(--color-text)]'));
      assert.ok(html.includes('focus-ring'), 'Button must include accessible focus ring');
      assert.ok(html.includes('min-h-[40px]'), 'Must satisfy desktop touch target minimum');
    });

    it('renders Button loading state with aria-busy and spinner', () => {
      const html = renderToStaticMarkup(
        <Button variant="primary" isLoading={true}>
          Decrypting
        </Button>
      );

      assert.ok(html.includes('aria-busy="true"'));
      assert.ok(html.includes('disabled=""') || html.includes('disabled'));
      assert.ok(html.includes('animate-spin'));
    });

    it('renders InputField with persistent label and error alert association', () => {
      const html = renderToStaticMarkup(
        <InputField
          label="Account Username"
          description="Your login handle or email address"
          error="Username is required"
          required
        />
      );

      assert.ok(html.includes('Account Username'));
      assert.ok(html.includes('role="alert"'), 'Input error must use role="alert"');
      assert.ok(html.includes('aria-invalid="true"'), 'Invalid input must have aria-invalid="true"');
      assert.ok(html.includes('aria-describedby'), 'Input must reference description and error IDs');
      assert.ok(html.includes('focus-ring'), 'InputField must include accessible focus ring');
    });
  });

  // AC-C-M0-04-04: Responsive shell usable at desktop and narrow mobile widths without horizontal scroll
  describe('AC-C-M0-04-04: Responsive Shell & Viewport Usability', () => {
    it('includes both desktop navigation and mobile navigation bars in layout structure', () => {
      const html = renderWithShell(<Layout />);

      // Desktop nav landmark
      assert.ok(
        html.includes('aria-label="Vault navigation"'),
        'Must provide desktop vault navigation landmark'
      );
      assert.ok(
        html.includes('hidden md:flex'),
        'Desktop nav should be hidden on narrow screens and visible on md+'
      );

      // Mobile header landmark
      assert.ok(
        html.includes('aria-label="Mobile header"'),
        'Must provide narrow mobile header bar'
      );

      // Mobile bottom navigation landmark
      assert.ok(
        html.includes('aria-label="Mobile bottom navigation"'),
        'Must provide quick mobile bottom navigation bar'
      );
    });

    it('enforces overflow-x-hidden on root containers to prevent horizontal scrolling', () => {
      const html = renderWithShell(<Layout />);

      // Top container enforces zero horizontal scrolling
      assert.ok(html.includes('overflow-hidden'), 'Root layout must prevent window overflow');
      assert.ok(
        html.includes('overflow-x-hidden'),
        'Main content area must enforce overflow-x-hidden'
      );
      assert.ok(
        html.includes('max-w-full') && html.includes('min-w-0'),
        'Content area must prevent flex item expansion past viewport width'
      );
    });
  });
});
