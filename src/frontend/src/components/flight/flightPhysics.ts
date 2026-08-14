import type { FlightPhase, Plane } from "@/types/game";
import * as THREE from "three";

/** Runway surface elevation in world meters. */
export const RUNWAY_ELEVATION = 0.02;
/** Distance from plane origin to wheel contact point. */
export const WHEEL_HEIGHT = 1.05;
/** World Y when the plane is sitting on the runway. */
export const GROUND_CONTACT_Y = RUNWAY_ELEVATION + WHEEL_HEIGHT;
/** Half-width of runway corridor used for landing detection (meters). */
export const RUNWAY_HALF_WIDTH = 6.5;
/** Airspeed (kt) at which the HUD prompts rotation. */
export const ROTATE_SPEED_KTS = 55;
/** Target approach speed shown in the HUD (kt). */
export const APPROACH_SPEED_KTS = 70;

const G = 9.81;
const _forward = new THREE.Vector3();

export type LandingHint =
  | null
  | "wrong_runway"
  | "off_corridor"
  | "too_fast"
  | "brake_to_finish";

/**
 * Shared flight-simulation state.
 */
export interface FlightState {
  position: THREE.Vector3;
  /** Euler order YXZ: heading (y), pitch (x, +nose-up), bank (z, −right-wing-down). */
  rotation: THREE.Euler;
  speed: number;
  verticalSpeed: number;
  phase: FlightPhase;
  elapsed: number;
  touchdown: {
    descentRate: number;
    alignmentDeg: number;
    speed: number;
    centerlineOffset: number;
  } | null;
  finished: boolean;
  airborne: boolean;
  /** HUD feedback when a landing attempt fails or rollout is pending. */
  landingHint: LandingHint;
  /** True once the player has been airborne at least once this flight. */
  hasFlown: boolean;
}

export interface SceneLayout {
  departureStart: THREE.Vector3;
  departureHeading: number;
  departureEnd: THREE.Vector3;
  waypoint: THREE.Vector3;
  landingThreshold: THREE.Vector3;
  landingHeading: number;
  landingEnd: THREE.Vector3;
}

export function createInitialRotation(heading = 0): THREE.Euler {
  return new THREE.Euler(0, heading, 0, "YXZ");
}

