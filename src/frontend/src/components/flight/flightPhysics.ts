import type { FlightPhase, Plane } from "@/types/game";
import * as THREE from "three";

/** Runway surface elevation in world meters. */
export const RUNWAY_ELEVATION = 0.02;
/** Distance from plane origin to wheel contact point. */
export const WHEEL_HEIGHT = 1.05;
/** World Y when the plane is sitting on the runway. */
export const GROUND_CONTACT_Y = RUNWAY_ELEVATION + WHEEL_HEIGHT;
/** Half-width of runway corridor used for landing detection (meters). */
export const RUNWAY_HALF_WIDTH = 6;

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

export function buildSceneLayout(): SceneLayout {
  const departureStart = new THREE.Vector3(0, GROUND_CONTACT_Y, 40);
  const departureEnd = new THREE.Vector3(0, RUNWAY_ELEVATION, -60);
  const departureHeading = 0;

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

export function distanceToLandingThreshold(
  position: THREE.Vector3,
  layout: SceneLayout,
): number {
  const threshold = layout.landingThreshold.clone();
  threshold.y = position.y;
  return position.distanceTo(threshold);
}

function rotationSpeed(plane: Plane): number {
  return 9 + plane.agility * 2;
}

function liftoffSpeed(plane: Plane): number {
  return 11 + plane.topSpeedKts * 0.02;
}

function stallSpeed(plane: Plane): number {
  return 7 + plane.stability * 2;
}

function rolloutCompleteSpeed(): number {
  return 10; // ~19 kt — taxi speed
}

/**
 * One physics integration step. Mutates `state` in place.
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
  state.landingHint = null;

  const agility = 0.85 + plane.agility * 1.5;
  const stability = 0.55 + plane.stability * 0.85;
  const maxSpeed = 22 + plane.topSpeedKts * 0.2;
  const vr = rotationSpeed(plane);
  const vlo = liftoffSpeed(plane);
  const vstall = stallSpeed(plane);

  const brakeFactor = input.brakes ? 0.3 : 1;
  const targetSpeed = maxSpeed * input.throttle * brakeFactor;
  const accelRate = input.brakes ? 2.5 : 1.6;
  state.speed += (targetSpeed - state.speed) * Math.min(1, dt * accelRate);
  state.speed = Math.max(0, state.speed);

  const groundY = GROUND_CONTACT_Y;
  const airborneThreshold = groundY + 0.12;
  const wasAirborne = state.airborne;
  state.airborne = state.position.y > airborneThreshold;
  if (state.airborne) state.hasFlown = true;

  if (!state.airborne) {
    // Ground roll — strong braking, rudder steering.
    if (input.brakes) {
      state.speed = Math.max(0, state.speed - dt * 14);
    }

    state.rotation.y -= input.roll * agility * 0.55 * dt;
    state.rotation.z *= 1 - Math.min(1, dt * 5);

    if (state.speed >= vr * 0.75 || state.phase === "rollout") {
      state.rotation.x += input.pitch * agility * 0.55 * dt;
      state.rotation.x = THREE.MathUtils.clamp(state.rotation.x, -0.1, 0.55);
    } else {
      state.rotation.x *= 1 - Math.min(1, dt * 3);
    }

    if (state.phase === "takeoff") {
      state.position.x += (layout.departureStart.x - state.position.x) * 0.08;
    }

    const dynamicPressure = state.speed * state.speed;
    const pitchLift =
      Math.sin(state.rotation.x) * dynamicPressure * 0.0045 +
      dynamicPressure * 0.0009;
    const groundEffect = state.position.y < groundY + 2 ? 1.4 : 1;
    const netLift = pitchLift * groundEffect - 9.8 * 0.12;

    if (
      state.phase !== "rollout" &&
      state.speed >= vlo &&
      (input.pitch > 0.04 || state.rotation.x > 0.1)
    ) {
      state.verticalSpeed = Math.max(0.6, netLift * 0.4);
      state.position.y += state.verticalSpeed * dt;
      if (state.position.y > airborneThreshold) {
        state.airborne = true;
      }
    } else {
      state.verticalSpeed = 0;
      state.position.y = groundY;
    }
  } else {
    // Airborne — responsive pitch/roll with coordinated turns.
    state.rotation.x += input.pitch * agility * 1.1 * dt;
    state.rotation.x = THREE.MathUtils.clamp(state.rotation.x, -0.8, 0.7);
    state.rotation.z += input.roll * agility * 0.85 * dt;
    state.rotation.z = THREE.MathUtils.clamp(state.rotation.z, -0.8, 0.8);
    state.rotation.y -= input.roll * agility * 0.6 * dt;

    const dynamicPressure = state.speed * state.speed;
    const pitchLift = Math.sin(state.rotation.x) * state.speed * 0.1;
    const speedLift = dynamicPressure * 0.0013;
    const stallPenalty =
      state.speed < vstall ? (vstall - state.speed) * 0.4 : 0;

    state.verticalSpeed +=
      (pitchLift + speedLift - stallPenalty - state.verticalSpeed * 0.06) *
      Math.min(1, dt * (1.5 / stability));

    if (state.rotation.x < 0.05 && state.verticalSpeed > -2.5) {
      state.verticalSpeed -= 1.6 * dt;
    }

    state.position.y += state.verticalSpeed * dt;

    if (state.position.y <= groundY) {
      const descentAtContact = Math.max(0, -state.verticalSpeed);
      state.position.y = groundY;
      state.airborne = false;
      state.verticalSpeed = 0;
      state.rotation.x *= 0.2;
      state.rotation.z *= 0.2;

      const onLanding = isOnLandingRunway(state.position, layout);
      const onDeparture = isOnDepartureRunway(state.position, layout);

      if (onLanding && wasAirborne && !state.touchdown) {
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
        state.speed *= 0.55;
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

  if (state.phase === "cruising") {
    const nearWaypoint = state.position.distanceTo(layout.waypoint) < 55;
    const nearLanding =
      distanceToLandingThreshold(state.position, layout) < 200;
    const onApproachPath = state.position.z < -150;
    if (nearWaypoint || nearLanding || onApproachPath) {
      state.phase = "landing";
    }
  }

  // Rollout: brake to taxi speed to finish the flight.
  if (state.phase === "rollout" && !state.airborne) {
    if (input.brakes) {
      state.speed = Math.max(0, state.speed - dt * 18);
    }
    if (state.speed <= rolloutCompleteSpeed()) {
      state.phase = "complete";
      state.finished = true;
      state.landingHint = null;
    } else {
      state.landingHint = "brake_to_finish";
    }
  }

  if (input.roll === 0 && state.airborne) {
    state.rotation.z *= 1 - Math.min(1, dt * 2);
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
