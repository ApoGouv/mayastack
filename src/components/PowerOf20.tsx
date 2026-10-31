import React from 'react';

interface PowerOf20Props {
  /** The exponent: a tier number, or a symbol such as "n" */
  exponent: number | string;
}

/**
 * 20 raised to an exponent, written with a superscript.
 *
 * Screen readers read a superscript as ordinary digits, so "20²" would be "202". The
 * superscript is hidden from them and replaced by visually hidden text, so they announce
 * "20 to the power of 2", once. That text is also left out of a selection to copy.
 */
const PowerOf20: React.FC<PowerOf20Props> = ({ exponent }) => (
  <>
    20<sup aria-hidden="true">{exponent}</sup>
    <span className="sr-only select-none"> to the power of {exponent}</span>
  </>
);

export default PowerOf20;
