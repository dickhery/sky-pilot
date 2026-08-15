import {
  Plane as BackendPlane,
  type FlightPlan,
  type SubmitOutcome,
} from "@/backend";
import {
  type CrashReason,
  crashReasonMessage,
} from "@/components/flight/flightPhysics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSubmitLeaderboardScore } from "@/hooks/useFlightData";
import type { Plane, ScoreBreakdown } from "@/types/game";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  Award,
  CheckCircle2,
  Crosshair,
  Gauge,
  Home,
  RotateCcw,
  Trophy,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

interface ResultsScreenProps {
  score: ScoreBreakdown;
  plan: FlightPlan | null;
  plane: Plane | null;
  durationSec: number;
  persisted: boolean;
  crashed?: boolean;
  crashReason?: CrashReason | null;
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
  crashed = false,
  crashReason = null,
  onRetry,
}: ResultsScreenProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, login, isLoggingIn } = useInternetIdentity();
  const submitScore = useSubmitLeaderboardScore();
  const [displayName, setDisplayName] = useState("");
  const [submitNote, setSubmitNote] = useState<string | null>(null);

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
              {crashed ? "Aircraft Down" : "Flight Complete"}
            </p>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              {crashed ? "Crashed" : (plan?.name ?? "Flight")}
            </h2>
            <p className="hud-label mt-1 text-[10px] text-muted-foreground">
              {plane?.name ?? "Aircraft"} · {durationStr}
            </p>
          </div>
          <div className="flex flex-col items-end">
            <span
              className={`font-display text-4xl font-bold ${crashed ? "text-accent" : grade.tone}`}
            >
              {crashed ? "—" : Math.round(score.total)}
            </span>
            <span
              className={`hud-label text-[10px] ${crashed ? "text-accent" : grade.tone}`}
            >
              {crashed ? "No score" : grade.label}
            </span>
          </div>
        </div>

        {crashed && crashReason && (
          <p className="mt-4 rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">
            {crashReasonMessage(crashReason)}
          </p>
        )}

        {!crashed && (
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
        )}

        {/* Persistence status */}
        <div className="mt-4 flex items-center gap-2 text-[11px]">
          {persisted ? (
            <>
              <CheckCircle2
                className="h-4 w-4 text-primary"
                aria-hidden="true"
              />
              <span className="hud-label text-primary">
                {crashed
                  ? "Crash not logged — no score earned"
                  : "Logged to flight logbook"}
              </span>
            </>
          ) : (
            <span className="hud-label text-muted-foreground">
              Saving to logbook…
            </span>
          )}
        </div>

        {!crashed && plan && plane && score.total > 0 && (
          <div
            className="mt-5 space-y-2 rounded-md border border-primary/30 bg-primary/5 p-3"
            data-ocid="flight.results.leaderboard"
          >
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" aria-hidden="true" />
              <p className="hud-label text-[10px] text-primary">
                Post to leaderboard
              </p>
            </div>
            {!isAuthenticated ? (
              <Button
                type="button"
                size="sm"
                className="hud-label w-full gap-2"
                onClick={() => login()}
                disabled={isLoggingIn}
                data-ocid="flight.results.sign_in_button"
              >
                {isLoggingIn
                  ? "Opening Internet Identity…"
                  : "Sign in with Internet Identity"}
              </Button>
            ) : (
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  submitScore.mutate(
                    {
                      displayName: displayName.trim(),
                      planName: plan.name,
                      plane:
                        plane.id === "CessnaSkyhawk"
                          ? BackendPlane.cessna
                          : BackendPlane.gulfstream,
                      weather: plan.weather,
                      total: BigInt(score.total),
                    },
                    {
                      onSuccess: (outcome) => {
                        void queryClient.invalidateQueries({
                          queryKey: ["leaderboard"],
                        });
                        setSubmitNote(outcomeMessage(outcome));
                      },
                      onError: (err) =>
                        setSubmitNote(
                          err instanceof Error
                            ? err.message
                            : "Could not post score",
                        ),
                    },
                  );
                }}
              >
                <Label htmlFor="display-name" className="hud-label text-[10px]">
                  Display name
                </Label>
                <Input
                  id="display-name"
                  maxLength={20}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Callsign"
                  className="h-8"
                  data-ocid="flight.results.display_name"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="hud-label w-full"
                  disabled={
                    submitScore.isPending || displayName.trim().length === 0
                  }
                  data-ocid="flight.results.post_score_button"
                >
                  {submitScore.isPending ? "Posting…" : "Post score"}
                </Button>
              </form>
            )}
            {submitNote && (
              <p className="text-[11px] text-muted-foreground">{submitNote}</p>
            )}
          </div>
        )}

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

function outcomeMessage(outcome: SubmitOutcome): string {
  switch (outcome.__kind__) {
    case "posted":
      return `Posted as ${outcome.posted.displayName}.`;
    case "improved":
      return `New personal best: ${Number(outcome.improved.total)}.`;
    case "unchanged":
      return `Kept your better score of ${Number(outcome.unchanged.total)}.`;
    case "tooLow":
      return `Need ${Number(outcome.tooLow.needed)} to make the top 25.`;
  }
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
