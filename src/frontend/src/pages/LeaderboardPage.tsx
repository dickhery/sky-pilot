import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLeaderboard } from "@/hooks/useFlightData";
import { AlertTriangle, Medal, RefreshCw, Trophy } from "lucide-react";
import { motion } from "motion/react";

/**
 * Public high-score board. Reads are a single query call.
 */
export function LeaderboardPage() {
  const { data, isLoading, isError, error, refetch, isFetching } =
    useLeaderboard();
  const rows = data ?? [];

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
          Top 25 clean landings. Sign in with Internet Identity after a flight
          to post a display name and score.
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

      {!isLoading && !isError && rows.length === 0 && (
        <Card className="border-border bg-card/70">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No scores posted yet. Land clean, sign in, and claim the top row.
          </CardContent>
        </Card>
      )}

      {rows.length > 0 && (
        <ol className="flex flex-col gap-2" data-ocid="leaderboard.list">
          {rows.map((row, i) => (
            <li
              key={row.id.toString()}
              className="flex items-center gap-3 rounded-lg border border-border bg-card/80 px-4 py-3"
              data-ocid={`leaderboard.row.${i + 1}`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 font-mono text-sm font-bold text-primary">
                {i < 3 ? (
                  <Medal className="h-4 w-4" aria-hidden="true" />
                ) : (
                  i + 1
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-base font-semibold text-foreground">
                  {row.displayName}
                </p>
                <p className="hud-label truncate text-[10px] text-muted-foreground">
                  {row.planName}
                </p>
              </div>
              <span className="font-mono text-xl font-bold text-primary">
                {Number(row.total)}
              </span>
            </li>
          ))}
        </ol>
      )}

      {rows.length > 0 && (
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
