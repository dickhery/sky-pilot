import { FlightLogCard } from "@/components/FlightLogCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFlightLogs } from "@/hooks/useFlightData";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  BookOpen,
  Compass,
  PlaneTakeoff,
  RefreshCw,
} from "lucide-react";
import { motion } from "motion/react";

/**
 * Logbook screen — lists every past flight fetched from the backend.
 * Shows loading skeletons, an error retry, an empty-state CTA, and
 * the list of clickable log cards.
 */
export function FlightLogsPage() {
  const { data, isLoading, isError, error, refetch, isFetching } =
    useFlightLogs();
  const navigate = useNavigate();

  const logs = data ?? [];
  const showSkeletons = isLoading || (isFetching && logs.length === 0);

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6"
      data-ocid="flight-logs.page"
    >
      {/* Page header */}
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-primary">
          <BookOpen className="size-5" aria-hidden="true" />
          <span className="hud-label text-[11px] text-muted-foreground">
            Pilot Logbook
          </span>
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Flight Logs
        </h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          Every landing you've logged is recorded here — speed, smoothness, and
          the conditions you flew through.
        </p>
      </header>

      {/* Error state */}
      {isError && !showSkeletons && (
        <Card
          className="glow-caution border-destructive/40 bg-destructive/5"
          data-ocid="flight-logs.error_state"
        >
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="size-6" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <p className="font-display text-lg font-semibold text-foreground">
                Couldn't load your logbook
              </p>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error
                  ? error.message
                  : "The flight recorder is offline. Try again in a moment."}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              data-ocid="flight-logs.retry_button"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {showSkeletons && !isError && (
        <div
          className="flex flex-col gap-4"
          data-ocid="flight-logs.loading_state"
          aria-busy="true"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholder array
            <Card key={`skeleton-${i}`} className="border-border/70 py-0">
              <CardContent className="flex flex-col gap-3 px-5 py-5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-7 w-14 rounded-md" />
                </div>
                <Skeleton className="h-5 w-2/3" />
                <div className="flex items-center gap-4">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-20 rounded-md" />
                    <Skeleton className="h-5 w-16 rounded-md" />
                  </div>
                  <Skeleton className="h-4 w-28" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!showSkeletons && !isError && logs.length === 0 && (
        <Card
          className="hud-scanlines border-primary/30 bg-card/60"
          data-ocid="flight-logs.empty_state"
        >
          <CardContent className="flex flex-col items-center gap-5 py-12 text-center">
            <div className="glow-instrument flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <PlaneTakeoff className="size-8 -rotate-45" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-xl font-semibold text-foreground">
                No flights logged yet
              </h2>
              <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                Your logbook is empty. Pick a flight plan, take to the sky, and
                your first landing will be recorded here.
              </p>
            </div>
            <Button
              variant="default"
              size="lg"
              onClick={() => navigate({ to: "/flight-plans" })}
              data-ocid="flight-logs.start_flight_button"
            >
              <Compass className="size-4" aria-hidden="true" />
              Start your first flight
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Log list */}
      {!showSkeletons && !isError && logs.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="hud-label text-[10px] text-muted-foreground">
              {logs.length} {logs.length === 1 ? "Entry" : "Entries"} Recorded
            </span>
          </div>
          <div className="flex flex-col gap-4">
            {logs.map((log, i) => (
              <FlightLogCard
                key={log.id.toString()}
                log={log}
                index={i + 1}
                onSelect={(id) =>
                  navigate({
                    to: "/flight-logs/$logId",
                    params: { logId: id.toString() },
                  })
                }
              />
            ))}
          </div>
        </div>
      )}
    </motion.section>
  );
}
