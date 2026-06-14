import axios from "axios";

const getBaseURL = () => {
  let url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
  // If the user configured an API URL (e.g. localhost:5000) but forgot the /api suffix, append it automatically
  if (url && !url.endsWith("/api") && !url.endsWith("/api/")) {
    url = url.endsWith("/") ? `${url}api` : `${url}/api`;
  }
  return url;
};

const API = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
  timeout: 15000,
});

API.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const isDemo = localStorage.getItem("demoMode") === "true";
    if (isDemo) {
      const url = config.url || "";
      if (
        url.includes("/authority") ||
        url.includes("/issues") ||
        url.includes("/escalations") ||
        url.includes("/routes") ||
        url.includes("/auth")
      ) {
        console.log("DEMO MODE ACTIVE");
        console.log("API SKIPPED", url);
        throw new Error("DEMO_MODE_SKIP_REQUEST");
      }
    }

    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.message === "DEMO_MODE_SKIP_REQUEST") {
      return Promise.reject(error);
    }
    
    if (typeof window !== "undefined" && localStorage.getItem("demoMode") === "true") {
      return Promise.reject(error);
    }

    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const res = await axios.post(
          `${API.defaults.baseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const newAccessToken = res.data.accessToken;
        localStorage.setItem("accessToken", newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return API(originalRequest);
      } catch (refreshError) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("user");
          window.dispatchEvent(new Event("civicguard-auth"));
          
          if (window.location.pathname.startsWith("/authority")) {
            window.location.href = "/dashboard?expired=true";
          }
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default API;