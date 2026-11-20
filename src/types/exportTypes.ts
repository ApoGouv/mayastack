/**
 * Where the Export control is placed: `floating` in the corner of the screen everywhere, or
 * `viewer-header` in the viewer's header where the viewer sticks (the `sticky-viewer` variant)
 * and floating elsewhere (UI-11)
 */
export type ExportPlacement = 'floating' | 'viewer-header';

export interface MayanExportPanelProps {
  /**
   * Renders the viewer: given the numeral SVG's ref and, while the Export control belongs in the
   * viewer's header, that control to place there (the panel then renders no floating copy), or null
   */
  children: (ref: React.RefObject<SVGSVGElement | null>, headerExport: React.ReactNode | null) => React.ReactNode;
  filename?: string;
  /** Defaults to `floating` */
  exportPlacement?: ExportPlacement;
}

export interface Dimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

export type ExportSize = 'original' | 'small' | 'medium' | 'large' | 'custom';

export type ExportFormat = 'png' | 'svg';
