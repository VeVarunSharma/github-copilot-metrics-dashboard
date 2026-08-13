import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuthDisabledBanner } from '@/components/layout/auth-disabled-banner';

describe('AuthDisabledBanner', () => {
  it('warns that the dashboard is public when auth mode is open', () => {
    render(<AuthDisabledBanner authIsEnabled={false} />);

    const banner = screen.getByRole('status');
    expect(banner.textContent).toContain('Dashboard auth is disabled.');
    expect(banner.textContent).toContain('This dashboard is public to anyone who can reach this URL');
    expect(banner.textContent).toContain('AUTH_MODE');
    expect(banner.textContent).toContain('open');

    const docsLink = screen.getByRole('link', { name: 'docs/auth.md' });
    expect(docsLink.getAttribute('href')).toContain('docs/auth.md');
  });

  it('does not render when auth is configured', () => {
    const { container } = render(<AuthDisabledBanner authIsEnabled />);

    expect(container.textContent).toBe('');
  });
});
