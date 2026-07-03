import type { Plane, Weather } from "@/backend";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useFlightLog } from "@/hooks/useFlightData";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Gauge,
  MapPin,
  Navigation,
  Plane as PlaneIcon,
  Route,
  Trophy,
} from "lucide-react";
import { motion } from "motion/react";

const planeLabel: Record<Plane, string> = {
  cessna: "Cessna Skyhawk",
  gulfstream: "Gulfstream G650",
};

const weatherVariant: Record<Weather, { label: string; className: string }> = {
  daytime: {
    label: "Daytime",
    className: "border-primary/40 bg-primary/10 text-primary",
  },
  nighttime: {
    label: "Nighttime",
    className: "border-chart-3/40 bg-chart-3/15 text-foreground/80",
  },
  partlyCloudy: {
    label: "Partly Cloudy",
    className: "border-muted-foreground/30 bg-muted text-muted-foreground",
  },
};

function formatDate(epochMs: bigint): string {
  const d = new Date(Number(epochMs));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(epochMs: bigint): string {
  const d = new Date(Number(epochMs));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface ScoreRowProps {
  icon: React.ReactNode;
  label: string;
  value: bigint;
  marker: string;
  accent?: "primary" | "accent";
}

function ScoreRow({
  icon,
  label,
  value,
  marker,
  accent = "primary",
}: ScoreRowProps) {
  const rounded = Math.round(Number(value));
  const barClass =
    accent === "accent"
      ? "[&_[data-slot=progress-indicator]]:bg-accent"
      : "[&_[data-slot=progress-indicator]]:bg-primary";
  const textClass = accent === "accent" ? "text-accent" : "text-primary";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          {icon}
          <span className="hud-label text-[10px]">{label}</span>
        </span>
        <span
          className={`font-mono text-lg font-semibold ${textClass}`}
          data-ocid={marker}
        >
          {rounded}
          <span className="hud-label ml-1 text-[9px] text-muted-foreground">
            /100
          </span>
        </span>
      </div>
      <Progress
        value={rounded}
        className={`h-2.5 ${barClass}`}
        data-ocid={`${marker}.bar`}
      />
    </div>
  );
}

/**
 * Detail view for a single flight log. Shows the full score breakdown
 * with progress bars plus all flight metadata.
 */
export function FlightLogDetailPage() {
  const { logId } = useParams({ from: "/flight-logs/$logId" });
  const navigate = useNavigate();

  // Route param is a string; the backend expects a bigint LogId.
  const parsedLogId = (() => {
    try {
      return BigInt(logId);
    } catch {
      return undefined;
    }
  })();

  const {
    data: log,
    isLoading,
    isError,
    error,
    refetch,
  } = useFlightLog(parsedLogId);

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6"
      data-ocid="flight-log-detail.page"
    >
      {/* Back nav */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: "/flight-logs" })}
          data-ocid="flight-log-detail.back_button"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to logbook
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div
          className="flex flex-col gap-4"
          data-ocid="flight-log-detail.loading_state"
          aria-busy="true"
        >
          <Skeleton className="h-8 w-48" />
          <Card className="border-border/70 py-0">
            <CardHeader className="px-6 pt-6">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-2/3" />
            </CardHeader>
            <CardContent className="flex flex-col gap-5 px-6 pb-6">
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholder array
                  <Skeleton key={`skeleton-${i}`} className="h-16 w-full" />
                ))}
              </div>
              <div className="flex flex-col gap-4 pt-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-2.5 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-2.5 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error */}
      {isError && !isLoading && (
        <Card
          className="glow-caution border-destructive/40 bg-destructive/5"
          data-ocid="flight-log-detail.error_state"
        >
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Trophy className="size-6" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <p className="font-display text-lg font-semibold text-foreground">
                This log entry couldn't be found
              </p>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error
                  ? error.message
                  : "The record may have been cleared from the logbook."}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                data-ocid="flight-log-detail.retry_button"
              >
                Retry
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate({ to: "/flight-logs" })}
                data-ocid="flight-log-detail.back_to_logs_button"
              >
                Back to logbook
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Not found / invalid id */}
      {!isLoading && !isError && !log && (
        <Card
          className="border-border/70 bg-card/60"
          data-ocid="flight-log-detail.empty_state"
        >
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <MapPin className="size-6" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <p className="font-display text-lg font-semibold text-foreground">
                Log entry not found
              </p>
              <p className="text-sm text-muted-foreground">
                No flight matches this logbook reference.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: "/flight-logs" })}
              data-ocid="flight-log-detail.return_button"
            >
              Return to logbook
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Detail content */}
      {!isLoading && !isError && log && (
        <>
          {/* Header card */}
          <Card
            className="hud-scanlines border-primary/30 bg-card/70 py-0"
            data-ocid="flight-log-detail.header_card"
          >
            <CardHeader className="gap-2 px-6 pt-6 pb-4">
              <span className="hud-label text-[10px] text-muted-foreground">
                Flight Log · #{log.id.toString()}
              </span>
              <CardTitle className="font-display text-2xl font-semibold tracking-tight text-foreground">
                {log.planName}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Badge
                  variant="outline"
                  className={weatherVariant[log.weather]?.className}
                  data-ocid="flight-log-detail.weather_badge"
                >
                  {weatherVariant[log.weather]?.label ?? log.weather}
                </Badge>
                <Badge
                  variant="secondary"
                  className="border-primary/20 bg-primary/5 text-primary/90"
                  data-ocid="flight-log-detail.plane_badge"
                >
                  <PlaneIcon className="size-3" aria-hidden="true" />
                  {planeLabel[log.plane] ?? log.plane}
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Total score hero */}
          <Card
            className="glow-instrument border-primary/40 bg-card/80"
            data-ocid="flight-log-detail.total_card"
          >
            <CardContent className="flex items-center justify-between gap-4 px-6 py-6">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Trophy className="size-6" aria-hidden="true" />
                </div>
                <div>
                  <p className="hud-label text-[10px] text-muted-foreground">
                    Final Score
                  </p>
                  <p className="font-display text-sm text-muted-foreground">
                    Weighted composite
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span
                  className="font-mono text-4xl font-bold text-primary"
                  data-ocid="flight-log-detail.total_score"
                >
                  {Math.round(Number(log.score.total))}
                </span>
                <span className="hud-label ml-1 text-xs text-muted-foreground">
                  /100
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Score breakdown */}
          <Card
            className="border-border/70 bg-card/60 py-0"
            data-ocid="flight-log-detail.breakdown_card"
          >
            <CardHeader className="px-6 pt-6 pb-2">
              <span className="hud-label text-[10px] text-muted-foreground">
                Score Breakdown
              </span>
            </CardHeader>
            <CardContent className="flex flex-col gap-5 px-6 pb-6">
              <ScoreRow
                icon={
                  <Gauge
                    className="size-4 text-primary/70"
                    aria-hidden="true"
                  />
                }
                label="Speed"
                value={log.score.speed}
                marker="flight-log-detail.speed_score"
                accent="primary"
              />
              <ScoreRow
                icon={
                  <Navigation
                    className="size-4 text-accent/70"
                    aria-hidden="true"
                  />
                }
                label="Landing Smoothness"
                value={log.score.landingSmoothness}
                marker="flight-log-detail.landing_score"
                accent="accent"
              />
            </CardContent>
          </Card>

          {/* Flight metadata */}
          <Card
            className="border-border/70 bg-card/60 py-0"
            data-ocid="flight-log-detail.metadata_card"
          >
            <CardHeader className="px-6 pt-6 pb-2">
              <span className="hud-label text-[10px] text-muted-foreground">
                Flight Metadata
              </span>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <Calendar
                    className="mt-0.5 size-4 shrink-0 text-primary/70"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <dt className="hud-label text-[10px] text-muted-foreground">
                      Date
                    </dt>
                    <dd className="font-mono text-sm text-foreground">
                      {formatDate(log.completedAt)}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock
                    className="mt-0.5 size-4 shrink-0 text-primary/70"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <dt className="hud-label text-[10px] text-muted-foreground">
                      Time
                    </dt>
                    <dd className="font-mono text-sm text-foreground">
                      {formatTime(log.completedAt)}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Route
                    className="mt-0.5 size-4 shrink-0 text-primary/70"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <dt className="hud-label text-[10px] text-muted-foreground">
                      Flight Plan
                    </dt>
                    <dd className="truncate text-sm text-foreground">
                      {log.planName}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <PlaneIcon
                    className="mt-0.5 size-4 shrink-0 text-primary/70"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <dt className="hud-label text-[10px] text-muted-foreground">
                      Aircraft
                    </dt>
                    <dd className="truncate text-sm text-foreground">
                      {planeLabel[log.plane] ?? log.plane}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin
                    className="mt-0.5 size-4 shrink-0 text-accent/70"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <dt className="hud-label text-[10px] text-muted-foreground">
                      Conditions
                    </dt>
                    <dd className="text-sm text-foreground">
                      {weatherVariant[log.weather]?.label ?? log.weather}
                    </dd>
                  </div>
                </div>
              </dl>
            </CardContent>
          </Card>
        </>
      )}
    </motion.section>
  );
}
