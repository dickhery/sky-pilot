import type { FlightPlan, LeaderboardEntryView } from "@/backend";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFlightPlans, useLeaderboard } from "@/hooks/useFlightData";
import { AlertTriangle, Medal, RefreshCw, Trophy } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";

/**
 * Public high-score board, one ranking per flight plan.
 * Reads are a single query call — the canister already groups and caps
 * each map so the frontend only filters.
 */
export function LeaderboardPage() {
  const { data, isLoading, isError, error, refetch, isFetching } =
    useLeaderboard();
  const { data: plans } = useFlightPlans();
  const rows = data ?? [];
  const catalog = plans ?? [];

  const mapNames = useMemo(() => {
    if (catalog.length > 0) {
      return catalog.map((plan) => plan.name);
    }
    const seen = new Set<string>();
    const names: string[] = [];
    for (const row of rows) {
      if (!seen.has(row.planName)) {
        seen.add(row.planName);
        names.push(row.planName);
      }
    }
    return names;
  }, [catalog, rows]);

  const [selectedMap, setSelectedMap] = useState<string>("");
  const activeMap = selectedMap || mapNames[0] || "";

  const planByName = useMemo(() => {
    const map = new Map<string, FlightPlan>();
    for (const plan of catalog) {
      map.set(plan.name, plan);
    }
    return map;
  }, [catalog]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6"
      data-ocid="leaderboard.page"
    >
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-primary">
          <Trophy className="size-5" aria-hidden="true" />
          <span className="hud-label text-[11px] text-muted-foreground">
            Public Standings
          </span>
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Leaderboard
        </h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          Top 10 clean landings on each route. Sign in with Internet Identity
          after a flight to post a display name and score.
        </p>
      </header>

      {isError && (
        <Card className="glow-caution border-destructive/40 bg-destructive/5">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <AlertTriangle className="size-6 text-destructive" />
            <p className="text-sm text-muted-foreground">
              {error instanceof Error
                ? error.message
                : "Could not load the board."}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              data-ocid="leaderboard.retry_button"
            >
              <RefreshCw className="size-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <p className="hud-label text-xs text-muted-foreground">
          Loading standings…
        </p>
      )}

      {!isLoading && !isError && mapNames.length === 0 && (
        <Card className="border-border bg-card/70">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No scores posted yet. Land clean, sign in, and claim the top row.
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && mapNames.length > 0 && (
        <Tabs
          value={activeMap}
          onValueChange={setSelectedMap}
          className="gap-4"
        >
          <TabsList
            className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/60 p-1"
            data-ocid="leaderboard.map_tabs"
          >
            {mapNames.map((name) => (
              <TabsTrigger
                key={name}
                value={name}
                className="hud-label max-w-full shrink-0 px-3 text-[10px]"
                data-ocid={`leaderboard.map_tab.${slug(name)}`}
              >
                {shortPlanName(name)}
              </TabsTrigger>
            ))}
          </TabsList>

          {mapNames.map((name) => {
            const board = rows.filter((row) => row.planName === name);
            const plan = planByName.get(name);
            return (
              <TabsContent
                key={name}
                value={name}
                className="flex flex-col gap-3"
                data-ocid={`leaderboard.map_board.${slug(name)}`}
              >
                <div className="flex flex-col gap-1">
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    {name}
                  </h2>
                  {plan && (
                    <p className="text-xs text-muted-foreground">
                      {plan.departure.name} → {plan.waypoint.name} →{" "}
                      {plan.landing.name}
                    </p>
                  )}
                </div>
                {board.length === 0 ? (
                  <Card className="border-border bg-card/70">
                    <CardContent className="py-10 text-center text-sm text-muted-foreground">
                      No scores on this map yet.
                    </CardContent>
                  </Card>
                ) : (
                  <ol
                    className="flex flex-col gap-2"
                    data-ocid="leaderboard.list"
                  >
                    {board.map((row, i) => (
                      <ScoreRow
                        key={row.id.toString()}
                        row={row}
                        rank={i + 1}
                      />
                    ))}
                  </ol>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      {mapNames.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className="size-4" />
          Refresh
        </Button>
      )}
    </motion.section>
  );
}

function ScoreRow({
  row,
  rank,
}: {
  row: LeaderboardEntryView;
  rank: number;
}) {
  return (
    <li
      className="flex items-center gap-3 rounded-lg border border-border bg-card/80 px-4 py-3"
      data-ocid={`leaderboard.row.${rank}`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 font-mono text-sm font-bold text-primary">
        {rank <= 3 ? <Medal className="h-4 w-4" aria-hidden="true" /> : rank}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-base font-semibold text-foreground">
          {row.displayName}
        </p>
        <p className="hud-label truncate text-[10px] text-muted-foreground">
          {formatSubmittedAt(row.submittedAt)}
        </p>
      </div>
      <span className="font-mono text-xl font-bold text-primary">
        {Number(row.total)}
      </span>
    </li>
  );
}

/** Motoko `Time.now()` is nanoseconds; older JS dates may be milliseconds. */
function formatSubmittedAt(ts: bigint): string {
  const raw = Number(ts);
  if (!Number.isFinite(raw) || raw <= 0) return "—";
  const ms = raw > 1e14 ? raw / 1e6 : raw;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function shortPlanName(name: string): string {
  return name.replace(/^(Morning|Midday|Midnight|Night|Cloudy|Storm)\s+/i, "");
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}
