import { ComingSoon } from "@/components/ComingSoon";
import { Layout } from "@/components/Layout";
import { FlightLogDetailPage } from "@/pages/FlightLogDetailPage";
import { FlightLogsPage } from "@/pages/FlightLogsPage";
import { FlightPlansPage } from "@/pages/FlightPlansPage";
import { FlightSchoolPage } from "@/pages/FlightSchoolPage";
import { FlightSimulationPage } from "@/pages/FlightSimulationPage";
import { MenuPage } from "@/pages/MenuPage";
import {
  Outlet,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";

type RouterContext = Record<string, never>;

// ── Root ──────────────────────────────────────────────────────────────────
const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
});

// ── Menu (default route) ───────────────────────────────────────────────────
const menuRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <MenuPage />,
});

// ── Flight Plans (level select) ────────────────────────────────────────────
const flightPlansRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/flight-plans",
  component: () => <FlightPlansPage />,
});

// ── Flight Simulation ─────────────────────────────────────────────────────
const flightSimulationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/flight-simulation",
  component: () => <FlightSimulationPage />,
});

// ── Flight Logs (logbook list) ────────────────────────────────────────────
const flightLogsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/flight-logs",
  component: () => <FlightLogsPage />,
});

// ── Flight Log detail ──────────────────────────────────────────────────────
const flightLogDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/flight-logs/$logId",
  component: () => <FlightLogDetailPage />,
});

// ── Flight School ──────────────────────────────────────────────────────────
const flightSchoolRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/flight-school",
  component: FlightSchoolPage,
});

// ── Catch-all → menu ──────────────────────────────────────────────────────
const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "*",
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});

const routeTree = rootRoute.addChildren([
  menuRoute,
  flightPlansRoute,
  flightSimulationRoute,
  flightLogsRoute,
  flightLogDetailRoute,
  flightSchoolRoute,
  notFoundRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
