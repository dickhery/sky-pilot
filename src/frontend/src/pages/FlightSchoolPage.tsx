import { ControlsReference } from "@/components/ControlsReference";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BookOpen, Gauge, Landmark, Plane, Trophy } from "lucide-react";
import { motion } from "motion/react";

interface Phase {
  id: string;
  step: number;
  title: string;
  summary: string;
  details: string[];
}

const PHASES: Phase[] = [
  {
    id: "takeoff",
    step: 1,
    title: "Take-off",
    summary:
      "Accelerate down the runway, build airspeed, and rotate to lift off.",
    details: [
      "Hold Shift to spool the throttle up — watch the airspeed indicator climb past rotation speed.",
      "Keep the wings level with A / D as the plane accelerates down the centreline.",
      "Pull back on S (or ↓) to rotate — lift the nose smoothly off the runway.",
      "Once airborne, ease the nose down slightly to build speed before climbing out.",
    ],
  },
  {
    id: "navigation",
    step: 2,
    title: "Navigation",
    summary: "Follow the on-screen guidance toward the destination waypoint.",
    details: [
      "A cyan horizon marker points toward the next waypoint — keep it near the top of the HUD.",
      "Bank gently with A / D to turn; coordinated turns hold altitude more cleanly.",
      "Trim pitch with W / S to hold a steady climb or cruise attitude.",
      "Watch the altitude tape and airspeed — stay within the green bands for a clean run.",
    ],
  },
  {
    id: "landing",
    step: 3,
    title: "Landing",
    summary: "Align with the runway, descend smoothly, and touch down gently.",
    details: [
      "Line up with the runway centreline early — small roll corrections, no sudden banks.",
      "Reduce throttle with Ctrl to descend; aim for a steady glide path.",
      "Flare just before touchdown by easing back on S to soften the contact.",
      "Touch down on the main gear first, then lower the nose — apply Space to brake.",
    ],
  },
];

interface ScoreFactor {
  id: string;
  label: string;
  weight: string;
  description: string;
}

const SCORE_FACTORS: ScoreFactor[] = [
  {
    id: "speed",
    label: "Speed",
    weight: "40%",
    description:
      "Time to complete the flight plan. Faster runs earn a higher speed multiplier — but reckless flying costs you on the landing score.",
  },
  {
    id: "alignment",
    label: "Runway Alignment",
    weight: "30%",
    description:
      "How closely you track the runway centreline at touchdown. Off-centre touchdowns bleed points fast.",
  },
  {
    id: "descent",
    label: "Descent Rate",
    weight: "30%",
    description:
      "Vertical speed at the moment of touchdown. A gentle flare keeps this number low and the score high.",
  },
];

/**
 * Flight School — reference page covering controls, the three flight phases,
 * and how the final score is calculated. Cockpit Noir themed.
 */
export function FlightSchoolPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 py-2"
    >
      {/* ── Page header ─────────────────────────────────────────────── */}
      <header className="flex flex-col gap-3" data-ocid="flight_school.page">
        <div className="flex items-center gap-3">
          <span className="glow-instrument flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="hud-label text-[10px] text-primary">Ground School</p>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Flight School
            </h1>
          </div>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Before you take to the skies, learn the controls, the three phases of
          every flight, and how your final score is calculated. Study this
          briefing — every clean landing starts here.
        </p>
      </header>

      {/* ── Section 1: Controls reference ───────────────────────────── */}
      <section
        className="flex flex-col gap-4"
        data-ocid="flight_school.controls.section"
      >
        <div className="flex items-center gap-2">
          <Plane className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="hud-label text-xs text-primary">01 · Controls</h2>
        </div>
        <ControlsReference />
      </section>

      {/* ── Section 2: How-to-play walkthrough ──────────────────────── */}
      <section
        className="flex flex-col gap-4"
        data-ocid="flight_school.walkthrough.section"
      >
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="hud-label text-xs text-primary">02 · How to Play</h2>
        </div>
        <Card className="glow-instrument border-primary/30 bg-card/80">
          <CardHeader className="border-b border-border/60 bg-secondary/40">
            <CardTitle className="font-display text-lg tracking-tight text-foreground">
              The Three Phases of Flight
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Every flight plan moves through take-off, navigation, and landing.
              Expand each phase to study the procedure.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <Accordion
              type="single"
              collapsible
              defaultValue="takeoff"
              className="w-full"
            >
              {PHASES.map((phase) => (
                <AccordionItem
                  key={phase.id}
                  value={phase.id}
                  className="border-border/60"
                  data-ocid={`flight_school.walkthrough.item.${phase.step}`}
                >
                  <AccordionTrigger
                    className="group hover:no-underline"
                    data-ocid={`flight_school.walkthrough.tab.${phase.step}`}
                  >
                    <div className="flex flex-1 items-center gap-3 text-left">
                      <span className="glow-instrument flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-mono text-sm font-semibold text-primary">
                        {phase.step}
                      </span>
                      <div className="min-w-0">
                        <p className="font-display text-base font-medium text-foreground">
                          {phase.title}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {phase.summary}
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pl-11 pr-1 pb-4">
                    <ul className="flex flex-col gap-2.5">
                      {phase.details.map((detail) => (
                        <li
                          key={detail}
                          className="flex items-start gap-2.5 text-sm text-foreground"
                        >
                          <span
                            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                            aria-hidden="true"
                          />
                          <span className="min-w-0 break-words">{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </section>

      {/* ── Section 3: Scoring explanation ─────────────────────────── */}
      <section
        className="flex flex-col gap-4"
        data-ocid="flight_school.scoring.section"
      >
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-accent" aria-hidden="true" />
          <h2 className="hud-label text-xs text-accent">03 · Scoring</h2>
        </div>
        <Card className="glow-caution border-accent/30 bg-card/80">
          <CardHeader className="border-b border-border/60 bg-accent/5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="font-display text-lg tracking-tight text-foreground">
                  How Your Score Is Calculated
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Total score combines speed with landing quality. Smooth,
                  well-aligned touchdowns are rewarded as heavily as a fast run.
                </CardDescription>
              </div>
              <Landmark
                className="hidden h-8 w-8 shrink-0 text-accent sm:block"
                aria-hidden="true"
              />
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 pt-4 sm:grid-cols-3">
            {SCORE_FACTORS.map((factor, idx) => (
              <div
                key={factor.id}
                className="flex flex-col gap-2 rounded-lg border border-border/60 bg-secondary/30 p-4"
                data-ocid={`flight_school.scoring.card.${idx + 1}`}
              >
                <div className="flex items-center justify-between">
                  <p className="hud-label text-[10px] text-muted-foreground">
                    {factor.label}
                  </p>
                  <Badge
                    variant="outline"
                    className="hud-label border-accent/40 bg-accent/10 text-[10px] text-accent"
                  >
                    {factor.weight}
                  </Badge>
                </div>
                <p className="text-sm leading-relaxed text-foreground">
                  {factor.description}
                </p>
              </div>
            ))}
          </CardContent>
          <CardContent className="pt-2">
            <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <Trophy
                className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <p className="text-sm text-foreground">
                <span className="hud-label text-[10px] text-primary">
                  Final Score
                </span>{" "}
                = Speed (40%) + Runway Alignment (30%) + Descent Rate (30%).
                Land too hard or off-centre and even the fastest run won't reach
                the top of the logbook.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </motion.div>
  );
}
