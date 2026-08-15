import type { FlightState } from "@/components/flight/flightPhysics";
import { useEffect, useRef } from "react";

/**
 * Procedural flight audio via the Web Audio API — no sample files, so
 * the Caffeine asset canister stays small. Starts on the first key/click
 * because browsers block AudioContext until a user gesture.
 */
export function useFlightAudio(
  flightState: React.MutableRefObject<FlightState>,
  axes: React.MutableRefObject<{ throttle: number }>,
  muted: boolean,
): void {
  const audio = useRef<AudioKit | null>(null);
  const lastAirborne = useRef(false);

  useEffect(() => {
    let raf = 0;
    let started = false;

    const start = () => {
      if (started) return;
      started = true;
      const kit = createKit();
      if (!kit) return;
      audio.current = kit;
    };

    const onGesture = () => start();
    window.addEventListener("keydown", onGesture, { once: true });
    window.addEventListener("pointerdown", onGesture, { once: true });

    const tick = () => {
      const kit = audio.current;
      const s = flightState.current;
      if (kit) {
        const throttle = muted ? 0 : axes.current.throttle;
        const speed = muted ? 0 : s.speed;
        const rpm = 70 + throttle * 90;
        kit.engineOsc.frequency.setTargetAtTime(rpm, kit.ctx.currentTime, 0.08);
        kit.engineOsc2.frequency.setTargetAtTime(
          rpm * 1.97,
          kit.ctx.currentTime,
          0.08,
        );
        const engineGain = muted
          ? 0
          : 0.012 + throttle * 0.055 + (s.airborne ? 0.008 : 0.018);
        kit.engineGain.gain.setTargetAtTime(
          engineGain,
          kit.ctx.currentTime,
          0.06,
        );
        const wind = muted ? 0 : Math.min(0.045, speed * 0.0009);
        kit.windGain.gain.setTargetAtTime(wind, kit.ctx.currentTime, 0.1);

        if (lastAirborne.current && !s.airborne && !muted) {
          bump(kit, 0.08, 0.12);
        }
        lastAirborne.current = s.airborne;
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
  }, [axes, flightState, muted]);
}

interface AudioKit {
  ctx: AudioContext;
  engineOsc: OscillatorNode;
  engineOsc2: OscillatorNode;
  engineGain: GainNode;
  windGain: GainNode;
  master: GainNode;
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

  return { ctx, engineOsc, engineOsc2, engineGain, windGain, master };
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
