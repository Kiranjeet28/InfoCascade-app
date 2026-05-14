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

      const apiBase = await resolveApiBaseAsync();
      const url = `${apiBase}/api/ai/chat`;

      console.log("[AI Service] Making request to:", url);

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
        12000,
      );

      const data: ChatResponse = await response.json();

      console.log("[AI Service] Response received:", {
        success: data.success,
        hasResponse: !!data.response,
        code: data.code,
      });

      if (!response.ok) {
        console.error("[AI Service] HTTP error:", {
          status: response.status,
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
