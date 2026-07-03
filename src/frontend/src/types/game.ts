// Frontend domain types for Sky Pilot flight simulator.
// These mirror the backend domain model (FlightPlan, Plane, Weather,
// FlightLog, ScoreBreakdown) and add frontend-only runtime types
// (FlightPhase, GameStatus) used by the in-cockpit game store.

export type Weather = "Daytime" | "Nighttime" | "PartlyCloudy";

export type PlaneId = "CessnaSkyhawk" | "Extra300";

export interface Plane {
  id: PlaneId;
  name: string;
  /** Short tagline describing the handling character. */
  handling: string;
  /** Top speed in knots — affects scoring on speed. */
  topSpeedKts: number;
  /** 0–1 agility rating; higher = more responsive controls. */
  agility: number;
  /** 0–1 stability rating; higher = easier to land smoothly. */
  stability: number;
  /** One-line description shown on the plane-select card. */
  description: string;
}

export interface FlightPlan {
  id: string;
  name: string;
  /** Origin airport ICAO-style code. */
  origin: string;
  /** Destination airport ICAO-style code. */
  destination: string;
  /** Approximate route distance in nautical miles. */
  distanceNm: number;
  /** Difficulty tier — drives the level-select ordering. */
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  /** Short narrative brief shown on the level-select card. */
  brief: string;
  /** Default weather the plan was authored for. */
  defaultWeather: Weather;
}

export interface ScoreBreakdown {
  /** 0–100 — how quickly the route was completed. */
  speed: number;
  /** 0–100 — vertical speed / touchdown firmness at landing. */
  landingSmoothness: number;
  /** 0–100 — how centered on the runway centerline at touchdown. */
  runwayAlignment: number;
  /** Weighted composite 0–100. */
  total: number;
}

export interface FlightLog {
  id: string;
  planId: string;
  planName: string;
  planeId: PlaneId;
  planeName: string;
  weather: Weather;
  /** ISO timestamp of the flight. */
  timestamp: string;
  /** Total flight duration in seconds. */
  durationSec: number;
  score: ScoreBreakdown;
}

// ── Frontend-only runtime types ───────────────────────────────────────────

export type FlightPhase =
  | "idle"
  | "takeoff"
  | "cruising"
  | "landing"
  | "complete";

export type GameStatus = "ready" | "in_flight" | "paused" | "finished";
