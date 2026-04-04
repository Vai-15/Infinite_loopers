import axios from "axios";
import { sanitizeText, assertValidEthAddress } from "./security";

const BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: {
        "Content-Type": "application/json"
    }
});

export async function fetchCreditScore(address) {
    assertValidEthAddress(address, "Wallet address");
    const response = await api.get(`/api/score/${address}`);
    return response.data;
}

export async function fetchAnalytics() {
    const response = await api.get("/api/analytics/overview");
    return response.data;
}

export async function fetchVolumeChart(days = 30) {
    const response = await api.get(`/api/analytics/volume?days=${Number(days) || 30}`);
    return response.data;
}

export async function fetchDashboardAnalytics() {
    const response = await api.get("/api/analytics/dashboard");
    return response.data;
}

export async function fetchTopBorrowers() {
    const response = await api.get("/api/analytics/topBorrowers");
    return response.data;
}

export async function fetchTopLenders() {
    const response = await api.get("/api/analytics/topLenders");
    return response.data;
}

export async function fetchRecentEvents(limit = 10) {
    const response = await api.get(`/api/analytics/recent-events?limit=${Number(limit) || 10}`);
    return response.data;
}

export async function submitLoanMetadata(data) {
    const sanitized = {
        loanId: Number(data.loanId),
        description: sanitizeText(data.description),
        purpose: sanitizeText(data.purpose),
        ipfsHash: data.ipfsHash ? sanitizeText(data.ipfsHash) : undefined
    };
    const response = await api.post("/api/loans/metadata", sanitized);
    return response.data;
}

export default api;
