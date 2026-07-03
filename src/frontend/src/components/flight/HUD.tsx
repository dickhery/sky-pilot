import type { LandingHint } from "@/components/flight/flightPhysics";
import type { FlightPhase } from "@/types/game";
import {
  CheckCircle2,
  Circle,
  Compass,
  Gauge,
  Keyboard,
  Mountain,
  Navigation,
  TriangleAlert,
} from "lucide-react";

interface HUDProps {
  altitude: number;
  airspeed: number;
  heading: number;
  verticalSpeed: number;
  airborne: boolean;
  phase: FlightPhase;
  missionStep: number;
  objective: string;
  subObjective?: string;
  landingHint: LandingHint;
  nextWaypoint: { name: string; distance: number; bearing: number } | null;
  throttlePct: number;
  brakesOn: boolean;
}

const MISSION_STEPS = [
  { phase: "takeoff", label: "Take off" },
  { phase: "cruising", label: "Waypoint" },
  { phase: "landing", label: "Approach" },
  { phase: "rollout", label: "Land" },
] as const;

const HINT_MESSAGES: Record<NonNullable<LandingHint>, string> = {
  wrong_runway: "Wrong runway — fly to the landing runway (offset right)",
  off_corridor: "Missed runway — go around and try the approach again",
  too_fast: "Too fast — reduce throttle (Ctrl) before touchdown",
  brake_to_finish: "Touchdown! Hold Space to brake below 20 kt to finish",
};

