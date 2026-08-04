import axios from "axios";
import Cookies from "js-cookie";
import authConfig from "configs/auth";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api",
  timeout: 30000,
});

let isRedirectingToLogin = false;
let refreshRequest = null;

const clearSessionData = () => {
  Cookies.remove(authConfig.storageTokenKeyName);
  Cookies.remove(authConfig.storageRefreshTokenKeyName);
  Cookies.remove(authConfig.storageSessionIdKeyName);
  if (typeof window !== "undefined") {
    localStorage.removeItem(authConfig.storageUserKeyName);
  }
};

const shouldIgnore401Redirect = (url = "") => {
  return url.includes("/auth/login") || url.includes("/auth/refresh");
};

const redirectToExpiredLogin = () => {
  clearSessionData();

  if (typeof window !== "undefined" && !isRedirectingToLogin) {
    isRedirectingToLogin = true;
    const next = encodeURIComponent(window.location.pathname || "/");
    window.location.replace(`/login?expired=1&next=${next}`);
  }
};

const refreshAccessToken = async () => {
  if (refreshRequest) return refreshRequest;

  const refreshToken = Cookies.get(authConfig.storageRefreshTokenKeyName);
  const sessionId = Cookies.get(authConfig.storageSessionIdKeyName);
  let currentUser = null;
  try {
    currentUser = JSON.parse(localStorage.getItem(authConfig.storageUserKeyName) || "null");
  } catch (error) {
    currentUser = null;
  }
  const userId = currentUser?.user_id || currentUser?.id;

  if (!refreshToken || !sessionId || !userId) {
    throw new Error("No hay credenciales para renovar la sesion");
  }

  refreshRequest = axios.post(`${apiClient.defaults.baseURL}/auth/refresh`, {
    refreshToken,
    sessionId: Number(sessionId),
    userId: Number(userId),
  }).then((response) => {
    const data = response.data?.data;
    if (response.data?.code !== 1 || !data?.access_token || !data?.refresh_token) {
      throw new Error(response.data?.message || "No se pudo renovar la sesion");
    }

    Cookies.set(authConfig.storageTokenKeyName, data.access_token, { sameSite: "Lax", expires: 30 });
    Cookies.set(authConfig.storageRefreshTokenKeyName, data.refresh_token, { sameSite: "Lax", expires: 30 });
    Cookies.set(authConfig.storageSessionIdKeyName, String(data.session_id || sessionId), { sameSite: "Lax", expires: 30 });
    return data.access_token;
  }).finally(() => {
    refreshRequest = null;
  });

  return refreshRequest;
};

apiClient.interceptors.request.use((config) => {
  const token = Cookies.get(authConfig.storageTokenKeyName);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";
    const originalRequest = error?.config;

    if (status === 401 && !shouldIgnore401Redirect(url) && originalRequest && !originalRequest._sessionRetry) {
      originalRequest._sessionRetry = true;
      try {
        const accessToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        redirectToExpiredLogin();
        return Promise.reject(refreshError);
      }
    }

    if (status === 401 && !shouldIgnore401Redirect(url)) redirectToExpiredLogin();

    return Promise.reject(error);
  }
);

export const GetEndpoint = async (path, config = {}) => {
  const result = await apiClient.get(path, config);
  return result.data;
};

export const PostEndpoint = async (path, data, config = {}) => {
  const result = await apiClient.post(path, data, config);
  return result.data;
};

export const PutEndpoint = async (path, data, config = {}) => {
  const result = await apiClient.put(path, data, config);
  return result.data;
};

export const PatchEndpoint = async (path, data, config = {}) => {
  const result = await apiClient.patch(path, data, config);
  return result.data;
};

export const DeleteEndpoint = async (path, config = {}) => {
  const result = await apiClient.delete(path, config);
  return result.data;
};

export default apiClient;
