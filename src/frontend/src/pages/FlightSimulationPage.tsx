import { Plane as BackendPlane, Weather as BackendWeather } from "@/backend";
import { FlightScene } from "@/components/flight/FlightScene";
import { FlightTouchControls } from "@/components/flight/FlightTouchControls";
import { HUD } from "@/components/flight/HUD";
import { ResultsScreen } from "@/components/flight/ResultsScreen";
import {
  APPROACH_SPEED_KTS,
  type LandingHint,
  ROTATE_SPEED_KTS,
  bearing,
  buildSceneLayout,
  computeScore,
  createInitialFlightState,
  currentNavTarget,
  missionStep,
} from "@/components/flight/flightPhysics";
import { Button } from "@/components/ui/button";
import { useFlightAudio } from "@/hooks/useFlightAudio";
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

  const [showResults, setShowResults] = useState(false);
  const { axes, touch, throttlePct, brakesOn, cockpitView, toggleCockpit } =
    useFlightControls({ enabled: !showResults });

  const planId = selectedPlan ? Number(selectedPlan.id) : 1;
  const layout = useMemo(() => buildSceneLayout(planId), [planId]);

  const flightState = useRef(createInitialFlightState(layout));

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
  useFlightAudio(
    flightState,
    axes,
    phase === "complete" || phase === "crashed",
  );
  const [waypointInfo, setWaypointInfo] = useState<{
    name: string;
    distance: number;
    bearing: number;
    kind: "gate" | "runway";
    index: number;
    total: number;
  } | null>(null);
  const [score, setScoreState] = useState<ScoreBreakdown>({
    speed: 0,
    landingSmoothness: 0,
    runwayAlignment: 0,
    total: 0,
  });
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

      if (s.phase === "crashed" || s.phase === "complete") {
        setWaypointInfo(null);
      } else {
        const nav = currentNavTarget(s, layout);
        const name =
          nav.kind === "gate" &&
          layout.checkpoints[s.nextCheckpoint]?.id === "waypoint"
            ? (selectedPlan?.waypoint.name ?? nav.name)
            : nav.kind === "runway"
              ? (selectedPlan?.landing.name ?? nav.name)
              : nav.name;
        setWaypointInfo({
          name,
          distance: s.position.distanceTo(nav.position) / 1852,
          bearing: bearing(s.position, nav.position),
          kind: nav.kind,
          index: Math.min(s.nextCheckpoint + 1, layout.checkpoints.length),
          total: layout.checkpoints.length,
        });
      }
    }, 100);
    return () => clearInterval(id);
  }, [layout, selectedPlan]);

  // On a successful landing, score and persist. Crashes end the flight
  // without a canister write (no score to keep, and no extra cycles).
  useEffect(() => {
    if ((phase !== "complete" && phase !== "crashed") || showResults) return;
    const s = flightState.current;
    const computed = computeScore(s, layout, selectedPlane ?? fallbackPlane);
    setScoreState(computed);
    setScore(computed);
    setFinalDuration(s.elapsed);
    setShowResults(true);

    if (phase === "crashed" || !selectedPlane || !selectedPlan) {
      setPersisted(true);
      return;
    }

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
        onError: () => setPersisted(true),
      },
    );
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

  const landingHdg = Math.round(
    ((THREE.MathUtils.radToDeg(layout.landingHeading) % 360) + 360) % 360,
  );
  const { objective, subObjective } = getMissionBrief(
    phase,
    telemetry.airborne,
    selectedPlan.waypoint.name,
    selectedPlan.landing.name,
    landingHdg,
  );

  const handleRetry = () => {
    flightState.current = createInitialFlightState(layout);
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
    <div className="relative h-[calc(100svh-3.25rem-env(safe-area-inset-top))] w-full overflow-hidden bg-background sm:h-[calc(100svh-4rem-env(safe-area-inset-top))] sm:rounded-lg sm:border sm:border-border">
      <FlightScene
        plane={selectedPlane}
        weather={mapWeatherToFrontend(selectedPlan.weather)}
        layout={layout}
        controlsAxes={axes}
        flightState={flightState}
        onPhaseChange={handlePhaseChange}
        cockpitView={cockpitView}
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
        cockpitView={cockpitView}
        onToggleCockpit={toggleCockpit}
      />
      {!showResults && phase !== "crashed" && phase !== "complete" && (
        <FlightTouchControls
          touch={touch}
          throttlePct={throttlePct}
          brakesOn={brakesOn}
          cockpitView={cockpitView}
          onToggleCockpit={toggleCockpit}
        />
      )}
      {showResults && (
        <ResultsScreen
          score={score}
          plan={selectedPlan}
          plane={selectedPlane}
          durationSec={finalDuration}
          persisted={persisted}
          crashed={phase === "crashed"}
          crashReason={flightState.current.crashReason}
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
  landingHdg: number,
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
            subObjective: `Add power, then at ${ROTATE_SPEED_KTS} kt pull up (stick up / W) to rotate`,
          };
    case "cruising":
      return {
        objective: `Fly through the ${waypointName} rings`,
        subObjective:
          "Each cyan ring is a required gate — fly through the glowing one",
      };
    case "landing":
      return {
        objective: `Land on ${landingName}`,
        subObjective: `Line up heading ${landingHdg.toString().padStart(3, "0")}° · slow to ${APPROACH_SPEED_KTS} kt · flare (stick up / W). A bad landing is a crash.`,
      };
    case "crashed":
      return { objective: "Flight over — the aircraft is down" };
    case "rollout":
      return {
        objective: "Complete the landing rollout",
        subObjective:
          "Hold brake / Space below 20 kt — flight finishes automatically",
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
