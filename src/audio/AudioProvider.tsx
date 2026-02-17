import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { readAudioSettings, writeAudioSettings } from './audioSettings';

type MusicTheme = 'default' | 'nature' | 'space' | 'pirates';

interface AudioContextValue {
  musicMuted: boolean;
  effectsMuted: boolean;
  toggleMusicMuted: () => void;
  toggleEffectsMuted: () => void;
  setMusicTheme: (themeId: string) => void;
  playPop: () => void;
}

interface AudioEngine {
  ensureStarted: () => Promise<boolean>;
  setMusicMuted: (muted: boolean) => void;
  setEffectsMuted: (muted: boolean) => void;
  setMusicTheme: (themeId: string) => void;
  playPop: () => void;
  dispose: () => void;
}

const AudioContextState = createContext<AudioContextValue | undefined>(undefined);

interface ThemeSong {
  bpm: number;
  stepsPerBeat: number;
  rootMidi: number;
  lead: Array<number | null>;
  bass: Array<number | null>;
  pad: Array<number | null>;
}

const toMusicTheme = (themeId: string): MusicTheme => {
  if (themeId === 'nature' || themeId === 'space' || themeId === 'pirates') {
    return themeId;
  }
  return 'default';
};

const midiToHz = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);
type LegacyAudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

const themeSongs: Record<MusicTheme, ThemeSong> = {
  default: {
    bpm: 94,
    stepsPerBeat: 2,
    rootMidi: 60,
    lead: [0, 4, 7, 9, 7, 4, 2, 4, 0, 4, 7, 11, 9, 7, 4, 2],
    bass: [0, null, -5, null, -3, null, -5, null, 0, null, -5, null, -3, null, -7, null],
    pad: [0, null, null, null, 5, null, null, null, 7, null, null, null, 5, null, null, null],
  },
  nature: {
    bpm: 90,
    stepsPerBeat: 2,
    rootMidi: 62,
    lead: [0, 2, 4, 7, 9, 7, 4, 2, 0, 2, 4, 7, 11, 9, 7, 4],
    bass: [0, null, -5, null, -3, null, -5, null, 0, null, -5, null, -3, null, -7, null],
    pad: [0, null, null, null, 4, null, null, null, 7, null, null, null, 4, null, null, null],
  },
  space: {
    bpm: 74,
    stepsPerBeat: 2,
    rootMidi: 57,
    lead: [0, null, 7, null, 10, null, 7, null, 5, null, 3, null, 2, null, 3, null],
    bass: [0, null, null, null, -2, null, null, null, -5, null, null, null, -7, null, null, null],
    pad: [0, null, null, null, 7, null, null, null, 5, null, null, null, 3, null, null, null],
  },
  pirates: {
    bpm: 114,
    stepsPerBeat: 2,
    rootMidi: 59,
    lead: [0, 4, 7, 4, 9, 7, 5, 4, 0, 4, 7, 4, 10, 9, 7, 5],
    bass: [0, null, -5, null, -5, null, -3, null, 0, null, -5, null, -7, null, -5, null],
    pad: [0, null, null, null, 7, null, null, null, 5, null, null, null, 7, null, null, null],
  },
};

