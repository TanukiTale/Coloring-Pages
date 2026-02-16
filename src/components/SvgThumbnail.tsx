import { RegionFillStates, SvgVariant } from '../models/domain';

interface SvgThumbnailProps {
  variant: SvgVariant;
  fills?: RegionFillStates;
  backgroundColor?: string;
  className?: string;
  colorfulUnfilled?: boolean;
}

const previewPalette = ['#ffd5d5', '#ffd89d', '#fff2a8', '#d4f4be', '#bde8ff', '#d8ccff', '#ffd0ef'];

export const SvgThumbnail = ({
  variant,
  fills,
  backgroundColor = '#f7f8ff',
  className,
  colorfulUnfilled = true,
}: SvgThumbnailProps): JSX.Element => (
  <svg className={className} viewBox={variant.viewBox} role="img" aria-label="Painting preview">
    <rect width="100%" height="100%" fill={backgroundColor} />
    {variant.regions.map((region, index) => {
      const fillColor = fills?.[region.id] ?? (colorfulUnfilled ? previewPalette[index % previewPalette.length] : '#ffffff');
      return <path key={region.id} d={region.path} fill={fillColor} stroke="#28344a" strokeWidth={1.4} />;
    })}
  </svg>
);
