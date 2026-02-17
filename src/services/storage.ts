import {
  BonusRevealEvent,
  Difficulty,
  PaintSnapshot,
  PersistedState,
  PaintingSession,
  ThemeProgress,
} from '../models/domain';
import { getPictureById } from '../data/library';

const STORAGE_KEY = 'coloring-quest:v1';

const emptyState: PersistedState = {
  sessions: {},
  themeProgress: {},
};

const cloneState = (state: PersistedState): PersistedState =>
  JSON.parse(JSON.stringify(state)) as PersistedState;

const nowIso = (): string => new Date().toISOString();

const createId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toStringMap = (value: unknown): Record<string, string> => {
  if (!isRecord(value)) {
    return {};
  }

  return Object.entries(value).reduce<Record<string, string>>((acc, [key, entryValue]) => {
    if (typeof entryValue === 'string') {
      acc[key] = entryValue;
    }

    return acc;
  }, {});
};

const isDifficulty = (value: unknown): value is Difficulty =>
  value === 'easy' || value === 'medium' || value === 'challenge';

const normalizeSnapshot = (value: unknown): PaintSnapshot => {
  if (!isRecord(value)) {
    return { fills: {}, backgroundColor: '#ffffff' };
  }

  return {
    fills: toStringMap(value.fills),
    backgroundColor: typeof value.backgroundColor === 'string' ? value.backgroundColor : '#ffffff',
  };
};

const normalizeSession = (sessionId: string, value: unknown): PaintingSession | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const themeId = typeof value.themeId === 'string' ? value.themeId : undefined;
  const pictureId = typeof value.pictureId === 'string' ? value.pictureId : undefined;
  if (!themeId || !pictureId) {
    return undefined;
  }

  const id = typeof value.id === 'string' && value.id.length > 0 ? value.id : sessionId;
  const startedAt = typeof value.startedAt === 'string' ? value.startedAt : nowIso();
  const updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt : startedAt;
  const completed = value.completed === true;
  const completedAt = typeof value.completedAt === 'string' ? value.completedAt : undefined;
  const durationMs =
    typeof value.durationMs === 'number' && Number.isFinite(value.durationMs) && value.durationMs >= 0
      ? value.durationMs
      : undefined;

  return {
    id,
    themeId,
    pictureId,
    difficulty: isDifficulty(value.difficulty) ? value.difficulty : 'easy',
    startedAt,
    updatedAt,
    completed,
    completedAt: completed ? completedAt ?? updatedAt : undefined,
    durationMs: completed ? durationMs : undefined,
    fills: toStringMap(value.fills),
    backgroundColor: typeof value.backgroundColor === 'string' ? value.backgroundColor : '#ffffff',
    archivedFromTheme: value.archivedFromTheme === true,
    undoStack: Array.isArray(value.undoStack) ? value.undoStack.map(normalizeSnapshot) : [],
    redoStack: Array.isArray(value.redoStack) ? value.redoStack.map(normalizeSnapshot) : [],
  };
};

const normalizeThemeProgress = (themeId: string, value: unknown): ThemeProgress | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const completedRegularCount =
    typeof value.completedRegularCount === 'number' && Number.isFinite(value.completedRegularCount)
      ? Math.max(0, Math.floor(value.completedRegularCount))
      : 0;
  const unlockedFromCount = Math.min(4, completedRegularCount);
  const unlockedQuadrants =
    typeof value.unlockedQuadrants === 'number' && Number.isFinite(value.unlockedQuadrants)
      ? Math.min(4, Math.max(unlockedFromCount, Math.floor(value.unlockedQuadrants)))
      : unlockedFromCount;

  return {
    themeId,
    completedRegularCount,
    unlockedQuadrants,
    bonusUnlocked: value.bonusUnlocked === true || unlockedQuadrants >= 4,
    lastUpdatedAt: typeof value.lastUpdatedAt === 'string' ? value.lastUpdatedAt : nowIso(),
  };
};

