import type { FlightPhase, Plane } from "@/types/game";
import * as THREE from "three";

/** Runway surface elevation in world meters. */
export const RUNWAY_ELEVATION = 0.02;
/** Distance from plane origin to wheel contact point. */
export const WHEEL_HEIGHT = 1.05;
/** World Y when the plane is sitting on the runway. */
export const GROUND_CONTACT_Y = RUNWAY_ELEVATION + WHEEL_HEIGHT;

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
    centerlineOffset: number; // meters off runway centerline
  } | null;
  /** Whether the flight has been flagged complete (score computed). */
  finished: boolean;
  /** Whether the plane is airborne (wheels off ground). */
  airborne: boolean;
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
  const departureStart = new THREE.Vector3(0, GROUND_CONTACT_Y, 40);
  const departureEnd = new THREE.Vector3(0, RUNWAY_ELEVATION, -60);
  const departureHeading = 0; // facing -Z

  const waypoint = new THREE.Vector3(-30, 55, -120);

  const landingThreshold = new THREE.Vector3(20, RUNWAY_ELEVATION, -260);
  const landingEnd = new THREE.Vector3(20, RUNWAY_ELEVATION, -360);
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

/** Rotation speed (Vr) in m/s — nose-up becomes effective around this speed. */
function rotationSpeed(plane: Plane): number {
  return 9 + plane.agility * 2;
}

/** Liftoff speed (Vlo) in m/s — enough lift to leave the ground. */
function liftoffSpeed(plane: Plane): number {
  return 11 + plane.topSpeedKts * 0.02;
}

/** Stall speed in m/s — below this the plane loses lift in the air. */
function stallSpeed(plane: Plane): number {
  return 7 + plane.stability * 2;
}

