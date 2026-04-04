import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: {
        "Content-Type": "application/json"
    }
});

export async function fetchCreditScore(address) {
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

export async function submitLoanMetadata(data) {
    const response = await api.post("/api/loans/metadata", data);
    return response.data;
}

export default api;
