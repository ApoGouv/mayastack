import React, { useRef } from 'react';
import { toPng, toSvg } from 'html-to-image';
import { isDev } from "@utils/env";

import "@components/MayanExportPanel.css";

type ExportFormat = 'png' | 'svg';

type Props = {
  children: React.ReactNode;
  filename?: string;
  formats?: ExportFormat[];
  showGrid?: boolean;
  backgroundColor?: string;
};

const MayanExportPanel: React.FC<Props> = ({
  children,
  filename = 'mayan-numeral',
  formats = ['png', 'svg'],
  showGrid = false,
  backgroundColor = 'rgba(255, 255, 255, 1)', // Default to white
}) => {
  const exportRef = useRef<HTMLDivElement>(null);
  const gridActive = isDev && showGrid;

  const handleExport = async (format: ExportFormat) => {
    if (!exportRef.current) return;

    try {
      let dataUrl = '';
      if (format === 'svg') dataUrl = await toSvg(exportRef.current);
      if (format === 'png') dataUrl = await toPng(exportRef.current);

      const link = document.createElement('a');
      link.download = `${filename}.${format}`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  return (
    <div>
      <div
        ref={exportRef}
        data-exportable
        className={`mep-svg-wrapper ${gridActive ? "mep-grid" : ""}`}
        style={{ backgroundColor: backgroundColor }}
      >
        {children}
      </div>

      <div style={{ marginTop: '1rem' }}>
        {formats.map((format) => (
          <button key={format} onClick={() => handleExport(format)} style={{ marginRight: '0.5rem' }}>
            Export as {format.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MayanExportPanel;
