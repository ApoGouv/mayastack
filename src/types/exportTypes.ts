export interface MayanExportPanelProps {
  children: (ref: React.RefObject<SVGSVGElement | null>) => React.ReactNode;
  filename?: string;
}

export interface Dimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

export type ExportSize = 'original' | 'small' | 'medium' | 'large' | 'custom';

export type ExportFormat = 'png' | 'svg';
