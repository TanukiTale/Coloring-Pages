export const exportSvgAsPng = async (
  svgElement: SVGSVGElement,
  fileName: string
): Promise<void> => {
  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(svgElement);

  if (!source.includes('xmlns="http://www.w3.org/2000/svg"')) {
    source = source.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Unable to load SVG for export.'));
      img.src = blobUrl;
    });

    const viewBox = svgElement.viewBox.baseVal;
    const width = viewBox?.width ? Math.round(viewBox.width) : 1024;
    const height = viewBox?.height ? Math.round(viewBox.height) : 768;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas context unavailable.');
    }

    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((output) => {
        if (output) {
          resolve(output);
          return;
        }
        reject(new Error('Failed to encode PNG output.'));
      }, 'image/png');
    });

    const pngUrl = URL.createObjectURL(pngBlob);
    const anchor = document.createElement('a');
    anchor.href = pngUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(pngUrl);
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
};
