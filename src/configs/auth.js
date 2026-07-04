const API = process.env.NEXT_PUBLIC_API_URL || "/api";

const authConfig = {
  storageTokenKeyName: "accessToken",
  storageRefreshTokenKeyName: "refreshToken",
  storageSessionIdKeyName: "sessionId",
  storageUserKeyName: "user",
  loginEndpoint: `${API}/auth/login`,
  refreshEndpoint: `${API}/auth/refresh`,
  logoutEndpoint: `${API}/auth/logout`,
};

export default authConfig;
