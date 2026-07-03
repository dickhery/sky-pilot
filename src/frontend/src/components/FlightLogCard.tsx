import type { FlightLogView, Plane, Weather } from "@/backend";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Calendar,
  ChevronRight,
  Gauge,
  Navigation,
  Plane as PlaneIcon,
} from "lucide-react";
import { motion } from "motion/react";

interface FlightLogCardProps {
  log: FlightLogView;
  /** 1-based position in the list — used for deterministic markers. */
  index: number;
  onSelect: (logId: bigint) => void;
}

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

function formatDateTime(epochMs: bigint): {
  date: string;
  time: string;
} {
  const ms = Number(epochMs);
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) {
    return { date: "—", time: "" };
  }
  return {
    date: d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    time: d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

/**
 * A single clickable logbook entry. Shows date, plan, plane, weather,
 * and a compact score summary. Selecting it opens the detail view.
 */
export function FlightLogCard({ log, index, onSelect }: FlightLogCardProps) {
  const weather = weatherVariant[log.weather] ?? weatherVariant.daytime;
  const { date, time } = formatDateTime(log.completedAt);
  const total = Math.round(Number(log.score.total));
  const speed = Math.round(Number(log.score.speed));
  const landing = Math.round(Number(log.score.landingSmoothness));

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(log.id)}
      data-ocid={`flight-logs.item.${index}`}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        duration: 0.35,
        delay: Math.min(index * 0.06, 0.4),
        ease: "easeOut",
      }}
      className="group block w-full text-left focus-visible:outline-none"
    >
      <Card className="hud-scanlines transition-smooth cursor-pointer border-border/70 py-0 hover:border-primary/60 hover:glow-instrument focus-within:glow-instrument">
        <CardHeader className="gap-2 px-5 pt-5 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="hud-label text-[10px] text-muted-foreground">
                Flight {String(index).padStart(2, "0")}
              </p>
              <h3 className="mt-1 truncate font-display text-lg font-semibold tracking-tight text-foreground">
                {log.planName}
              </h3>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent/10 px-2.5 py-1 font-mono text-sm font-semibold text-accent">
                {total}
                <span className="hud-label text-[9px] text-accent/70">
                  /100
                </span>
              </span>
              <ChevronRight
                className="size-5 text-muted-foreground transition-smooth group-hover:translate-x-0.5 group-hover:text-primary"
                aria-hidden="true"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-5 pb-5">
          {/* Metadata row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Calendar
                className="size-3.5 text-primary/70"
                aria-hidden="true"
              />
              <span className="font-mono">{date}</span>
              {time && (
                <span className="text-muted-foreground/60">· {time}</span>
              )}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <PlaneIcon
                className="size-3.5 text-primary/70"
                aria-hidden="true"
              />
              <span className="truncate">
                {planeLabel[log.plane] ?? log.plane}
              </span>
            </span>
          </div>

          {/* Badges + score breakdown */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={weather.className}
                data-ocid={`flight-logs.weather.${index}`}
              >
                {weather.label}
              </Badge>
              <Badge
                variant="secondary"
                className="border-primary/20 bg-primary/5 text-primary/90"
                data-ocid={`flight-logs.plane.${index}`}
              >
                <PlaneIcon className="size-3" aria-hidden="true" />
                {log.plane === "gulfstream" ? "Jet" : "Trainer"}
              </Badge>
            </div>

            <div className="flex items-center gap-4 font-mono text-xs">
              <span
                className="inline-flex items-center gap-1.5 text-muted-foreground"
                title="Speed score"
              >
                <Gauge
                  className="size-3.5 text-primary/70"
                  aria-hidden="true"
                />
                <span className="hud-label text-[9px]">SPD</span>
                <span className="font-semibold text-foreground">{speed}</span>
              </span>
              <span
                className="inline-flex items-center gap-1.5 text-muted-foreground"
                title="Landing smoothness score"
              >
                <Navigation
                  className="size-3.5 text-accent/70"
                  aria-hidden="true"
                />
                <span className="hud-label text-[9px]">LND</span>
                <span className="font-semibold text-foreground">{landing}</span>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.button>
  );
}
