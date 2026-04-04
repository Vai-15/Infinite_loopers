import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  timeout: 15000,
  headers: { "Content-Type": "application/json" }
});

export const api = {
  health: async () => (await apiClient.get("/health")).data,

  listLoans: async (params = {}) => (await apiClient.get("/api/v1/loans/", { params })).data,
  getLoan: async (loanId) => (await apiClient.get(`/api/v1/loans/${loanId}`)).data,
  createLoan: async (payload) => (await apiClient.post("/api/v1/loans/", payload)).data,
  fundLoan: async (loanId, payload) => (await apiClient.post(`/api/v1/loans/${loanId}/fund`, payload)).data,
  repayLoan: async (loanId, payload) => (await apiClient.post(`/api/v1/loans/${loanId}/repay`, payload)).data,
  markDefault: async (loanId) => (await apiClient.post(`/api/v1/loans/${loanId}/default`)).data,
  saveLoanMetadata: async (loanId, payload) =>
    (await apiClient.post(`/api/v1/loans/${loanId}/metadata`, payload)).data,
  getLoanMetadata: async (loanId) => (await apiClient.get(`/api/v1/loans/${loanId}/metadata`)).data,

  registerUser: async (payload) => (await apiClient.post("/api/v1/users/register", payload)).data,
  getUser: async (wallet) => (await apiClient.get(`/api/v1/users/${wallet}`)).data,

  scoreCredit: async (payload) => (await apiClient.post("/api/v1/credit/score", payload)).data,

  getVouches: async (borrowerWallet) =>
    (await apiClient.get(`/api/v1/community/vouch/${borrowerWallet}`)).data,
  addVouch: async (payload) => (await apiClient.post("/api/v1/community/vouch", payload)).data,

  getAnalyticsOverview: async () => (await apiClient.get("/api/v1/analytics/overview")).data,
  getAnalyticsVolume: async (days = 30) =>
    (await apiClient.get("/api/v1/analytics/volume", { params: { days } })).data,
  getAnalyticsDashboard: async () => (await apiClient.get("/api/v1/analytics/dashboard")).data,
  getTopBorrowers: async () => (await apiClient.get("/api/v1/analytics/topBorrowers")).data,
  getTopLenders: async () => (await apiClient.get("/api/v1/analytics/topLenders")).data,
  getRecentEvents: async (limit = 10) =>
    (await apiClient.get("/api/v1/analytics/recent-events", { params: { limit } })).data
};

export default apiClient;