const buildThemeProgressFromSessions = (sessions: Record<string, PaintingSession>): Record<string, ThemeProgress> => {
  const progressByTheme = new Map<string, { count: number; lastUpdatedAt: string }>();

  Object.values(sessions).forEach((session) => {
    if (!session.completed || session.archivedFromTheme) {
      return;
    }

    const picture = getPictureById(session.pictureId);
    if (!picture || picture.isBonus) {
      return;
    }

    const existing = progressByTheme.get(session.themeId);
    const eventTime = session.completedAt ?? session.updatedAt;
    if (!existing) {
      progressByTheme.set(session.themeId, { count: 1, lastUpdatedAt: eventTime });
      return;
    }

    const previousMs = new Date(existing.lastUpdatedAt).getTime();
    const nextMs = new Date(eventTime).getTime();
    progressByTheme.set(session.themeId, {
      count: existing.count + 1,
      lastUpdatedAt: nextMs > previousMs ? eventTime : existing.lastUpdatedAt,
    });
  });

  const result: Record<string, ThemeProgress> = {};
  progressByTheme.forEach((value, themeId) => {
    const unlockedQuadrants = Math.min(4, value.count);
    result[themeId] = {
      themeId,
      completedRegularCount: value.count,
      unlockedQuadrants,
      bonusUnlocked: unlockedQuadrants >= 4,
      lastUpdatedAt: value.lastUpdatedAt,
    };
  });

  return result;
};

const getSessionUpdatedAtMs = (session: PaintingSession): number => {
  const updatedAtMs = new Date(session.updatedAt).getTime();
  return Number.isFinite(updatedAtMs) ? updatedAtMs : 0;
};

const readState = (): PersistedState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return cloneState(emptyState);
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return cloneState(emptyState);
    }

    const rawSessions = isRecord(parsed.sessions) ? parsed.sessions : {};
    const sessions = Object.entries(rawSessions).reduce<Record<string, PaintingSession>>((acc, [sessionId, value]) => {
      const normalized = normalizeSession(sessionId, value);
      if (normalized) {
        acc[normalized.id] = normalized;
      }
      return acc;
    }, {});

    const rawThemeProgress = isRecord(parsed.themeProgress) ? parsed.themeProgress : {};
    const themeProgress = Object.entries(rawThemeProgress).reduce<Record<string, ThemeProgress>>((acc, [themeId, value]) => {
      const normalized = normalizeThemeProgress(themeId, value);
      if (normalized) {
        acc[themeId] = normalized;
      }
      return acc;
    }, {});

    const recomputedProgress = buildThemeProgressFromSessions(sessions);
    const normalizedState: PersistedState = {
      sessions,
      themeProgress: {
        ...themeProgress,
        ...recomputedProgress,
      },
    };

    const normalizedRaw = JSON.stringify(normalizedState);
    if (normalizedRaw !== raw) {
      localStorage.setItem(STORAGE_KEY, normalizedRaw);
    }

    return normalizedState;
  } catch {
    return cloneState(emptyState);
  }
};

const writeState = (state: PersistedState): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const snapshotFromSession = (session: PaintingSession): PaintSnapshot => ({
  fills: { ...session.fills },
  backgroundColor: session.backgroundColor,
});

const updateSession = (
  state: PersistedState,
  sessionId: string,
  mutate: (session: PaintingSession) => PaintingSession
): PaintingSession | undefined => {
  const session = state.sessions[sessionId];
  if (!session) {
    return undefined;
  }

  const updated = mutate(session);
  state.sessions[sessionId] = updated;
  writeState(state);
  return updated;
};

const getOrCreateThemeProgress = (state: PersistedState, themeId: string): ThemeProgress => {
  const existing = state.themeProgress[themeId];
  if (existing) {
    return existing;
  }

  const next: ThemeProgress = {
    themeId,
    completedRegularCount: 0,
    unlockedQuadrants: 0,
    bonusUnlocked: false,
    lastUpdatedAt: nowIso(),
  };

  state.themeProgress[themeId] = next;
  return next;
};

const recomputeThemeProgressForTheme = (state: PersistedState, themeId: string): void => {
  const completedRegularCount = Object.values(state.sessions).filter((session) => {
    if (session.themeId !== themeId || !session.completed || session.archivedFromTheme) {
      return false;
    }

    const picture = getPictureById(session.pictureId);
    return Boolean(picture && !picture.isBonus);
  }).length;

  const hasExistingProgress = Boolean(state.themeProgress[themeId]);
  if (!hasExistingProgress && completedRegularCount === 0) {
    return;
  }

  const unlockedQuadrants = Math.min(4, completedRegularCount);
  state.themeProgress[themeId] = {
    themeId,
    completedRegularCount,
    unlockedQuadrants,
    bonusUnlocked: unlockedQuadrants >= 4,
    lastUpdatedAt: nowIso(),
  };
};

