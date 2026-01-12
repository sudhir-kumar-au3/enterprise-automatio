// API Configuration
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001/api/v1";

export const config = {
  apiBaseUrl: API_BASE_URL,
  tokenKey: "auth_token",
  refreshTokenKey: "refresh_token",
  userKey: "current_user",
};

export default config;