const createAudioEngine = (): AudioEngine => {
  const audioWindow = window as LegacyAudioWindow;
  const AudioContextCtor = window.AudioContext ?? audioWindow.webkitAudioContext;
  if (!AudioContextCtor) {
    return {
      ensureStarted: async () => false,
      setMusicMuted: () => {},
      setEffectsMuted: () => {},
      setMusicTheme: () => {},
      playPop: () => {},
      dispose: () => {},
    };
  }

  let context: AudioContext | null = null;
  let masterGain: GainNode | null = null;
  let musicGain: GainNode | null = null;
  let musicMuted = false;
  let effectsMuted = false;
  let musicTheme: MusicTheme = 'default';
  let noteSchedulerId: number | null = null;
  let nextStepTime = 0;
  let stepIndex = 0;
  let noiseBuffer: AudioBuffer | null = null;
  let unlockedOnce = false;
  let pendingStart: Promise<boolean> | null = null;

  const teardownContext = async (): Promise<void> => {
    if (noteSchedulerId !== null) {
      window.clearInterval(noteSchedulerId);
      noteSchedulerId = null;
    }

    if (context) {
      try {
        await context.close();
      } catch {
        // Ignore teardown failures and attempt a clean recreate anyway.
      }
    }

    context = null;
    masterGain = null;
    musicGain = null;
    noiseBuffer = null;
    unlockedOnce = false;
  };

  const ensureContext = (): AudioContext => {
    if (!context) {
      context = new AudioContextCtor();
      masterGain = context.createGain();
      masterGain.gain.value = 1;
      masterGain.connect(context.destination);
    }

    return context;
  };

  const createNoiseBuffer = (ctx: AudioContext): AudioBuffer => {
    const durationSeconds = 0.14;
    const frameCount = Math.floor(ctx.sampleRate * durationSeconds);
    const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < frameCount; index += 1) {
      channel[index] = (Math.random() * 2 - 1) * 0.9;
    }
    return buffer;
  };

  const scheduleTone = (params: {
    frequency: number;
    wave: OscillatorType;
    startTime: number;
    duration: number;
    peakGain: number;
    attackSeconds: number;
    releaseSeconds: number;
    cutoffHz: number;
    q: number;
  }): void => {
    if (!context || !musicGain) {
      return;
    }

    const oscillator = context.createOscillator();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();

    oscillator.type = params.wave;
    oscillator.frequency.setValueAtTime(params.frequency, params.startTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(params.cutoffHz, params.startTime);
    filter.Q.value = params.q;

    const releaseStart = params.startTime + Math.max(params.attackSeconds + 0.015, params.duration);
    const stopTime = releaseStart + params.releaseSeconds + 0.02;

    gain.gain.setValueAtTime(0.0001, params.startTime);
    gain.gain.exponentialRampToValueAtTime(params.peakGain, params.startTime + params.attackSeconds);
    gain.gain.exponentialRampToValueAtTime(0.0001, releaseStart + params.releaseSeconds);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(musicGain);

    oscillator.start(params.startTime);
    oscillator.stop(stopTime);
    oscillator.onended = () => {
      oscillator.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  };

  const scheduleStep = (song: ThemeSong, step: number, startTime: number, stepDuration: number): void => {
    const leadInterval = song.lead[step % song.lead.length];
    if (leadInterval !== null) {
      scheduleTone({
        frequency: midiToHz(song.rootMidi + leadInterval),
        wave: 'triangle',
        startTime,
        duration: stepDuration * 0.84,
        peakGain: 0.22,
        attackSeconds: 0.01,
        releaseSeconds: 0.07,
        cutoffHz: musicTheme === 'space' ? 1800 : 3200,
        q: 0.9,
      });
    }

    const bassInterval = song.bass[step % song.bass.length];
    if (bassInterval !== null) {
      scheduleTone({
        frequency: midiToHz(song.rootMidi - 12 + bassInterval),
        wave: musicTheme === 'space' ? 'triangle' : 'sine',
        startTime,
        duration: stepDuration * 0.95,
        peakGain: 0.26,
        attackSeconds: 0.008,
        releaseSeconds: 0.1,
        cutoffHz: 900,
        q: 0.7,
      });
    }

    const padInterval = song.pad[step % song.pad.length];
    if (padInterval !== null) {
      scheduleTone({
        frequency: midiToHz(song.rootMidi + padInterval),
        wave: musicTheme === 'pirates' ? 'triangle' : 'sawtooth',
        startTime,
        duration: stepDuration * 1.9,
        peakGain: 0.1,
        attackSeconds: 0.03,
        releaseSeconds: 0.12,
        cutoffHz: musicTheme === 'space' ? 1200 : 2000,
        q: 0.8,
      });
    }
  };

  const startNoteScheduler = (): void => {
    if (noteSchedulerId !== null) {
      return;
    }

    const ctx = ensureContext();
    nextStepTime = ctx.currentTime + 0.04;
    stepIndex = 0;

    noteSchedulerId = window.setInterval(() => {
      if (!context || !musicGain || context.state !== 'running') {
        return;
      }

      const song = themeSongs[musicTheme];
      const stepDuration = 60 / song.bpm / song.stepsPerBeat;

      while (nextStepTime < context.currentTime + 0.2) {
        scheduleStep(song, stepIndex, nextStepTime, stepDuration);
        nextStepTime += stepDuration;
        stepIndex += 1;
      }
    }, 50);
  };

  const ensureMusicNodes = (): void => {
    if (musicGain) {
      return;
    }

    const ctx = ensureContext();
    if (!masterGain) {
      return;
    }

    const toneFilter = ctx.createBiquadFilter();
    toneFilter.type = 'lowpass';
    toneFilter.frequency.value = 3800;
    toneFilter.Q.value = 0.5;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 22;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.01;
    compressor.release.value = 0.12;

    const nextMusicGain = ctx.createGain();
    nextMusicGain.gain.value = musicMuted ? 0 : 0.2;
    nextMusicGain.connect(toneFilter);
    toneFilter.connect(compressor);
    compressor.connect(masterGain);

    musicGain = nextMusicGain;
    startNoteScheduler();
  };

  const rampMusicLevel = (): void => {
    if (!context || !musicGain) {
      return;
    }

    const time = context.currentTime;
    musicGain.gain.cancelScheduledValues(time);
    musicGain.gain.setTargetAtTime(musicMuted ? 0 : 0.2, time, 0.1);
  };

  const warmupIosOutput = (ctx: AudioContext): void => {
    if (unlockedOnce || !masterGain) {
      return;
    }

    // iOS Safari often needs a tiny one-shot source after resume to fully unlock playback.
    const silence = ctx.createBufferSource();
    silence.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    const silenceGain = ctx.createGain();
    silenceGain.gain.value = 0.0001;
    silence.connect(silenceGain);
    silenceGain.connect(masterGain);
    silence.start(ctx.currentTime);
    silence.stop(ctx.currentTime + 0.001);
    silence.onended = () => {
      silence.disconnect();
      silenceGain.disconnect();
    };
    unlockedOnce = true;
  };

  const ensureStarted = async (): Promise<boolean> => {
    if (pendingStart) {
      return pendingStart;
    }

    pendingStart = (async () => {
      try {
        const ctx = ensureContext();
        ensureMusicNodes();
        for (let attempt = 0; attempt < 3 && ctx.state !== 'running'; attempt += 1) {
          await ctx.resume();
          if (ctx.state === 'running') {
            break;
          }

          // Some iOS in-app browsers need a short delay between resume attempts.
          await new Promise<void>((resolve) => {
            window.setTimeout(resolve, 70);
          });
        }

        if (ctx.state !== 'running') {
          // iOS WebViews can get stuck in suspended state; recreate and retry once.
          await teardownContext();
          const retryCtx = ensureContext();
          ensureMusicNodes();
          await retryCtx.resume();
          if (retryCtx.state !== 'running') {
            return false;
          }
        }

        const activeContext = context ?? ctx;
        warmupIosOutput(activeContext);
        rampMusicLevel();
        return true;
      } catch {
        return false;
      } finally {
        pendingStart = null;
      }
    })();

    return pendingStart;
  };

  return {
    ensureStarted,
    setMusicMuted: (muted) => {
      musicMuted = muted;
      rampMusicLevel();
    },
    setEffectsMuted: (muted) => {
      effectsMuted = muted;
    },
    setMusicTheme: (themeId) => {
      const nextTheme = toMusicTheme(themeId);
      if (musicTheme === nextTheme) {
        return;
      }

      musicTheme = nextTheme;
      if (context) {
        nextStepTime = context.currentTime + 0.03;
        stepIndex = 0;
      }
    },
    playPop: () => {
      if (effectsMuted) {
        return;
      }

      const playPopNow = (): void => {
        const ctx = ensureContext();
        if (!masterGain) {
          return;
        }

        if (!noiseBuffer) {
          noiseBuffer = createNoiseBuffer(ctx);
        }

        const time = ctx.currentTime;
        const popBus = ctx.createGain();
        popBus.gain.value = 1.05;
        popBus.connect(masterGain);

        const scheduleNoiseBurst = (params: {
          startTime: number;
          peak: number;
          duration: number;
          highPassHz: number;
          lowPassHz: number;
        }): void => {
          const source = ctx.createBufferSource();
          source.buffer = noiseBuffer;
          const highPass = ctx.createBiquadFilter();
          highPass.type = 'highpass';
          highPass.frequency.setValueAtTime(params.highPassHz, params.startTime);
          const lowPass = ctx.createBiquadFilter();
          lowPass.type = 'lowpass';
          lowPass.frequency.setValueAtTime(params.lowPassHz, params.startTime);
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.0001, params.startTime);
          gain.gain.exponentialRampToValueAtTime(params.peak, params.startTime + 0.002);
          gain.gain.exponentialRampToValueAtTime(0.0001, params.startTime + params.duration);

          source.connect(highPass);
          highPass.connect(lowPass);
          lowPass.connect(gain);
          gain.connect(popBus);

          source.start(params.startTime);
          source.stop(params.startTime + params.duration + 0.02);
          source.onended = () => {
            source.disconnect();
            highPass.disconnect();
            lowPass.disconnect();
            gain.disconnect();
          };
        };

        // Single pop effect: low thump with tiny air burst.
        const thumpOsc = ctx.createOscillator();
        const thumpGain = ctx.createGain();
        thumpOsc.type = 'sine';
        thumpOsc.frequency.setValueAtTime(185, time);
        thumpOsc.frequency.exponentialRampToValueAtTime(138, time + 0.052);
        thumpGain.gain.setValueAtTime(0.0001, time);
        thumpGain.gain.exponentialRampToValueAtTime(0.5, time + 0.004);
        thumpGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.1);
        thumpOsc.connect(thumpGain);
        thumpGain.connect(popBus);
        thumpOsc.start(time);
        thumpOsc.stop(time + 0.12);
        thumpOsc.onended = () => {
          thumpOsc.disconnect();
          thumpGain.disconnect();
        };

        scheduleNoiseBurst({
          startTime: time,
          peak: 0.22,
          duration: 0.058,
          highPassHz: 600,
          lowPassHz: 2700,
        });

        window.setTimeout(() => {
          popBus.disconnect();
        }, 320);
      };

      const ctx = ensureContext();
      if (ctx.state === 'running') {
        playPopNow();
        return;
      }

      void ensureStarted().then((started) => {
        if (!started || effectsMuted) {
          return;
        }
        playPopNow();
      });
    },
    dispose: () => {
      if (!context) {
        return;
      }
      void teardownContext();
    },
  };
};

