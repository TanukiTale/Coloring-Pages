import { Picture } from '../models/domain';
import { SvgThumbnail } from './SvgThumbnail';

interface PictureCardProps {
  picture: Picture;
  onSelect: () => void;
  badge?: string;
}

export const PictureCard = ({ picture, onSelect, badge }: PictureCardProps): JSX.Element => (
  <button className="picture-card" onClick={onSelect}>
    {picture.thumbnailAsset ? (
      <img src={picture.thumbnailAsset} alt={picture.title} className="picture-card__asset" />
    ) : (
      <SvgThumbnail variant={picture.variants.easy} className="picture-card__svg" />
    )}
    <span className="picture-card__title">{picture.title}</span>
    <span className="picture-card__desc">{picture.description}</span>
    {badge ? <span className="picture-card__badge">{badge}</span> : null}
  </button>
);
