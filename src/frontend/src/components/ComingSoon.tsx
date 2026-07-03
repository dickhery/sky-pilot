import { Plane } from "lucide-react";
import { motion } from "motion/react";

interface ComingSoonProps {
  title: string;
  /** Route path — used for the deterministic marker namespace. */
  route: string;
}

/**
 * Placeholder route component used by the foundation router. Each page
 * task will replace its corresponding `<ComingSoon>` with the real
 * screen implementation.
 */
export function ComingSoon({ title, route }: ComingSoonProps) {
  // Derive a stable marker root from the route, e.g. "/flight-plans" → "flight-plans"
  const markerRoot =
    route.replace(/^\//, "").replace(/[^a-z0-9]+/g, "_") || "menu";

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center text-center"
    >
      <div
        className="glow-instrument hud-scanlines flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary"
        data-ocid={`${markerRoot}.section`}
      >
        <Plane
          className="h-9 w-9 -rotate-45 animate-horizon-pulse"
          aria-hidden="true"
        />
      </div>

      <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h1>
      <p className="hud-label mt-3 text-xs text-muted-foreground">
        Cockpit systems initializing
      </p>
      <p className="mt-4 max-w-sm text-sm text-muted-foreground">
        This screen is on the flight plan. The full experience will be ready for
        takeoff shortly.
      </p>
    </motion.section>
  );
}
