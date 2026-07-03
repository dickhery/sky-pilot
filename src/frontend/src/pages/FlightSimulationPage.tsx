import { Plane as BackendPlane, Weather as BackendWeather } from "@/backend";
import { FlightScene } from "@/components/flight/FlightScene";
import { HUD } from "@/components/flight/HUD";
import { ResultsScreen } from "@/components/flight/ResultsScreen";
import {
  type FlightState,
  type LandingHint,
  bearing,
  buildSceneLayout,
  computeScore,
  distanceToLandingThreshold,
  missionStep,
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
    airborne: false,
    landingHint: null,
    hasFlown: false,
  });

  const [phase, setPhaseState] = useState<FlightPhase>("takeoff");
  const [telemetry, setTelemetry] = useState({
    altitude: 0,
    airspeed: 0,
    heading: 0,
    verticalSpeed: 0,
    airborne: false,
    landingHint: null as LandingHint,
    step: 1,
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
        altitude: Math.max(0, (s.position.y - 1.07) * 3.28),
        airspeed: s.speed * 1.94,
        heading: THREE.MathUtils.radToDeg(s.rotation.y),
        verticalSpeed: s.verticalSpeed * 196.85,
        airborne: s.airborne,
        landingHint: s.landingHint,
        step: missionStep(s.phase),
      });

      if (s.phase === "takeoff" || s.phase === "cruising") {
        const target = layout.waypoint;
        setWaypointInfo({
          name: selectedPlan?.waypoint.name ?? "Waypoint",
          distance: s.position.distanceTo(target) / 1852,
          bearing: bearing(s.position, target),
        });
      } else if (
        s.phase === "landing" ||
        s.phase === "rollout" ||
        s.phase === "complete"
      ) {
        const target = layout.landingThreshold;
        setWaypointInfo({
          name: selectedPlan?.landing.name ?? "Landing Runway",
          distance: distanceToLandingThreshold(s.position, layout) / 1852,
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

  const { objective, subObjective } = getMissionBrief(
    phase,
    telemetry.airborne,
    selectedPlan.waypoint.name,
    selectedPlan.landing.name,
  );

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
      airborne: false,
      landingHint: null,
      hasFlown: false,
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
        verticalSpeed={telemetry.verticalSpeed}
        airborne={telemetry.airborne}
        phase={phase}
        missionStep={telemetry.step}
        objective={objective}
        subObjective={subObjective}
        landingHint={telemetry.landingHint}
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

function getMissionBrief(
  phase: FlightPhase,
  airborne: boolean,
  waypointName: string,
  landingName: string,
): { objective: string; subObjective?: string } {
  switch (phase) {
    case "takeoff":
      return airborne
        ? {
            objective: `Fly to ${waypointName}`,
            subObjective: "Follow the cyan marker ahead — climb to ~500 ft",
          }
        : {
            objective: "Take off from the departure runway",
            subObjective:
              "Hold Shift for power → at 55 kt pull up (W) to rotate",
          };
    case "cruising":
      return {
        objective: `Navigate to ${waypointName}`,
        subObjective: `Then descend toward ${landingName} (runway offset to the right)`,
      };
    case "landing":
      return {
        objective: `Land on ${landingName}`,
        subObjective:
          "Turn right toward the second runway · heading 000° · slow to 65 kt · gentle descent",
      };
    case "rollout":
      return {
        objective: "Complete the landing rollout",
        subObjective:
          "Hold Space to brake below 20 kt — flight finishes automatically",
      };
    case "complete":
      return { objective: "Flight complete" };
    default:
      return { objective: "Prepare for departure" };
  }
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
