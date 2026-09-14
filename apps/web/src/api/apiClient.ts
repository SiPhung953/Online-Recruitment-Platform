import { client } from "../client/client.gen";
import { clearStoredSession } from "@/ui-shared/auth/AuthContext";
import { API_BASE_URL } from "./ApiBaseUrl";

// Configure client with baseURL, auth, and the mock adapter directly
client.setConfig({
  baseURL: API_BASE_URL,
  auth: () => localStorage.getItem("accessToken") ?? "",
});

// Global 401 Interceptor
// When the access token expires, any API response returning 401 will
// automatically clear the stored session and redirect to the login page.
// Auth endpoints (/auth/*) are excluded so that bad-credentials errors
// are still handled by the calling component.
// This could be dangerous, or not. I don't think 
// there's a case where the user "accidentally" trigger a 401
client.instance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url: string = error?.config?.url ?? "";

    // Only intercept 401s that are NOT from auth endpoints
    if (status === 401 && !url.includes("/auth/")) {
      clearStoredSession();
      window.location.href = "/login"; // Trigger a full page reload, remounting AuthProvider and re-reading storage.
    }

    return Promise.reject(error);
  }
);