import { getJwtToken } from "../utils/auth-cache";
import { resolveApiBaseAsync, fetchWithTimeout } from "@/utils/api";

export interface ChatResponse {
  success: boolean;
  response?: string;
  code?: string;
  message?: string;
}

export const aiService = {
  async chat(message: string): Promise<string> {
    try {
      const token = await getJwtToken();

      if (!token) {
        throw new Error(
          "No authentication token available. Please log in first.",
        );
      }

      console.log("[AI Service] Token obtained, sending request...");
      console.log(
        "[AI Service] Token preview:",
        token
          ? `${token.substring(0, 20)}...${token.substring(token.length - 10)}`
          : "null",
      );
      console.log("[AI Service] Token length:", token?.length);

      const apiBase = await resolveApiBaseAsync();
      const url = `${apiBase}/api/ai/chat`;

      console.log("[AI Service] Making request to:", url);
      console.log("[AI Service] Request headers:", {
        Authorization: `Bearer ${token ? "[token]" : "no-token"}`,
      });

      const response = await fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message }),
        },
        45000,
      );

      const data: ChatResponse = await response.json();
      console.log("🔥 FULL BACKEND RESPONSE:", data);
      console.log("[AI Service] Response received:", {
        success: data.success,
        hasResponse: !!data.response,
        code: data.code,
        status: response.status,
      });

      if (!response.ok) {
        console.error("[AI Service] HTTP error:", {
          status: response.status,
          statusText: response.statusText,
          message: data.message,
          code: data.code,
        });
        throw new Error(
          data.message || `HTTP ${response.status}: Failed to get AI response`,
        );
      }

      if (!data.success) {
        throw new Error(data.message || "Failed to get AI response");
      }

      return data.response || "No response";
    } catch (error) {
      console.error("AI Service Error:", error);
      throw error;
    }
  },
};
