import { useEffect, useRef, useState } from "react";

/**
 * Keyboard control state for the flight simulator.
 *
 * Each axis is a normalized -1..1 value so the flight loop can apply it
 * directly to the plane's transform. We poll the live key state on each
 * animation frame via the returned ref so there is no React re-render per
 * frame — only the HUD-relevant summary (throttle %, brakes on/off) is
 * surfaced through React state for the telemetry readout.
 */
export interface ControlAxes {
  /** Pitch: -1 = nose down (S), 1 = nose up (W). */
  pitch: number;
  /** Roll / yaw steering: -1 = left (A), 1 = right (D). */
  roll: number;
  /** Throttle: 0 = idle, 1 = full. Shift increases, Ctrl decreases. */
  throttle: number;
  /** Brakes active (Space). */
  brakes: boolean;
}

export interface FlightControls {
  /** Live axes — read inside the render loop, never triggers re-render. */
  axes: React.MutableRefObject<ControlAxes>;
  /** Throttle 0..1 for HUD readout. */
  throttlePct: number;
  /** Brakes engaged flag for HUD readout. */
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

/**
 * Manages keyboard input for flight control. W/S pitch, A/D roll,
 * Shift/Ctrl throttle, Space brakes. Returns a ref of live axes for the
 * render loop plus React state for the HUD telemetry readout.
 */
export function useFlightControls(): FlightControls {
  const axes = useRef<ControlAxes>({
    pitch: 0,
    roll: 0,
    throttle: 0.2,
    brakes: false,
  });
  const keys = useRef<Set<string>>(new Set());
  const [throttlePct, setThrottlePct] = useState(20);
  const [brakesOn, setBrakesOn] = useState(false);

  useEffect(() => {
    const recompute = () => {
      const k = keys.current;
      const pitch =
        (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0) +
        (k.has("KeyS") || k.has("ArrowDown") ? -1 : 0);
      const roll =
        (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) +
        (k.has("KeyA") || k.has("ArrowLeft") ? -1 : 0);
      const brakes = k.has("Space");

      // Throttle ramps toward target so it feels like a real throttle lever.
      const targetUp = k.has("ShiftLeft") || k.has("ShiftRight");
      const targetDown = k.has("ControlLeft") || k.has("ControlRight");
      let throttle = axes.current.throttle;
      const ramp = 0.028;
      if (targetUp) throttle = Math.min(1, throttle + ramp);
      else if (targetDown) throttle = Math.max(0, throttle - ramp);
      // Brakes bleed throttle when on the ground.
      if (brakes) throttle = Math.max(0, throttle - ramp * 2);

      axes.current = { pitch, roll, throttle, brakes };
      setThrottlePct(Math.round(throttle * 100));
      setBrakesOn(brakes);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const action = KEY_MAP[e.code];
      if (!action) return;
      // Prevent page scroll on arrow keys / space while flying.
      if (
        e.code === "Space" ||
        e.code.startsWith("Arrow") ||
        e.code === "Tab"
      ) {
        e.preventDefault();
      }
      keys.current.add(e.code);
      recompute();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (!KEY_MAP[e.code]) return;
      keys.current.delete(e.code);
      recompute();
    };

    const onBlur = () => {
      keys.current.clear();
      recompute();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return { axes, throttlePct, brakesOn };
}