export function HUD({
  altitude,
  airspeed,
  heading,
  verticalSpeed,
  airborne,
  phase,
  missionStep,
  objective,
  subObjective,
  landingHint,
  nextWaypoint,
  throttlePct,
  brakesOn,
}: HUDProps) {
  const phaseLabel: Record<FlightPhase, string> = {
    idle: "Standby",
    takeoff: "Takeoff",
    cruising: "Cruise",
    landing: "Approach",
    rollout: "Rollout",
    complete: "Complete",
  };

  const headingStr = `${Math.round(((heading % 360) + 360) % 360)
    .toString()
    .padStart(3, "0")}°`;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 select-none font-mono text-primary">
      {/* Top-center: mission progress + objective */}
      <div className="absolute left-1/2 top-4 flex -translate-x-1/2 flex-col items-center gap-1.5">
        <div
          className="hud-scanlines glow-instrument flex items-center gap-3 rounded-md border border-primary/40 bg-card/80 px-4 py-1.5 backdrop-blur"
          data-ocid="flight.hud.mission"
        >
          {MISSION_STEPS.map((step, i) => {
            const stepNum = i + 1;
            const done = missionStep > stepNum;
            const active =
              missionStep === stepNum ||
              (phase === "complete" && stepNum === 4);
            return (
              <div key={step.phase} className="flex items-center gap-1">
                {done ? (
                  <CheckCircle2
                    className="h-3 w-3 text-primary"
                    aria-hidden="true"
                  />
                ) : (
                  <Circle
                    className={`h-3 w-3 ${active ? "text-accent" : "text-muted-foreground/50"}`}
                    aria-hidden="true"
                  />
                )}
                <span
                  className={`hud-label text-[9px] ${active ? "font-bold text-accent" : done ? "text-primary" : "text-muted-foreground"}`}
                >
                  {step.label}
                </span>
                {i < MISSION_STEPS.length - 1 && (
                  <span className="mx-0.5 text-muted-foreground/40">›</span>
                )}
              </div>
            );
          })}
        </div>

        <div
          className="hud-scanlines flex flex-col items-center gap-0.5 rounded-md border border-accent/40 bg-card/70 px-4 py-1.5 backdrop-blur"
          data-ocid="flight.hud.objective"
        >
          <div className="flex items-center gap-2">
            <span className="hud-label text-[10px] text-muted-foreground">
              {phaseLabel[phase]}
            </span>
            <Navigation
              className="h-3.5 w-3.5 text-accent"
              aria-hidden="true"
            />
            <span className="hud-label text-[11px] font-bold text-accent">
              {objective}
            </span>
          </div>
          {subObjective && (
            <span className="hud-label text-[10px] text-muted-foreground">
              {subObjective}
            </span>
          )}
        </div>

        {landingHint && (
          <div className="glow-caution hud-scanlines flex items-center gap-1.5 rounded-md border border-accent/50 bg-accent/15 px-3 py-1.5 backdrop-blur">
            <TriangleAlert
              className="h-3.5 w-3.5 shrink-0 text-accent"
              aria-hidden="true"
            />
            <span className="hud-label text-[10px] text-accent">
              {HINT_MESSAGES[landingHint]}
            </span>
          </div>
        )}
      </div>

      {/* Top-left: instruments */}
      <div className="absolute left-4 top-4 flex flex-col gap-2">
        <Instrument
          icon={<Mountain className="h-4 w-4" aria-hidden="true" />}
          label="ALT"
          value={`${Math.max(0, Math.round(altitude))}`}
          unit="ft"
          dataOcid="flight.hud.altitude"
        />
        <Instrument
          icon={<Gauge className="h-4 w-4" aria-hidden="true" />}
          label="SPD"
          value={`${Math.max(0, Math.round(airspeed))}`}
          unit="kt"
          dataOcid="flight.hud.airspeed"
        />
        <Instrument
          icon={<Compass className="h-4 w-4" aria-hidden="true" />}
          label="HDG"
          value={headingStr}
          unit=""
          dataOcid="flight.hud.heading"
        />
        {airborne && (
          <Instrument
            icon={<Navigation className="h-4 w-4" aria-hidden="true" />}
            label="V/S"
            value={`${verticalSpeed >= 0 ? "+" : ""}${Math.round(verticalSpeed)}`}
            unit="fpm"
            dataOcid="flight.hud.vertical_speed"
          />
        )}
        {phase === "takeoff" && !airborne && airspeed >= 45 && (
          <div className="glow-caution hud-scanlines flex items-center gap-1.5 rounded-md border border-accent/50 bg-accent/15 px-2.5 py-1.5 backdrop-blur">
            <TriangleAlert
              className="h-3.5 w-3.5 text-accent"
              aria-hidden="true"
            />
            <span className="hud-label text-[10px] text-accent">
              Rotate — pull up (W)
            </span>
          </div>
        )}
        {phase === "landing" && airborne && airspeed > 85 && (
          <div className="glow-caution hud-scanlines flex items-center gap-1.5 rounded-md border border-accent/50 bg-accent/15 px-2.5 py-1.5 backdrop-blur">
            <TriangleAlert
              className="h-3.5 w-3.5 text-accent"
              aria-hidden="true"
            />
            <span className="hud-label text-[10px] text-accent">
              Slow to 65 kt (Ctrl) before landing
            </span>
          </div>
        )}
      </div>

      {/* Top-right: throttle + brakes */}
      <div className="absolute right-4 top-4 flex flex-col gap-2">
        <div
          className="hud-scanlines glow-instrument w-40 rounded-md border border-primary/40 bg-card/80 p-2 backdrop-blur"
          data-ocid="flight.hud.throttle"
        >
          <div className="flex items-center justify-between">
            <span className="hud-label text-[10px] text-muted-foreground">
              Throttle
            </span>
            <span className="hud-label text-xs font-bold text-primary">
              {throttlePct}%
            </span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-sm bg-secondary">
            <div
              className="h-full bg-primary transition-[width] duration-100"
              style={{ width: `${throttlePct}%` }}
            />
          </div>
        </div>
        {brakesOn && (
          <div
            className="glow-caution hud-scanlines flex items-center gap-1.5 rounded-md border border-accent/50 bg-accent/15 px-2.5 py-1.5 backdrop-blur"
            data-ocid="flight.hud.brakes"
          >
            <TriangleAlert
              className="h-3.5 w-3.5 text-accent"
              aria-hidden="true"
            />
            <span className="hud-label text-[10px] text-accent">Brakes</span>
          </div>
        )}
      </div>

      {/* Bottom-center: navigation */}
      {nextWaypoint && (
        <div
          className="hud-scanlines glow-instrument absolute bottom-24 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-md border border-primary/40 bg-card/80 px-4 py-2 backdrop-blur"
          data-ocid="flight.hud.waypoint"
        >
          <div className="flex flex-col">
            <span className="hud-label text-[9px] text-muted-foreground">
              {phase === "landing" || phase === "rollout"
                ? "Landing Runway"
                : "Navigate To"}
            </span>
            <span className="hud-label text-sm font-bold text-primary">
              {nextWaypoint.name}
            </span>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex flex-col">
            <span className="hud-label text-[9px] text-muted-foreground">
              Distance
            </span>
            <span className="hud-label text-sm font-bold text-foreground">
              {Math.max(0, nextWaypoint.distance).toFixed(1)} nm
            </span>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex flex-col">
            <span className="hud-label text-[9px] text-muted-foreground">
              Bearing
            </span>
            <span className="hud-label text-sm font-bold text-foreground">
              {Math.round(((nextWaypoint.bearing % 360) + 360) % 360)
                .toString()
                .padStart(3, "0")}
              °
            </span>
          </div>
        </div>
      )}

      {/* Bottom-right: controls */}
      <div
        className="hud-scanlines absolute bottom-4 right-4 rounded-md border border-border bg-card/80 p-3 backdrop-blur"
        data-ocid="flight.hud.controls"
      >
        <div className="mb-1.5 flex items-center gap-1.5">
          <Keyboard
            className="h-3.5 w-3.5 text-muted-foreground"
            aria-hidden="true"
          />
          <span className="hud-label text-[9px] text-muted-foreground">
            Controls
          </span>
        </div>
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
          <Key>W / S</Key>
          <span>Pitch up / down</span>
          <Key>A / D</Key>
          <span>Turn (bank)</span>
          <Key>Shift</Key>
          <span>More power</span>
          <Key>Ctrl</Key>
          <span>Less power</span>
          <Key>Space</Key>
          <span>Brakes</span>
        </div>
      </div>
    </div>
  );
}

function Instrument({
  icon,
  label,
  value,
  unit,
  dataOcid,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  dataOcid: string;
}) {
  return (
    <div
      className="hud-scanlines glow-instrument flex w-36 items-center gap-2.5 rounded-md border border-primary/40 bg-card/80 px-2.5 py-1.5 backdrop-blur"
      data-ocid={dataOcid}
    >
      <span className="text-primary">{icon}</span>
      <div className="flex flex-1 flex-col leading-none">
        <span className="hud-label text-[9px] text-muted-foreground">
          {label}
        </span>
        <span className="flex items-baseline gap-1">
          <span className="text-base font-bold text-foreground">{value}</span>
          {unit && (
            <span className="hud-label text-[9px] text-muted-foreground">
              {unit}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="hud-label inline-flex items-center justify-center rounded-sm border border-border bg-secondary px-1.5 py-0.5 text-[9px] font-bold text-foreground">
      {children}
    </kbd>
  );
}
