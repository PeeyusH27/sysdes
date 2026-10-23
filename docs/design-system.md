# Design system

The look of the site is set by tokens in `src/app/globals.css`. Every stylesheet reads them, so changing a token re-themes every page.

## Principles

1. **Quiet by default.** Cards are flat sheets: a 1px border, no shadow, no gradient. Depth appears only on things that float (menus, drawers, the shorts deck).
2. **One highlighter.** `--hl` (marker yellow) marks the lines worth remembering: bold text in lessons, the one-line answer, the "say it in 30 seconds" card. It is used nowhere else, so it always means "remember this".
3. **A human voice.** Page and section titles use a soft serif (Fraunces, `--font-display`); body and UI stay in Geist. Eyebrows and labels are sentence case, not shouting capitals.
4. **Motion lives in the content.** Diagrams, widgets and illustrations animate. Cards and buttons do not lift, tilt or glow.

## Tokens

| Token | Light | Use |
| --- | --- | --- |
| `--bg` / `--card` / `--card-2` | warm paper, white-ish, deeper paper | page, sheets, wells and chips |
| `--border` / `--border-strong` | warm grey | hairlines, control edges |
| `--fg` / `--muted` | warm ink | text (both pass AA on every surface) |
| `--accent` | indigo `#4b3fd1` | primary action, DSA track |
| `--tone-sd` | teal `#0f766e` | System Design track |
| `--accent-2` | amber `#a5500a` | eyebrows, warm accents, Shorts |
| `--hl`, `--hl-soft` | marker yellow | highlights (see above) |
| `--k-*` | | what a box in a diagram is (client, service, database…) |
| `--radius` / `--radius-lg` | 12px / 16px | controls and cards / big containers |

Dark mode redefines the same tokens under `[data-theme=dark]` (warm near-black, not blue-grey).

## Components

- **Card** `.card`, `.card-link`: border only; a link darkens its edge in its track colour (`--tone`) on hover.
- **Button** `.btn`: quiet outline; `.btn-primary` is solid indigo. One primary per view; a secondary action is a `.link`.
- **Chips and tags** `.tag`, `.badge`, `.diff`, `.hub-jump a`: filled with a tint, no outline.
- **Callouts** `.callout`, `.tldr`, `.next-note`: a rule on the left in the note's colour, no box. `.tldr` and the 30-second card sit on the highlighter.
- **Section cards** `.sec-card`: a bordered sheet with a number pill; no side stripe.
- **Track colours**: DSA = `--tone-dsa`, System Design = `--tone-sd`, Shorts = `--accent-2`. Set `--tone` on a container and its children follow.

## Stylesheets

`globals.css` (tokens, base, content components), `reader.css` (lesson frame), `refresh.css` (reading rhythm, primers), `nav.css`, `home.css`, `hubs.css`, `dsa.css`, `shorts.css`, `story.css`, `prep.css`, `code.css`, `stage.css`.
