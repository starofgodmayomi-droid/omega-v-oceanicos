import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LifecycleFlow } from '../../LifecycleFlow';

describe('lifecycle stage keyboard access', () => {
  it('supports tab focus and Enter/Space toggling with disclosure semantics', async () => {
    const user = userEvent.setup();
    render(
      <LifecycleFlow
        stages={[
          {
            id: 'system',
            icon: '⚙️',
            label: 'System',
            subtitle: 'Health and trust evidence',
            state: 'available',
            detail: <div>System stage detail fixture</div>,
          },
        ]}
      />,
    );

    const toggle = screen.getByRole('button', { name: 'System. Available. Health and trust evidence' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-controls', 'lifecycle-stage-detail-system');
    expect(screen.queryByText('System stage detail fixture')).not.toBeInTheDocument();

    await user.tab();
    expect(toggle).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('System stage detail fixture')).toBeVisible();

    await user.keyboard(' ');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('System stage detail fixture')).not.toBeInTheDocument();
  });
});
