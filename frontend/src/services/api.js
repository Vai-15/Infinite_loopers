import axios from "axios";
import toast from "react-hot-toast";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  timeout: 30000,
  headers: { "Content-Type": "application/json" }
});

apiClient.interceptors.response.use(
  (r) => r,
  (err) => {
    const msg =
      err?.response?.data?.detail ||
      (Array.isArray(err?.response?.data?.detail) ? err.response.data.detail.map((d) => d.msg).join(", ") : null) ||
      err?.message ||
      "Request failed";
    if (err?.response?.status >= 400) {
      toast.error(typeof msg === "string" ? msg : "Request failed");
    }
    return Promise.reject(err);
  }
);

export async function getLoans(filters = {}) {
  return (await apiClient.get("/api/v1/loans/", { params: filters })).data;
}

export async function createLoan(payload) {
  return (await apiClient.post("/api/v1/loans/", payload)).data;
}

export async function fundLoanApi(loanId, lenderWallet) {
  return (await apiClient.post(`/api/v1/loans/${loanId}/fund`, { lender_wallet: lenderWallet })).data;
}

export async function activateLoanApi(loanId) {
  return (await apiClient.post(`/api/v1/loans/${loanId}/activate`)).data;
}

export async function repayLoanApi(loanId, amountUsdc, txHash) {
  return (await apiClient.post(`/api/v1/loans/${loanId}/repay`, { amount_usdc: amountUsdc, tx_hash: txHash })).data;
}

export async function defaultLoanApi(loanId) {
  return (await apiClient.post(`/api/v1/loans/${loanId}/default`)).data;
}

export async function getCreditScore(wallet, extra = {}) {
  return (await apiClient.post("/api/v1/credit/score", { wallet_address: wallet, ...extra })).data;
}

export async function registerUser(wallet, did) {
  return (await apiClient.post("/api/v1/users/register", { wallet_address: wallet, did })).data;
}

export async function getUser(wallet) {
  return (await apiClient.get(`/api/v1/users/${wallet}`)).data;
}

export async function getUserHistory(wallet) {
  return (await apiClient.get(`/api/v1/users/${wallet}/history`)).data;
}

export async function getVouches(wallet) {
  return (await apiClient.get(`/api/v1/community/vouches/${wallet}`)).data;
}

export async function postVouch(payload) {
  return (await apiClient.post("/api/v1/community/vouch/detailed", payload)).data;
}

export async function getPoolStats() {
  return (await apiClient.get("/api/v1/community/pool/stats")).data;
}

export async function getAnalyticsSummary() {
  return (await apiClient.get("/api/v1/analytics/summary")).data;
}

export async function getAnalyticsVolume(days = 30) {
  return (await apiClient.get("/api/v1/analytics/volume", { params: { days } })).data;
}

export async function getAnalyticsDistribution() {
  return (await apiClient.get("/api/v1/analytics/distribution")).data;
}

export async function getAnalyticsFeed(limit = 10) {
  return (await apiClient.get("/api/v1/analytics/feed", { params: { limit } })).data;
}

export const api = {
  health: async () => (await apiClient.get("/health")).data,

  listLoans: getLoans,
  getLoan: async (loanId) => (await apiClient.get(`/api/v1/loans/${loanId}`)).data,
  createLoan,
  fundLoan: fundLoanApi,
  activateLoan: activateLoanApi,
  repayLoan: repayLoanApi,
  markDefault: defaultLoanApi,
  saveLoanMetadata: async (loanId, payload) =>
    (await apiClient.post(`/api/v1/loans/${loanId}/metadata`, payload)).data,
  getLoanMetadata: async (loanId) => (await apiClient.get(`/api/v1/loans/${loanId}/metadata`)).data,

  registerUser,
  getUser,
  getUserHistory,

  scoreCredit: async (payload) => (await apiClient.post("/api/v1/credit/score", payload)).data,

  getVouches: async (borrowerWallet) =>
    (await apiClient.get(`/api/v1/community/vouch/${borrowerWallet}`)).data,
  getVouchesDetailed: getVouches,
  addVouch: async (payload) => (await apiClient.post("/api/v1/community/vouch", payload)).data,
  postVouchDetailed: postVouch,
  getPoolStats,

  getAnalyticsOverview: async () => (await apiClient.get("/api/v1/analytics/overview")).data,
  getAnalyticsVolume,
  getAnalyticsDashboard: async () => (await apiClient.get("/api/v1/analytics/dashboard")).data,
  getTopBorrowers: async () => (await apiClient.get("/api/v1/analytics/topBorrowers")).data,
  getTopLenders: async () => (await apiClient.get("/api/v1/analytics/topLenders")).data,
  getRecentEvents: async (limit = 10) =>
    (await apiClient.get("/api/v1/analytics/recent-events", { params: { limit } })).data,
  getAnalyticsSummary,
  getAnalyticsDistribution,
  getAnalyticsFeed
};

export default apiClient;