export const createPaintingSession = (params: {
  themeId: string;
  pictureId: string;
  difficulty: Difficulty;
  initialBackground?: string;
}): PaintingSession => {
  const state = readState();
  const session: PaintingSession = {
    id: createId(),
    themeId: params.themeId,
    pictureId: params.pictureId,
    difficulty: params.difficulty,
    startedAt: nowIso(),
    updatedAt: nowIso(),
    completed: false,
    fills: {},
    backgroundColor: params.initialBackground ?? '#ffffff',
    archivedFromTheme: false,
    undoStack: [],
    redoStack: [],
  };

  state.sessions[session.id] = session;
  writeState(state);
  return session;
};

export const getSessionById = (sessionId: string): PaintingSession | undefined => {
  const state = readState();
  return state.sessions[sessionId];
};

export const getAllSessions = (): PaintingSession[] => {
  const state = readState();
  return Object.values(state.sessions);
};

export const getLatestInProgressSessionByPictureAndDifficulty = (
  pictureId: string,
  difficulty: Difficulty
): PaintingSession | undefined =>
  getAllSessions()
    .filter(
      (session) =>
        session.pictureId === pictureId &&
        session.difficulty === difficulty &&
        !session.completed &&
        !session.archivedFromTheme
    )
    .sort((a, b) => getSessionUpdatedAtMs(b) - getSessionUpdatedAtMs(a))[0];

export const getLatestSessionMapByThemeId = (themeId: string): Record<string, PaintingSession> =>
  getAllSessions()
    .filter((session) => session.themeId === themeId && !session.archivedFromTheme)
    .sort((a, b) => getSessionUpdatedAtMs(b) - getSessionUpdatedAtMs(a))
    .reduce<Record<string, PaintingSession>>((acc, session) => {
      if (!acc[session.pictureId]) {
        acc[session.pictureId] = session;
      }

      return acc;
    }, {});

export const getThemeProgressMap = (): Record<string, ThemeProgress> => {
  const state = readState();
  return state.themeProgress;
};

export const getThemeProgressByThemeId = (themeId: string): ThemeProgress => {
  const state = readState();
  return getOrCreateThemeProgress(state, themeId);
};

export const setSession = (session: PaintingSession): PaintingSession => {
  const state = readState();
  state.sessions[session.id] = session;
  writeState(state);
  return session;
};

export const fillRegion = (sessionId: string, regionId: string, color: string): PaintingSession | undefined => {
  const state = readState();
  return updateSession(state, sessionId, (session) => {
    if (session.completed) {
      return session;
    }

    if (session.fills[regionId] === color) {
      return session;
    }

    return {
      ...session,
      fills: {
        ...session.fills,
        [regionId]: color,
      },
      updatedAt: nowIso(),
      undoStack: [...session.undoStack, snapshotFromSession(session)],
      redoStack: [],
    };
  });
};

export const fillBackground = (sessionId: string, color: string): PaintingSession | undefined => {
  const state = readState();
  return updateSession(state, sessionId, (session) => {
    if (session.completed) {
      return session;
    }

    if (session.backgroundColor === color) {
      return session;
    }

    return {
      ...session,
      backgroundColor: color,
      updatedAt: nowIso(),
      undoStack: [...session.undoStack, snapshotFromSession(session)],
      redoStack: [],
    };
  });
};

export const undoPaint = (sessionId: string): PaintingSession | undefined => {
  const state = readState();
  return updateSession(state, sessionId, (session) => {
    if (session.completed || session.undoStack.length === 0) {
      return session;
    }

    const previous = session.undoStack[session.undoStack.length - 1];
    if (!previous) {
      return session;
    }

    return {
      ...session,
      fills: { ...previous.fills },
      backgroundColor: previous.backgroundColor,
      updatedAt: nowIso(),
      undoStack: session.undoStack.slice(0, -1),
      redoStack: [snapshotFromSession(session), ...session.redoStack],
    };
  });
};

