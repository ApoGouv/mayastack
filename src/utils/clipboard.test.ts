import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyText } from './clipboard';

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Replaces navigator with one whose clipboard is the given object */
const stubClipboard = (clipboard: unknown) => vi.stubGlobal('navigator', { clipboard });

describe('copyText', () => {
  it('writes the exact text and reports success', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard({ writeText });
    const text = '9'.repeat(500);
    expect(await copyText(text)).toEqual({ ok: true });
    expect(writeText).toHaveBeenCalledExactlyOnceWith(text);
  });

  it('reports a refused or failed write without throwing', async () => {
    stubClipboard({ writeText: vi.fn().mockRejectedValue(new DOMException('Denied', 'NotAllowedError')) });
    expect(await copyText('42')).toEqual({ ok: false, reason: 'failed' });
  });

  it('reports a missing Clipboard API, e.g. outside a secure context', async () => {
    stubClipboard(undefined);
    expect(await copyText('42')).toEqual({ ok: false, reason: 'unavailable' });
    stubClipboard({});
    expect(await copyText('42')).toEqual({ ok: false, reason: 'unavailable' });
  });
});
