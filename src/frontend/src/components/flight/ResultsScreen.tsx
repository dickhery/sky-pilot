import type { FlightPlan } from "@/backend";
import { Button } from "@/components/ui/button";
import type { Plane, ScoreBreakdown } from "@/types/game";
import { useNavigate } from "@tanstack/react-router";
import {
  Award,
  CheckCircle2,
  Crosshair,
  Gauge,
  Home,
  RotateCcw,
} from "lucide-react";
import { motion } from "motion/react";

interface ResultsScreenProps {
  score: ScoreBreakdown;
  plan: FlightPlan | null;
  plane: Plane | null;
  durationSec: number;
  persisted: boolean;
  onRetry: () => void;
}

/**
 * Post-flight results screen.
 *
 * Cockpit Noir styled: dark card, cyan/amber instrument glows, monospace
 * telemetry. Shows the three score components (speed, landing smoothness,
 * runway alignment) plus the weighted total, then offers Retry / Return
 * to Menu. Overlays the 3D scene as a modal-style panel.
 */
export function ResultsScreen({
  score,
  plan,
  plane,
  durationSec,
  persisted,
  onRetry,
}: ResultsScreenProps) {
  const navigate = useNavigate();

  const mins = Math.floor(durationSec / 60);
  const secs = Math.round(durationSec % 60);
  const durationStr = `${mins}:${secs.toString().padStart(2, "0")}`;

  const grade =
    score.total >= 90
      ? { label: "Ace", tone: "text-primary" }
      : score.total >= 75
        ? { label: "Sharp", tone: "text-primary" }
        : score.total >= 55
          ? { label: "Steady", tone: "text-accent" }
          : { label: "Rookie", tone: "text-muted-foreground" };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="absolute inset-0 z-30 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      data-ocid="flight.results.section"
    >
      <motion.div
        initial={{ y: 24, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="hud-scanlines glow-instrument w-full max-w-md rounded-lg border border-primary/40 bg-card p-6 shadow-2xl"
        data-ocid="flight.results.card"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <p className="hud-label text-[10px] text-muted-foreground">
              Flight Complete
            </p>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              {plan?.name ?? "Flight"}
            </h2>
            <p className="hud-label mt-1 text-[10px] text-muted-foreground">
              {plane?.name ?? "Aircraft"} · {durationStr}
            </p>
          </div>
          <div className="flex flex-col items-end">
            <span className={`font-display text-4xl font-bold ${grade.tone}`}>
              {Math.round(score.total)}
            </span>
            <span className={`hud-label text-[10px] ${grade.tone}`}>
              {grade.label}
            </span>
          </div>
        </div>

        {/* Score breakdown */}
        <div className="mt-5 space-y-3" data-ocid="flight.results.breakdown">
          <ScoreRow
            icon={<Gauge className="h-4 w-4" aria-hidden="true" />}
            label="Speed"
            value={score.speed}
            description="Time to complete route"
            dataOcid="flight.results.speed"
          />
          <ScoreRow
            icon={<Award className="h-4 w-4" aria-hidden="true" />}
            label="Landing Smoothness"
            value={score.landingSmoothness}
            description="Descent rate at touchdown"
            dataOcid="flight.results.smoothness"
          />
          <ScoreRow
            icon={<Crosshair className="h-4 w-4" aria-hidden="true" />}
            label="Runway Alignment"
            value={score.runwayAlignment}
            description="Centerline accuracy"
            dataOcid="flight.results.alignment"
          />
        </div>

        {/* Persistence status */}
        <div className="mt-4 flex items-center gap-2 text-[11px]">
          {persisted ? (
            <>
              <CheckCircle2
                className="h-4 w-4 text-primary"
                aria-hidden="true"
              />
              <span className="hud-label text-primary">
                Logged to flight logbook
              </span>
            </>
          ) : (
            <span className="hud-label text-muted-foreground">
              Saving to logbook…
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button
            variant="default"
            className="hud-label flex-1 gap-2"
            onClick={onRetry}
            data-ocid="flight.results.retry_button"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Retry Flight
          </Button>
          <Button
            variant="secondary"
            className="hud-label flex-1 gap-2"
            onClick={() => navigate({ to: "/" })}
            data-ocid="flight.results.menu_button"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Return to Menu
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ScoreRow({
  icon,
  label,
  value,
  description,
  dataOcid,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  description: string;
  dataOcid: string;
}) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const barColor =
    v >= 75 ? "bg-primary" : v >= 50 ? "bg-accent" : "bg-destructive/70";
  return (
    <div
      className="rounded-md border border-border bg-secondary/40 p-3"
      data-ocid={dataOcid}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-primary">{icon}</span>
          <div className="flex flex-col leading-none">
            <span className="hud-label text-[11px] font-bold text-foreground">
              {label}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {description}
            </span>
          </div>
        </div>
        <span className="font-mono text-xl font-bold text-foreground">
          {v}
          <span className="text-xs text-muted-foreground">/100</span>
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-sm bg-secondary">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${v}%` }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
          className={`h-full ${barColor}`}
        />
      </div>
    </div>
  );
}
