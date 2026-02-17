import { PaintingSession, Picture } from '../models/domain';
import { SvgThumbnail } from './SvgThumbnail';

interface PictureCardProps {
  picture: Picture;
  onSelect: () => void;
  badge?: string;
  session?: PaintingSession;
}

export const PictureCard = ({ picture, onSelect, badge, session }: PictureCardProps): JSX.Element => (
  <button className="picture-card" onClick={onSelect}>
    {session ? (
      <SvgThumbnail
        variant={picture.variants[session.difficulty]}
        fills={session.fills}
        backgroundColor={session.backgroundColor}
        colorfulUnfilled={false}
        className="picture-card__svg"
      />
    ) : (
      <SvgThumbnail variant={picture.variants.easy} colorfulUnfilled={false} className="picture-card__svg" />
    )}
    <span className="picture-card__title">{picture.title}</span>
    <span className="picture-card__desc">{picture.description}</span>
    {session ? <span className="picture-card__status">{session.completed ? 'Completed' : 'In progress'}</span> : null}
    {badge ? <span className="picture-card__badge">{badge}</span> : null}
  </button>
);
