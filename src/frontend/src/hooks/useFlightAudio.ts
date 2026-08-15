import type { FlightState } from "@/components/flight/flightPhysics";
import { isTypingTarget } from "@/hooks/useFlightControls";
import { useEffect, useRef } from "react";

export interface FlightAudioOptions {
  /** Kill engine + wind (results / crash). */
  engineMuted: boolean;
  /** Pause the route soundtrack. */
  musicMuted: boolean;
  /** Flight-plan id 1–6 picks a distinct CC0 track. */
  planId: number;
}

const MUSIC_PREF_KEY = "sky-pilot-music";
const MUSIC_VOLUME = 0.46;

const TRACKS: Record<number, string> = {
  1: "/assets/music/coast.m4a",
  2: "/assets/music/ridge.m4a",
  3: "/assets/music/harbor.m4a",
  4: "/assets/music/city.m4a",
  5: "/assets/music/valley.m4a",
  6: "/assets/music/storm.m4a",
};

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
 * Engine rumble is still synthesized (tiny). Route music is real CC0
 * loops in /assets/music so it is actually audible in-flight.
 */
export function useFlightAudio(
  flightState: React.MutableRefObject<FlightState>,
  axes: React.MutableRefObject<{ throttle: number }>,
  options: FlightAudioOptions,
): void {
  const engine = useRef<EngineKit | null>(null);
  const music = useRef<HTMLAudioElement | null>(null);
  const lastAirborne = useRef(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const unlocked = useRef(false);

  useEffect(() => {
    const el = new Audio();
    el.loop = true;
    el.preload = "auto";
    el.volume = MUSIC_VOLUME;
    el.setAttribute("playsinline", "true");
    music.current = el;

    let raf = 0;

    const unlock = () => {
      unlocked.current = true;
      if (!engine.current) {
        engine.current = createEngine();
      }
      void engine.current?.ctx.resume();
      syncMusic();
    };

    const syncMusic = () => {
      const elNow = music.current;
      if (!elNow) return;
      const opts = optionsRef.current;
      const src = TRACKS[opts.planId] ?? TRACKS[1];
      const want = src && !opts.musicMuted;
      if (elNow.dataset.track !== src) {
        elNow.src = src;
        elNow.dataset.track = src;
        elNow.load();
      }
      if (!want) {
        elNow.pause();
        return;
      }
      if (!unlocked.current) return;
      const play = elNow.play();
      if (play) void play.catch(() => {});
    };

    const onGesture = () => unlock();
    window.addEventListener("pointerdown", onGesture);
    window.addEventListener("keydown", onGesture);
    window.addEventListener("touchstart", onGesture, { passive: true });

    const tick = () => {
      const kit = engine.current;
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
      }
      syncMusic();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    syncMusic();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
      window.removeEventListener("touchstart", onGesture);
      el.pause();
      el.src = "";
      music.current = null;
      engine.current?.ctx.close();
      engine.current = null;
    };
  }, [axes, flightState]);
}

interface EngineKit {
  ctx: AudioContext;
  engineOsc: OscillatorNode;
  engineOsc2: OscillatorNode;
  engineGain: GainNode;
  windGain: GainNode;
  master: GainNode;
}

function createEngine(): EngineKit | null {
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

  return { ctx, engineOsc, engineOsc2, engineGain, windGain, master };
}

function makeNoise(ctx: AudioContext): AudioBuffer {
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function bump(kit: EngineKit, peak: number, seconds: number) {
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
