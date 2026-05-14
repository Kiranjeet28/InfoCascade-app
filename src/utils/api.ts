import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

const API_URL_STORAGE_KEY = "app_api_url_override";

/**
 * Stores a custom API URL in AsyncStorage (runtime configuration)
 * This allows changing the API URL without rebuilding the APK
 *
 * @param url - The API base URL to store
 */
export async function setApiUrl(url: string): Promise<void> {
  try {
    const cleanUrl = url.trim().replace(/\/$/, "");
    await AsyncStorage.setItem(API_URL_STORAGE_KEY, cleanUrl);
    console.log("[API] Custom API URL set:", cleanUrl);
  } catch (error) {
    console.error("[API] Failed to set custom API URL:", error);
  }
}

/**
 * Retrieves the custom API URL from AsyncStorage if available
 */
export async function getStoredApiUrl(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(API_URL_STORAGE_KEY);
  } catch (error) {
    console.error("[API] Failed to get stored API URL:", error);
    return null;
  }
}

/**
 * Clears the stored API URL from AsyncStorage
 */
export async function clearStoredApiUrl(): Promise<void> {
  try {
    await AsyncStorage.removeItem(API_URL_STORAGE_KEY);
    console.log("[API] Stored API URL cleared");
  } catch (error) {
    console.error("[API] Failed to clear stored API URL:", error);
  }
}

/**
 * Resolves the API base URL from multiple sources with priority:
 * 1. Runtime override stored in AsyncStorage (allows changes without APK rebuild)
 * 2. Environment variable EXPO_PUBLIC_API_URL (.env files)
 * 3. Development debugger host detection (Expo Go)
 * 4. Platform-specific defaults for local development
 *
 * Works across all platforms: Web, Android APK, iOS, Expo Go
 *
 * IMPORTANT: For APK deployments, use setApiUrl() to change the backend URL
 * at runtime without rebuilding the APK.
 */
export function resolveApiBase(): string {
  // Priority 1: Check for runtime override in AsyncStorage
  // This is async but we handle it in a synchronous function by checking a cache
  // For async resolution, use resolveApiBaseAsync() instead

  // Priority 2: Explicit environment variable (from .env, .env.production, etc.)
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim()) {
    console.log("[API] Using environment URL:", envUrl.trim());
    return envUrl.trim().replace(/\/$/, "");
  }

  console.warn(
    "[API] No EXPO_PUBLIC_API_URL found in environment, using fallback",
  );

  // Priority 3: Development mode - detect debugger host (Expo Go)
  const manifest: any =
    (Constants as any).manifest || (Constants as any).manifest2;
  const dbg = manifest && manifest.debuggerHost;
  if (dbg && typeof dbg === "string") {
    const host = dbg.split(":")[0];
    console.log("[API] Using debugger host:", host);
    return `http://${host}:5000`;
  }

  // Priority 4: Production fallback
  const productionUrl = "https://infocascade-backend.onrender.com";
  console.log("[API] Using production fallback:", productionUrl);
  return productionUrl;
}

/**
 * Async version of resolveApiBase that checks AsyncStorage override first
 * Use this when you need to fetch the most current API URL including runtime overrides
 */
export async function resolveApiBaseAsync(): Promise<string> {
  // Priority 1: Runtime override stored in AsyncStorage
  const storedUrl = await getStoredApiUrl();
  if (storedUrl) {
    console.log("[API] Using stored override URL:", storedUrl);
    return storedUrl;
  }

  // Falls back to synchronous resolution
  return resolveApiBase();
}

export function fetchWithTimeout(
  input: RequestInfo,
  init: RequestInit = {},
  timeoutMs = 10000,
) {
  const controller = new AbortController();
  let timeoutTriggered = false;

  const timeoutId = setTimeout(() => {
    timeoutTriggered = true;
    controller.abort();
    console.warn("[API] Request timeout after", timeoutMs, "ms for:", input);
  }, timeoutMs);

  return fetch(input, { ...init, signal: controller.signal })
    .then((response) => {
      clearTimeout(timeoutId);
      return response;
    })
    .catch((error) => {
      clearTimeout(timeoutId);
      // Provide better error message for timeout vs other abort scenarios
      if (error.name === "AbortError" && timeoutTriggered) {
        const timeoutError = new Error(`Request timeout after ${timeoutMs}ms`);
        timeoutError.name = "TimeoutError";
        console.error("[API] Request timeout:", timeoutError.message);
        throw timeoutError;
      }
      console.error("[API] Fetch error:", error);
      throw error;
    });
}

export async function postJson(path: string, body: any, timeoutMs = 12000) {
  try {
    const base = resolveApiBase().replace(/\/$/, "");
    const pathWithSlash = path.startsWith("/") ? path : `/${path}`;
    const url = `${base}${pathWithSlash}`;

    console.log("[API] POST request to:", url);

    const res = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      timeoutMs,
    );

    console.log("[API] POST response status:", res.status);
    return res;
  } catch (error) {
    console.error("[API] Error in postJson:", error);
    throw error;
  }
}

/** POST with AsyncStorage API URL override applied. */
export async function postJsonAsync(
  path: string,
  body: any,
  timeoutMs = 12000,
) {
  try {
    const base = (await resolveApiBaseAsync()).replace(/\/$/, "");
    const pathWithSlash = path.startsWith("/") ? path : `/${path}`;
    const url = `${base}${pathWithSlash}`;

    console.log("[API] POST request (async base) to:", url);

    const res = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      timeoutMs,
    );

    console.log("[API] POST response status:", res.status);
    return res;
  } catch (error) {
    console.error("[API] Error in postJsonAsync:", error);
    throw error;
  }
}

export async function fetchJson(
  path: string,
  init: RequestInit = {},
  timeoutMs = 12000,
) {
  try {
    const base = resolveApiBase().replace(/\/$/, "");
    const pathWithSlash = path.startsWith("/") ? path : `/${path}`;
    const url = `${base}${pathWithSlash}`;

    console.log("[API] GET request to:", url);

    const res = await fetchWithTimeout(url, init, timeoutMs);

    console.log("[API] GET response status:", res.status);
    return res;
  } catch (error) {
    console.error("[API] Error in fetchJson:", error);
    throw error;
  }
}

/** GET with AsyncStorage API URL override applied (use for auth and any call that must respect runtime base URL). */
export async function fetchJsonAsync(
  path: string,
  init: RequestInit = {},
  timeoutMs = 12000,
) {
  try {
    const base = (await resolveApiBaseAsync()).replace(/\/$/, "");
    const pathWithSlash = path.startsWith("/") ? path : `/${path}`;
    const url = `${base}${pathWithSlash}`;

    console.log("[API] GET request (async base) to:", url);

    const res = await fetchWithTimeout(url, init, timeoutMs);

    console.log("[API] GET response status:", res.status);
    return res;
  } catch (error) {
    console.error("[API] Error in fetchJsonAsync:", error);
    throw error;
  }
}

export default {
  resolveApiBase,
  fetchWithTimeout,
  postJson,
  postJsonAsync,
  fetchJson,
};
