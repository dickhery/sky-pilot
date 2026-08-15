import type { TouchAxes } from "@/hooks/useFlightControls";
import { Camera, Hand, Music, Music2 } from "lucide-react";
import { useCallback, useRef } from "react";

interface FlightTouchControlsProps {
  touch: React.MutableRefObject<TouchAxes>;
  throttlePct: number;
  brakesOn: boolean;
  cockpitView: boolean;
  onToggleCockpit: () => void;
  musicOn: boolean;
  onToggleMusic: () => void;
}

/**
 * On-screen stick + throttle for phones and tablets.
 * Writes into the same ref the physics loop reads — no extra React renders.
 */
export function FlightTouchControls({
  touch,
  throttlePct,
  brakesOn,
  cockpitView,
  onToggleCockpit,
  musicOn,
  onToggleMusic,
}: FlightTouchControlsProps) {
  return (
    <div
      className="flight-touch pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-end justify-between gap-3 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-8"
      data-ocid="flight.touch.overlay"
    >
      <Stick touch={touch} />
      <div className="pointer-events-auto flex items-end gap-2">
        <button
          type="button"
          className="hud-label flex h-12 w-12 touch-manipulation items-center justify-center rounded-full border border-primary/40 bg-card/80 text-primary backdrop-blur"
          onClick={onToggleCockpit}
          aria-label={cockpitView ? "Chase camera" : "Cockpit view"}
          data-ocid="flight.touch.view"
        >
          <Camera className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="hud-label flex h-12 w-12 touch-manipulation items-center justify-center rounded-full border border-primary/40 bg-card/80 text-primary backdrop-blur"
          onClick={onToggleMusic}
          aria-label={musicOn ? "Mute music" : "Play music"}
          data-ocid="flight.touch.music"
        >
          {musicOn ? (
            <Music2 className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Music className="h-5 w-5 opacity-50" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          className={`hud-label flex h-14 min-w-14 touch-manipulation items-center justify-center rounded-full border px-3 text-[10px] backdrop-blur ${
            brakesOn
              ? "border-accent bg-accent/30 text-accent"
              : "border-accent/40 bg-card/80 text-accent"
          }`}
          onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            touch.current.brakes = true;
          }}
          onPointerUp={() => {
            touch.current.brakes = false;
          }}
          onPointerCancel={() => {
            touch.current.brakes = false;
          }}
          data-ocid="flight.touch.brake"
        >
          <span className="flex flex-col items-center gap-0.5">
            <Hand className="h-4 w-4" aria-hidden="true" />
            Brake
          </span>
        </button>
        <ThrottleSlider touch={touch} throttlePct={throttlePct} />
      </div>
    </div>
  );
}

function Stick({ touch }: { touch: React.MutableRefObject<TouchAxes> }) {
  const padRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const apply = useCallback(
    (clientX: number, clientY: number) => {
      const pad = padRef.current;
      if (!pad) return;
      const rect = pad.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const max = rect.width * 0.38;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const len = Math.hypot(dx, dy);
      if (len > max) {
        dx = (dx / len) * max;
        dy = (dy / len) * max;
      }
      const nx = dx / max;
      const ny = dy / max;
      touch.current.roll = nx;
      touch.current.pitch = -ny;
      if (knobRef.current) {
        knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
      }
    },
    [touch],
  );

  const reset = useCallback(() => {
    dragging.current = false;
    touch.current.pitch = 0;
    touch.current.roll = 0;
    if (knobRef.current) {
      knobRef.current.style.transform = "translate(0px, 0px)";
    }
  }, [touch]);

  return (
    <div
      ref={padRef}
      className="pointer-events-auto relative h-[7.5rem] w-[7.5rem] touch-none rounded-full border border-primary/40 bg-card/55 backdrop-blur"
      onPointerDown={(e) => {
        e.preventDefault();
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        apply(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return;
        apply(e.clientX, e.clientY);
      }}
      onPointerUp={reset}
      onPointerCancel={reset}
      data-ocid="flight.touch.stick"
      aria-label="Flight stick. Drag up to pitch up, left and right to bank."
    >
      <div className="absolute inset-6 rounded-full border border-primary/20" />
      <div
        ref={knobRef}
        className="absolute left-1/2 top-1/2 h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/70 bg-primary/35 shadow-instrument-glow"
      />
    </div>
  );
}

function ThrottleSlider({
  touch,
  throttlePct,
}: {
  touch: React.MutableRefObject<TouchAxes>;
  throttlePct: number;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const apply = (clientY: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const t = 1 - (clientY - rect.top) / rect.height;
    touch.current.throttle = Math.min(1, Math.max(0, t));
  };

  const end = () => {
    dragging.current = false;
    touch.current.throttle = null;
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="hud-label text-[9px] text-primary">{throttlePct}%</span>
      <div
        ref={trackRef}
        className="relative h-36 w-11 touch-none overflow-hidden rounded-full border border-primary/40 bg-card/70 backdrop-blur"
        onPointerDown={(e) => {
          e.preventDefault();
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          apply(e.clientY);
        }}
        onPointerMove={(e) => {
          if (!dragging.current) return;
          apply(e.clientY);
        }}
        onPointerUp={end}
        onPointerCancel={end}
        data-ocid="flight.touch.throttle"
        aria-label="Throttle slider. Drag up for more power."
      >
        <div
          className="absolute inset-x-0 bottom-0 bg-primary/50"
          style={{ height: `${throttlePct}%` }}
        />
        <div
          className="absolute left-1/2 h-4 w-8 -translate-x-1/2 rounded-sm border border-primary bg-primary/80"
          style={{ bottom: `calc(${throttlePct}% - 0.5rem)` }}
        />
      </div>
      <span className="hud-label text-[9px] text-muted-foreground">Pwr</span>
    </div>
  );
}
