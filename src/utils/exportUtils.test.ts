// @vitest-environment happy-dom
import { createElement } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DisplaySettingsProvider } from '@/context/DisplaySettingsContext';
import MayanRenderer from '@components/MayanRenderer';
import { toBase20 } from './base20';
import {
  checkPngSize,
  DOWNLOAD_URL_LIFETIME_MS,
  exportPng,
  exportSvg,
  getNumberExportFilename,
  MAX_DIGITS_IN_FILENAME,
  MAX_PNG_AREA,
  MAX_PNG_SIDE,
  PngSizeError,
  prepareSvgCloneForExport,
} from './exportUtils';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** Renders the glyphs of a number, as HomeView does, and returns the SVG element */
const renderNumberSvg = (value: bigint) => {
  const { container } = render(
    createElement(
      DisplaySettingsProvider,
      null,
      createElement(MayanRenderer, {
        digitGroups: [toBase20(value)],
        heightPerGlyphStack: 80,
        widthPerGroup: 350,
      })
    )
  );
  return container.querySelector('svg') as SVGSVGElement;
};

describe('prepareSvgCloneForExport', () => {
  it('keeps every digit stack and its metadata for the largest 500-digit number', () => {
    const value = 10n ** 500n - 1n;
    const svg = renderNumberSvg(value);
    const placeholder = document.createElement('div');

    const clone = prepareSvgCloneForExport(svg, 700, 61600, placeholder);

    expect(clone).not.toBeNull();
    expect(clone?.getAttribute('width')).toBe('700');
    expect(clone?.getAttribute('height')).toBe('61600');

    const groups = [...(clone?.querySelectorAll('g[data-digit-index]') ?? [])];
    expect(groups).toHaveLength(385);
    // The exported digit stacks still describe exactly the original number
    expect(
      groups.reduce(
        (total, group) =>
          total +
          BigInt(group.getAttribute('data-digit-value') ?? '') *
            20n ** BigInt(group.getAttribute('data-digit-exponent') ?? ''),
        0n
      )
    ).toBe(value);
  });
});

describe('checkPngSize', () => {
  it('uses a 32,767 px side limit and an 8,192 × 8,192 px area limit', () => {
    expect(MAX_PNG_SIDE).toBe(32_767);
    expect(MAX_PNG_AREA).toBe(67_108_864);
  });

  it('allows the original size of the largest 500-digit number', () => {
    // 385 base-20 digits × 80 units tall, 350 units wide
    expect(checkPngSize(350, 30800)).toEqual({ supported: true });
  });

  it('allows sizes exactly at the limits', () => {
    expect(checkPngSize(350, MAX_PNG_SIDE)).toEqual({ supported: true });
    expect(checkPngSize(8192, 8192)).toEqual({ supported: true });
  });

  it('refuses a side longer than the limit, e.g. the Small preset for 500 digits', () => {
    expect(checkPngSize(350, MAX_PNG_SIDE + 1)).toEqual({
      supported: false,
      reason:
        'PNG export is limited to 32,767 px in width and height, the most some browsers can draw; this one would be 350 × 32,768 px.',
    });
    expect(checkPngSize(600, 52800).supported).toBe(false);
  });

  it('refuses more pixels than the area limit, even with both sides allowed', () => {
    expect(checkPngSize(8192, 8193)).toEqual({
      supported: false,
      reason:
        'PNG export is limited to 67,108,864 pixels (8,192 × 8,192) to keep memory use safe; this one would have 67,117,056.',
    });
  });

  it('refuses empty or invalid sizes', () => {
    expect(checkPngSize(0, 0).supported).toBe(false);
    expect(checkPngSize(Number.NaN, 100).supported).toBe(false);
  });
});

