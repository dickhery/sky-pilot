import { Plane as BackendPlane, Weather as BackendWeather } from "@/backend";
import { FlightScene } from "@/components/flight/FlightScene";
import { HUD } from "@/components/flight/HUD";
import { ResultsScreen } from "@/components/flight/ResultsScreen";
import {
  type FlightState,
  bearing,
  buildSceneLayout,
  computeScore,
} from "@/components/flight/flightPhysics";
import { Button } from "@/components/ui/button";
import { useFlightControls } from "@/hooks/useFlightControls";
import { useRecordFlightLog } from "@/hooks/useFlightData";
import { useGameStore } from "@/store/gameStore";
import type { FlightPhase, ScoreBreakdown, Weather } from "@/types/game";
import { useNavigate } from "@tanstack/react-router";
import { Plane as PlaneIcon, Rocket } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

/**
 * Convert a backend Weather enum variant to the frontend Weather type.
 * Backend uses lowercase ('daytime'|'nighttime'|'partlyCloudy'); the
 * FlightScene / Environment components expect the capitalized frontend
 * Weather ('Daytime'|'Nighttime'|'PartlyCloudy').
 */
function mapWeatherToFrontend(w: BackendWeather): Weather {
  switch (w) {
    case BackendWeather.nighttime:
      return "Nighttime";
    case BackendWeather.partlyCloudy:
      return "PartlyCloudy";
    case BackendWeather.daytime:
      return "Daytime";
  }
}

/**
 * Main flight simulation screen.
 *
 * Reads the selected plan + plane from the game store, renders the 3D
 * FlightScene with the HUD overlay, manages phase transitions and scoring,
 * persists the completed flight to the backend via recordFlightLog, and
 * shows the ResultsScreen on completion.
 *
 * The render loop lives inside FlightScene; this page samples a telemetry
 * snapshot on a 100ms interval to feed the HUD without per-frame re-renders.
 */
