import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:8000/api/v1";

// Auth is carried entirely by the httpOnly `auth_token` cookie the backend
// sets on login (SameSite=None so it's sent on these cross-origin
// requests) - withCredentials makes axios send it automatically. There is
// deliberately no token kept in JS (localStorage or otherwise): an XSS
// payload elsewhere in the app can no longer read it, since it isn't
// anywhere JS can reach. See SECURITY_FINDINGS.md SEC-7.
export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      window.location.pathname !== "/login"
    ) {
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);
