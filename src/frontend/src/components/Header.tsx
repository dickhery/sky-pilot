import { Button } from "@/components/ui/button";
import { Link, useRouterState } from "@tanstack/react-router";
import { Plane, Rocket } from "lucide-react";

/**
 * Sky Pilot app header.
 *
 * Always shows the brand mark + name. On every route except the menu
 * (`/`), a "Back to Menu" control appears on the right so the pilot
 * can always return to the hub.
 */
export function Header() {
  const location = useRouterState({ select: (s) => s.location.pathname });
  const isMenu = location === "/";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="hud-scanlines pointer-events-none absolute inset-0 opacity-40" />
      <div className="container relative flex h-16 items-center justify-between">
        <Link
          to="/"
          className="group flex items-center gap-3"
          data-ocid="header.brand.link"
          aria-label="Sky Pilot — back to menu"
        >
          <span className="glow-instrument flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary transition-smooth group-hover:bg-primary/25">
            <Plane className="h-5 w-5 -rotate-45" aria-hidden="true" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-lg font-semibold tracking-tight text-foreground">
              Sky Pilot
            </span>
            <span className="hud-label text-[10px] text-muted-foreground">
              Flight Simulator
            </span>
          </span>
        </Link>

        {!isMenu && (
          <Button
            asChild
            variant="secondary"
            size="sm"
            className="hud-label gap-2"
            data-ocid="header.back_to_menu.button"
          >
            <Link to="/">
              <Rocket className="h-4 w-4" aria-hidden="true" />
              Back to Menu
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
}
