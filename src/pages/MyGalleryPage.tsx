import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { difficultyLabels, getPictureById, getThemeById } from '../data/library';
import { PaintingSession, Picture, Theme } from '../models/domain';
import { deleteSessionById, getAllSessions } from '../services/storage';
import { downloadPngBlob, renderVariantToPngBlob } from '../services/exportPng';
import { formatDateTime, formatDuration } from '../utils/time';
import { SvgThumbnail } from '../components/SvgThumbnail';

type ClipboardItemConstructor = new (items: Record<string, Blob>) => ClipboardItem;
type NoticeTone = 'success' | 'error' | 'info';
type GallerySortMode = 'recent' | 'theme' | 'name' | 'duration';
type GalleryStatusFilter = 'all' | 'completed' | 'in-progress';

interface PendingDelete {
  sessionId: string;
  pictureTitle: string;
}

interface GalleryNotice {
  message: string;
  tone: NoticeTone;
}

interface GalleryEntry {
  session: PaintingSession;
  picture: Picture;
  theme: Theme;
}

const NOTICE_TIMEOUT_MS = 3000;
const sortOptionLabels: Record<GallerySortMode, string> = {
  recent: 'Most recent',
  theme: 'Theme',
  name: 'Name',
  duration: 'Duration',
};
const statusOptionLabels: Record<GalleryStatusFilter, string> = {
  all: 'All images',
  completed: 'Completed only',
  'in-progress': 'Still in progress',
};

const toFileBaseName = (title: string): string => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const getRecentActivity = (session: PaintingSession): number => new Date(session.completedAt ?? session.updatedAt).getTime();
const blobToDataUrl = async (blob: Blob): Promise<string> =>
  await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string' && reader.result.length > 0) {
        resolve(reader.result);
        return;
      }
      reject(new Error('Empty data URL.'));
    };
    reader.onerror = () => reject(new Error('Unable to read blob.'));
    reader.readAsDataURL(blob);
  });

const tryLegacyImageCopy = async (pngBlob: Blob): Promise<boolean> => {
  if (typeof document.execCommand !== 'function') {
    return false;
  }

  try {
    const dataUrl = await blobToDataUrl(pngBlob);
    let copied = false;
    const onCopy = (event: ClipboardEvent): void => {
      if (!event.clipboardData) {
        return;
      }

      event.clipboardData.setData('text/html', `<img src="${dataUrl}" alt="Coloring page" />`);
      event.clipboardData.setData('text/plain', dataUrl);
      event.preventDefault();
      copied = true;
    };

    document.addEventListener('copy', onCopy);
    try {
      const commandWorked = document.execCommand('copy');
      return copied || commandWorked;
    } finally {
      document.removeEventListener('copy', onCopy);
    }
  } catch {
    return false;
  }
};

