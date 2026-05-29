import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { kv } from "@vercel/kv";

const CACHE_KEY = "leaderboard:current";
const LOCAL_CACHE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", ".local-cache");
const LOCAL_CACHE_FILE = join(LOCAL_CACHE_DIR, "leaderboard.json");

function kvConfigured() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function useLocalCache() {
  if (kvConfigured()) return false;
  if (process.env.USE_LOCAL_CACHE === "1") return true;
  if (process.env.VERCEL === "1") {
    return process.env.VERCEL_ENV === "development";
  }
  return true;
}

export async function getLeaderboard() {
  if (kvConfigured()) {
    return kv.get(CACHE_KEY);
  }
  if (useLocalCache()) {
    try {
      const raw = await readFile(LOCAL_CACHE_FILE, "utf8");
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  throw new Error(
    "@vercel/kv: Missing required environment variables KV_REST_API_URL and KV_REST_API_TOKEN"
  );
}

export async function setLeaderboard(data) {
  if (kvConfigured()) {
    await kv.set(CACHE_KEY, data);
    return;
  }
  if (useLocalCache()) {
    await mkdir(LOCAL_CACHE_DIR, { recursive: true });
    await writeFile(LOCAL_CACHE_FILE, JSON.stringify(data), "utf8");
    return;
  }
  throw new Error(
    "@vercel/kv: Missing required environment variables KV_REST_API_URL and KV_REST_API_TOKEN"
  );
}
