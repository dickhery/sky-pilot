import { Button } from "@/components/ui/button";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { Link, useRouterState } from "@tanstack/react-router";
import { LogIn, LogOut, Plane, Rocket } from "lucide-react";

/**
 * Sky Pilot app header.
 *
 * Always shows the brand mark + name. On every route except the menu
 * (`/`), a "Back to Menu" control appears on the right so the pilot
 * can always return to the hub.
 */
export function Header({ compact = false }: { compact?: boolean }) {
  const location = useRouterState({ select: (s) => s.location.pathname });
  const isMenu = location === "/";
  const { isAuthenticated, login, clear, isLoggingIn } = useInternetIdentity();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/80 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="hud-scanlines pointer-events-none absolute inset-0 opacity-40" />
      <div
        className={`container relative flex items-center justify-between ${
          compact ? "h-12" : "h-14 sm:h-16"
        }`}
      >
        <Link
          to="/"
          className="group flex items-center gap-3"
          data-ocid="header.brand.link"
          aria-label="Sky Pilot — back to menu"
        >
          <span className="glow-instrument flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary transition-smooth group-hover:bg-primary/25 sm:h-10 sm:w-10">
            <Plane
              className="h-4 w-4 -rotate-45 sm:h-5 sm:w-5"
              aria-hidden="true"
            />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-base font-semibold tracking-tight text-foreground sm:text-lg">
              Sky Pilot
            </span>
            <span className="hud-label hidden text-[10px] text-muted-foreground sm:inline">
              Flight Simulator
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="hud-label gap-2"
              onClick={() => clear()}
              data-ocid="header.sign_out.button"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="hud-label gap-2"
              onClick={() => login()}
              disabled={isLoggingIn}
              data-ocid="header.sign_in.button"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">
                {isLoggingIn ? "Signing in…" : "Sign in"}
              </span>
              <span className="sm:hidden">{isLoggingIn ? "…" : "In"}</span>
            </Button>
          )}
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
                <span className="hidden sm:inline">Back to Menu</span>
                <span className="sm:hidden">Menu</span>
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
