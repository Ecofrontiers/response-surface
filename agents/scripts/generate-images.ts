/**
 * generate-images.ts
 *
 * Generates agent avatar icons and disaster evidence photos via the Replicate API.
 * Uses flux-schnell for fast avatars and flux-dev for higher-quality evidence photos.
 *
 * Usage: npx tsx agents/scripts/generate-images.ts
 *
 * Prerequisites:
 *   - REPLICATE_API_TOKEN exported in env (from ~/.zshenv)
 *   - Directories web/public/images/agents/ and web/public/images/evidence/ exist
 */

import { writeFile, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;
if (!REPLICATE_TOKEN) {
  console.error("ERROR: REPLICATE_API_TOKEN is not set. Export it first.");
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..");
const AVATARS_DIR = join(ROOT, "web", "public", "images", "agents");
const EVIDENCE_DIR = join(ROOT, "web", "public", "images", "evidence");

const AVATAR_MODEL = "black-forest-labs/flux-schnell";
const EVIDENCE_MODEL = "black-forest-labs/flux-dev";

const POLL_INTERVAL_MS = 2_000;
const TIMEOUT_MS = 120_000; // 2 min per image (flux-dev can be slow)

const HEADERS = {
  Authorization: `Bearer ${REPLICATE_TOKEN}`,
  "Content-Type": "application/json",
  Prefer: "wait", // attempt synchronous if < 60s
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ImageSpec {
  id: string;
  prompt: string;
  model: string;
  outDir: string;
  filename: string;
  width: number;
  height: number;
}

// ---------------------------------------------------------------------------
// Image definitions
// ---------------------------------------------------------------------------

const avatarBase = (region: string, color: string, desc: string): string =>
  `Abstract geometric circular icon for ${region} bioregion, ${color} tones, dark background (#0f172a), minimalist op-art style, symmetrical, flat design, ${desc}, no text, no letters, no words`;

const avatarSpecs: ImageSpec[] = [
  {
    id: "pacific",
    prompt: avatarBase("Pacific Coast", "orange (#f97316)", "abstract waves interweaving with fire patterns, Pacific coast feel"),
    model: AVATAR_MODEL,
    outDir: AVATARS_DIR,
    filename: "pacific.webp",
    width: 512,
    height: 512,
  },
  {
    id: "mountain",
    prompt: avatarBase("Mountain West", "red (#ef4444)", "angular mountain peaks, rocky geometric formations, sharp edges"),
    model: AVATAR_MODEL,
    outDir: AVATARS_DIR,
    filename: "mountain.webp",
    width: 512,
    height: 512,
  },
  {
    id: "central",
    prompt: avatarBase("Central Plains", "amber (#f59e0b)", "sweeping plains with tornado spiral pattern, warm amber gradients"),
    model: AVATAR_MODEL,
    outDir: AVATARS_DIR,
    filename: "central.webp",
    width: 512,
    height: 512,
  },
  {
    id: "lakes",
    prompt: avatarBase("Great Lakes", "blue (#3b82f6)", "concentric water ripple patterns, Great Lakes inspired, cool blue tones"),
    model: AVATAR_MODEL,
    outDir: AVATARS_DIR,
    filename: "lakes.webp",
    width: 512,
    height: 512,
  },
  {
    id: "delta",
    prompt: avatarBase("Mississippi Delta", "cyan (#06b6d4)", "branching river delta fractal pattern, teal and cyan flowing lines"),
    model: AVATAR_MODEL,
    outDir: AVATARS_DIR,
    filename: "delta.webp",
    width: 512,
    height: 512,
  },
  {
    id: "gulf",
    prompt: avatarBase("Gulf Coast", "purple and violet (#8b5cf6)", "hurricane spiral fibonacci pattern, deep violet gradients"),
    model: AVATAR_MODEL,
    outDir: AVATARS_DIR,
    filename: "gulf.webp",
    width: 512,
    height: 512,
  },
  {
    id: "atlantic",
    prompt: avatarBase("Atlantic Seaboard", "emerald green (#10b981)", "ocean wave tessellation pattern, emerald and sea green"),
    model: AVATAR_MODEL,
    outDir: AVATARS_DIR,
    filename: "atlantic.webp",
    width: 512,
    height: 512,
  },
  {
    id: "coordinator",
    prompt: avatarBase("Coordinator Hub", "gold (#f59e0b)", "central network node with radiating connections, hub-and-spoke pattern, golden"),
    model: AVATAR_MODEL,
    outDir: AVATARS_DIR,
    filename: "coordinator.webp",
    width: 512,
    height: 512,
  },
];

const evidenceBase = (scenario: string): string =>
  `Photojournalistic disaster photo, ${scenario}, taken with smartphone camera, natural lighting, realistic, documentary style, high detail`;

const evidenceSpecs: ImageSpec[] = [
  {
    id: "wildfire_01",
    prompt: evidenceBase("active wildfire burning through California pine forest at dusk, massive orange smoke plume rising into darkening sky, fire trucks visible on a dirt road in foreground"),
    model: EVIDENCE_MODEL,
    outDir: EVIDENCE_DIR,
    filename: "wildfire_01.webp",
    width: 1024,
    height: 768,
  },
  {
    id: "wildfire_02",
    prompt: evidenceBase("aftermath of wildfire, charred blackened tree trunks standing in ashen landscape, a red fire engine and firefighters in the background surveying damage"),
    model: EVIDENCE_MODEL,
    outDir: EVIDENCE_DIR,
    filename: "wildfire_02.webp",
    width: 1024,
    height: 768,
  },
  {
    id: "flood_01",
    prompt: evidenceBase("flooded residential street in Louisiana suburb, brown muddy floodwater reaching car rooftops, rescue boat with volunteers navigating between houses"),
    model: EVIDENCE_MODEL,
    outDir: EVIDENCE_DIR,
    filename: "flood_01.webp",
    width: 1024,
    height: 768,
  },
  {
    id: "flood_02",
    prompt: evidenceBase("swollen river overflowing its banks, partially submerged concrete bridge, brown rushing water carrying debris, elevated perspective showing scale of flooding"),
    model: EVIDENCE_MODEL,
    outDir: EVIDENCE_DIR,
    filename: "flood_02.webp",
    width: 1024,
    height: 768,
  },
  {
    id: "storm_01",
    prompt: evidenceBase("severe storm damage in suburban neighborhood, large uprooted tree fallen onto roof of house, dark ominous sky, power lines down, emergency crew with chainsaws working"),
    model: EVIDENCE_MODEL,
    outDir: EVIDENCE_DIR,
    filename: "storm_01.webp",
    width: 1024,
    height: 768,
  },
  {
    id: "storm_02",
    prompt: evidenceBase("hurricane aftermath along coastal town, destroyed wooden buildings and scattered debris across road, damaged boats tossed inland, National Guard vehicles arriving"),
    model: EVIDENCE_MODEL,
    outDir: EVIDENCE_DIR,
    filename: "storm_02.webp",
    width: 1024,
    height: 768,
  },
];

// ---------------------------------------------------------------------------
// Replicate API helpers
// ---------------------------------------------------------------------------

async function createPrediction(spec: ImageSpec, retries = 3): Promise<string> {
  const url = `https://api.replicate.com/v1/models/${spec.model}/predictions`;
  const body: Record<string, unknown> = {
    input: {
      prompt: spec.prompt,
      width: spec.width,
      height: spec.height,
      num_outputs: 1,
      output_format: "webp",
      output_quality: 90,
    },
  };

  // flux-dev supports num_inference_steps
  if (spec.model.includes("flux-dev")) {
    (body.input as Record<string, unknown>).num_inference_steps = 28;
    (body.input as Record<string, unknown>).guidance_scale = 3.5;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(body),
  });

  // Handle rate limiting with retry + backoff
  if (res.status === 429 && retries > 0) {
    const retryAfter = parseInt(res.headers.get("retry-after") || "8", 10);
    const waitMs = (retryAfter + 2) * 1000; // add 2s buffer
    console.log(`    -> rate limited, waiting ${waitMs / 1000}s then retrying (${retries} left)...`);
    await sleep(waitMs);
    return createPrediction(spec, retries - 1);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Replicate create failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as Record<string, unknown>;

  // If the Prefer: wait header worked, it might already be done
  if (data.status === "succeeded" && Array.isArray(data.output) && data.output.length > 0) {
    return data.output[0] as string;
  }

  // Otherwise, poll
  const predictionUrl = (data.urls as Record<string, string>)?.get;
  if (!predictionUrl) {
    throw new Error(`No prediction URL returned: ${JSON.stringify(data)}`);
  }

  return pollPrediction(predictionUrl);
}

async function pollPrediction(url: string): Promise<string> {
  const start = Date.now();

  while (Date.now() - start < TIMEOUT_MS) {
    await sleep(POLL_INTERVAL_MS);

    const res = await fetch(url, { headers: { Authorization: `Bearer ${REPLICATE_TOKEN}` } });
    if (!res.ok) {
      throw new Error(`Poll failed (${res.status}): ${await res.text()}`);
    }

    const data = (await res.json()) as Record<string, unknown>;
    const status = data.status as string;

    if (status === "succeeded") {
      const output = data.output as string[];
      if (output && output.length > 0) return output[0];
      throw new Error(`Succeeded but no output: ${JSON.stringify(data)}`);
    }

    if (status === "failed" || status === "canceled") {
      throw new Error(`Prediction ${status}: ${(data.error as string) || JSON.stringify(data)}`);
    }

    // still processing — loop
  }

  throw new Error(`Prediction timed out after ${TIMEOUT_MS / 1000}s`);
}

async function downloadImage(imageUrl: string, outPath: string): Promise<void> {
  const res = await fetch(imageUrl);
  if (!res.ok) {
    throw new Error(`Download failed (${res.status}): ${imageUrl}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  await writeFile(outPath, buffer);
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function generateImage(spec: ImageSpec): Promise<void> {
  const outPath = join(spec.outDir, spec.filename);

  if (await fileExists(outPath)) {
    console.log(`  SKIP ${spec.id} — already exists at ${outPath}`);
    return;
  }

  console.log(`  GENERATE ${spec.id} (${spec.model})...`);
  const startTime = Date.now();

  const imageUrl = await createPrediction(spec);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`    -> prediction done in ${elapsed}s, downloading...`);

  await downloadImage(imageUrl, outPath);
  console.log(`    -> saved ${outPath}`);
}

async function main(): Promise<void> {
  console.log("=== Response Surface Image Generator ===\n");
  console.log(`Avatars dir:  ${AVATARS_DIR}`);
  console.log(`Evidence dir: ${EVIDENCE_DIR}`);
  console.log();

  // --- Avatars (batch 4 at a time to stay under rate limit burst) ---
  console.log(`--- Generating ${avatarSpecs.length} agent avatars (flux-schnell) ---`);
  const AVATAR_CONCURRENCY = 4;
  let avatarOk = 0;
  for (let i = 0; i < avatarSpecs.length; i += AVATAR_CONCURRENCY) {
    const batch = avatarSpecs.slice(i, i + AVATAR_CONCURRENCY);
    const results = await Promise.allSettled(batch.map((spec) => generateImage(spec)));
    for (const [j, r] of results.entries()) {
      if (r.status === "fulfilled") {
        avatarOk++;
      } else {
        console.error(`  FAILED ${batch[j].id}: ${(r.reason as Error).message}`);
      }
    }
    // small pause between batches to avoid burst limit
    if (i + AVATAR_CONCURRENCY < avatarSpecs.length) {
      await sleep(3000);
    }
  }
  console.log(`\nAvatars: ${avatarOk}/${avatarSpecs.length} succeeded\n`);

  // --- Evidence photos (run 2 at a time to avoid rate limits on flux-dev) ---
  console.log(`--- Generating ${evidenceSpecs.length} evidence photos (flux-dev) ---`);
  const CONCURRENCY = 2;
  let evidenceOk = 0;
  let evidenceFailed = 0;

  for (let i = 0; i < evidenceSpecs.length; i += CONCURRENCY) {
    const batch = evidenceSpecs.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(batch.map((spec) => generateImage(spec)));
    for (const [j, r] of results.entries()) {
      if (r.status === "fulfilled") {
        evidenceOk++;
      } else {
        evidenceFailed++;
        console.error(`  FAILED ${batch[j].id}: ${(r.reason as Error).message}`);
      }
    }
  }

  console.log(`\nEvidence: ${evidenceOk}/${evidenceSpecs.length} succeeded\n`);

  // --- Summary ---
  const totalOk = avatarOk + evidenceOk;
  const total = avatarSpecs.length + evidenceSpecs.length;
  console.log(`=== Done: ${totalOk}/${total} images generated ===`);

  if (totalOk < total) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