/**
 * One physics integration step. Mutates `state` in place.
 *
 * Arcade-realistic model: throttle drives target airspeed, pitch controls
 * climb/dive, roll couples into coordinated turns. On the runway the plane
 * is constrained to ground contact height until lift exceeds weight.
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

  const agility = 0.7 + plane.agility * 1.6;
  const stability = 0.5 + plane.stability * 0.9;
  const maxSpeed = 22 + plane.topSpeedKts * 0.2;
  const vr = rotationSpeed(plane);
  const vlo = liftoffSpeed(plane);
  const vstall = stallSpeed(plane);

  const brakeFactor = input.brakes ? 0.35 : 1;
  const targetSpeed = maxSpeed * input.throttle * brakeFactor;
  const accelRate = input.brakes ? 2.2 : 1.4;
  state.speed += (targetSpeed - state.speed) * Math.min(1, dt * accelRate);
  state.speed = Math.max(0, state.speed);

  const groundY = GROUND_CONTACT_Y;
  const airborneThreshold = groundY + 0.12;
  const wasAirborne = state.airborne;
  state.airborne = state.position.y > airborneThreshold;

  if (!state.airborne) {
    // ── Ground roll ─────────────────────────────────────────────────────
    state.rotation.y -= input.roll * agility * 0.35 * dt;
    state.rotation.z *= 1 - Math.min(1, dt * 4);

    // Allow pitch-up rotation once at Vr (realistic takeoff technique).
    if (state.speed >= vr * 0.85) {
      const pitchInput = Math.max(input.pitch, state.speed >= vr ? 0.15 : 0);
      state.rotation.x += pitchInput * agility * 0.6 * dt;
      state.rotation.x = THREE.MathUtils.clamp(state.rotation.x, -0.05, 0.55);
    } else {
      state.rotation.x *= 1 - Math.min(1, dt * 3);
    }

    // Center on departure runway during takeoff roll.
    if (state.phase === "takeoff") {
      state.position.x += (layout.departureStart.x - state.position.x) * 0.06;
    }

    // Lift builds with speed² and pitch (ground effect boosts near runway).
    const dynamicPressure = state.speed * state.speed;
    const pitchLift =
      Math.sin(state.rotation.x) * dynamicPressure * 0.004 +
      dynamicPressure * 0.0008;
    const groundEffect = state.position.y < groundY + 2 ? 1.35 : 1;
    const weight = 9.8;
    const netLift = pitchLift * groundEffect - weight * 0.15;

    if (state.speed >= vlo && (input.pitch > 0.05 || state.rotation.x > 0.12)) {
      state.verticalSpeed = Math.max(0.5, netLift * 0.35);
      state.position.y += state.verticalSpeed * dt;
      if (state.position.y > airborneThreshold) {
        state.airborne = true;
        if (state.phase === "takeoff") state.phase = "cruising";
      }
    } else if (state.speed >= vlo && state.rotation.x > 0.08) {
      // Auto-rotate: at liftoff speed with nose up, gently lift.
      state.verticalSpeed = Math.max(0.3, (state.speed - vlo) * 0.4);
      state.position.y += state.verticalSpeed * dt;
      if (state.position.y > airborneThreshold) {
        state.airborne = true;
        if (state.phase === "takeoff") state.phase = "cruising";
      }
    } else {
      state.verticalSpeed = 0;
      state.position.y = groundY;
    }
  } else {
    // ── Airborne ────────────────────────────────────────────────────────
    state.rotation.x += input.pitch * agility * dt;
    state.rotation.x = THREE.MathUtils.clamp(state.rotation.x, -0.85, 0.75);
    state.rotation.z += input.roll * agility * 0.75 * dt;
    state.rotation.z = THREE.MathUtils.clamp(state.rotation.z, -0.85, 0.85);
    state.rotation.y -= input.roll * agility * 0.55 * dt;

    const dynamicPressure = state.speed * state.speed;
    const pitchLift = Math.sin(state.rotation.x) * state.speed * 0.09;
    const speedLift = dynamicPressure * 0.0012;
    const stallPenalty =
      state.speed < vstall ? (vstall - state.speed) * 0.35 : 0;

    state.verticalSpeed +=
      (pitchLift + speedLift - stallPenalty - state.verticalSpeed * 0.08) *
      Math.min(1, dt * (1.4 / stability));

    // Gentle gravity when not climbing.
    if (state.rotation.x < 0.04 && state.verticalSpeed > -2) {
      state.verticalSpeed -= 1.8 * dt;
    }

    state.position.y += state.verticalSpeed * dt;

    // Ground collision / landing.
    if (state.position.y <= groundY) {
      const descentAtContact = Math.max(0, -state.verticalSpeed);
      state.position.y = groundY;
      state.airborne = false;
      state.verticalSpeed = 0;
      state.rotation.x *= 0.25;
      state.rotation.z *= 0.25;

      if (state.phase === "landing" && !state.touchdown) {
        const alignmentDeg = Math.abs(
          THREE.MathUtils.radToDeg(state.rotation.y - layout.landingHeading),
        );
        const runwayCenterX = layout.landingThreshold.x;
        state.touchdown = {
          descentRate: descentAtContact,
          alignmentDeg,
          speed: state.speed,
          centerlineOffset: Math.abs(state.position.x - runwayCenterX),
        };
        state.phase = "complete";
        state.finished = true;
      } else if (wasAirborne && state.speed > vlo * 0.9) {
        // Bounced or hard landing outside scoring — bleed speed.
        state.speed *= 0.6;
      }
    }
  }

  // Forward motion along heading.
  const forward = new THREE.Vector3(
    Math.sin(state.rotation.y),
    0,
    Math.cos(state.rotation.y),
  ).multiplyScalar(-1);
  state.position.addScaledVector(forward, state.speed * dt);

  // Phase transitions.
  if (state.phase === "takeoff" && state.airborne) {
    state.phase = "cruising";
  }
  if (
    state.phase === "cruising" &&
    state.position.distanceTo(layout.waypoint) < 35
  ) {
    state.phase = "landing";
  }

  // Auto-level roll when no input (stability).
  if (input.roll === 0 && state.airborne) {
    state.rotation.z *= 1 - Math.min(1, dt * 1.8);
  }
}

/**
 * Compute the final score breakdown from the completed flight.
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
  const routeLen = layout.departureStart.distanceTo(layout.landingEnd);
  const parTime = routeLen / (22 + plane.topSpeedKts * 0.2) / 0.65;
  const speedRatio = Math.min(1.5, state.elapsed / parTime);
  const speed = Math.max(
    0,
    Math.min(100, Math.round(100 - (speedRatio - 0.7) * 90)),
  );

  const td = state.touchdown;
  let landingSmoothness = 50;
  let runwayAlignment = 50;
  if (td) {
    const descentScore = Math.max(0, 100 - (td.descentRate - 1.2) * 22);
    landingSmoothness = Math.round(Math.max(0, Math.min(100, descentScore)));
    const alignScore = Math.max(0, 100 - td.alignmentDeg * 5);
    const centerlineScore = Math.max(0, 100 - td.centerlineOffset * 12);
    runwayAlignment = Math.round(
      Math.max(0, Math.min(100, alignScore * 0.6 + centerlineScore * 0.4)),
    );
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

/** Knots for HUD hints. */
export function mpsToKts(mps: number): number {
  return mps * 1.94384;
}
