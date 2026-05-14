// API URL is configured via EXPO_PUBLIC_API_URL in .env
// Default to production backend if env var not set
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://infocascade-backend.onrender.com";
