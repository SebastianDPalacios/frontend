import axios from "axios";
import Cookies from "js-cookie";
import authConfig from "configs/auth";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api",
  timeout: 30000,
});

let isRedirectingToLogin = false;

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

apiClient.interceptors.request.use((config) => {
  const token = Cookies.get(authConfig.storageTokenKeyName);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";

    if (status === 401 && !shouldIgnore401Redirect(url)) {
      clearSessionData();

      if (typeof window !== "undefined" && !isRedirectingToLogin) {
        isRedirectingToLogin = true;
        const next = encodeURIComponent(window.location.pathname || "/");
        window.location.replace(`/login?expired=1&next=${next}`);
      }
    }

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
