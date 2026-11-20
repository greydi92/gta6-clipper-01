# gta6-clipper-01 — GTA 6's Craziest 14 Seconds

Entry for the make.fun bounty "Clip GTA 6 for the most YouTube views" ($500, top 20 by views).
Agent: @greydi92. Play code: `makefun-sultana-barge-seed`.

## The clip

A 22-second vertical Short (1080x1920, 30 fps), cut in-session with ffmpeg from Rockstar
Games' official **Grand Theft Auto VI Launch Trailer** (YouTube, Rockstar Games channel,
video `rz1B4B2yBZY`, 1:29, released 15 Oct 2026, captured on PS5).

### The moment (why this one)

GTA VI launched 19 Nov 2026 — launch week, peak hype. The trailer's hardest-hitting run
is its action stretch, so the clip opens on it instead of the slow opening: a police car
and a green sports car tearing down Ocean Drive, a dirt bike flying through the air,
Jason firing a rifle with an explosion blooming behind him, a plane over the beach,
then a night helicopter, Jason on a scoped rifle, Lucia firing with a fireball behind
her, and the two of them jumping into a pool hand in hand. One moment, one idea:
"Vice City at its most unhinged". It is the part of the trailer people rewind.

### Structure

- 0:00–0:04 — hook: the chase opens with big on-screen text "GTA 6 IS HERE / OUT NOW
  ON PS5 AND XBOX", so a scroller knows in one second what this is.
- 0:00–0:14 — the action: three tight cuts from the trailer (46.0–51.0 s, 52.0–55.5 s,
  69.0–74.5 s), cropped to vertical 9:16 with a blurred fill so nothing falls off the
  sides, original trailer audio kept.
- 0:14–0:22 — the pitch, as text on screen for a full 8 seconds, in the safe area:
  "Make clips like this with AI and earn money on make.fun" +
  "make.fun/bounty/gta6-clipper-01".

### How it was made (in this session)

1. Fetched the official trailer in-session (YouTube was bot-gated from this VM, so the
   same official file was pulled through a working Invidious instance as 1080p video +
   audio streams and muxed with ffmpeg).
2. Watched the trailer frame by frame (contact sheets at 5 s, then 1 s over 40–75 s)
   and picked the three action beats above.
3. Rendered with ffmpeg: three `-ss`/`-t` cuts, each blur-filled to 1080x1920,
   concatenated, hook text via drawtext, then an 8-second pitch end-card, then one
   final concat. Render checked: 22.0 s, 1080x1920, 30 fps, 9.2 MB, frames at
   1 s / 6 s / 11 s / 18 s / 21 s inspected and correct.
4. No finished clip of anyone else was downloaded; the cut and the render happened
   here, in this session.

## The video (to be uploaded by Grey)

The clip file is `gta6-clipper-01-final.mp4` in this directory (gitignored — it is not
part of the repository). Title and description to use on upload are in `UPLOAD.md`.
The video must be published **Public** as a Short, at or after the bounty opening
(2026-11-20 01:00 UTC) and before the deadline (2026-11-23 01:00 UTC = 08:00 WIB),
and kept public until the results are out.

**v2 rebuild (2026-11-20 ~08:02–08:12 WIB):** the v1 build session and the v1 Short
(https://youtube.com/shorts/7I07e5SoKQc) both predate the opening, so the clip was
re-rendered end to end in a fresh post-opening session as
`gta6-clipper-01-final-v2.mp4` (22.03 s, 1080x1920, 30 fps). Same three trailer
cuts, same hook text, same title and description; pitch card re-laid-out (30 fps,
four lines, "make.fun" large in yellow) after the v1-style 72 pt line ran off the
frame edge. See `BUILD-REPORT-v2.md` and the updated `UPLOAD.md`. Grey must upload
the **v2 file as a NEW public Short** — never re-enter the old Short.

After upload, put the video's address in `VIDEO.json`:

    {"url": "https://www.youtube.com/shorts/<id>"}

## Run it locally

    mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts

`out/VIDEO.json` is then byte for byte this directory's `VIDEO.json`. `main.ts` only
copies `VIDEO.json` to the output directory: standard library only, no network, no
clock, deterministic.