export const MyGalleryPage = (): JSX.Element => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<PaintingSession[]>([]);
  const [shareMenuSessionId, setShareMenuSessionId] = useState<string | null>(null);
  const [shareBusySessionId, setShareBusySessionId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [notice, setNotice] = useState<GalleryNotice | null>(null);
  const [sortMode, setSortMode] = useState<GallerySortMode>('recent');
  const [statusFilter, setStatusFilter] = useState<GalleryStatusFilter>('all');
  const [themeFilter, setThemeFilter] = useState<string>('all');
  const [pictureFilter, setPictureFilter] = useState<string>('all');
  const noticeTimerRef = useRef<number | null>(null);
  const collator = useMemo(() => new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' }), []);

  useEffect(() => {
    setSessions(getAllSessions());
  }, []);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current !== null) {
        window.clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!pendingDelete) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      setPendingDelete(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [pendingDelete]);

  const galleryEntries = useMemo(
    () =>
      sessions.reduce<GalleryEntry[]>((acc, session) => {
        const picture = getPictureById(session.pictureId);
        const theme = picture ? getThemeById(picture.themeId) : undefined;
        if (!picture || !theme) {
          return acc;
        }

        acc.push({ session, picture, theme });
        return acc;
      }, []),
    [sessions]
  );

  const statusFilteredEntries = useMemo(
    () =>
      galleryEntries.filter((entry) => {
        if (statusFilter === 'completed') {
          return entry.session.completed;
        }

        if (statusFilter === 'in-progress') {
          return !entry.session.completed;
        }

        return true;
      }),
    [galleryEntries, statusFilter]
  );

  const themeOptions = useMemo(() => {
    const uniqueThemes = statusFilteredEntries.reduce<Map<string, string>>((acc, entry) => {
      acc.set(entry.theme.id, entry.theme.name);
      return acc;
    }, new Map<string, string>());

    return [...uniqueThemes.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((left, right) => collator.compare(left.name, right.name));
  }, [collator, statusFilteredEntries]);

  const pictureOptions = useMemo(() => {
    const uniquePictures = statusFilteredEntries.reduce<Map<string, { title: string; themeName: string }>>((acc, entry) => {
      if (themeFilter !== 'all' && entry.theme.id !== themeFilter) {
        return acc;
      }

      acc.set(entry.picture.id, { title: entry.picture.title, themeName: entry.theme.name });
      return acc;
    }, new Map<string, { title: string; themeName: string }>());

    return [...uniquePictures.entries()]
      .map(([id, details]) => ({ id, ...details }))
      .sort((left, right) => collator.compare(left.title, right.title));
  }, [collator, statusFilteredEntries, themeFilter]);

  useEffect(() => {
    if (themeFilter === 'all') {
      return;
    }

    const hasTheme = themeOptions.some((theme) => theme.id === themeFilter);
    if (!hasTheme) {
      setThemeFilter('all');
      setPictureFilter('all');
    }
  }, [themeFilter, themeOptions]);

  useEffect(() => {
    if (pictureFilter === 'all') {
      return;
    }

    const hasPicture = pictureOptions.some((picture) => picture.id === pictureFilter);
    if (!hasPicture) {
      setPictureFilter('all');
    }
  }, [pictureFilter, pictureOptions]);

  const filteredEntries = useMemo(
    () =>
      statusFilteredEntries.filter(
        (entry) =>
          (themeFilter === 'all' || entry.theme.id === themeFilter) &&
          (pictureFilter === 'all' || entry.picture.id === pictureFilter)
      ),
    [pictureFilter, statusFilteredEntries, themeFilter]
  );

  const sortedEntries = useMemo(() => {
    const byName = (left: GalleryEntry, right: GalleryEntry): number => collator.compare(left.picture.title, right.picture.title);
    const byTheme = (left: GalleryEntry, right: GalleryEntry): number => collator.compare(left.theme.name, right.theme.name);
    const byRecentActivity = (left: GalleryEntry, right: GalleryEntry): number => {
      const leftTime = getRecentActivity(left.session);
      const rightTime = getRecentActivity(right.session);
      return rightTime - leftTime;
    };

    return [...filteredEntries].sort((left, right) => {
      if (sortMode === 'theme') {
        return byTheme(left, right) || byName(left, right) || byRecentActivity(left, right);
      }

      if (sortMode === 'name') {
        return byName(left, right) || byTheme(left, right) || byRecentActivity(left, right);
      }

      if (sortMode === 'duration') {
        const leftDuration = left.session.durationMs ?? 0;
        const rightDuration = right.session.durationMs ?? 0;
        return rightDuration - leftDuration || byName(left, right) || byTheme(left, right) || byRecentActivity(left, right);
      }

      return byRecentActivity(left, right) || byName(left, right) || byTheme(left, right);
    });
  }, [collator, filteredEntries, sortMode]);

  const selectedThemeName = themeOptions.find((theme) => theme.id === themeFilter)?.name;
  const pageFilterAllLabel = selectedThemeName ? `All ${selectedThemeName} pages` : 'All pages';
  const hasActiveFilters = statusFilter !== 'all' || themeFilter !== 'all' || pictureFilter !== 'all';

  const clearNotice = (): void => {
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = null;
    }

    setNotice(null);
  };

  const showNotice = (message: string, tone: NoticeTone): void => {
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
    }

    setNotice({ message, tone });
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice(null);
      noticeTimerRef.current = null;
    }, NOTICE_TIMEOUT_MS);
  };

  const handleDelete = (sessionId: string, pictureTitle: string): void => {
    setShareMenuSessionId(null);
    setPendingDelete({ sessionId, pictureTitle });
  };

  const cancelDelete = (): void => {
    setPendingDelete(null);
  };

  const confirmDelete = (): void => {
    if (!pendingDelete) {
      return;
    }

    const { sessionId, pictureTitle } = pendingDelete;
    const deleted = deleteSessionById(sessionId);
    setPendingDelete(null);

    if (!deleted) {
      showNotice('Unable to delete image right now.', 'error');
      return;
    }

    setSessions((current) => current.filter((session) => session.id !== sessionId));
    showNotice(`Deleted "${pictureTitle}" from My Gallery.`, 'success');
  };

  const clearFilters = (): void => {
    setStatusFilter('all');
    setThemeFilter('all');
    setPictureFilter('all');
  };

  const buildShareBlob = async (session: PaintingSession): Promise<Blob | undefined> => {
    const picture = getPictureById(session.pictureId);
    if (!picture) {
      return undefined;
    }

    return await renderVariantToPngBlob({
      variant: picture.variants[session.difficulty],
      fills: session.fills,
      backgroundColor: session.backgroundColor,
    });
  };

  const handleCopyImage = async (session: PaintingSession): Promise<void> => {
    setShareBusySessionId(session.id);

    try {
      const pngBlob = await buildShareBlob(session);
      if (!pngBlob) {
        showNotice('Unable to copy image right now.', 'error');
        return;
      }

      const ClipboardItemCtor = (globalThis as { ClipboardItem?: ClipboardItemConstructor }).ClipboardItem;
      if (typeof navigator.clipboard?.write === 'function' && ClipboardItemCtor) {
        try {
          await navigator.clipboard.write([new ClipboardItemCtor({ 'image/png': pngBlob })]);
          showNotice('Image copied to clipboard.', 'success');
          setShareMenuSessionId(null);
          return;
        } catch {
          // Fall through to legacy copy path for browsers with partial Clipboard API support.
        }
      }

      const legacyCopyWorked = await tryLegacyImageCopy(pngBlob);
      if (legacyCopyWorked) {
        showNotice('Image copied to clipboard.', 'success');
        setShareMenuSessionId(null);
        return;
      }

      showNotice('Copy image is not supported in this browser. Use Save image instead.', 'error');
    } catch {
      showNotice('Unable to copy image right now.', 'error');
    } finally {
      setShareBusySessionId(null);
    }
  };

  const handleSaveImage = async (session: PaintingSession): Promise<void> => {
    setShareBusySessionId(session.id);

    try {
      const picture = getPictureById(session.pictureId);
      const pngBlob = await buildShareBlob(session);
      if (!picture || !pngBlob) {
        showNotice('Unable to save image right now.', 'error');
        return;
      }

      const fileBaseName = toFileBaseName(picture.title) || 'my-coloring';
      downloadPngBlob(pngBlob, `${fileBaseName}.png`);
      setShareMenuSessionId(null);
      showNotice('Image saved to your device.', 'success');
    } catch {
      showNotice('Unable to save image right now.', 'error');
    } finally {
      setShareBusySessionId(null);
    }
  };

  const handleEmailImage = async (session: PaintingSession): Promise<void> => {
    setShareBusySessionId(session.id);

    try {
      const picture = getPictureById(session.pictureId);
      const theme = picture ? getThemeById(picture.themeId) : undefined;
      const pngBlob = await buildShareBlob(session);
      if (!picture || !pngBlob) {
        showNotice('Unable to prepare image for email right now.', 'error');
        return;
      }

      const fileBaseName = toFileBaseName(picture.title) || 'my-coloring';
      const file = new File([pngBlob], `${fileBaseName}.png`, { type: 'image/png' });
      const nativeShareAvailable =
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] });

      if (nativeShareAvailable) {
        await navigator.share({
          title: `My Coloring Page: ${picture.title}`,
          text: `Sharing my ${theme?.name ?? 'Coloring Quest'} page.`,
          files: [file],
        });
        setShareMenuSessionId(null);
        showNotice('Image shared successfully.', 'success');
        return;
      }

      downloadPngBlob(pngBlob, `${fileBaseName}.png`);
      const body = encodeURIComponent(
        `I wanted to share my coloring page "${picture.title}".\n\nThe image has been downloaded as ${fileBaseName}.png. Please attach it to this email.`
      );
      const subject = encodeURIComponent(`My Coloring Page: ${picture.title}`);
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
      setShareMenuSessionId(null);
      showNotice('Image downloaded. Attach it before sending the email.', 'info');
    } catch {
      showNotice('Unable to prepare email right now.', 'error');
    } finally {
      setShareBusySessionId(null);
    }
  };

  return (
    <section className="screen">
      <div className="screen__head">
        <h1>My Gallery</h1>
        <p>All saved paintings, including in-progress work.</p>
      </div>

      {galleryEntries.length === 0 ? (
        <div className="empty-state">
          <p>No saved paintings yet.</p>
          <Link className="inline-link" to="/">
            Start painting
          </Link>
        </div>
      ) : (
        <>
          <div className="gallery-controls">
            <div className="gallery-sort">
              <label htmlFor="gallery-sort-select">Sort by</label>
              <select
                id="gallery-sort-select"
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as GallerySortMode)}
              >
                <option value="recent">{sortOptionLabels.recent}</option>
                <option value="theme">{sortOptionLabels.theme} (then Name)</option>
                <option value="name">{sortOptionLabels.name}</option>
                <option value="duration">{sortOptionLabels.duration}</option>
              </select>
            </div>

            <div className="gallery-filter">
              <label htmlFor="gallery-filter-status">Filter by</label>
              <select
                id="gallery-filter-status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as GalleryStatusFilter)}
              >
                <option value="all">{statusOptionLabels.all}</option>
                <option value="completed">{statusOptionLabels.completed}</option>
                <option value="in-progress">{statusOptionLabels['in-progress']}</option>
              </select>
            </div>

            <div className="gallery-filter">
              <label htmlFor="gallery-filter-theme">Theme</label>
              <select
                id="gallery-filter-theme"
                value={themeFilter}
                onChange={(event) => {
                  setThemeFilter(event.target.value);
                  setPictureFilter('all');
                }}
              >
                <option value="all">All themes</option>
                {themeOptions.map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="gallery-filter">
              <label htmlFor="gallery-filter-page">Page</label>
              <select id="gallery-filter-page" value={pictureFilter} onChange={(event) => setPictureFilter(event.target.value)}>
                <option value="all">{pageFilterAllLabel}</option>
                {pictureOptions.map((picture) => (
                  <option key={picture.id} value={picture.id}>
                    {themeFilter === 'all' ? `${picture.themeName}: ${picture.title}` : picture.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {sortedEntries.length === 0 ? (
            <div className="empty-state">
              <p>No paintings match this filter.</p>
              {hasActiveFilters ? (
                <button className="ghost-btn" onClick={clearFilters}>
                  Clear filters
                </button>
              ) : null}
            </div>
          ) : (
            <div className="gallery-list">
              {sortedEntries.map(({ session, picture, theme }) => (
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
                      <strong>Status:</strong> {session.completed ? 'Completed' : 'In progress'}
                    </p>
                    <p>
                      <strong>Started:</strong> {formatDateTime(session.startedAt)}
                    </p>
                    {session.completed ? (
                      <>
                        <p>
                          <strong>Completed:</strong> {formatDateTime(session.completedAt)}
                        </p>
                        <p>
                          <strong>Duration:</strong> {formatDuration(session.durationMs)}
                        </p>
                      </>
                    ) : (
                      <p>
                        <strong>Last updated:</strong> {formatDateTime(session.updatedAt)}
                      </p>
                    )}
                  </div>

                  <div className="gallery-item__actions">
                    <div className="gallery-item__action-row">
                      <button className="ghost-btn" onClick={() => navigate(`/paint/${session.id}`)}>
                        Open
                      </button>
                      <button className="ghost-btn danger-btn" onClick={() => handleDelete(session.id, picture.title)}>
                        Delete
                      </button>
                      <button
                        className="ghost-btn"
                        onClick={() => setShareMenuSessionId((current) => (current === session.id ? null : session.id))}
                      >
                        Share
                      </button>
                    </div>

                    {shareMenuSessionId === session.id ? (
                      <div className="gallery-item__share-menu">
                        <button
                          className="action-btn"
                          onClick={() => {
                            void handleCopyImage(session);
                          }}
                          disabled={shareBusySessionId === session.id}
                        >
                          Copy image
                        </button>
                        <button
                          className="action-btn"
                          onClick={() => {
                            void handleSaveImage(session);
                          }}
                          disabled={shareBusySessionId === session.id}
                        >
                          Save image
                        </button>
                        <button
                          className="action-btn"
                          onClick={() => {
                            void handleEmailImage(session);
                          }}
                          disabled={shareBusySessionId === session.id}
                        >
                          Email image
                        </button>
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {pendingDelete ? (
        <div className="overlay" role="alertdialog" aria-modal="true" aria-label="Delete image confirmation" onClick={cancelDelete}>
          <div className="overlay__panel gallery-confirm" onClick={(event) => event.stopPropagation()}>
            <h2>Delete</h2>
            <p>{`Delete "${pendingDelete.pictureTitle}" from My Gallery?`}</p>
            <div className="overlay__actions">
              <button className="ghost-btn" onClick={cancelDelete}>
                Cancel
              </button>
              <button className="primary-btn danger-fill-btn" onClick={confirmDelete}>
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {notice ? (
        <div
          className={`gallery-notice gallery-notice--${notice.tone}`}
          role="status"
          aria-live={notice.tone === 'error' ? 'assertive' : 'polite'}
        >
          <p>{notice.message}</p>
          <button className="gallery-notice__dismiss" onClick={clearNotice} aria-label="Dismiss message">
            x
          </button>
        </div>
      ) : null}
    </section>
  );
};