export const AudioProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const initialSettings = useRef(readAudioSettings());
  const [musicMuted, setMusicMuted] = useState(initialSettings.current.musicMuted);
  const [effectsMuted, setEffectsMuted] = useState(initialSettings.current.effectsMuted);
  const engineRef = useRef<AudioEngine | undefined>(undefined);
  if (!engineRef.current) {
    engineRef.current = createAudioEngine();
  }
  const engine = engineRef.current;

  useEffect(() => {
    writeAudioSettings({ musicMuted, effectsMuted });
  }, [effectsMuted, musicMuted]);

  useEffect(() => {
    engine.setMusicMuted(musicMuted);
  }, [engine, musicMuted]);

  useEffect(() => {
    engine.setEffectsMuted(effectsMuted);
  }, [effectsMuted, engine]);

  useEffect(() => {
    if (musicMuted && effectsMuted) {
      return;
    }

    const removeUnlockListeners = (): void => {
      window.removeEventListener('pointerdown', activateAudio);
      window.removeEventListener('keydown', activateAudio);
      window.removeEventListener('touchstart', activateAudio);
      window.removeEventListener('touchend', activateAudio);
      window.removeEventListener('click', activateAudio);
      document.removeEventListener('pointerdown', activateAudio, true);
      document.removeEventListener('pointerup', activateAudio, true);
      document.removeEventListener('touchstart', activateAudio, true);
      document.removeEventListener('touchend', activateAudio, true);
      document.removeEventListener('click', activateAudio, true);
    };

    const activateAudio = (): void => {
      void engine.ensureStarted().then((started) => {
        if (started) {
          removeUnlockListeners();
        }
      });
    };

    window.addEventListener('pointerdown', activateAudio);
    window.addEventListener('keydown', activateAudio);
    window.addEventListener('touchstart', activateAudio);
    window.addEventListener('touchend', activateAudio);
    window.addEventListener('click', activateAudio);
    document.addEventListener('pointerdown', activateAudio, true);
    document.addEventListener('pointerup', activateAudio, true);
    document.addEventListener('touchstart', activateAudio, true);
    document.addEventListener('touchend', activateAudio, true);
    document.addEventListener('click', activateAudio, true);

    return () => {
      removeUnlockListeners();
    };
  }, [effectsMuted, engine, musicMuted]);

  useEffect(() => {
    if (musicMuted && effectsMuted) {
      return;
    }

    const resumeAudio = (): void => {
      void engine.ensureStarted();
    };

    const onVisibilityChange = (): void => {
      if (document.visibilityState === 'visible') {
        resumeAudio();
      }
    };

    window.addEventListener('focus', resumeAudio);
    window.addEventListener('pageshow', resumeAudio);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('focus', resumeAudio);
      window.removeEventListener('pageshow', resumeAudio);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [effectsMuted, engine, musicMuted]);

  useEffect(() => () => engine.dispose(), [engine]);

  const toggleMusicMuted = useCallback(() => {
    setMusicMuted((previous) => {
      const next = !previous;
      if (!next) {
        void engine.ensureStarted();
      }
      return next;
    });
  }, [engine]);

  const toggleEffectsMuted = useCallback(() => {
    setEffectsMuted((previous) => {
      const next = !previous;
      if (!next) {
        void engine.ensureStarted();
      }
      return next;
    });
  }, [engine]);

  const setMusicTheme = useCallback(
    (themeId: string) => {
      engine.setMusicTheme(themeId);
    },
    [engine]
  );

  const playPop = useCallback(() => {
    engine.playPop();
  }, [engine]);

  return (
    <AudioContextState.Provider
      value={{
        musicMuted,
        effectsMuted,
        toggleMusicMuted,
        toggleEffectsMuted,
        setMusicTheme,
        playPop,
      }}
    >
      {children}
    </AudioContextState.Provider>
  );
};

export const useAudio = (): AudioContextValue => {
  const context = useContext(AudioContextState);
  if (!context) {
    throw new Error('useAudio must be used within AudioProvider');
  }

  return context;
};
