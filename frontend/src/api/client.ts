import axios from "axios";
import type { AxiosInstance, AxiosError } from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const api: AxiosInstance = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: string }>) => {
    const message =
      (error.response?.data && typeof error.response?.data === "object"
        ? (error.response.data.detail as string | undefined)
        : undefined) ||
      error.message ||
      "An unexpected error occurred";
    return Promise.reject(new Error(message));
  },
);

export default api;
