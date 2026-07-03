import { MenuCard } from "@/components/MenuCard";
import { ClipboardList, GraduationCap, Plane, Radar } from "lucide-react";
import { motion } from "motion/react";

const NAV_ITEMS = [
  {
    title: "Flight Logs",
    description:
      "Review your logbook of past flights — scores, weather, plane choice, and landing quality for every sortie.",
    icon: ClipboardList,
    to: "/flight-logs" as const,
    marker: "menu.flight_logs",
    accent: "primary" as const,
  },
  {
    title: "Flight Plans",
    description:
      "Choose your mission. Pick a flight plan, then select a plane and weather condition before taking to the sky.",
    icon: Plane,
    to: "/flight-plans" as const,
    marker: "menu.flight_plans",
    accent: "accent" as const,
  },
  {
    title: "Flight School",
    description:
      "Learn the controls, scoring rules, and how to nail a smooth landing. Required reading before your first flight.",
    icon: GraduationCap,
    to: "/flight-school" as const,
    marker: "menu.flight_school",
    accent: "primary" as const,
  },
];

/**
 * Sky Pilot main menu hub — the app's default landing screen.
 *
 * Cockpit Noir treatment: horizon backdrop, HUD scanlines, instrument
 * glow, and three primary navigation cards.
 */
export function MenuPage() {
  return (
    <section className="flex flex-1 flex-col" data-ocid="menu.section">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative mx-auto flex w-full max-w-3xl flex-col items-center text-center"
      >
        {/* Instrument bezel mark */}
        <div
          className="glow-instrument hud-scanlines relative flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary"
          data-ocid="menu.brand.badge"
        >
          <Plane
            className="h-9 w-9 -rotate-45 animate-horizon-pulse"
            aria-hidden="true"
          />
          {/* Caution ring */}
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-accent animate-runway-strobe"
          />
        </div>

        {/* Eyebrow */}
        <p className="hud-label mt-6 text-[11px] text-primary/80">
          Cockpit&nbsp;Online&nbsp;·&nbsp;Clear&nbsp;for&nbsp;Takeoff
        </p>

        {/* Title */}
        <h1 className="mt-3 font-display text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
          Sky&nbsp;Pilot
        </h1>

        {/* Subtitle */}
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          A pocket flight simulator. Pick a flight plan, choose your plane and
          weather, and prove you can put it down softly on the runway.
        </p>

        {/* HUD status strip */}
        <div
          className="mt-7 flex items-center gap-4 rounded-full border border-border bg-card/60 px-5 py-2 backdrop-blur"
          data-ocid="menu.status.panel"
        >
          <span className="flex items-center gap-2">
            <Radar className="h-4 w-4 text-primary" aria-hidden="true" />
            <span className="hud-label text-[10px] text-muted-foreground">
              3&nbsp;Sectors
            </span>
          </span>
          <span aria-hidden="true" className="h-3 w-px bg-border" />
          <span className="hud-label text-[10px] text-muted-foreground">
            2&nbsp;Airframes
          </span>
          <span aria-hidden="true" className="h-3 w-px bg-border" />
          <span className="hud-label text-[10px] text-muted-foreground">
            3&nbsp;Weather&nbsp;Modes
          </span>
        </div>
      </motion.div>

      {/* ── Navigation cards ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="mx-auto mt-14 grid w-full max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        data-ocid="menu.cards.list"
      >
        {NAV_ITEMS.map((item, i) => (
          <MenuCard
            key={item.to}
            title={item.title}
            description={item.description}
            icon={item.icon}
            to={item.to}
            marker={item.marker}
            index={i + 1}
            accent={item.accent}
          />
        ))}
      </motion.div>

      {/* ── Footer hint ──────────────────────────────────────────────── */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="hud-label mx-auto mt-12 text-center text-[10px] text-muted-foreground"
      >
        Select a sector to begin&nbsp;·&nbsp;Use the header to return to this
        menu at any time
      </motion.p>
    </section>
  );
}