export const redoPaint = (sessionId: string): PaintingSession | undefined => {
  const state = readState();
  return updateSession(state, sessionId, (session) => {
    if (session.completed || session.redoStack.length === 0) {
      return session;
    }

    const [nextSnapshot, ...nextRedoStack] = session.redoStack;
    if (!nextSnapshot) {
      return session;
    }

    return {
      ...session,
      fills: { ...nextSnapshot.fills },
      backgroundColor: nextSnapshot.backgroundColor,
      updatedAt: nowIso(),
      undoStack: [...session.undoStack, snapshotFromSession(session)],
      redoStack: nextRedoStack,
    };
  });
};

export const markSessionCompleted = (params: {
  sessionId: string;
  isBonusPicture: boolean;
  themeName: string;
  bonusPictureId: string;
}): {
  session?: PaintingSession;
  reveal?: BonusRevealEvent;
} => {
  const state = readState();
  const session = state.sessions[params.sessionId];

  if (!session) {
    return {};
  }

  if (session.completed) {
    return { session };
  }

  const completedAt = nowIso();
  const durationMs = new Date(completedAt).getTime() - new Date(session.startedAt).getTime();
  const completedSession: PaintingSession = {
    ...session,
    completed: true,
    completedAt,
    updatedAt: completedAt,
    durationMs,
    undoStack: [],
    redoStack: [],
  };

  state.sessions[params.sessionId] = completedSession;

  let reveal: BonusRevealEvent | undefined;

  if (!params.isBonusPicture && !completedSession.archivedFromTheme) {
    const themeProgress = getOrCreateThemeProgress(state, completedSession.themeId);
    const previousUnlocks = themeProgress.unlockedQuadrants;

    const completedRegularCount = themeProgress.completedRegularCount + 1;
    const unlockedQuadrants = Math.min(4, completedRegularCount);
    const bonusUnlocked = unlockedQuadrants >= 4;

    state.themeProgress[completedSession.themeId] = {
      ...themeProgress,
      completedRegularCount,
      unlockedQuadrants,
      bonusUnlocked,
      lastUpdatedAt: completedAt,
    };

    if (unlockedQuadrants > previousUnlocks) {
      reveal = {
        themeId: completedSession.themeId,
        themeName: params.themeName,
        bonusPictureId: params.bonusPictureId,
        unlockedQuadrants,
        newlyUnlockedQuadrant: unlockedQuadrants,
        remainingToUnlock: Math.max(0, 4 - unlockedQuadrants),
        bonusUnlocked,
      };
    }
  }

  writeState(state);
  return {
    session: completedSession,
    reveal,
  };
};

export const getCompletedSessions = (): PaintingSession[] =>
  getAllSessions()
    .filter((session) => session.completed && session.completedAt)
    .sort((a, b) => {
      const left = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const right = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return right - left;
    });

export const deleteSessionById = (sessionId: string): boolean => {
  const state = readState();
  const session = state.sessions[sessionId];

  if (!session) {
    return false;
  }

  delete state.sessions[sessionId];
  recomputeThemeProgressForTheme(state, session.themeId);
  writeState(state);
  return true;
};

export const resetThemeProgressByThemeId = (themeId: string): boolean => {
  const state = readState();
  let didChange = false;

  Object.entries(state.sessions).forEach(([sessionId, session]) => {
    if (session.themeId !== themeId || session.archivedFromTheme) {
      return;
    }

    state.sessions[sessionId] = {
      ...session,
      archivedFromTheme: true,
    };
    didChange = true;
  });

  const existing = state.themeProgress[themeId];
  const nextProgress: ThemeProgress = {
    themeId,
    completedRegularCount: 0,
    unlockedQuadrants: 0,
    bonusUnlocked: false,
    lastUpdatedAt: nowIso(),
  };

  if (
    !existing ||
    existing.completedRegularCount !== 0 ||
    existing.unlockedQuadrants !== 0 ||
    existing.bonusUnlocked
  ) {
    state.themeProgress[themeId] = nextProgress;
    didChange = true;
  } else {
    state.themeProgress[themeId] = {
      ...existing,
      lastUpdatedAt: nextProgress.lastUpdatedAt,
    };
  }

  if (!didChange) {
    return false;
  }

  writeState(state);
  return true;
};
