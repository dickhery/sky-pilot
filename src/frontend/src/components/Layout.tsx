import { Header } from "@/components/Header";
import type { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

/**
 * Shared layout wrapper for every Sky Pilot screen.
 *
 * Applies the Cockpit Noir horizon backdrop, a sticky branded header,
 * and a centered content region. Pages compose inside `<Layout>`.
 */
export function Layout({ children }: LayoutProps) {
  return (
    <div className="relative flex min-h-svh flex-col bg-background">
      {/* Horizon backdrop — fixed so it stays put during scroll */}
      <div
        aria-hidden="true"
        className="bg-horizon pointer-events-none fixed inset-0 -z-10 opacity-60"
      />
      {/* Subtle vignette to deepen the cockpit feel at the edges */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,transparent_55%,oklch(0.145_0.02_250/0.85)_100%)]"
      />

      <Header />

      <main className="container relative flex flex-1 flex-col py-8">
        {children}
      </main>

      <footer className="border-t border-border bg-card/60 py-6">
        <div className="container flex flex-col items-center justify-between gap-2 text-center sm:flex-row sm:text-left">
          <p className="hud-label text-[10px] text-muted-foreground">
            © {new Date().getFullYear()} Sky Pilot
          </p>
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
              typeof window !== "undefined"
                ? window.location.hostname
                : "skypilot",
            )}`}
            target="_blank"
            rel="noreferrer"
            className="hud-label text-[10px] text-muted-foreground transition-smooth hover:text-primary"
          >
            Built with love using caffeine.ai
          </a>
        </div>
      </footer>
    </div>
  );
}
