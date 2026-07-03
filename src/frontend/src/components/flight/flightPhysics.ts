import type { FlightPhase, Plane } from "@/types/game";
import * as THREE from "three";

/**
 * Shared flight-simulation state.
 *
 * A single mutable object passed between the page (orchestration), the
 * controls hook (input), and the scene's render loop (integration). Keeping
 * it in a ref-backed object avoids per-frame React re-renders — the page
 * samples a telemetry snapshot on an interval for the HUD.
 */
export interface FlightState {
  /** Plane world position (meters). */
  position: THREE.Vector3;
  /** Plane Euler rotation in radians (x=pitch, y=yaw, z=roll). */
  rotation: THREE.Euler;
  /** Forward velocity along the plane's nose, in m/s. */
  speed: number;
  /** Vertical speed (m/s), positive = climbing. */
  verticalSpeed: number;
  /** Current flight phase. */
  phase: FlightPhase;
  /** Elapsed flight time in seconds. */
  elapsed: number;
  /** Touchdown metrics captured at landing contact. */
  touchdown: {
    descentRate: number; // m/s, positive = downward
    alignmentDeg: number; // degrees off runway heading
    speed: number; // m/s at touchdown
  } | null;
  /** Whether the flight has been flagged complete (score computed). */
  finished: boolean;
}

export interface SceneLayout {
  /** Departure runway start position (plane spawns here). */
  departureStart: THREE.Vector3;
  /** Departure runway heading (radians, 0 = -Z). */
  departureHeading: number;
  /** Departure runway end (where liftoff should occur). */
  departureEnd: THREE.Vector3;
  /** Waypoint position the player flies toward in cruise. */
  waypoint: THREE.Vector3;
  /** Landing runway threshold (approach end). */
  landingThreshold: THREE.Vector3;
  /** Landing runway heading (radians). */
  landingHeading: number;
  /** Landing runway end. */
  landingEnd: THREE.Vector3;
}

/**
 * Build a deterministic scene layout from a flight plan.
 *
 * The layout is fixed regardless of plan content so the physics tuning
 * stays stable; the plan's name/weather/plane flavor the visuals and HUD.
 */
export function buildSceneLayout(): SceneLayout {
  const departureStart = new THREE.Vector3(0, 0.8, 40);
  const departureEnd = new THREE.Vector3(0, 0.8, -60);
  const departureHeading = 0; // facing -Z

  const waypoint = new THREE.Vector3(-30, 60, -120);

  const landingThreshold = new THREE.Vector3(20, 0.8, -260);
  const landingEnd = new THREE.Vector3(20, 0.8, -360);
  const landingHeading = 0;

  return {
    departureStart,
    departureEnd,
    departureHeading,
    waypoint,
    landingThreshold,
    landingEnd,
    landingHeading,
  };
}

/**
 * One physics integration step. Mutates `state` in place.
 *
 * The model is intentionally arcade-style, not a flight sim: pitch input
 * rotates the nose and converts to climb/dive, roll input yaws the heading
 * (coordinated turn approximation), throttle sets target speed which the
 * actual speed eases toward. On the ground the plane is constrained to the
 * runway until it has enough speed to lift off.
 */
