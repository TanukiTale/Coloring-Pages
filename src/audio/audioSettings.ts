const AUDIO_SETTINGS_KEY = 'coloring-quest:audio:v1';

export interface AudioSettings {
  musicMuted: boolean;
  effectsMuted: boolean;
}

const defaultSettings: AudioSettings = {
  musicMuted: false,
  effectsMuted: false,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const readAudioSettings = (): AudioSettings => {
  try {
    const raw = localStorage.getItem(AUDIO_SETTINGS_KEY);
    if (!raw) {
      return defaultSettings;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return defaultSettings;
    }

    return {
      musicMuted: parsed.musicMuted === true,
      // Migrate from older popMode (0=off, 1..4=on) to simple effects mute flag.
      effectsMuted:
        parsed.effectsMuted === true
          ? true
          : parsed.popMode === 0
            ? true
            : false,
    };
  } catch {
    return defaultSettings;
  }
};

export const writeAudioSettings = (settings: AudioSettings): void => {
  localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(settings));
};
