import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Extracts a user-facing message from a caught error, preferring an axios
 * error's `response.data.detail` (the FastAPI convention this app's
 * backend uses), then the error's own `message`, then a caller-supplied
 * fallback. Safe to call on an `unknown` catch-clause value. */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object') {
    const withResponse = error as { response?: { data?: { detail?: string } }; message?: string };
    if (typeof withResponse.response?.data?.detail === 'string') {
      return withResponse.response.data.detail;
    }
    if (typeof withResponse.message === 'string') {
      return withResponse.message;
    }
  }
  return fallback;
}
