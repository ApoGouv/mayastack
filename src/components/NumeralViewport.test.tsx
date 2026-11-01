// @vitest-environment happy-dom
import { createRef } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import NumeralViewport from './NumeralViewport';

afterEach(cleanup);

const LABEL = 'Mayan numeral for 123: 2 stacked base-20 digits, highest place value at the top';

/** Renders the viewport around a stand-in numeral and returns its parts */
function renderViewport(props: { resetKey?: string } = {}) {
  const result = render(
    <NumeralViewport numeralWidth={350} label={LABEL} {...props}>
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
    // Changed deliberately in UI-13: the stage's height for the screen, not a 480 px maximum
    expect(viewer.className.split(' ')).toContain('numeral-stage-height');
    expect(viewer.getAttribute('style')).toBeNull();
    expect(viewer.className).toContain('overflow-auto');
    expect(document.getElementById(viewer.getAttribute('aria-describedby') ?? '')?.textContent).toContain(
      'Press plus or minus to zoom'
    );
    expect(image.contains(screen.getByTestId('numeral'))).toBe(true);
    expect(image.style.width).toBe('350px');
  });

  it('zooms in and out through the zoom levels, keeping the numeral itself unchanged', () => {
    const { zoomIn, zoomOut, image, zoomText } = renderViewport();

    fireEvent.click(zoomIn);
    expect(zoomText()).toBe('150%');
    expect(image.style.width).toBe('525px');

    fireEvent.click(zoomOut);
    fireEvent.click(zoomOut);
    expect(zoomText()).toBe('75%');
    expect(image.style.width).toBe('262.5px');

    // The SVG keeps its logical size: only the wrapper it scales to changes
    const svg = screen.getByTestId('numeral');
    expect(svg.getAttribute('width')).toBe('350');
    expect(svg.getAttribute('height')).toBe('160');
    expect(svg.getAttribute('viewBox')).toBe('0 0 350 160');
  });

  it('shows the numeral at 1 CSS px per SVG unit at 100%, scaled exactly at every zoom level, and centred', () => {
    const { zoomIn, zoomOut, image, zoomText } = renderViewport();
    // Its own width in CSS px, never a share of the viewer's, never shrunk, centred both ways
    expect(image.className.split(' ')).toEqual(expect.arrayContaining(['relative', 'm-auto', 'shrink-0']));
    for (let i = 0; i < 3; i++) fireEvent.click(zoomOut);
    const widths: Record<string, string> = {};
    for (let i = 0; i < 8; i++) {
      widths[zoomText().split(' ')[0]] = image.style.width;
      fireEvent.click(zoomIn);
    }
    expect(widths).toEqual({
      '25%': '87.5px', '50%': '175px', '75%': '262.5px', '100%': '350px',
      '150%': '525px', '200%': '700px', '300%': '1050px', '400%': '1400px',
    });
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

  it('places an overlay after the numeral, in the zoom wrapper, which is its positioning context', () => {
    render(
      <NumeralViewport numeralWidth={350} label={LABEL} overlay={<div data-testid="overlay" />}>
        <svg data-testid="numeral" />
      </NumeralViewport>
    );
    const image = screen.getByRole('img', { name: LABEL });
    expect([...image.children]).toEqual([screen.getByTestId('numeral'), screen.getByTestId('overlay')]);
    expect(image.className).toContain('relative');

    // It zooms with the numeral
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(image.style.width).toBe('525px');
    expect(image.contains(screen.getByTestId('overlay'))).toBe(true);
  });

  it('places an underlay before the numeral, in the zoom wrapper, which zooms it with the numeral', () => {
    render(
      <NumeralViewport numeralWidth={350} label={LABEL} underlay={<div data-testid="underlay" />} overlay={<div data-testid="overlay" />}>
        <svg data-testid="numeral" />
      </NumeralViewport>
    );
    const image = screen.getByRole('img', { name: LABEL });
    expect([...image.children]).toEqual([
      screen.getByTestId('underlay'),
      screen.getByTestId('numeral'),
      screen.getByTestId('overlay'),
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(image.style.width).toBe('525px');
  });

  it('sets a scroller ref it is given to the viewer, and still scrolls through it', () => {
    const scrollerRef = createRef<HTMLDivElement>();
    render(
      <NumeralViewport numeralWidth={350} label={LABEL} scrollerRef={scrollerRef}>
        <svg data-testid="numeral" />
      </NumeralViewport>
    );
    const viewer = screen.getByRole('group', { name: 'Numeral viewer' });
    expect(scrollerRef.current).toBe(viewer);

    // Reset at 100% still returns the viewer to its top
    viewer.scrollTop = 500;
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(viewer.scrollTop).toBe(0);
  });

  it('has the scroller, the stage in canvas and the backdrop, then the stage box, then the slab', () => {
    const { viewer, image } = renderViewport();
    // The scroller is the only scroll container, and the backdrop behind a translucent numeral
    expect(viewer.hasAttribute('data-numeral-backdrop')).toBe(true);
    expect(viewer.className.split(' ')).toEqual(expect.arrayContaining(['overflow-auto', 'bg-canvas']));
    expect(document.querySelectorAll('[data-numeral-backdrop]')).toHaveLength(1);
    // The stage box: the scroller's only child, holding the slab, padded, at least the scroller's size
    const stage = viewer.firstElementChild as HTMLElement;
    expect(viewer.children).toHaveLength(1);
    expect(stage.hasAttribute('data-numeral-stage')).toBe(true);
    expect(stage.className.split(' ')).toEqual(
      expect.arrayContaining(['flex', 'w-max', 'min-w-full', 'min-h-full', 'p-4', 'overflow-clip'])
    );
    expect([...stage.children]).toEqual([image]);
  });

  it('spans the viewer card’s width, with no canvas surround of its own (changed deliberately in UI-13)', () => {
    const { viewer } = renderViewport();
    const root = screen.getByRole('group', { name: 'Zoom controls' }).parentElement!;
    expect(root.contains(viewer)).toBe(true);
    expect(root.className.split(' ')).toContain('w-full');
    expect(root.className).not.toMatch(/\b(max-w-|bg-|p-)/);
  });

  it('has no underlay or overlay unless given', () => {
    const { image } = renderViewport();
    expect(image.children).toHaveLength(1);
  });

  it('returns to the top for a new numeral', () => {
    const { viewer, rerender } = renderViewport({ resetKey: 'a' });

    viewer.scrollTop = 500;
    rerender(
      <NumeralViewport numeralWidth={350} label={LABEL} resetKey="b">
        <svg data-testid="numeral" />
      </NumeralViewport>
    );
    expect(viewer.scrollTop).toBe(0);
  });
});
