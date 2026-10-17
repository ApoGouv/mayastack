// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import NumeralViewport from './NumeralViewport';

afterEach(cleanup);

const LABEL = 'Mayan numeral for 123: 2 stacked base-20 digits, highest place value at the top';

/** Renders the viewport around a stand-in numeral and returns its parts */
function renderViewport(props: { resetKey?: string } = {}) {
  const result = render(
    <NumeralViewport label={LABEL} {...props}>
      <svg width={350} height={160} viewBox="0 0 350 160" data-testid="numeral" />
    </NumeralViewport>
  );
  const viewer = screen.getByRole('group', { name: 'Numeral viewer' });
  const image = screen.getByRole('img', { name: LABEL });
  const zoomIn = screen.getByRole('button', { name: 'Zoom in' });
  const zoomOut = screen.getByRole('button', { name: 'Zoom out' });
  const reset = screen.getByRole('button', { name: 'Reset' });
  /** The zoom level shown to the user and announced to screen readers, e.g. "100%" */
  const zoomStatus = screen.getByRole('group', { name: 'Zoom controls' }).querySelector('[aria-live]') as HTMLElement;
  const zoomText = () => zoomStatus.textContent ?? '';
  return { ...result, viewer, image, zoomIn, zoomOut, reset, zoomStatus, zoomText };
}

describe('NumeralViewport', () => {
  it('shows the numeral as one labelled image in a focusable, bounded viewer', () => {
    const { viewer, image } = renderViewport();

    expect(viewer.tabIndex).toBe(0);
    expect(viewer.style.maxHeight).toBe('480px');
    expect(viewer.className).toContain('overflow-auto');
    expect(document.getElementById(viewer.getAttribute('aria-describedby') ?? '')?.textContent).toContain(
      'Press plus or minus to zoom'
    );
    expect(image.contains(screen.getByTestId('numeral'))).toBe(true);
    expect(image.style.width).toBe('100%');
  });

  it('zooms in and out through the zoom levels, keeping the numeral itself unchanged', () => {
    const { zoomIn, zoomOut, image, zoomText } = renderViewport();

    fireEvent.click(zoomIn);
    expect(zoomText()).toBe('150%');
    expect(image.style.width).toBe('150%');

    fireEvent.click(zoomOut);
    fireEvent.click(zoomOut);
    expect(zoomText()).toBe('75%');
    expect(image.style.width).toBe('75%');

    // The SVG keeps its logical size: only the wrapper it scales to changes
    const svg = screen.getByTestId('numeral');
    expect(svg.getAttribute('width')).toBe('350');
    expect(svg.getAttribute('height')).toBe('160');
    expect(svg.getAttribute('viewBox')).toBe('0 0 350 160');
  });

  it('stops at 400% and 25% and marks the limit', () => {
    const { zoomIn, zoomOut, zoomText } = renderViewport();

    for (let i = 0; i < 10; i++) fireEvent.click(zoomIn);
    expect(zoomText()).toBe('400% (maximum zoom)');
    expect(zoomIn.getAttribute('aria-disabled')).toBe('true');
    expect(zoomOut.getAttribute('aria-disabled')).toBe('false');

    for (let i = 0; i < 10; i++) fireEvent.click(zoomOut);
    expect(zoomText()).toBe('25% (minimum zoom)');
    expect(zoomOut.getAttribute('aria-disabled')).toBe('true');
    expect(zoomIn.getAttribute('aria-disabled')).toBe('false');
  });

  it('announces the zoom level politely from a region present from the start', () => {
    const { zoomIn, zoomStatus, zoomText } = renderViewport();

    expect(zoomStatus.getAttribute('aria-live')).toBe('polite');
    expect(zoomText()).toBe('100%');
    fireEvent.click(zoomIn);
    expect(zoomText()).toBe('150%');
  });

  it('keeps focus on a zoom button that reaches its limit, and ignores it there', () => {
    const { zoomIn, zoomText } = renderViewport();

    zoomIn.focus();
    for (let i = 0; i < 4; i++) fireEvent.click(zoomIn);
    expect(zoomText()).toBe('400% (maximum zoom)');
    expect(document.activeElement).toBe(zoomIn);
    expect(zoomIn.hasAttribute('disabled')).toBe(false);

    // Activating it again, e.g. with Enter, changes nothing
    fireEvent.click(zoomIn);
    expect(zoomText()).toBe('400% (maximum zoom)');
    expect(document.activeElement).toBe(zoomIn);
  });

  it('resets to 100% and the top of the numeral', () => {
    const { viewer, zoomIn, reset, zoomText } = renderViewport();

    fireEvent.click(zoomIn);
    viewer.scrollTop = 300;
    fireEvent.click(reset);
    expect(zoomText()).toBe('100%');
    expect(viewer.scrollTop).toBe(0);

    // Also from 100%, after scrolling
    viewer.scrollTop = 300;
    fireEvent.click(reset);
    expect(viewer.scrollTop).toBe(0);
  });

  it('supports +, - and 0 while the viewer has focus', () => {
    const { viewer, zoomText } = renderViewport();

    fireEvent.keyDown(viewer, { key: '+' });
    expect(zoomText()).toBe('150%');
    fireEvent.keyDown(viewer, { key: '=' });
    expect(zoomText()).toBe('200%');
    fireEvent.keyDown(viewer, { key: '-' });
    expect(zoomText()).toBe('150%');
    fireEvent.keyDown(viewer, { key: '0' });
    expect(zoomText()).toBe('100%');
  });

  it('ignores the shortcuts with Ctrl, ⌘ or Alt, which belong to the browser', () => {
    const { viewer, zoomText } = renderViewport();

    fireEvent.keyDown(viewer, { key: '+', ctrlKey: true });
    fireEvent.keyDown(viewer, { key: '+', metaKey: true });
    fireEvent.keyDown(viewer, { key: '-', altKey: true });
    expect(zoomText()).toBe('100%');
  });

  it('ignores the shortcuts on the zoom buttons and on content inside the viewer', () => {
    const { reset, image, zoomText } = renderViewport();

    fireEvent.keyDown(reset, { key: '+' });
    fireEvent.keyDown(image, { key: '+' });
    expect(zoomText()).toBe('100%');
  });

  it('returns to the top for a new numeral', () => {
    const { viewer, rerender } = renderViewport({ resetKey: 'a' });

    viewer.scrollTop = 500;
    rerender(
      <NumeralViewport label={LABEL} resetKey="b">
        <svg data-testid="numeral" />
      </NumeralViewport>
    );
    expect(viewer.scrollTop).toBe(0);
  });
});
