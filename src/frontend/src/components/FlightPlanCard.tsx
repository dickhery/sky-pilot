import type { FlightPlan, Weather } from "@/backend";
import { Badge } from "@/components/ui/badge";
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Cloud, Moon, Plane, Sun, Waypoints } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";

interface FlightPlanCardProps {
  plan: FlightPlan;
  index: number;
  isSelected: boolean;
  onSelect: (plan: FlightPlan) => void;
}

const weatherConfig: Record<
  Weather,
  { label: string; icon: ReactNode; className: string }
> = {
  daytime: {
    label: "Daytime",
    icon: <Sun className="h-3.5 w-3.5" aria-hidden="true" />,
    className: "border-accent/40 bg-accent/15 text-accent",
  },
  nighttime: {
    label: "Nighttime",
    icon: <Moon className="h-3.5 w-3.5" aria-hidden="true" />,
    className: "border-primary/40 bg-primary/15 text-primary",
  },
  partlyCloudy: {
    label: "Partly Cloudy",
    icon: <Cloud className="h-3.5 w-3.5" aria-hidden="true" />,
    className: "border-muted-foreground/40 bg-muted text-muted-foreground",
  },
};

/**
 * Level-select card for a single flight plan.
 *
 * Renders the plan name, weather badge, plane name + handling, and a
 * departure → waypoint → landing route summary. Selecting the card
 * arms it with a cyan instrument glow and a "Begin Flight" affordance.
 */
export function FlightPlanCard({
  plan,
  index,
  isSelected,
  onSelect,
}: FlightPlanCardProps) {
  const weather = weatherConfig[plan.weather];
  const markerId = `flight-plans.item.${index + 1}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: "easeOut" }}
    >
      <button
        type="button"
        aria-pressed={isSelected}
        aria-label={`Select flight plan: ${plan.name}`}
        data-ocid={markerId}
        onClick={() => onSelect(plan)}
        className={`group relative w-full cursor-pointer overflow-hidden rounded-xl text-left transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          isSelected
            ? "glow-instrument border border-primary/60 bg-primary/5"
            : "border border-border hover:border-primary/40 hover:bg-card/80"
        }`}
      >
        {/* Scanline wash on the header strip */}
        <div
          aria-hidden="true"
          className="hud-scanlines pointer-events-none absolute inset-x-0 top-0 h-24 opacity-30"
        />

        <CardHeader className="relative">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="hud-label text-[10px] text-muted-foreground">
                Plan {String(index + 1).padStart(2, "0")}
              </span>
              <CardTitle className="font-display text-lg leading-tight tracking-tight text-foreground">
                {plan.name}
              </CardTitle>
            </div>
            <Badge
              variant="outline"
              className={`hud-label gap-1 text-[10px] ${weather.className}`}
              data-ocid={`flight-plans.weather.badge.${index + 1}`}
            >
              {weather.icon}
              {weather.label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {/* Plane block */}
          <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
              <Plane className="h-4 w-4 -rotate-45" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="hud-label text-[10px] text-muted-foreground">
                Aircraft
              </p>
              <p className="truncate font-medium text-foreground">
                {plan.plane.name}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {plan.plane.handling}
              </p>
            </div>
          </div>

          {/* Route block */}
          <div className="flex flex-col gap-2">
            <p className="hud-label flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Waypoints className="h-3.5 w-3.5" aria-hidden="true" />
              Route
            </p>
            <ol className="flex flex-col gap-1.5 text-xs">
              <li className="flex items-center gap-2 text-foreground">
                <span className="hud-label w-16 shrink-0 text-[10px] text-muted-foreground">
                  Depart
                </span>
                <span className="truncate font-medium">
                  {plan.departure.name}
                </span>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <span className="hud-label w-16 shrink-0 text-[10px] text-muted-foreground">
                  Via
                </span>
                <span className="truncate">{plan.waypoint.name}</span>
              </li>
              <li className="flex items-center gap-2 text-foreground">
                <span className="hud-label w-16 shrink-0 text-[10px] text-muted-foreground">
                  Arrive
                </span>
                <span className="truncate font-medium">
                  {plan.landing.name}
                </span>
              </li>
            </ol>
          </div>

          {plan.routeDescription && (
            <CardDescription className="border-l-2 border-primary/30 pl-3 text-xs leading-relaxed text-muted-foreground">
              {plan.routeDescription}
            </CardDescription>
          )}
        </CardContent>

        <CardFooter className="mt-2">
          <span
            className={`hud-label flex w-full items-center justify-center gap-2 rounded-md border py-2 text-[11px] transition-smooth ${
              isSelected
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-border bg-muted/40 text-muted-foreground group-hover:border-primary/40 group-hover:text-primary"
            }`}
            data-ocid={`flight-plans.select_button.${index + 1}`}
          >
            {isSelected ? "Armed — Begin Flight" : "Select Plan"}
          </span>
        </CardFooter>
      </button>
    </motion.div>
  );
}
