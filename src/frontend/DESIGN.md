# Cockpit Noir — Design Brief

## Direction
Cockpit Noir: a flight-sim aesthetic that treats the screen like an instrument
panel at dusk. Dark mode is primary — deep midnight blue-black base, cyan
horizon as the primary signal color, sunset amber as the caution/accent. The
feeling is focused, technical, and cinematic, never gamified or cartoonish.

## Tone
Calm authority. Copy is terse and pilot-flavored ("Cleared for takeoff",
"Maintain runway heading"). Numbers and HUD labels use JetBrains Mono in
uppercase with wide tracking. Body copy stays plain and instructional.

## Differentiation
Most flight UIs lean either photoreal or arcade-bright. Cockpit Noir sits
between: a restrained instrument-panel chrome wrapped around a vivid horizon
gradient. The cyan/amber pair reads as avionics, not generic SaaS.

## Color Palette

| Token        | Light (daytime-flight)        | Dark (cockpit-noir)            | Use                  |
| ------------ | ---------------------------- | ------------------------------ | -------------------- |
| background   | oklch(0.97 0.012 230)        | oklch(0.145 0.02 250)          | page base            |
| card         | oklch(0.99 0.008 220)        | oklch(0.185 0.025 250)         | header / panels      |
| muted        | oklch(0.94 0.014 220)        | oklch(0.21 0.022 250)          | alternating sections |
| primary      | oklch(0.72 0.14 190) cyan     | oklch(0.75 0.15 190) cyan      | CTAs, active state   |
| accent       | oklch(0.74 0.16 70) amber     | oklch(0.72 0.17 70) amber      | warnings, highlights |
| foreground   | oklch(0.18 0.02 250)         | oklch(0.93 0.015 220)          | body text            |
| border       | oklch(0.88 0.018 220)        | oklch(0.27 0.025 250)          | dividers, inputs     |

## Typography
- **Display** — Space Grotesk. Headings, hero numerals, menu titles.
- **Body** — Figtree. Paragraphs, labels, button text.
- **Mono** — JetBrains Mono. HUD readouts, coordinates, scores, `.hud-label`.

## Elevation
- `shadow-subtle` — header and cards, single soft drop.
- `instrument-glow` — cyan ring + bloom on active instruments and focused inputs.
- `caution-glow` — amber variant for landing alerts and warnings.

## Structural Zones

| Zone     | Background                | Treatment                                |
| -------- | ------------------------- | ---------------------------------------- |
| Header   | `bg-card` + `border-b`    | Elevated, `shadow-subtle`, HUD label nav |
| Hero     | `bg-horizon`              | Full-bleed horizon gradient, display H1  |
| Content  | `bg-background`           | Primary surface, cards float on it       |
| Alt sect | `bg-muted/30`             | Alternating band for rhythm              |
| Footer   | `bg-card` + `border-t`    | Branding strip, mono caption             |

## Spacing
8px base grid. Section padding `py-16 md:py-24`. Card padding `p-6`. HUD
clusters use `gap-2`/`gap-3`; menu cards use `gap-6`.

## Component Patterns
- **Menu cards** — 3-up grid, `bg-card`, hover lifts with `glow-instrument`.
- **Flight plan list** — level-select rows, mono index, amber lock for locked.
- **HUD overlay** — fixed corners, `hud-scanlines`, `hud-label`, `animate-hud-flicker`.
- **Buttons** — primary cyan, caution amber variant, verb-first labels.
- **Score readout** — large mono numerals, `glow-instrument` on landing score.

## Motion
- `horizon-pulse` — slow 4s opacity breath on hero horizon.
- `hud-flicker` — 6s CRT-style flicker on HUD overlays.
- `runway-strobe` — 1.4s strobe for runway lights and active CTA pulse.
- Entrance: `motion/react` `whileInView`, stagger `delay: i * 0.1`, alternate
  slide direction per section. Honor `prefers-reduced-motion`.

## Constraints
- Dark mode primary; light mode is the daytime-flight variant only.
- No raw Tailwind palette colors — only semantic tokens.
- No inline color/font styles — all via CSS variables and utilities.
- Two planes, three weather conditions only — no extra variants.

## Signature Detail
The horizon gradient (`bg-horizon`) behind the hero, paired with a JetBrains
Mono HUD cluster running `hud-flicker` and `hud-scanlines`. It reads as a real
cockpit glass panel, not a landing page.
