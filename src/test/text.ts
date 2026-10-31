/** The text of an element without the parts matching a selector */
function textWithout(element: Element, selector: string): string {
  const clone = element.cloneNode(true) as Element;
  clone.querySelectorAll(selector).forEach((node) => node.remove());
  return clone.textContent ?? '';
}

/** The text a sighted reader sees: without visually hidden (sr-only) text */
export const visibleText = (element: Element): string => textWithout(element, '.sr-only');

/** The text a screen reader reads: with visually hidden text, without aria-hidden content */
export const spokenText = (element: Element): string => textWithout(element, '[aria-hidden="true"]');
