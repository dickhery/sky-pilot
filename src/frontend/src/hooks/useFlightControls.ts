import { useEffect, useRef, useState } from "react";

/**
 * Keyboard control state for the flight simulator.
 *
 * Axes are smoothed each animation frame so pitch/roll feel less twitchy.
 * Throttle ramps like a real lever; brakes bleed speed on the ground.
 */
export interface ControlAxes {
  pitch: number;
  roll: number;
  throttle: number;
  brakes: boolean;
}

export interface FlightControls {
  axes: React.MutableRefObject<ControlAxes>;
  throttlePct: number;
  brakesOn: boolean;
}

const KEY_MAP: Record<
  string,
  keyof ControlAxes | "throttleUp" | "throttleDown" | "brakes"
> = {
  KeyW: "pitch",
  ArrowUp: "pitch",
  KeyS: "pitch",
  ArrowDown: "pitch",
  KeyA: "roll",
  ArrowLeft: "roll",
  KeyD: "roll",
  ArrowRight: "roll",
  ShiftLeft: "throttleUp",
  ShiftRight: "throttleUp",
  ControlLeft: "throttleDown",
  ControlRight: "throttleDown",
  Space: "brakes",
};

export function useFlightControls(): FlightControls {
  const axes = useRef<ControlAxes>({
    pitch: 0,
    roll: 0,
    throttle: 0.25,
    brakes: false,
  });
  const keys = useRef<Set<string>>(new Set());
  const target = useRef({ pitch: 0, roll: 0 });
  const [throttlePct, setThrottlePct] = useState(25);
  const [brakesOn, setBrakesOn] = useState(false);

  useEffect(() => {
    const readTargets = () => {
      const k = keys.current;
      target.current.pitch =
        (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0) +
        (k.has("KeyS") || k.has("ArrowDown") ? -1 : 0);
      target.current.roll =
        (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) +
        (k.has("KeyA") || k.has("ArrowLeft") ? -1 : 0);
      return k.has("Space");
    };

    let frame = 0;
    const tick = () => {
      const brakes = readTargets();
      const t = target.current;
      const a = axes.current;
      const smooth = 0.14;

      a.pitch += (t.pitch - a.pitch) * smooth;
      a.roll += (t.roll - a.roll) * smooth;

      const ramp = 0.032;
      const targetUp =
        keys.current.has("ShiftLeft") || keys.current.has("ShiftRight");
      const targetDown =
        keys.current.has("ControlLeft") || keys.current.has("ControlRight");
      if (targetUp) a.throttle = Math.min(1, a.throttle + ramp);
      else if (targetDown) a.throttle = Math.max(0, a.throttle - ramp);
      if (brakes) a.throttle = Math.max(0, a.throttle - ramp * 2.5);

      a.brakes = brakes;
      a.pitch = Math.abs(a.pitch) < 0.01 ? 0 : a.pitch;
      a.roll = Math.abs(a.roll) < 0.01 ? 0 : a.roll;

      setThrottlePct(Math.round(a.throttle * 100));
      setBrakesOn(brakes);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    const onKeyDown = (e: KeyboardEvent) => {
      const action = KEY_MAP[e.code];
      if (!action) return;
      if (
        e.code === "Space" ||
        e.code.startsWith("Arrow") ||
        e.code === "Tab"
      ) {
        e.preventDefault();
      }
      keys.current.add(e.code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (!KEY_MAP[e.code]) return;
      keys.current.delete(e.code);
    };

    const onBlur = () => {
      keys.current.clear();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return { axes, throttlePct, brakesOn };
}
