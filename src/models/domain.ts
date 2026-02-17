export type Difficulty = 'easy' | 'medium' | 'challenge';

export interface SvgRegionDefinition {
  id: string;
  path: string;
}

export interface SvgVariant {
  viewBox: string;
  regions: SvgRegionDefinition[];
}

export interface Picture {
  id: string;
  themeId: string;
  title: string;
  description: string;
  isBonus: boolean;
  thumbnailAsset: string;
  variants: Record<Difficulty, SvgVariant>;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  accentColor: string;
  coverAsset: string;
  pictureIds: string[];
  bonusPictureId: string;
}

export interface RegionFillStates {
  [regionId: string]: string;
}

export interface PaintSnapshot {
  fills: RegionFillStates;
  backgroundColor: string;
}

export interface PaintingSession {
  id: string;
  themeId: string;
  pictureId: string;
  difficulty: Difficulty;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  durationMs?: number;
  completed: boolean;
  fills: RegionFillStates;
  backgroundColor: string;
  archivedFromTheme?: boolean;
  undoStack: PaintSnapshot[];
  redoStack: PaintSnapshot[];
}

export interface ThemeProgress {
  themeId: string;
  completedRegularCount: number;
  unlockedQuadrants: number;
  bonusUnlocked: boolean;
  lastUpdatedAt: string;
}

export interface PersistedState {
  sessions: Record<string, PaintingSession>;
  themeProgress: Record<string, ThemeProgress>;
}

export interface BonusRevealEvent {
  themeId: string;
  themeName: string;
  bonusPictureId: string;
  unlockedQuadrants: number;
  newlyUnlockedQuadrant: number;
  remainingToUnlock: number;
  bonusUnlocked: boolean;
}
