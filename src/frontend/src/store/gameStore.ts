import type { FlightPlan, Plane__1 } from "@/backend";
import type {
  FlightPhase,
  Plane,
  PlaneId,
  ScoreBreakdown,
  Weather,
} from "@/types/game";
import { create } from "zustand";

/**
 * Derive a frontend `Plane` from a backend `Plane__1` carried on a
 * `FlightPlan`. The backend plane only carries `{ id, name, handling }`;
 * the frontend `Plane` adds numeric specs (topSpeedKts, agility, stability)
 * used by the flight model and scoring. We map the backend plane id
 * (1 = Cessna, 2 = Gulfstream) to the frontend `PlaneId` and pick specs
 * that match each aircraft's character.
 */
function derivePlaneFromBackend(backendPlane: Plane__1): Plane {
  const isCessna = backendPlane.id === 1n;
  const id: PlaneId = isCessna ? "CessnaSkyhawk" : "Extra300";
  return {
    id,
    name: backendPlane.name,
    handling: backendPlane.handling,
    topSpeedKts: isCessna ? 120 : 180,
    agility: isCessna ? 0.5 : 0.85,
    stability: isCessna ? 0.8 : 0.55,
    description: backendPlane.handling,
  };
}

interface GameState {
  // ── Selection ──────────────────────────────────────────────────────────
  selectedPlan: FlightPlan | null;
  selectedPlane: Plane | null;
  selectedPlaneId: PlaneId | null;
  selectedWeather: Weather;

  // ── Runtime flight state ──────────────────────────────────────────────
  phase: FlightPhase;
  score: ScoreBreakdown;

  // ── Actions ───────────────────────────────────────────────────────────
  selectPlan: (plan: FlightPlan) => void;
  selectPlane: (plane: Plane) => void;
  selectPlaneById: (id: PlaneId) => void;
  selectWeather: (weather: Weather) => void;
  setPhase: (phase: FlightPhase) => void;
  setScore: (score: ScoreBreakdown) => void;
  resetFlight: () => void;
}

const emptyScore: ScoreBreakdown = {
  speed: 0,
  landingSmoothness: 0,
  runwayAlignment: 0,
  total: 0,
};

export const useGameStore = create<GameState>((set) => ({
  selectedPlan: null,
  selectedPlane: null,
  selectedPlaneId: null,
  selectedWeather: "Daytime",

  phase: "idle",
  score: emptyScore,

  selectPlan: (plan) =>
    set({
      selectedPlan: plan,
      // Each backend FlightPlan already carries its plane; derive the
      // frontend Plane so FlightSimulationPage can proceed without a
      // separate plane-selection step.
      selectedPlane: derivePlaneFromBackend(plan.plane),
      selectedPlaneId: derivePlaneFromBackend(plan.plane).id,
    }),
  selectPlane: (plane) =>
    set({ selectedPlane: plane, selectedPlaneId: plane.id }),
  selectPlaneById: (id) => set({ selectedPlaneId: id }),
  selectWeather: (weather) => set({ selectedWeather: weather }),
  setPhase: (phase) => set({ phase }),
  setScore: (score) => set({ score }),
  resetFlight: () =>
    set({
      phase: "idle",
      score: emptyScore,
      selectedPlan: null,
      selectedPlane: null,
      selectedPlaneId: null,
      selectedWeather: "Daytime",
    }),
}));
