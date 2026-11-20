// main.ts — GTA 6 clipper entry for make.fun (gta6-clipper-01).
//
// Renders a 22-second vertical Short from Rockstar's official GTA VI
// launch trailer: 14 seconds of the wildest action with a hook line on
// top, then an 8-second end card pitching make.fun.
//
// Pipeline (all ffmpeg, driven from Node):
//   1. cut three moments, blur-fill each one to 1080x1920 at 30 fps
//   2. stamp the hook text on the first four seconds
//   3. render the pitch card from a black frame plus text
//   4. join action + pitch with a full re-encode
//   5. copy VIDEO.json next to the finished clip
//
// Run it with:  mkdir -p out && node main.ts
// Needs Node 22 or newer and ffmpeg 8 on the PATH.

import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? ".";
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? "out";
const TRAILER_VIDEO = path.join(BOT_DIR, "footage", "trailer-video.mp4");
const TRAILER_AUDIO = path.join(BOT_DIR, "footage", "trailer-audio.m4a");
const FONT_FILE = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
const FINAL_NAME = "gta6-clipper-01-final-v2.mp4";

const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;
const PITCH_SECONDS = 8;

type Moment = { start: number; end: number; what: string };

// The three moments, in trailer order. Together they are exactly 14 s.
const MOMENTS: Moment[] = [
  { start: 46.0, end: 51.0, what: "police chase down Ocean Drive" },
  { start: 52.0, end: 55.5, what: "dirt bike flying, Jason fires, explosion" },
  { start: 69.0, end: 74.5, what: "night helicopter, scoped rifle, Lucia fires, pool jump" },
];

function mustExist(file: string, what: string): void {
  if (!fs.existsSync(file)) {
    throw new Error(`missing ${what}: ${file}`);
  }
}

function ffmpeg(args: string[], step: string): void {
  console.log(`\n[step: ${step}]`);
  execFileSync("ffmpeg", args, { stdio: "inherit" });
}

// One drawtext filter: bold text, centred, on a soft dark box.
function drawText(
  text: string,
  size: number,
  color: string,
  y: number,
  extra = "",
): string {
  return (
    `drawtext=fontfile=${FONT_FILE}` +
    `:text='${text}'` +
    `:fontsize=${size}` +
    `:fontcolor=${color}` +
    `:box=1:boxcolor=black@0.55:boxborderw=24` +
    `:x=(w-text_w)/2:y=${y}` +
    (extra ? `:${extra}` : "")
  );
}

// Filter graph for the 14 s action part: each moment is trimmed, then
// split into a blurred full-frame background and an aspect-fit
// foreground, overlaid centred. The hook text rides on the first cut
// for its first four seconds only.
function actionFilter(): string {
  const parts: string[] = [];
  const videoLabels: string[] = [];
  const audioLabels: string[] = [];

  MOMENTS.forEach((moment, i) => {
    parts.push(
      `[0:v]trim=start=${moment.start}:end=${moment.end},setpts=PTS-STARTPTS,split=2[bg${i}][fg${i}]`,
      `[bg${i}]scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}:${HEIGHT},gblur=sigma=40[bg${i}b]`,
      `[fg${i}]scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease[fg${i}s]`,
    );
    let chain =
      `[bg${i}b][fg${i}s]overlay=(W-w)/2:(H-h)/2,fps=${FPS},setsar=1`;
    if (i === 0) {
      chain += `,${drawText("GTA 6 IS HERE", 110, "white", 1420, "enable='lt(t,4)'")}`;
      chain += `,${drawText("OUT NOW ON PS5 AND XBOX", 56, "white", 1580, "enable='lt(t,4)'")}`;
    }
    parts.push(`${chain}[v${i}]`);
    parts.push(
      `[1:a]atrim=start=${moment.start}:end=${moment.end},asetpts=PTS-STARTPTS[a${i}]`,
    );
    videoLabels.push(`[v${i}]`);
    audioLabels.push(`[a${i}]`);
  });

  parts.push(`${videoLabels.join("")}concat=n=${MOMENTS.length}:v=1:a=0[vc]`);
  parts.push(`${audioLabels.join("")}concat=n=${MOMENTS.length}:v=0:a=1[ac]`);
  return parts.join(";");
}

// Filter graph for the 8 s pitch card: four centred lines on black.
// The "make.fun" line is big and yellow; the bounty URL stays at 56 pt
// because 72 pt runs off the frame.
function pitchFilter(): string {
  const lines = [
    drawText("Make clips like this with AI", 56, "white", 620),
    drawText("and earn money on make.fun", 56, "white", 720),
    drawText("make.fun", 120, "yellow", 860),
    drawText("make.fun/bounty/gta6-clipper-01", 56, "white", 1080),
  ];
  return `[0:v]setsar=1,${lines.join(",")}[v]`;
}