describe('exportPng', () => {
  it.each([
    ['too large', 600, 52800],
    ['empty', 0, 0],
  ])('refuses a %s size (%i × %i) before creating any canvas', async (_, width, height) => {
    const svg = renderNumberSvg(10n ** 500n - 1n);
    const clone = prepareSvgCloneForExport(svg, width, height, document.createElement('div')) as SVGSVGElement;
    const createElement = vi.spyOn(document, 'createElement');

    await expect(exportPng(clone, 'refused.png')).rejects.toBeInstanceOf(PngSizeError);
    expect(createElement).not.toHaveBeenCalledWith('canvas');
  });
});

describe('getNumberExportFilename', () => {
  it('writes out numbers of up to 30 digits in full, as before', () => {
    expect(MAX_DIGITS_IN_FILENAME).toBe(30);
    for (const decimal of ['0', '7', '123', '9007199254740993', '1'.repeat(30)]) {
      expect(getNumberExportFilename(decimal)).toBe(`mayan-numeral-number-${decimal}`);
    }
  });

  it('abbreviates longer numbers to their first and last 10 digits and their length', () => {
    expect(getNumberExportFilename('1234567890' + '5' + '0987654321' + '0'.repeat(10))).toBe(
      'mayan-numeral-number-1234567890...0000000000-31-digits'
    );
    expect(getNumberExportFilename('12345678901234567890123456789012345678901234567890')).toBe(
      'mayan-numeral-number-1234567890...1234567890-50-digits'
    );
  });

  it('keeps the filename of the largest 500-digit number short', () => {
    const name = getNumberExportFilename('9'.repeat(500));

    expect(name).toBe('mayan-numeral-number-9999999999...9999999999-500-digits');
    expect(name).toHaveLength(55);
    // With either extension, well within the 255 characters most file systems allow
    for (const extension of ['.svg', '.png']) expect(`${name}${extension}`.length).toBeLessThanOrEqual(59);
  });

  it('gives every supported number a filename of at most 55 safe characters', () => {
    for (let digits = 1; digits <= 500; digits++) {
      const name = getNumberExportFilename('8'.repeat(digits));
      expect(name.length).toBeLessThanOrEqual(55);
      expect(name).toMatch(/^[a-z0-9.-]+$/);
    }
  });
});

describe('exportSvg download', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('downloads the complete SVG and releases its URL only after a short delay', async () => {
    vi.useFakeTimers();
    const blobs: Blob[] = [];
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      blobs.push(blob as Blob);
      return 'blob:mayastack-test';
    });
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clicks: { href: string; download: string }[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicks.push({ href: this.href, download: this.download });
    });
    const svg = renderNumberSvg(123n);

    await exportSvg(svg, 'mayan-numeral-number-123.svg');

    // The download is requested once, with the file's name and URL
    expect(clicks).toEqual([{ href: 'blob:mayastack-test', download: 'mayan-numeral-number-123.svg' }]);
    expect(blobs).toHaveLength(1);
    expect(blobs[0].type).toBe('image/svg+xml');
    expect(await blobs[0].text()).toBe(new XMLSerializer().serializeToString(svg));

    // Not revoked during or straight after the click, so the browser can still read it
    expect(revoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(DOWNLOAD_URL_LIFETIME_MS - 1);
    expect(revoke).not.toHaveBeenCalled();

    // Then released once, so no URL is left holding the file's memory
    vi.advanceTimersByTime(1);
    expect(revoke).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledWith('blob:mayastack-test');
  });

  it('still releases the URL, after the same delay, when starting the download throws', async () => {
    vi.useFakeTimers();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mayastack-test');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const failure = new Error('Download blocked');
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      throw failure;
    });

    // The original error reaches the caller, which reports the failed export
    await expect(exportSvg(renderNumberSvg(123n), 'mayan-numeral-number-123.svg')).rejects.toBe(failure);

    expect(revoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(DOWNLOAD_URL_LIFETIME_MS - 1);
    expect(revoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(revoke).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledWith('blob:mayastack-test');
  });

  it('keeps the release delay short: seconds, not minutes', () => {
    expect(DOWNLOAD_URL_LIFETIME_MS).toBe(10_000);
  });
});
