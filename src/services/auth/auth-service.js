import Cookies from "js-cookie";
import { GetEndpoint, PostEndpoint } from "services/api/api-base";
import endpoints from "services/api";
import authConfig from "configs/auth";

const setSessionData = (data) => {
  Cookies.set(authConfig.storageTokenKeyName, data.access_token || "", { sameSite: "Lax" });
  Cookies.set(authConfig.storageRefreshTokenKeyName, data.refresh_token || "", { sameSite: "Lax" });
  Cookies.set(authConfig.storageSessionIdKeyName, String(data.session_id || ""), { sameSite: "Lax" });
  localStorage.setItem(authConfig.storageUserKeyName, JSON.stringify({
    ...(data.user || {}),
    roles: data.roles || [],
    permissions: data.permissions || [],
  }));
};

const clearSessionData = () => {
  Cookies.remove(authConfig.storageTokenKeyName);
  Cookies.remove(authConfig.storageRefreshTokenKeyName);
  Cookies.remove(authConfig.storageSessionIdKeyName);
  localStorage.removeItem(authConfig.storageUserKeyName);
};

const parseJwtPayload = (token) => {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) {
      return null;
    }

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = `${base64}${"=".repeat((4 - (base64.length % 4)) % 4)}`;
    const json = atob(padded);
    return JSON.parse(json);
  } catch (error) {
    return null;
  }
};

const isTokenExpired = (token) => {
  const payload = parseJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  return payload.exp <= now;
};

class AuthService {
  async login(identifier, password) {
    const response = await PostEndpoint(endpoints.auth.login, { identifier, password });
    if (response.code === 1 && response.data) {
      setSessionData(response.data);
    }
    return response;
  }

  async logout() {
    const sessionId = Cookies.get(authConfig.storageSessionIdKeyName);
    if (sessionId) {
      await PostEndpoint(endpoints.auth.logout, { sessionId: Number(sessionId) });
    }
    clearSessionData();
  }

  async changePassword(newPassword) {
    return PostEndpoint(endpoints.adminAuth.changePassword, {
      p_expected_current_hash: null,
      p_new_password_hash: newPassword,
      p_new_password_algo: "bcrypt",
      p_revoke_all_sessions: 0,
    });
  }

  async checkSession() {
    return GetEndpoint(endpoints.auth.session);
  }

  clearSession() {
    clearSessionData();
  }

  updateCurrentUser(values = {}) {
    const currentUser = this.getCurrentUser() || {};
    localStorage.setItem(authConfig.storageUserKeyName, JSON.stringify({ ...currentUser, ...values }));
  }

  getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem(authConfig.storageUserKeyName) || "null");
    } catch (error) {
      return null;
    }
  }

  isAuthenticated() {
    if (typeof window === "undefined") {
      return false;
    }

    const token = Cookies.get(authConfig.storageTokenKeyName);
    if (!token) {
      return false;
    }

    if (isTokenExpired(token)) {
      clearSessionData();
      return false;
    }

    return true;
  }
}

const authService = new AuthService();

export default authService;
