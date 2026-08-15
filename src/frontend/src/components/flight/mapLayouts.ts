import * as THREE from "three";

const RUNWAY_Y = 0.02;
const START_Y = 1.07;

export type MapTheme =
  | "coast"
  | "ridge"
  | "harbor"
  | "city"
  | "valley"
  | "storm";

export interface Checkpoint {
  id: string;
  name: string;
  position: THREE.Vector3;
  radius: number;
}

export interface SceneLayout {
  planId: number;
  theme: MapTheme;
  departureStart: THREE.Vector3;
  departureHeading: number;
  departureEnd: THREE.Vector3;
  waypoint: THREE.Vector3;
  checkpoints: Checkpoint[];
  landingThreshold: THREE.Vector3;
  landingHeading: number;
  landingEnd: THREE.Vector3;
}

const GATE = 18;

function along(
  x: number,
  z: number,
  heading: number,
  dist: number,
): { x: number; z: number } {
  return {
    x: x - Math.sin(heading) * dist,
    z: z - Math.cos(heading) * dist,
  };
}

function gate(
  id: string,
  name: string,
  x: number,
  y: number,
  z: number,
): Checkpoint {
  return { id, name, position: new THREE.Vector3(x, y, z), radius: GATE };
}

function strip(
  x: number,
  z: number,
  heading: number,
  behind: number,
  ahead: number,
): {
  start: THREE.Vector3;
  end: THREE.Vector3;
  heading: number;
} {
  const s = along(x, z, heading, -behind);
  const e = along(x, z, heading, ahead);
  return {
    start: new THREE.Vector3(s.x, START_Y, s.z),
    end: new THREE.Vector3(e.x, RUNWAY_Y, e.z),
    heading,
  };
}

function pack(
  planId: number,
  theme: MapTheme,
  dep: ReturnType<typeof strip>,
  landing: ReturnType<typeof strip>,
  checkpoints: Checkpoint[],
): SceneLayout {
  return {
    planId,
    theme,
    departureStart: dep.start,
    departureEnd: dep.end,
    departureHeading: dep.heading,
    waypoint: checkpoints[1]?.position ?? checkpoints[0].position,
    checkpoints,
    landingThreshold: landing.start,
    landingEnd: landing.end,
    landingHeading: landing.heading,
  };
}

/** Morning Coastal Hop — left along the water to a lighthouse, then inland. */
function coastLayout(): SceneLayout {
  const h0 = 0;
  return pack(
    1,
    "coast",
    strip(0, 0, h0, 150, 150),
    strip(90, -1780, 0, 0, 260),
    [
      gate("climbout", "Climb-out", 20, 70, -460),
      gate("waypoint", "Lighthouse Point", -260, 76, -860),
      gate("final", "Marsh Final", 70, 40, -1540),
    ],
  );
}

/** Midday Crosswind Run — climb a ridge pass, land on a plateau to the right. */
function ridgeLayout(): SceneLayout {
  const hDep = 0.32;
  const hLand = 0.22;
  return pack(
    2,
    "ridge",
    strip(-60, 40, hDep, 130, 140),
    strip(460, -1680, hLand, 0, 280),
    [
      gate("climbout", "Ridge Climb", 90, 98, -400),
      gate("waypoint", "Ridge Pass", 300, 118, -880),
      gate("final", "Plateau Final", 430, 52, -1420),
    ],
  );
}

/** Midnight Harbor Approach — swing right over water to a beacon, come back. */
function harborLayout(): SceneLayout {
  const hDep = -0.7;
  const hLand = 2.55;
  return pack(
    3,
    "harbor",
    strip(0, 20, hDep, 140, 140),
    strip(180, -920, hLand, 0, 240),
    [
      gate("climbout", "Harbor Climb", 260, 68, -300),
      gate("waypoint", "Harbor Beacon", 540, 72, -80),
      gate("final", "Harbor Final", 320, 42, -640),
    ],
  );
}

