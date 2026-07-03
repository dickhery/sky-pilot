import type { FlightPlan } from "@/backend";
import { FlightPlanCard } from "@/components/FlightPlanCard";
import { Button } from "@/components/ui/button";
import { useFlightPlans } from "@/hooks/useFlightData";
import { useGameStore } from "@/store/gameStore";
import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Compass, Loader2, Plane } from "lucide-react";
import { motion } from "motion/react";

/**
 * Flight Plans — the level-select screen.
 *
 * Fetches available flight plans via `useFlightPlans`, renders them as
 * a responsive grid of selectable cards, and on selection arms the plan
 * in the game store and navigates to `/flight-simulation` to begin the
 * flight. Shows loading and error states per the Cockpit Noir theme.
 */
export function FlightPlansPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = useFlightPlans();
  const selectedPlan = useGameStore((s) => s.selectedPlan);
  const selectPlan = useGameStore((s) => s.selectPlan);

  const handleSelect = (plan: FlightPlan) => {
    selectPlan(plan);
    void navigate({ to: "/flight-simulation" });
  };

  const plans = data ?? [];

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-1 flex-col gap-8"
      data-ocid="flight-plans.page"
    >
      {/* Section header */}
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="glow-instrument flex h-11 w-11 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Compass className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="flex flex-col">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Flight Plans
            </h1>
            <p className="hud-label text-[10px] text-muted-foreground">
              Select a route to begin your flight
            </p>
          </div>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Each plan defines a departure runway, a guided destination waypoint,
          and a landing runway. Choose your aircraft and weather, then arm the
          plan to take off.
        </p>
      </header>

      {/* Loading state */}
      {isLoading && (
        <div
          className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card/60 py-20"
          data-ocid="flight-plans.loading_state"
        >
          <Loader2
            className="h-8 w-8 animate-spin text-primary"
            aria-hidden="true"
          />
          <p className="hud-label text-xs text-muted-foreground">
            Loading flight plans
          </p>
        </div>
      )}

      {/* Error state */}
      {isError && !isLoading && (
        <div
          className="glow-caution flex flex-col items-center justify-center gap-4 rounded-xl border border-accent/40 bg-accent/5 py-20 text-center"
          data-ocid="flight-plans.error_state"
        >
          <AlertTriangle className="h-8 w-8 text-accent" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <p className="font-display text-lg font-semibold text-foreground">
              Unable to load flight plans
            </p>
            <p className="max-w-md text-sm text-muted-foreground">
              {error instanceof Error
                ? error.message
                : "The flight planner is unreachable. Please try again."}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="hud-label gap-2"
            onClick={() => refetch()}
            data-ocid="flight-plans.retry_button"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && plans.length === 0 && (
        <div
          className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-card/40 py-20 text-center"
          data-ocid="flight-plans.empty_state"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Plane className="h-6 w-6 -rotate-45" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="font-display text-lg font-semibold text-foreground">
              No flight plans available
            </p>
            <p className="max-w-md text-sm text-muted-foreground">
              Flight plans are published by the operations team. Check back
              shortly for new routes.
            </p>
          </div>
        </div>
      )}

      {/* Plans grid */}
      {!isLoading && !isError && plans.length > 0 && (
        <div
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
          data-ocid="flight-plans.list"
        >
          {plans.map((plan, index) => (
            <FlightPlanCard
              key={plan.id.toString()}
              plan={plan}
              index={index}
              isSelected={selectedPlan?.id === plan.id}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}
    </motion.section>
  );
}
