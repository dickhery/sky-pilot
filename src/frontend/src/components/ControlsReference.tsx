import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Gauge,
  Hand,
  type LucideIcon,
  Minimize2,
  MousePointer2,
} from "lucide-react";

interface ControlBinding {
  /** Primary key / mouse input, e.g. "W" or "Shift". */
  input: string;
  /** Alternate equivalent input, e.g. "↑" for W. */
  alt?: string;
  /** Action description shown to the pilot. */
  action: string;
  /** lucide icon hinting at the action. */
  icon: LucideIcon;
  /** Group label used to bucket rows. */
  group: "Pitch" | "Roll" | "Throttle" | "Brakes" | "View";
}

const BINDINGS: ControlBinding[] = [
  {
    input: "W",
    alt: "↑",
    action: "Pitch up — lift the nose skyward",
    icon: ArrowUp,
    group: "Pitch",
  },
  {
    input: "S",
    alt: "↓",
    action: "Pitch down — nose toward the horizon",
    icon: ArrowDown,
    group: "Pitch",
  },
  {
    input: "A",
    alt: "←",
    action: "Roll left — bank the port wing down",
    icon: ArrowLeft,
    group: "Roll",
  },
  {
    input: "D",
    alt: "→",
    action: "Roll right — bank the starboard wing down",
    icon: ArrowRight,
    group: "Roll",
  },
  {
    input: "Shift",
    action: "Throttle up — increase engine power",
    icon: Gauge,
    group: "Throttle",
  },
  {
    input: "Ctrl",
    action: "Throttle down — decrease engine power",
    icon: Minimize2,
    group: "Throttle",
  },
  {
    input: "Space",
    action: "Brakes — slow down on the runway",
    icon: Hand,
    group: "Brakes",
  },
  {
    input: "Mouse",
    action: "Free-look camera — drag to scan the cockpit",
    icon: MousePointer2,
    group: "View",
  },
];

const GROUP_ORDER: ControlBinding["group"][] = [
  "Pitch",
  "Roll",
  "Throttle",
  "Brakes",
  "View",
];

/**
 * Controls reference table for the Flight School screen.
 *
 * Lists every keyboard / mouse input and the in-flight action it performs.
 * Grouped by flight control surface for quick cockpit orientation.
 */
export function ControlsReference() {
  return (
    <Card
      className="glow-instrument hud-scanlines overflow-hidden border-primary/30 bg-card/80"
      data-ocid="flight_school.controls.card"
    >
      <CardHeader className="border-b border-border/60 bg-secondary/40">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="font-display text-lg tracking-tight text-foreground">
            Controls Reference
          </CardTitle>
          <Badge
            variant="outline"
            className="hud-label border-primary/40 text-[10px] text-primary"
          >
            Input Map
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead className="hud-label w-[26%] text-[10px] text-muted-foreground">
                Input
              </TableHead>
              <TableHead className="hud-label w-[18%] text-[10px] text-muted-foreground">
                Group
              </TableHead>
              <TableHead className="hud-label text-[10px] text-muted-foreground">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {GROUP_ORDER.flatMap((group) =>
              BINDINGS.filter((b) => b.group === group).map((binding, idx) => {
                const Icon = binding.icon;
                const key = `${binding.group}-${binding.input}-${idx}`;
                return (
                  <TableRow
                    key={key}
                    className="border-border/40 transition-smooth hover:bg-primary/5"
                    data-ocid={`flight_school.controls.row.${idx + 1}`}
                  >
                    <TableCell className="font-mono">
                      <div className="flex items-center gap-2">
                        <kbd
                          className="glow-instrument inline-flex min-w-[2.25rem] items-center justify-center rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary"
                          aria-label={`Primary input ${binding.input}`}
                        >
                          {binding.input}
                        </kbd>
                        {binding.alt && (
                          <kbd
                            className="inline-flex min-w-[2rem] items-center justify-center rounded-md border border-border bg-secondary/60 px-2 py-1 text-xs text-muted-foreground"
                            aria-label={`Alternate input ${binding.alt}`}
                          >
                            {binding.alt}
                          </kbd>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="hud-label bg-secondary/60 text-[9px] text-secondary-foreground"
                      >
                        {binding.group}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-foreground">
                      <div className="flex items-center gap-2">
                        <Icon
                          className="h-4 w-4 shrink-0 text-accent"
                          aria-hidden="true"
                        />
                        <span className="min-w-0 break-words">
                          {binding.action}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              }),
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