export function FlightSimulationPage() {
  const navigate = useNavigate();
  const selectedPlan = useGameStore((s) => s.selectedPlan);
  const selectedPlane = useGameStore((s) => s.selectedPlane);
  const setPhase = useGameStore((s) => s.setPhase);
  const setScore = useGameStore((s) => s.setScore);

  const { axes, throttlePct, brakesOn } = useFlightControls();

  const layout = useMemo(buildSceneLayout, []);

  // Initialize flight state once.
  const flightState = useRef<FlightState>({
    position: layout.departureStart.clone(),
    rotation: new THREE.Euler(0, layout.departureHeading, 0),
    speed: 0,
    verticalSpeed: 0,
    phase: "takeoff",
    elapsed: 0,
    touchdown: null,
    finished: false,
  });

  const [phase, setPhaseState] = useState<FlightPhase>("takeoff");
  const [telemetry, setTelemetry] = useState({
    altitude: 0,
    airspeed: 0,
    heading: 0,
  });
  const [waypointInfo, setWaypointInfo] = useState<{
    name: string;
    distance: number;
    bearing: number;
  } | null>(null);
  const [score, setScoreState] = useState<ScoreBreakdown>({
    speed: 0,
    landingSmoothness: 0,
    runwayAlignment: 0,
    total: 0,
  });
  const [showResults, setShowResults] = useState(false);
  const [persisted, setPersisted] = useState(false);
  const [finalDuration, setFinalDuration] = useState(0);

  const recordMutation = useRecordFlightLog();

  // Phase change handler passed into the scene.
  const handlePhaseChange = useCallback(
    (newPhase: FlightPhase) => {
      setPhaseState(newPhase);
      setPhase(newPhase);
    },
    [setPhase],
  );

  // Telemetry sampling interval — feeds HUD without per-frame renders.
  useEffect(() => {
    const id = setInterval(() => {
      const s = flightState.current;
      setTelemetry({
        altitude: s.position.y * 3.28, // m → ft
        airspeed: s.speed * 1.94, // m/s → kt
        heading: THREE.MathUtils.radToDeg(s.rotation.y),
      });

      // Waypoint guidance depends on phase.
      if (s.phase === "takeoff" || s.phase === "cruising") {
        const target = layout.waypoint;
        const dist = s.position.distanceTo(target) / 30; // m → nm approx
        setWaypointInfo({
          name: selectedPlan?.waypoint.name ?? "Waypoint",
          distance: dist,
          bearing: bearing(s.position, target),
        });
      } else if (s.phase === "landing") {
        const target = layout.landingThreshold;
        const dist = s.position.distanceTo(target) / 30;
        setWaypointInfo({
          name: "Landing Runway",
          distance: dist,
          bearing: bearing(s.position, target),
        });
      } else {
        setWaypointInfo(null);
      }
    }, 100);
    return () => clearInterval(id);
  }, [layout, selectedPlan]);

  // On completion, compute score and persist.
  useEffect(() => {
    if (phase !== "complete" || showResults) return;
    const s = flightState.current;
    const computed = computeScore(s, layout, selectedPlane ?? fallbackPlane);
    setScoreState(computed);
    setScore(computed);
    setFinalDuration(s.elapsed);
    setShowResults(true);

    // Persist to backend.
    if (selectedPlane && selectedPlan) {
      recordMutation.mutate(
        {
          completedAt: BigInt(Date.now()),
          planName: selectedPlan.name,
          plane:
            selectedPlane.id === "CessnaSkyhawk"
              ? BackendPlane.cessna
              : BackendPlane.gulfstream,
          weather: selectedPlan.weather,
          score: {
            speed: BigInt(computed.speed),
            landingSmoothness: BigInt(computed.landingSmoothness),
            total: BigInt(computed.total),
          },
        },
        {
          onSuccess: () => setPersisted(true),
          onError: () => setPersisted(true), // still let user proceed
        },
      );
    } else {
      setPersisted(true);
    }
  }, [
    phase,
    showResults,
    layout,
    selectedPlane,
    selectedPlan,
    setScore,
    recordMutation,
  ]);

  // No plan/plane selected — bounce to flight plans.
  if (!selectedPlan || !selectedPlane) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <PlaneIcon
          className="h-12 w-12 text-muted-foreground"
          aria-hidden="true"
        />
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            No flight plan selected
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a flight plan and aircraft before taking off.
          </p>
        </div>
        <Button
          onClick={() => navigate({ to: "/flight-plans" })}
          className="hud-label gap-2"
          data-ocid="flight.no_plan.flight_plans_button"
        >
          <Rocket className="h-4 w-4" aria-hidden="true" />
          Go to Flight Plans
        </Button>
      </div>
    );
  }

  const objective =
    phase === "takeoff"
      ? "Accelerate (Shift) and pull up (W) to take off"
      : phase === "cruising"
        ? `Fly to ${selectedPlan.landing.name}`
        : phase === "landing"
          ? "Align with runway and descend gently"
          : "Flight complete";

  const handleRetry = () => {
    flightState.current = {
      position: layout.departureStart.clone(),
      rotation: new THREE.Euler(0, layout.departureHeading, 0),
      speed: 0,
      verticalSpeed: 0,
      phase: "takeoff",
      elapsed: 0,
      touchdown: null,
      finished: false,
    };
    setPhaseState("takeoff");
    setPhase("takeoff");
    setShowResults(false);
    setPersisted(false);
    setScoreState({
      speed: 0,
      landingSmoothness: 0,
      runwayAlignment: 0,
      total: 0,
    });
  };

  return (
    <div className="relative h-[calc(100svh-7rem)] w-full overflow-hidden rounded-lg border border-border bg-background">
      <FlightScene
        plane={selectedPlane}
        weather={mapWeatherToFrontend(selectedPlan.weather)}
        controlsAxes={axes}
        flightState={flightState}
        onPhaseChange={handlePhaseChange}
      />
      <HUD
        altitude={telemetry.altitude}
        airspeed={telemetry.airspeed}
        heading={telemetry.heading}
        phase={phase}
        objective={objective}
        nextWaypoint={waypointInfo}
        throttlePct={throttlePct}
        brakesOn={brakesOn}
      />
      {showResults && (
        <ResultsScreen
          score={score}
          plan={selectedPlan}
          plane={selectedPlane}
          durationSec={finalDuration}
          persisted={persisted}
          onRetry={handleRetry}
        />
      )}
    </div>
  );
}

const fallbackPlane = {
  id: "CessnaSkyhawk" as const,
  name: "Cessna Skyhawk",
  handling: "Stable trainer",
  topSpeedKts: 120,
  agility: 0.5,
  stability: 0.8,
  description: "",
};
