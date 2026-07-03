import { createActor } from "@/backend";
import type {
  FlightLogView,
  FlightPlan,
  LogId,
  Plane,
  ScoreBreakdown,
  Weather,
} from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery } from "@tanstack/react-query";

/**
 * Fetch the list of available flight plans (level-select screen).
 *
 * Calls the backend `listFlightPlans` actor method and returns the
 * raw backend `FlightPlan` shape (departure / waypoint / landing /
 * plane / weather / routeDescription).
 */
export function useFlightPlans() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<FlightPlan[]>({
    queryKey: ["flight-plans"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listFlightPlans();
    },
    enabled: !!actor && !isFetching,
    staleTime: 60_000,
  });
}

/**
 * Fetch the pilot's saved flight logs (logbook screen).
 */
export function useFlightLogs() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<FlightLogView[]>({
    queryKey: ["flight-logs"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listFlightLogs();
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
  });
}

/**
 * Fetch a single flight log by id (log detail screen).
 */
export function useFlightLog(logId: LogId | undefined) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<FlightLogView | null>({
    queryKey: ["flight-log", logId?.toString()],
    queryFn: async () => {
      if (!actor || logId === undefined) return null;
      return actor.getFlightLog(logId);
    },
    enabled: !!actor && !isFetching && logId !== undefined,
    staleTime: 30_000,
  });
}

/**
 * Persist a completed flight to the backend logbook.
 *
 * Wraps the backend `recordFlightLog` actor method in a React Query
 * mutation. Callers pass the candid-shaped payload (BigInts for numeric
 * fields, backend enum variants for plane/weather).
 */
export interface RecordFlightLogInput {
  completedAt: bigint;
  planName: string;
  plane: Plane;
  weather: Weather;
  score: ScoreBreakdown;
}

export function useRecordFlightLog() {
  const { actor } = useActor(createActor);
  return useMutation<FlightLogView, Error, RecordFlightLogInput>({
    mutationFn: async (input) => {
      if (!actor) throw new Error("Backend actor not ready");
      return actor.recordFlightLog(
        input.completedAt,
        input.planName,
        input.plane,
        input.weather,
        input.score,
      );
    },
  });
}
