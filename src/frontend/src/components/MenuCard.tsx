import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";

export interface MenuCardProps {
  /** Display heading for the card. */
  title: string;
  /** Short description of what the destination screen offers. */
  description: string;
  /** lucide-react icon shown in the instrument bezel. */
  icon: LucideIcon;
  /** TanStack Router destination path. */
  to: string;
  /** Deterministic marker root, e.g. "menu.flight_logs". */
  marker: string;
  /** Stable 1-based index for staggered entrance + marker suffix. */
  index: number;
  /** Optional accent — "primary" (cyan) or "accent" (amber). */
  accent?: "primary" | "accent";
}

/**
 * Reusable navigation card for the Sky Pilot main menu hub.
 *
 * Renders as a full-card link with an instrument-bezel icon, title,
 * description, and a runway-strobe hover indicator. Entrance is
 * staggered via motion with `whileInView`.
 */
export function MenuCard({
  title,
  description,
  icon: Icon,
  to,
  marker,
  index,
  accent = "primary",
}: MenuCardProps) {
  const isAccent = accent === "accent";
  const bezelClasses = isAccent
    ? "bg-accent/15 text-accent group-hover:glow-caution"
    : "bg-primary/15 text-primary group-hover:glow-instrument";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.45, ease: "easeOut", delay: index * 0.1 }}
      className="h-full"
    >
      <Link
        to={to}
        data-ocid={`${marker}.card.${index}`}
        aria-label={`${title} — ${description}`}
        className={cn(
          "group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card/80 p-6",
          "shadow-sm backdrop-blur transition-smooth",
          "hover:-translate-y-1 hover:border-primary/50 hover:shadow-instrument-glow",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
      >
        {/* Runway strobe strip — animates on hover/focus */}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 transition-opacity duration-300 group-hover:animate-runway-strobe group-hover:opacity-100 group-focus-visible:opacity-100"
        />
        {/* Subtle HUD scanline texture */}
        <span
          aria-hidden="true"
          className="hud-scanlines pointer-events-none absolute inset-0 opacity-30"
        />

        {/* Instrument bezel */}
        <div
          className={cn(
            "relative flex h-14 w-14 items-center justify-center rounded-full border border-border transition-smooth",
            bezelClasses,
          )}
        >
          <Icon className="h-6 w-6 -rotate-0" aria-hidden="true" />
        </div>

        {/* Title + description */}
        <div className="relative mt-5 flex flex-1 flex-col">
          <h3 className="font-display text-xl font-semibold tracking-tight text-foreground">
            {title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>

        {/* Call-to-action row */}
        <div className="relative mt-5 flex items-center justify-between">
          <span className="hud-label text-[10px] text-muted-foreground">
            Enter&nbsp;Sector
          </span>
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full border border-border transition-smooth",
              isAccent
                ? "text-accent group-hover:bg-accent group-hover:text-accent-foreground"
                : "text-primary group-hover:bg-primary group-hover:text-primary-foreground",
            )}
            aria-hidden="true"
          >
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
