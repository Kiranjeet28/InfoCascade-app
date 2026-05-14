/**
 * Lightweight Fetch-Based API Client
 * Replaces axios (60KB) with native fetch API (0KB overhead)
 *
 * Usage:
 *   import { get, post } from '@/utils/api-fetch'
 *   const data = await get('/endpoint')
 *   const result = await post('/endpoint', { body })
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const API_URL_STORAGE_KEY = "app_api_url_override";
const DEFAULT_TIMEOUT = 10000;

// ── Cache for API base URL to avoid async overhead ──────────────────────────
let cachedApiBase: string | null = null;

/**
 * Resolves the API base URL from multiple sources
 * Priority: AsyncStorage > Environment > Debugger > Fallback
 */
export async function resolveApiBase(): Promise<string> {
  // Try to get from cache first
  if (cachedApiBase) {
    return cachedApiBase;
  }

  // Priority 1: Runtime override in AsyncStorage
  try {
    const stored = await AsyncStorage.getItem(API_URL_STORAGE_KEY);
    if (stored) {
      cachedApiBase = stored.trim().replace(/\/$/, "");
      console.log("[API] Using stored API URL:", cachedApiBase);
      return cachedApiBase;
    }
  } catch (e) {
    console.warn("[API] Failed to get stored URL:", e);
  }

  // Priority 2: Environment variable
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim()) {
    cachedApiBase = envUrl.trim().replace(/\/$/, "");
    console.log("[API] Using environment API URL:", cachedApiBase);
    return cachedApiBase;
  }

  // Priority 3: Debugger host (Expo Go development)
  try {
    const manifest: any =
      (Constants as any).manifest || (Constants as any).manifest2;
    const dbg = manifest?.debuggerHost;
    if (dbg && typeof dbg === "string") {
      const host = dbg.split(":")[0];
      cachedApiBase = `http://${host}:5000`;
      console.log("[API] Using debugger host:", cachedApiBase);
      return cachedApiBase;
    }
  } catch (e) {
    console.warn("[API] Failed to detect debugger host:", e);
  }

  // Priority 4: Production fallback
  const fallback = "https://infocascade-backend.onrender.com";
  cachedApiBase = fallback;
  console.log("[API] Using production fallback URL:", fallback);
  return fallback;
}

/**
 * Set custom API URL at runtime (e.g., for APK deployment)
 */
export async function setApiUrl(url: string): Promise<void> {
  try {
    const cleanUrl = url.trim().replace(/\/$/, "");
    await AsyncStorage.setItem(API_URL_STORAGE_KEY, cleanUrl);
    cachedApiBase = cleanUrl; // Update cache
    console.log("[API] Custom API URL set:", cleanUrl);
  } catch (error) {
    console.error("[API] Failed to set API URL:", error);
    throw error;
  }
}

/**
 * Clear the stored API URL
 */
export async function clearStoredApiUrl(): Promise<void> {
  try {
    await AsyncStorage.removeItem(API_URL_STORAGE_KEY);
    cachedApiBase = null;
    console.log("[API] Stored API URL cleared");
  } catch (error) {
    console.error("[API] Failed to clear API URL:", error);
  }
}

// ── Request configuration interface ────────────────────────────────────────
interface RequestConfig {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  skipAuth?: boolean;
}

/**
 * Core fetch wrapper with timeout, auth, and error handling
 */
export async function fetchJson(
  url: string,
  config: RequestConfig = {},
): Promise<Response> {
  const baseUrl = await resolveApiBase();
  const fullUrl = url.startsWith("http") ? url : `${baseUrl}${url}`;

  // Setup abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    config.timeout || DEFAULT_TIMEOUT,
  );

  try {
    // Build headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...config.headers,
    };

    // Add auth token if available and not skipped
    if (!config.skipAuth) {
      try {
        const token = await AsyncStorage.getItem("auth_token");
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
      } catch (e) {
        console.warn("[API] Failed to get auth token:", e);
      }
    }

    // Make request
    const response = await fetch(fullUrl, {
      method: config.method || "GET",
      headers,
      body:
        config.body && config.method !== "GET"
          ? JSON.stringify(config.body)
          : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Log response status
    if (!response.ok) {
      console.warn(
        `[API] HTTP ${response.status}: ${response.statusText} (${fullUrl})`,
      );
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle abort/timeout
    if (error instanceof Error && error.name === "AbortError") {
      console.error("[API] Request timeout");
      throw new Error("Request timeout");
    }

    console.error("[API] Request failed:", error);
    throw error;
  }
}

/**
 * Fetch and parse JSON response
 */
export async function fetchJsonData<T>(
  url: string,
  config?: RequestConfig,
): Promise<T> {
  const response = await fetchJson(url, config);

  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
    (error as any).status = response.status;
    throw error;
  }

  try {
    return (await response.json()) as T;
  } catch (e) {
    console.error("[API] Failed to parse JSON response:", e);
    throw new Error("Invalid JSON response");
  }
}

/**
 * GET request
 */
export async function get<T = any>(
  url: string,
  config?: Omit<RequestConfig, "method">,
): Promise<T> {
  return fetchJsonData<T>(url, {
    ...config,
    method: "GET",
  });
}

/**
 * POST request
 */
export async function post<T = any>(
  url: string,
  body?: any,
  config?: Omit<RequestConfig, "method" | "body">,
): Promise<T> {
  return fetchJsonData<T>(url, {
    ...config,
    method: "POST",
    body,
  });
}

/**
 * PUT request
 */
export async function put<T = any>(
  url: string,
  body?: any,
  config?: Omit<RequestConfig, "method" | "body">,
): Promise<T> {
  return fetchJsonData<T>(url, {
    ...config,
    method: "PUT",
    body,
  });
}

/**
 * PATCH request
 */
export async function patch<T = any>(
  url: string,
  body?: any,
  config?: Omit<RequestConfig, "method" | "body">,
): Promise<T> {
  return fetchJsonData<T>(url, {
    ...config,
    method: "PATCH",
    body,
  });
}

/**
 * DELETE request
 */
export async function del<T = any>(
  url: string,
  config?: Omit<RequestConfig, "method">,
): Promise<T> {
  return fetchJsonData<T>(url, {
    ...config,
    method: "DELETE",
  });
}

/**
 * Raw fetch response (for streaming, blobs, etc.)
 */
export async function fetchRaw(
  url: string,
  config?: RequestConfig,
): Promise<Response> {
  return fetchJson(url, config);
}

// Size savings: ~60KB (axios) with zero added overhead (fetch is native)
