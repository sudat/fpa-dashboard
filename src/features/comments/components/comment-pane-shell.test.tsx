import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CommentPaneShell } from './comment-pane-shell';

describe('CommentPaneShell', () => {
  it('renders the shell with comment header', () => {
    render(<CommentPaneShell />);
    expect(screen.getByText('コメント')).toBeInTheDocument();
  });

  it('shows deferred badge', () => {
    render(<CommentPaneShell />);
    expect(screen.getByText('（準備中）')).toBeInTheDocument();
  });

  it('shows deferred placeholder message', () => {
    render(<CommentPaneShell />);
    expect(
      screen.getByText('💬 コメント機能は今後のアップデートで追加予定です'),
    ).toBeInTheDocument();
  });

  it('lists all deferred features with markers', () => {
    render(<CommentPaneShell />);
    expect(screen.getByText('メンション（@宛先）')).toBeInTheDocument();
    expect(screen.getByText('スレッド返信')).toBeInTheDocument();
    expect(screen.getByText('通知連携')).toBeInTheDocument();
    expect(screen.getByText('承認ワークフロー')).toBeInTheDocument();
  });

  it('marks each deferred feature with data attribute', () => {
    const { container } = render(<CommentPaneShell />);
    const features = container.querySelectorAll('[data-deferred-feature]');
    expect(features).toHaveLength(4);
    expect(features[0]).toHaveAttribute('data-deferred-feature', 'メンション（@宛先）');
    expect(features[3]).toHaveAttribute('data-deferred-feature', '承認ワークフロー');
  });

  it('shows v1.0 scope note in footer', () => {
    render(<CommentPaneShell />);
    expect(screen.getByText('v1.0 では分析に特化しています')).toBeInTheDocument();
  });

  it('does NOT render any interactive comment elements', () => {
    const { container } = render(<CommentPaneShell />);
    expect(container.querySelector('input')).not.toBeInTheDocument();
    expect(container.querySelector('textarea')).not.toBeInTheDocument();
    expect(container.querySelector('button')).not.toBeInTheDocument();
    expect(container.querySelector('form')).not.toBeInTheDocument();
  });

  it('has deferred data attribute on root element', () => {
    const { container } = render(<CommentPaneShell />);
    const shell = container.querySelector('[data-testid="comment-pane-shell"]');
    expect(shell).toHaveAttribute('data-comment-status', 'deferred');
  });
});
