import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { difficultyLabels, getPictureById, getThemeById } from '../data/library';
import { PaintingSession } from '../models/domain';
import { getCompletedSessions } from '../services/storage';
import { formatDateTime, formatDuration } from '../utils/time';
import { SvgThumbnail } from '../components/SvgThumbnail';

export const MyGalleryPage = (): JSX.Element => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<PaintingSession[]>([]);

  useEffect(() => {
    setSessions(getCompletedSessions());
  }, []);

  return (
    <section className="screen">
      <div className="screen__head">
        <h1>My Gallery</h1>
        <p>Completed paintings sorted by most recent completion time.</p>
      </div>

      {sessions.length === 0 ? (
        <div className="empty-state">
          <p>No completed paintings yet.</p>
          <Link className="inline-link" to="/">
            Start painting
          </Link>
        </div>
      ) : (
        <div className="gallery-list">
          {sessions.map((session) => {
            const picture = getPictureById(session.pictureId);
            const theme = picture ? getThemeById(picture.themeId) : undefined;

            if (!picture || !theme) {
              return null;
            }

            return (
              <article key={session.id} className="gallery-item">
                <SvgThumbnail
                  variant={picture.variants[session.difficulty]}
                  fills={session.fills}
                  backgroundColor={session.backgroundColor}
                  colorfulUnfilled={false}
                  className="gallery-item__thumb"
                />

                <div className="gallery-item__meta">
                  <h2>{picture.title}</h2>
                  <p>
                    <strong>Theme:</strong> {theme.name}
                  </p>
                  <p>
                    <strong>Difficulty:</strong> {difficultyLabels[session.difficulty]}
                  </p>
                  <p>
                    <strong>Started:</strong> {formatDateTime(session.startedAt)}
                  </p>
                  <p>
                    <strong>Completed:</strong> {formatDateTime(session.completedAt)}
                  </p>
                  <p>
                    <strong>Duration:</strong> {formatDuration(session.durationMs)}
                  </p>
                </div>

                <div className="gallery-item__actions">
                  <button className="ghost-btn" onClick={() => navigate(`/paint/${session.id}`)}>
                    Open
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
