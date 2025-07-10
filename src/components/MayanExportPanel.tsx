import React, { useRef } from 'react';
import { toPng, toSvg } from 'html-to-image';

type ExportFormat = 'png' | 'svg';

type Props = {
  children: React.ReactNode;
  filename?: string;
  formats?: ExportFormat[];
};

const MayanExportPanel: React.FC<Props> = ({
  children,
  filename = 'mayan-numeral',
  formats = ['png', 'svg'],
}) => {
  const exportRef = useRef<HTMLDivElement>(null);

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
        style={{ display: 'inline-block', padding: '1rem', background: 'white' }}
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
