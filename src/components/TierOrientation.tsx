import React from 'react';
import { toSuperscript } from '@utils/base20';

/**
 * The numeral's physical orientation, from its tier count: its top tier's power of 20 down to
 * its bottom tier's, e.g. "Top: 20² ↓ Bottom: 20⁰", or "1 tier · 20⁰". Screen readers get the
 * same in words. Not a live region, so editing the input is not announced at every keystroke.
 *
 * The base-20 card's TierBadge gives the mathematical range instead, ascending (20⁰–20²).
 *
 * @param tiers - The tallest group's tier count (getTierCount), at least 1
 */
const TierOrientation: React.FC<{ tiers: number }> = ({ tiers }) => {
  const highest = tiers - 1;
  const visible = tiers === 1 ? '1 tier · 20⁰' : `Top: 20${toSuperscript(highest)} ↓ Bottom: 20⁰`;
  const spoken =
    tiers === 1
      ? 'One tier, 20 to the power of 0'
      : `Top tier 20 to the power of ${highest}, down to the bottom tier, 20 to the power of 0`;

  return (
    <span className="rounded-md bg-surface-hover px-2 py-0.5 text-xs tabular-nums text-fg-muted whitespace-nowrap">
      <span aria-hidden="true">{visible}</span>
      <span className="sr-only">{spoken}</span>
    </span>
  );
};

export default TierOrientation;
