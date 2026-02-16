import {
  BonusRevealEvent,
  Difficulty,
  PaintSnapshot,
  PersistedState,
  PaintingSession,
  ThemeProgress,
} from '../models/domain';

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

const readState = (): PersistedState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return cloneState(emptyState);
    }

    const parsed = JSON.parse(raw) as PersistedState;
    if (!parsed.sessions || !parsed.themeProgress) {
      return cloneState(emptyState);
    }

    return parsed;
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
    backgroundColor: params.initialBackground ?? '#f4f7ff',
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

  if (!params.isBonusPicture) {
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