// Verify the finished clip: 1080x1920, 30 fps, ~22 s, video + audio.
// The program fails loudly here instead of silently handing over a
// broken render.
function verifyOutput(file: string): void {
  const raw = execFileSync(
    "ffprobe",
    [
      "-v", "error",
      "-show_entries", "stream=codec_type,width,height,r_frame_rate",
      "-show_entries", "format=duration",
      "-of", "json",
      file,
    ],
    { encoding: "utf8" },
  );
  const probe = JSON.parse(raw) as {
    streams: {
      codec_type: string;
      width?: number;
      height?: number;
      r_frame_rate?: string;
    }[];
    format: { duration: string };
  };
  const video = probe.streams.find((s) => s.codec_type === "video");
  const audio = probe.streams.find((s) => s.codec_type === "audio");
  const duration = Number(probe.format.duration);
  const problems: string[] = [];
  if (!video) problems.push("no video stream");
  if (!audio) problems.push("no audio stream");
  if (video && (video.width !== WIDTH || video.height !== HEIGHT)) {
    problems.push(
      `video is ${video.width}x${video.height}, want ${WIDTH}x${HEIGHT}`,
    );
  }
  if (video && video.r_frame_rate !== `${FPS}/1`) {
    problems.push(`video is ${video.r_frame_rate} fps, want ${FPS}`);
  }
  if (Math.abs(duration - (14 + PITCH_SECONDS)) > 0.5) {
    problems.push(`duration is ${duration.toFixed(2)} s, want ~22 s`);
  }
  if (problems.length > 0) {
    throw new Error(`output failed verification: ${problems.join("; ")}`);
  }
  console.log(
    `verified: ${WIDTH}x${HEIGHT}, ${FPS} fps, ${duration.toFixed(2)} s, video + audio`,
  );
}

function main(): void {
  mustExist(TRAILER_VIDEO, "trailer video");
  mustExist(TRAILER_AUDIO, "trailer audio");
  mustExist(FONT_FILE, "hook font");
  mustExist(path.join(BOT_DIR, "VIDEO.json"), "VIDEO.json");
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gta6-clipper-"));
  const actionFile = path.join(tmp, "action.mp4");
  const pitchFile = path.join(tmp, "pitch.mp4");
  const finalFile = path.join(OUTPUT_DIR, FINAL_NAME);

  try {
    // 1. Action: three moments, vertical blur-fill, hook on the first 4 s.
    ffmpeg(
      [
        "-y",
        "-i", TRAILER_VIDEO,
        "-i", TRAILER_AUDIO,
        "-filter_complex", actionFilter(),
        "-map", "[vc]",
        "-map", "[ac]",
        "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        "-pix_fmt", "yuv420p", "-r", String(FPS),
        "-c:a", "aac", "-b:a", "160k",
        "-movflags", "+faststart",
        actionFile,
      ],
      "action cut (14 s)",
    );

    // 2. Pitch card: 8 s of black with the make.fun call to action.
    ffmpeg(
      [
        "-y",
        "-f", "lavfi",
        "-i", `color=c=black:s=${WIDTH}x${HEIGHT}:r=${FPS}:d=${PITCH_SECONDS}`,
        "-f", "lavfi",
        "-i", "anullsrc=r=48000:cl=stereo",
        "-filter_complex", pitchFilter(),
        "-map", "[v]",
        "-map", "1:a",
        "-t", String(PITCH_SECONDS),
        "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        "-pix_fmt", "yuv420p", "-r", String(FPS),
        "-c:a", "aac", "-b:a", "160k",
        "-movflags", "+faststart",
        pitchFile,
      ],
      "pitch card (8 s)",
    );

    // 3. Join them: full re-encode, square pixels on both halves so the
    // concat filter never trips on an SAR mismatch.
    ffmpeg(
      [
        "-y",
        "-i", actionFile,
        "-i", pitchFile,
        "-filter_complex",
        "[0:v]setsar=1[v0];[1:v]setsar=1[v1];[v0][0:a][v1][1:a]concat=n=2:v=1:a=1[v][a]",
        "-map", "[v]",
        "-map", "[a]",
        "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        "-pix_fmt", "yuv420p", "-r", String(FPS),
        "-c:a", "aac", "-b:a", "160k",
        "-movflags", "+faststart",
        finalFile,
      ],
      "concat action + pitch",
    );

    // 3b. Check the finished clip before handing it over.
    verifyOutput(finalFile);

    // 4. VIDEO.json rides along to the output directory.
    fs.copyFileSync(
      path.join(BOT_DIR, "VIDEO.json"),
      path.join(OUTPUT_DIR, "VIDEO.json"),
    );

    const size = fs.statSync(finalFile).size;
    console.log(
      `\ndone: ${finalFile} (${size} bytes, 14 s action + 8 s pitch = 22 s)`,
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

main();
