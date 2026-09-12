import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Offer Letter API methods
export const uploadOfferLetter = (internshipId, file) => {
  const formData = new FormData();
  formData.append('offer_letter', file);
  return api.post(`/internships/${internshipId}/offer-letter`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const getOfferLetter = (internshipId) => {
  return api.get(`/internships/${internshipId}/offer-letter`);
};

export const deleteOfferLetter = (internshipId) => {
  return api.delete(`/internships/${internshipId}/offer-letter`);
};

export default api;