export function buildSceneLayout(): SceneLayout {
  const departureStart = new THREE.Vector3(0, GROUND_CONTACT_Y, 85);
  const departureEnd = new THREE.Vector3(0, RUNWAY_ELEVATION, -85);
  const departureHeading = 0;

  const waypoint = new THREE.Vector3(-28, 62, -145);

  const landingThreshold = new THREE.Vector3(22, RUNWAY_ELEVATION, -290);
  const landingEnd = new THREE.Vector3(22, RUNWAY_ELEVATION, -430);
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

/** Level-flight cruise speed used by the energy model and scoring par time. */
export function cruiseSpeedMps(plane: Plane): number {
  return plane.topSpeedKts * 0.48;
}

/** Stall speed in m/s — Cessna is slower and more forgiving. */
export function stallSpeedMps(plane: Plane): number {
  return 22 + (1 - plane.stability) * 10;
}

function rotateSpeedMps(plane: Plane): number {
  return stallSpeedMps(plane) * 1.12;
}

function maxBank(plane: Plane): number {
  return 0.85 + plane.agility * 0.45;
}

/** True when position is over the landing runway corridor. */
export function isOnLandingRunway(
  position: THREE.Vector3,
  layout: SceneLayout,
): boolean {
  const centerX = layout.landingThreshold.x;
  const zMin = Math.min(layout.landingThreshold.z, layout.landingEnd.z) - 20;
  const zMax = Math.max(layout.landingThreshold.z, layout.landingEnd.z) + 10;
  return (
    Math.abs(position.x - centerX) <= RUNWAY_HALF_WIDTH &&
    position.z <= zMax &&
    position.z >= zMin
  );
}

/** True when position is over the departure runway corridor. */
export function isOnDepartureRunway(
  position: THREE.Vector3,
  layout: SceneLayout,
): boolean {
  const centerX = layout.departureStart.x;
  const zMin = Math.min(layout.departureStart.z, layout.departureEnd.z) - 10;
  const zMax = Math.max(layout.departureStart.z, layout.departureEnd.z) + 10;
  return (
    Math.abs(position.x - centerX) <= RUNWAY_HALF_WIDTH &&
    position.z <= zMax &&
    position.z >= zMin
  );
}

function isOnAnyRunway(position: THREE.Vector3, layout: SceneLayout): boolean {
  return (
    isOnLandingRunway(position, layout) || isOnDepartureRunway(position, layout)
  );
}

export function distanceToLandingThreshold(
  position: THREE.Vector3,
  layout: SceneLayout,
): number {
  const dx = position.x - layout.landingThreshold.x;
  const dz = position.z - layout.landingThreshold.z;
  return Math.hypot(dx, dz);
}

/**
 * One physics integration step. Mutates `state` in place.
 *
 * Model (game-tuned, physically motivated):
 * - Throttle is thrust, not a speed target. Drag grows with V².
 * - Pitching up trades airspeed for altitude (and the reverse).
 * - A/D banks the wings in the air; the aircraft turns from that bank
 *   (coordinated). On the ground A/D steers the nosewheel.
 * - Lift comes from angle of attack and dynamic pressure; too slow or
 *   too much nose-up stalls and the nose drops.
 */
export function stepFlight(
  state: FlightState,
  layout: SceneLayout,
  plane: Plane,
  input: { pitch: number; roll: number; throttle: number; brakes: boolean },
  dt: number,
): void {
  if (state.finished) return;
  const step = Math.min(dt, 0.05);
  state.elapsed += step;
  state.landingHint = null;

  if (state.rotation.order !== "YXZ") {
    state.rotation.order = "YXZ";
  }

  const agility = 0.7 + plane.agility * 1.15;
  const stability = 0.45 + plane.stability * 0.9;
  const vCruise = cruiseSpeedMps(plane);
  const vStall = stallSpeedMps(plane);
  const vRotate = rotateSpeedMps(plane);
  const groundY = GROUND_CONTACT_Y;

  const pitch = state.rotation.x;
  const bank = state.rotation.z;

  const wasAirborne = state.airborne;
  const airborneThreshold = groundY + 0.14;
  state.airborne = state.position.y > airborneThreshold;
  if (state.airborne) state.hasFlown = true;

  // ── Attitude ──────────────────────────────────────────────────────────
  if (!state.airborne) {
    // Nosewheel / rudder steering. Bank stays on the ground.
    const steerAuth = THREE.MathUtils.clamp(state.speed / 6, 0.15, 1.15);
    state.rotation.y -= input.roll * agility * 0.7 * steerAuth * step;
    state.rotation.z += (0 - bank) * Math.min(1, step * 8);

    // Rotation (nose up) only once there is airflow over the elevator.
    if (state.speed >= vRotate * 0.55 || state.phase === "rollout") {
      state.rotation.x += input.pitch * agility * 0.42 * step;
      state.rotation.x = THREE.MathUtils.clamp(state.rotation.x, -0.04, 0.28);
    } else {
      state.rotation.x += (0 - pitch) * Math.min(1, step * 4);
    }
  } else {
    const pitchRate = agility * 0.38;
    const rollRate = agility * 1.05;
    state.rotation.x += input.pitch * pitchRate * step;
    state.rotation.x = THREE.MathUtils.clamp(state.rotation.x, -0.55, 0.72);
    // D = +roll → right wing down → negative Z in this convention.
    state.rotation.z -= input.roll * rollRate * step;
    const bankLimit = maxBank(plane);
    state.rotation.z = THREE.MathUtils.clamp(
      state.rotation.z,
      -bankLimit,
      bankLimit,
    );

    // Wings-level stability when the stick is released.
    if (input.roll === 0) {
      state.rotation.z *= 1 - Math.min(1, step * (0.55 + stability * 0.7));
    }
    // Attitude hold: released elevator keeps the current pitch.

    // Coordinated turn: yaw rate comes from bank, not from aileron input.
    // Turn is slightly faster than real-world so the compact world stays fun.
    const speedForTurn = Math.max(state.speed, 10);
    // Right bank (z < 0) must decrease heading so the nose tracks right.
    const yawRate = (Math.tan(state.rotation.z) * G * 1.15) / speedForTurn;
    state.rotation.y += yawRate * step;
  }

  // ── Energy: thrust, drag, gravity along the flight path ───────────────
  const pathAngle = Math.atan2(
    state.verticalSpeed,
    Math.max(state.speed, 0.35),
  );
  const aoa = state.rotation.x - pathAngle;

  const throttle = THREE.MathUtils.clamp(input.throttle, 0, 1);
  // Static thrust-to-weight is sporty so the short runways still work.
  const thrustAccel = (5.1 + plane.agility * 1.6) * throttle;
  const q = 0.5 * state.speed * state.speed;

  const stallAoa = 0.26 + plane.stability * 0.04;
  let cl = 0.22 + aoa * 4.4;
  let stalled = false;
  if (aoa > stallAoa) {
    stalled = true;
    const over = aoa - stallAoa;
    cl = 0.22 + stallAoa * 4.4 - over * 11;
  }
  if (state.speed < vStall && state.airborne) {
    stalled = true;
    cl *= Math.max(0.15, state.speed / vStall);
  }
  cl = THREE.MathUtils.clamp(cl, -0.7, 1.55);

  const heightAgl = state.position.y - groundY;
  const groundEffect = heightAgl < 3.5 ? 1 + (1 - heightAgl / 3.5) * 0.28 : 1;

  // Calibrated so ~1G at cruise with a few degrees of AoA.
  const liftAccel = q * cl * 0.0165 * groundEffect;

  const cd0 = 0.0022 + (1 - plane.agility) * 0.00035;
  const induced = (0.85 * cl * cl) / Math.max(state.speed * state.speed, 40);
  const parasite = cd0 * state.speed * state.speed;
  const gravityAlongPath = G * Math.sin(pathAngle);

  let accel = thrustAccel - parasite - induced - gravityAlongPath;
  if (!state.airborne) {
    const onPaved = isOnAnyRunway(state.position, layout);
    const rolling = onPaved ? 0.55 : 2.4;
    const braking = input.brakes ? (onPaved ? 11 : 7) : 0;
    accel -= rolling + braking;
  } else if (input.brakes) {
    // Airbrake / extra drag — useful on final.
    accel -= 2.2;
  }

  state.speed = Math.max(0, state.speed + accel * step);
  if (!state.airborne && input.brakes) {
    state.speed = Math.max(0, state.speed - step * 2);
  }

  // ── Vertical channel ──────────────────────────────────────────────────
  if (!state.airborne) {
    const canRotate =
      state.phase !== "rollout" &&
      state.speed >= vRotate * 0.92 &&
      (input.pitch > 0.05 || state.rotation.x > 0.09);

    const liftExceedsWeight = liftAccel > G * 0.96;
    if (canRotate && liftExceedsWeight) {
      state.verticalSpeed = Math.max(0.45, (liftAccel - G) * 0.35);
      state.position.y += state.verticalSpeed * step;
      if (state.position.y > airborneThreshold) {
        state.airborne = true;
        state.hasFlown = true;
      }
    } else {
      state.verticalSpeed = 0;
      state.position.y = groundY;
    }
  } else {
    const bankRad = state.rotation.z;
    const verticalLift =
      liftAccel * Math.cos(bankRad) * Math.cos(state.rotation.x);
    const thrustUp = thrustAccel * Math.sin(state.rotation.x);
    let vsAccel = verticalLift + thrustUp - G;

    if (stalled) {
      // Nose drop and extra sink — recoverable by lowering the nose / adding power.
      state.rotation.x -= step * (0.55 + Math.max(0, aoa) * 0.8);
      vsAccel -= 3.2;
    }

    // Light damping so the ride isn't springy.
    vsAccel -= state.verticalSpeed * 0.12;
    state.verticalSpeed += vsAccel * step;
    state.position.y += state.verticalSpeed * step;

    if (state.position.y <= groundY) {
      const descentAtContact = Math.max(0, -state.verticalSpeed);
      const hard = descentAtContact > 9;

      if (hard && descentAtContact < 16) {
        // Bounce rather than sticking a crash-rate arrival.
        state.position.y = groundY + 0.2;
        state.verticalSpeed = descentAtContact * 0.28;
        state.speed *= 0.82;
        state.rotation.x *= 0.55;
      } else {
        state.position.y = groundY;
        state.airborne = false;
        state.verticalSpeed = 0;
        state.rotation.x *= 0.18;
        state.rotation.z *= 0.15;

        const onLanding = isOnLandingRunway(state.position, layout);
        const onDeparture = isOnDepartureRunway(state.position, layout);

        if (onLanding && wasAirborne && !state.touchdown) {
          if (state.speed > vCruise * 0.85) {
            state.landingHint = "too_fast";
            state.speed *= 0.7;
          }
          const alignmentDeg = Math.abs(
            THREE.MathUtils.radToDeg(state.rotation.y - layout.landingHeading),
          );
          state.touchdown = {
            descentRate: descentAtContact,
            alignmentDeg,
            speed: state.speed,
            centerlineOffset: Math.abs(
              state.position.x - layout.landingThreshold.x,
            ),
          };
          state.phase = "rollout";
          state.landingHint = "brake_to_finish";
        } else if (wasAirborne && state.hasFlown) {
          if (onDeparture) {
            state.landingHint = "wrong_runway";
          } else if (state.phase === "landing" || state.phase === "rollout") {
            state.landingHint = "off_corridor";
          }
          state.speed *= 0.5;
        }
      }
    }
  }

  // Forward along heading. The aircraft always tracks its nose (no sideslip).
  const heading = state.rotation.y;
  _forward.set(-Math.sin(heading), 0, -Math.cos(heading));
  state.position.addScaledVector(_forward, state.speed * step);

  // ── Phase transitions ─────────────────────────────────────────────────
  if (state.phase === "takeoff" && state.airborne) {
    state.phase = "cruising";
  }

  if (state.phase === "cruising") {
    const nearWaypoint = state.position.distanceTo(layout.waypoint) < 55;
    const nearLanding =
      distanceToLandingThreshold(state.position, layout) < 200;
    const onApproachPath = state.position.z < -160;
    if (nearWaypoint || nearLanding || onApproachPath) {
      state.phase = "landing";
    }
  }

  if (state.phase === "rollout" && !state.airborne) {
    if (input.brakes) {
      state.speed = Math.max(0, state.speed - step * 16);
    }
    if (state.speed <= 10) {
      state.phase = "complete";
      state.finished = true;
      state.landingHint = null;
    } else {
      state.landingHint = "brake_to_finish";
    }
  }
}

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
  const parTime = routeLen / cruiseSpeedMps(plane) / 0.62;
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

export function bearing(from: THREE.Vector3, to: THREE.Vector3): number {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  return (THREE.MathUtils.radToDeg(Math.atan2(dx, -dz)) + 360) % 360;
}

export function mpsToKts(mps: number): number {
  return mps * 1.94384;
}

/** Mission step index (1-based) for HUD progress display. */
export function missionStep(phase: FlightPhase): number {
  switch (phase) {
    case "takeoff":
      return 1;
    case "cruising":
      return 2;
    case "landing":
      return 3;
    case "rollout":
      return 4;
    case "complete":
      return 4;
    default:
      return 1;
  }
}
