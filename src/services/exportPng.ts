import { RegionFillStates, SvgVariant } from '../models/domain';

const parseViewBoxSize = (viewBox: string): { width: number; height: number } => {
  const parts = viewBox
    .split(/[,\s]+/)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  if (parts.length >= 4 && parts[2] > 0 && parts[3] > 0) {
    return { width: Math.round(parts[2]), height: Math.round(parts[3]) };
  }

  return { width: 1024, height: 768 };
};

const encodeToPngBlob = async (svgSource: string, width: number, height: number): Promise<Blob> => {
  const blob = new Blob([svgSource], { type: 'image/svg+xml;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Unable to load SVG for export.'));
      img.src = blobUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas context unavailable.');
    }

    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((output) => {
        if (output) {
          resolve(output);
          return;
        }
        reject(new Error('Failed to encode PNG output.'));
      }, 'image/png');
    });
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
};

export const downloadPngBlob = (pngBlob: Blob, fileName: string): void => {
  const pngUrl = URL.createObjectURL(pngBlob);
  const anchor = document.createElement('a');
  anchor.href = pngUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(pngUrl);
};

export const renderVariantToPngBlob = async (params: {
  variant: SvgVariant;
  fills: RegionFillStates;
  backgroundColor: string;
}): Promise<Blob> => {
  const { variant, fills, backgroundColor } = params;
  const { width, height } = parseViewBoxSize(variant.viewBox);

  const paths = variant.regions
    .map((region) => {
      const fillColor = fills[region.id] ?? '#ffffff';
      return `<path d="${region.path}" fill="${fillColor}" stroke="#28344a" stroke-width="1.4"></path>`;
    })
    .join('');

  const svgSource = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${variant.viewBox}" role="img" aria-label="Painting preview"><rect width="100%" height="100%" fill="${backgroundColor}" />${paths}</svg>`;
  return encodeToPngBlob(svgSource, width, height);
};

export const exportSvgAsPng = async (
  svgElement: SVGSVGElement,
  fileName: string
): Promise<void> => {
  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(svgElement);

  if (!source.includes('xmlns="http://www.w3.org/2000/svg"')) {
    source = source.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  const viewBox = svgElement.viewBox.baseVal;
  const width = viewBox?.width ? Math.round(viewBox.width) : 1024;
  const height = viewBox?.height ? Math.round(viewBox.height) : 768;

  const pngBlob = await encodeToPngBlob(source, width, height);
  downloadPngBlob(pngBlob, fileName);
};
