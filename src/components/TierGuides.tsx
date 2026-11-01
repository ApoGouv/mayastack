import React, { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { RgbaColor } from '@/types/colors';
import { rgbaToCss } from '@utils/colors';
import type { GuideColors } from '@utils/guideColors';
import {
  findPlaceTierBand,
  getPlaceTierBands,
  getTierHairlines,
  type NumeralLayout,
} from '@utils/tierGuides';

interface GuideProps {
  /** Each group's base-20 digits, as given to MayanRenderer */
  digitGroups: number[][];
  /** The layout given to MayanRenderer */
  layout: NumeralLayout;
}

interface PlaceTierGuidesProps extends GuideProps {
  /** The numeral's background colour, which this layer paints in place of the SVG's own */
  background: RgbaColor;
  /** The guides' colours for that background (getGuideColors) */
  colors: Pick<GuideColors, 'card' | 'cardHover' | 'cardHoverShadow'>;
  /**
   * The viewer that scrolls the numeral (NumeralViewport's scroller): while the pointer stays
   * still, its scrolling moves another card under the pointer. Without it, the hover follows the
   * pointer's own moves only.
   */
  scrollerRef: RefObject<HTMLElement | null>;
}

const bandKey = (groupIndex: number, exponent: number) => `${groupIndex}-${exponent}`;

/**
 * Screen-only Place Tier Guides: a subtle card behind each tier of each numeral group, the one
 * under a mouse or pen pointer a little stronger, with a shadow.
 *
 * An HTML layer placed before the numeral's SVG in the viewer's zoom wrapper (NumeralViewport's
 * `underlay`), never part of the SVG, so it is never exported. While it is shown, a screen-only
 * rule in `src/index.css` makes the SVG's background rectangle transparent and lifts the SVG
 * above this layer, which paints the same background itself, then the cards. The glyphs and the
 * grid are therefore drawn over the cards exactly as over the background: their pixels are not
 * changed, whatever their colour or alpha.
 *
 * The layer is hidden from assistive technology and never takes the pointer: the hovered card
 * is found from the pointer's position over the zoom wrapper, by geometry, and kept up to date
 * while the viewer (`scrollerRef`) scrolls under a still pointer. Touch shows no hover.
 */
export const PlaceTierGuides: React.FC<PlaceTierGuidesProps> = ({ digitGroups, layout, background, colors, scrollerRef }) => {
  const bands = useMemo(() => getPlaceTierBands(digitGroups, layout), [digitGroups, layout]);
  const layerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    // The zoom wrapper, which the layer fills and whose box the pointer is measured against, and
    // the viewer that scrolls it, given explicitly: it is not the wrapper's parent
    const wrapper = layerRef.current?.parentElement;
    if (!wrapper) return;
    const scroller = scrollerRef.current;
    let pointer: { x: number; y: number } | null = null;

    const update = () => {
      if (!pointer) return;
      const box = wrapper.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return;
      const band = findPlaceTierBand(bands, (pointer.x - box.left) / box.width, (pointer.y - box.top) / box.height);
      setHovered(band ? bandKey(band.groupIndex, band.exponent) : null);
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      pointer = { x: event.clientX, y: event.clientY };
      update();
    };
    const leave = () => {
      pointer = null;
      setHovered(null);
    };

    wrapper.addEventListener('pointermove', move, { passive: true });
    wrapper.addEventListener('pointerleave', leave, { passive: true });
    scroller?.addEventListener('scroll', update, { passive: true });
    return () => {
      wrapper.removeEventListener('pointermove', move);
      wrapper.removeEventListener('pointerleave', leave);
      scroller?.removeEventListener('scroll', update);
      setHovered(null);
    };
  }, [bands, scrollerRef]);

  const card = rgbaToCss(colors.card);
  const cardHover = rgbaToCss(colors.cardHover);

  return (
    <div
      ref={layerRef}
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none"
      data-numeral-underlay
      data-place-tier-guides
      style={{ backgroundColor: rgbaToCss(background) }}
    >
      {bands.map(({ groupIndex, exponent, top, height, left, width }) => {
        const isHovered = hovered === bandKey(groupIndex, exponent);
        return (
          <div
            key={bandKey(groupIndex, exponent)}
            className="absolute motion-safe:transition-[background-color,box-shadow] motion-safe:duration-150"
            data-place-tier-band
            data-group-index={groupIndex}
            data-exponent={exponent}
            data-hovered={isHovered || undefined}
            style={{
              top: `${top * 100}%`,
              height: `${height * 100}%`,
              left: `${left * 100}%`,
              width: `${width * 100}%`,
              backgroundColor: isHovered ? cardHover : card,
              boxShadow: isHovered ? colors.cardHoverShadow : 'none',
            }}
          />
        );
      })}
    </div>
  );
};

interface TierHairlinesProps extends GuideProps {
  /** The hairlines' colour (getGuideColors) */
  color: RgbaColor;
}

/**
 * Screen-only Dividing Hairlines: a 1 px line between the tiers of each numeral group.
 *
 * An HTML overlay after the numeral's SVG in the viewer's zoom wrapper (NumeralViewport's
 * `overlay`), never part of the SVG, so it is never exported. The lines lie in the gaps between
 * the tiers, never over a glyph. Positioned in percentages of the numeral's logical size, they
 * follow the SVG at any zoom and scroll with it. The overlay is hidden from assistive
 * technology and lets the pointer through.
 */
export const TierHairlines: React.FC<TierHairlinesProps> = ({ digitGroups, layout, color }) => {
  const lines = useMemo(() => getTierHairlines(digitGroups, layout), [digitGroups, layout]);
  const lineColor = rgbaToCss(color);

  return (
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none" data-tier-hairlines>
      {lines.map(({ groupIndex, boundary, top, left, width }) => (
        <div
          key={`${groupIndex}-${boundary}`}
          className="absolute h-px -translate-y-1/2"
          data-tier-hairline
          data-group-index={groupIndex}
          data-boundary={boundary}
          style={{
            top: `${top * 100}%`,
            left: `${left * 100}%`,
            width: `${width * 100}%`,
            backgroundColor: lineColor,
          }}
        />
      ))}
    </div>
  );
};
