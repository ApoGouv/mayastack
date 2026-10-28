/**
 * The result of copying text to the clipboard.
 *
 * - `unavailable`: the browser offers no Clipboard API here (e.g. outside a
 *   secure context, or in a browser without it)
 * - `failed`: the browser refused or could not write, e.g. without permission
 */
export type CopyTextResult = { ok: true } | { ok: false; reason: 'unavailable' | 'failed' };

/**
 * Copies plain text to the clipboard with the asynchronous Clipboard API.
 *
 * Never throws: the caller decides how to report a failure. There is no
 * fallback to the deprecated document.execCommand('copy').
 *
 * @param text - The text to copy
 * @returns Whether the text was copied, and why not
 */
export async function copyText(text: string): Promise<CopyTextResult> {
  const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard;
  if (typeof clipboard?.writeText !== 'function') return { ok: false, reason: 'unavailable' };

  try {
    await clipboard.writeText(text);
    return { ok: true };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}
