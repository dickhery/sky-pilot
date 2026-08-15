import type { FlightState } from "@/components/flight/flightPhysics";
import { isTypingTarget } from "@/hooks/useFlightControls";
import { useEffect, useRef } from "react";

export interface FlightAudioOptions {
  /** Kill engine + wind (results / crash). */
  engineMuted: boolean;
  /** Kill the route soundtrack. */
  musicMuted: boolean;
  /** Flight-plan id 1–6 picks a distinct loop. */
  planId: number;
}

const MUSIC_PREF_KEY = "sky-pilot-music";

export function readMusicPref(): boolean {
  try {
    return window.localStorage.getItem(MUSIC_PREF_KEY) !== "off";
  } catch {
    return true;
  }
}

export function writeMusicPref(on: boolean): void {
  try {
    window.localStorage.setItem(MUSIC_PREF_KEY, on ? "on" : "off");
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Procedural engine + per-route soundtrack via the Web Audio API.
 * No sample files — the Caffeine asset canister stays small and
 * reimport stays offline-friendly.
 */
export function useFlightAudio(
  flightState: React.MutableRefObject<FlightState>,
  axes: React.MutableRefObject<{ throttle: number }>,
  options: FlightAudioOptions,
): void {
  const audio = useRef<AudioKit | null>(null);
  const lastAirborne = useRef(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    let raf = 0;
    let started = false;

    const start = () => {
      if (started) return;
      started = true;
      const kit = createKit();
      if (!kit) return;
      audio.current = kit;
      void kit.ctx.resume();
    };

    const onGesture = () => start();
    window.addEventListener("keydown", onGesture, { once: true });
    window.addEventListener("pointerdown", onGesture, { once: true });

    const tick = () => {
      const kit = audio.current;
      const s = flightState.current;
      const opts = optionsRef.current;
      if (kit) {
        if (kit.ctx.state === "suspended") void kit.ctx.resume();
        const throttle = opts.engineMuted ? 0 : axes.current.throttle;
        const speed = opts.engineMuted ? 0 : s.speed;
        const rpm = 70 + throttle * 90;
        kit.engineOsc.frequency.setTargetAtTime(rpm, kit.ctx.currentTime, 0.08);
        kit.engineOsc2.frequency.setTargetAtTime(
          rpm * 1.97,
          kit.ctx.currentTime,
          0.08,
        );
        const engineGain = opts.engineMuted
          ? 0
          : 0.012 + throttle * 0.055 + (s.airborne ? 0.008 : 0.018);
        kit.engineGain.gain.setTargetAtTime(
          engineGain,
          kit.ctx.currentTime,
          0.06,
        );
        const wind = opts.engineMuted ? 0 : Math.min(0.045, speed * 0.0009);
        kit.windGain.gain.setTargetAtTime(wind, kit.ctx.currentTime, 0.1);

        if (lastAirborne.current && !s.airborne && !opts.engineMuted) {
          bump(kit, 0.08, 0.12);
        }
        lastAirborne.current = s.airborne;

        const theme = themeForPlan(opts.planId);
        if (kit.music.planId !== opts.planId) {
          kit.music.planId = opts.planId;
          kit.music.theme = theme;
          kit.music.step = 0;
          kit.music.nextTime = kit.ctx.currentTime + 0.05;
          kit.musicFilter.frequency.setTargetAtTime(
            theme.filterHz,
            kit.ctx.currentTime,
            0.2,
          );
        }
        const musicTarget = opts.musicMuted ? 0 : theme.gain;
        kit.musicGain.gain.setTargetAtTime(
          musicTarget,
          kit.ctx.currentTime,
          0.18,
        );
        if (!opts.musicMuted) {
          scheduleMusic(kit, kit.ctx.currentTime);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onGesture);
      window.removeEventListener("pointerdown", onGesture);
      audio.current?.ctx.close();
      audio.current = null;
    };
  }, [axes, flightState]);
}

interface MusicTheme {
  bpm: number;
  root: number;
  scale: number[];
  pad: number[];
  melody: number[];
  bass: number[];
  wave: OscillatorType;
  filterHz: number;
  gain: number;
}

interface MusicState {
  planId: number;
  theme: MusicTheme;
  step: number;
  nextTime: number;
}

interface AudioKit {
  ctx: AudioContext;
  engineOsc: OscillatorNode;
  engineOsc2: OscillatorNode;
  engineGain: GainNode;
  windGain: GainNode;
  musicGain: GainNode;
  musicFilter: BiquadFilterNode;
  music: MusicState;
  master: GainNode;
}

function themeForPlan(planId: number): MusicTheme {
  switch (planId) {
    case 2:
      return {
        bpm: 110,
        root: 293.66,
        scale: [0, 2, 4, 7, 9, 10],
        pad: [0, 4, 7, 10],
        melody: [4, -1, 7, 4, 9, 7, 4, 2, 7, -1, 4, 0, 10, 7, 4, 2],
        bass: [0, 0, 7, 5],
        wave: "sawtooth",
        filterHz: 720,
        gain: 0.028,
      };
    case 3:
      return {
        bpm: 72,
        root: 220,
        scale: [0, 2, 3, 7, 8],
        pad: [0, 3, 7],
        melody: [0, -1, -1, 3, 2, -1, 7, -1, 3, -1, 0, 2, 8, 7, 3, 0],
        bass: [0, -5, 0, 3],
        wave: "sine",
        filterHz: 640,
        gain: 0.032,
      };
    case 4:
      return {
        bpm: 124,
        root: 185,
        scale: [0, 2, 3, 5, 7, 10],
        pad: [0, 3, 7, 10],
        melody: [7, 5, 3, 0, 10, 7, 5, 3, 7, -1, 10, 7, 5, 3, 2, 0],
        bass: [0, 0, 5, 7],
        wave: "square",
        filterHz: 580,
        gain: 0.022,
      };
    case 5:
      return {
        bpm: 84,
        root: 196,
        scale: [0, 2, 3, 5, 7, 9],
        pad: [0, 3, 7, 10],
        melody: [2, 3, 5, -1, 7, 5, 3, 2, 0, -1, 9, 7, 5, 3, 2, 0],
        bass: [0, 2, 7, 5],
        wave: "triangle",
        filterHz: 700,
        gain: 0.03,
      };
    case 6:
      return {
        bpm: 132,
        root: 164.81,
        scale: [0, 1, 3, 5, 7, 8],
        pad: [0, 3, 7, 8],
        melody: [0, 1, 3, 0, 7, 5, 3, 1, 8, 7, 5, 3, 1, 0, 3, 0],
        bass: [0, 1, 0, 5],
        wave: "sawtooth",
        filterHz: 540,
        gain: 0.026,
      };
    default:
      return {
        bpm: 88,
        root: 261.63,
        scale: [0, 2, 4, 7, 9],
        pad: [0, 4, 7],
        melody: [0, -1, 2, 4, 2, -1, 4, 7, 4, 2, 0, -1, 7, 4, 2, 0],
        bass: [0, 0, 4, 7],
        wave: "triangle",
        filterHz: 880,
        gain: 0.032,
      };
  }
}

function noteHz(theme: MusicTheme, degree: number): number {
  const scale = theme.scale;
  const steps = scale.length;
  const octave = Math.floor(degree / steps);
  const idx = ((degree % steps) + steps) % steps;
  const semis = scale[idx] + octave * 12;
  return theme.root * 2 ** (semis / 12);
}

function scheduleMusic(kit: AudioKit, now: number) {
  const m = kit.music;
  const stepSec = 60 / m.theme.bpm / 2;
  if (m.nextTime < now - 0.5) {
    m.nextTime = now + 0.02;
  }
  while (m.nextTime < now + 0.18) {
    const i = m.step % 16;
    const deg = m.theme.melody[i] ?? -1;
    if (deg >= 0) {
      pluck(kit, noteHz(m.theme, deg), m.nextTime, 0.2, 0.18);
    }
    if (i % 4 === 0) {
      const bassDeg = m.theme.bass[(i / 4) % m.theme.bass.length] ?? 0;
      pluck(kit, noteHz(m.theme, bassDeg) * 0.5, m.nextTime, 0.38, 0.22);
    }
    if (i === 0) {
      for (const p of m.theme.pad) {
        padTone(kit, noteHz(m.theme, p) * 0.5, m.nextTime, stepSec * 16);
      }
    }
    m.nextTime += stepSec;
    m.step += 1;
  }
}

function pluck(
  kit: AudioKit,
  freq: number,
  when: number,
  dur: number,
  peak: number,
) {
  const osc = kit.ctx.createOscillator();
  osc.type = kit.music.theme.wave;
  osc.frequency.setValueAtTime(freq, when);
  const g = kit.ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(peak, when + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.connect(g);
  g.connect(kit.musicFilter);
  osc.start(when);
  osc.stop(when + dur + 0.02);
}

function padTone(kit: AudioKit, freq: number, when: number, dur: number) {
  const osc = kit.ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, when);
  const g = kit.ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.07, when + 0.4);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.connect(g);
  g.connect(kit.musicFilter);
  osc.start(when);
  osc.stop(when + dur + 0.02);
}

function createKit(): AudioKit | null {
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  const ctx = new Ctor();
  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);

  const engineGain = ctx.createGain();
  engineGain.gain.value = 0;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 420;
  engineGain.connect(filter);
  filter.connect(master);

  const engineOsc = ctx.createOscillator();
  engineOsc.type = "sawtooth";
  engineOsc.frequency.value = 80;
  engineOsc.connect(engineGain);
  engineOsc.start();

  const engineOsc2 = ctx.createOscillator();
  engineOsc2.type = "triangle";
  engineOsc2.frequency.value = 160;
  const g2 = ctx.createGain();
  g2.gain.value = 0.45;
  engineOsc2.connect(g2);
  g2.connect(engineGain);
  engineOsc2.start();

  const noise = ctx.createBufferSource();
  noise.buffer = makeNoise(ctx);
  noise.loop = true;
  const windFilter = ctx.createBiquadFilter();
  windFilter.type = "highpass";
  windFilter.frequency.value = 800;
  const windGain = ctx.createGain();
  windGain.gain.value = 0;
  noise.connect(windFilter);
  windFilter.connect(windGain);
  windGain.connect(master);
  noise.start();

  const musicFilter = ctx.createBiquadFilter();
  musicFilter.type = "lowpass";
  musicFilter.frequency.value = 880;
  const musicGain = ctx.createGain();
  musicGain.gain.value = 0;
  musicFilter.connect(musicGain);
  musicGain.connect(master);

  const theme = themeForPlan(1);
  musicFilter.frequency.value = theme.filterHz;

  return {
    ctx,
    engineOsc,
    engineOsc2,
    engineGain,
    windGain,
    musicGain,
    musicFilter,
    music: { planId: 1, theme, step: 0, nextTime: ctx.currentTime + 0.2 },
    master,
  };
}

function makeNoise(ctx: AudioContext): AudioBuffer {
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function bump(kit: AudioKit, peak: number, seconds: number) {
  const t = kit.ctx.currentTime;
  const g = kit.ctx.createGain();
  g.gain.setValueAtTime(peak, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
  const src = kit.ctx.createBufferSource();
  src.buffer = makeNoise(kit.ctx);
  const f = kit.ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 180;
  src.connect(f);
  f.connect(g);
  g.connect(kit.master);
  src.start();
  src.stop(t + seconds);
}

/** Toggle music from M unless a text field is focused. */
export function bindMusicHotkey(toggle: () => void): () => void {
  const onKey = (e: KeyboardEvent) => {
    if (e.repeat || e.code !== "KeyM") return;
    if (isTypingTarget(e.target)) return;
    e.preventDefault();
    toggle();
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}