/** Night Express — take off south, circle a tower, land back to the north. */
function cityLayout(): SceneLayout {
  const hDep = Math.PI;
  const hLand = -0.18;
  return pack(
    4,
    "city",
    strip(0, 80, hDep, 130, 140),
    strip(210, -40, hLand, 0, 250),
    [
      gate("climbout", "Downtown", 70, 82, 480),
      gate("waypoint", "City Tower", 340, 92, 640),
      gate("final", "Uptown Final", 260, 48, 180),
    ],
  );
}

/** Cloudy Valley Tour — fly the valley floor to the right, land at the far end. */
function valleyLayout(): SceneLayout {
  const hDep = -0.7;
  const hLand = 0.35;
  return pack(
    5,
    "valley",
    strip(80, 20, hDep, 100, 140),
    strip(120, -1240, hLand, 0, 250),
    [
      gate("climbout", "Valley Climb", 140, 88, -220),
      gate("waypoint", "Cloud Gap", 360, 105, -560),
      gate("final", "Overlook Final", 180, 48, -980),
    ],
  );
}

/** Storm Front Sprint — out to a buoy over open water, then back to the coast. */
function stormLayout(): SceneLayout {
  const hDep = -2.2;
  const hLand = 0.95;
  return pack(
    6,
    "storm",
    strip(20, 40, hDep, 130, 140),
    strip(-80, 420, hLand, 0, 250),
    [
      gate("climbout", "Offshore", 320, 70, -80),
      gate("waypoint", "Weather Buoy", 620, 64, 160),
      gate("final", "Coastal Final", 180, 42, 320),
    ],
  );
}

/** Build the course and scenery theme for a backend flight-plan id (1–6). */
export function buildSceneLayout(planId = 1): SceneLayout {
  switch (planId) {
    case 2:
      return ridgeLayout();
    case 3:
      return harborLayout();
    case 4:
      return cityLayout();
    case 5:
      return valleyLayout();
    case 6:
      return stormLayout();
    default:
      return coastLayout();
  }
}

/** Place a field to the right of a runway so hangars never sit on the strip. */
export function apronBeside(
  start: THREE.Vector3,
  end: THREE.Vector3,
  rightMeters: number,
): { x: number; y: number; z: number; heading: number } {
  const ax = end.x - start.x;
  const az = end.z - start.z;
  const heading = Math.atan2(-ax, -az);
  const midX = (start.x + end.x) * 0.5;
  const midZ = (start.z + end.z) * 0.5;
  return {
    x: midX + Math.cos(heading) * rightMeters,
    y: 0,
    z: midZ - Math.sin(heading) * rightMeters,
    heading,
  };
}

/**
 * How strongly a world XZ point should be graded flat for an airfield.
 * Wider than the terrain vertex spacing (~42 m) so hills cannot poke
 * through the runway between samples.
 */
export function stripClearance(
  x: number,
  z: number,
  start: THREE.Vector3,
  end: THREE.Vector3,
  halfWidth = 130,
  endPad = 90,
): number {
  const ax = end.x - start.x;
  const az = end.z - start.z;
  const len = Math.hypot(ax, az) || 1;
  const ux = ax / len;
  const uz = az / len;
  const dx = x - start.x;
  const dz = z - start.z;
  const along = dx * ux + dz * uz;
  const across = dx * -uz + dz * ux;
  const alongClamped = THREE.MathUtils.clamp(along, -endPad, len + endPad);
  const alongOff = along - alongClamped;
  const dist = Math.hypot(across, alongOff);
  return THREE.MathUtils.smoothstep(halfWidth, halfWidth * 0.28, dist);
}

/** 1 = fully graded airfield, 0 = untouched countryside. */
export function airfieldClearance(
  layout: SceneLayout,
  x: number,
  z: number,
): number {
  return Math.max(
    stripClearance(x, z, layout.departureStart, layout.departureEnd),
    stripClearance(x, z, layout.landingThreshold, layout.landingEnd),
  );
}