export function stepFlight(
  state: FlightState,
  layout: SceneLayout,
  plane: Plane,
  input: { pitch: number; roll: number; throttle: number; brakes: boolean },
  dt: number,
): void {
  if (state.finished) return;
  state.elapsed += dt;

  const agility = 0.6 + plane.agility * 1.4; // rad/s scale
  const stability = 0.5 + plane.stability * 0.8;
  const maxSpeed = 24 + plane.topSpeedKts * 0.18; // m/s
  const liftSpeed = 16; // m/s needed to leave the ground

  // Throttle → target speed
  const brakeFactor = input.brakes ? 0.4 : 1;
  const targetSpeed = maxSpeed * input.throttle * brakeFactor;
  state.speed += (targetSpeed - state.speed) * Math.min(1, dt * 0.8);

  const onGround = state.position.y <= 1.0;

  if (onGround) {
    // Ground handling: only yaw (steering), no pitch/roll effect.
    state.rotation.y -= input.roll * agility * 0.4 * dt;
    // Keep wings level on the ground.
    state.rotation.x *= 0.6;
    state.rotation.z *= 0.6;
    // Clamp to runway during takeoff roll (gentle centering).
    if (state.phase === "takeoff") {
      state.position.x += (layout.departureStart.x - state.position.x) * 0.04;
    }
    // Liftoff: once past lift speed and player pitches up, leave ground.
    if (state.speed > liftSpeed && input.pitch > 0.1) {
      state.verticalSpeed = (state.speed - liftSpeed) * 0.25;
      state.position.y += state.verticalSpeed * dt;
      if (state.position.y > 1.0) {
        state.phase = "cruising";
      }
    } else {
      state.verticalSpeed = 0;
      state.position.y = 0.8;
    }
  } else {
    // Airborne handling.
    state.rotation.x += input.pitch * agility * dt;
    state.rotation.x = THREE.MathUtils.clamp(state.rotation.x, -0.9, 0.9);
    // Roll couples into yaw for coordinated turns.
    state.rotation.z += input.roll * agility * 0.7 * dt;
    state.rotation.z = THREE.MathUtils.clamp(state.rotation.z, -0.8, 0.8);
    state.rotation.y -= input.roll * agility * 0.5 * dt;

    // Pitch → vertical speed (climb/dive), damped by stability.
    const pitchLift = Math.sin(state.rotation.x) * state.speed * 0.05;
    state.verticalSpeed +=
      (pitchLift - state.verticalSpeed) * Math.min(1, dt * (1.2 / stability));
    // Gravity bleed when nose-level.
    if (Math.abs(state.rotation.x) < 0.05) {
      state.verticalSpeed -= 2 * dt;
    }
    state.position.y += state.verticalSpeed * dt;

    // Prevent flying through the ground.
    if (state.position.y < 0.8) {
      state.position.y = 0.8;
      // Touchdown event — capture metrics once.
      if (state.phase === "landing" && !state.touchdown) {
        const alignmentDeg = Math.abs(
          THREE.MathUtils.radToDeg(state.rotation.y - layout.landingHeading),
        );
        state.touchdown = {
          descentRate: Math.max(0, -state.verticalSpeed),
          alignmentDeg,
          speed: state.speed,
        };
        state.phase = "complete";
        state.finished = true;
      }
      state.verticalSpeed = 0;
      state.rotation.x *= 0.3;
      state.rotation.z *= 0.3;
    }
  }

  // Forward motion along heading.
  const forward = new THREE.Vector3(
    Math.sin(state.rotation.y),
    0,
    Math.cos(state.rotation.y),
  ).multiplyScalar(-1); // nose faces -Z
  state.position.addScaledVector(forward, state.speed * dt);

  // Phase transitions based on position.
  if (state.phase === "takeoff" && !onGround) {
    state.phase = "cruising";
  }
  if (
    state.phase === "cruising" &&
    state.position.distanceTo(layout.waypoint) < 30
  ) {
    state.phase = "landing";
  }

  // Auto-level roll when no input (stability).
  if (input.roll === 0 && !onGround) {
    state.rotation.z *= 1 - Math.min(1, dt * 1.5);
  }
}

/**
 * Compute the final score breakdown from the completed flight.
 *
 * - Speed: faster elapsed time → lower score. Scaled against a par time.
 * - Landing smoothness: lower descent rate at touchdown → higher score.
 * - Runway alignment: smaller heading offset → higher score.
 * - Total: weighted average (speed 40%, smoothness 30%, alignment 30%).
 */
export function computeScore(
  state: FlightState,
  layout: SceneLayout,
  plane: Plane,
): {
  speed: number;
  landingSmoothness: number;
  runwayAlignment: number;
  total: number;
} {
  // Par time scales with distance and plane top speed.
  const routeLen = layout.departureStart.distanceTo(layout.landingEnd);
  const parTime = routeLen / (24 + plane.topSpeedKts * 0.18) / 0.7;
  const speedRatio = Math.min(1.5, state.elapsed / parTime);
  const speed = Math.max(
    0,
    Math.min(100, Math.round(100 - (speedRatio - 0.7) * 90)),
  );

  const td = state.touchdown;
  let landingSmoothness = 50;
  let runwayAlignment = 50;
  if (td) {
    // Smoothness: ideal descent < 1.5 m/s. 5+ m/s is rough.
    const descentScore = Math.max(0, 100 - (td.descentRate - 1.5) * 25);
    landingSmoothness = Math.round(Math.max(0, Math.min(100, descentScore)));
    // Alignment: ideal < 3°. 15°+ is poor.
    const alignScore = Math.max(0, 100 - td.alignmentDeg * 6);
    runwayAlignment = Math.round(Math.max(0, Math.min(100, alignScore)));
  }

  const total = Math.round(
    speed * 0.4 + landingSmoothness * 0.3 + runwayAlignment * 0.3,
  );
  return { speed, landingSmoothness, runwayAlignment, total };
}

/** Bearing in degrees from `from` to `to` (0 = north / -Z). */
export function bearing(from: THREE.Vector3, to: THREE.Vector3): number {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  return (THREE.MathUtils.radToDeg(Math.atan2(dx, -dz)) + 360) % 360;
}
