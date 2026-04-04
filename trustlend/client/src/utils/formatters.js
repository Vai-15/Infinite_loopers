import { ethers } from "ethers";
import { LOAN_STATUS } from "./constants";

export function formatAddress(address) {
    if (!address) {
        return "-";
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatEth(value, maximumFractionDigits = 4) {
    if (value === undefined || value === null) {
        return "0 ETH";
    }

    const normalized =
        typeof value === "string" || typeof value === "number"
            ? Number(value)
            : Number(ethers.utils.formatEther(value));

    return `${normalized.toLocaleString(undefined, {
        maximumFractionDigits
    })} ETH`;
}

export function toWei(amount) {
    return ethers.utils.parseEther(amount.toString());
}

export function formatDate(timestampSeconds) {
    if (!timestampSeconds || Number(timestampSeconds) === 0) {
        return "-";
    }
    const date = new Date(Number(timestampSeconds) * 1000);
    return date.toLocaleDateString(undefined, {
        month: "short",
        day: "2-digit",
        year: "numeric"
    });
}

export function formatDaysLeft(startTime, durationSeconds) {
    if (!startTime || Number(startTime) === 0) {
        return "-";
    }

    const due = Number(startTime) + Number(durationSeconds);
    const now = Math.floor(Date.now() / 1000);
    const delta = due - now;

    if (delta <= 0) {
        return "Overdue";
    }

    return `${Math.ceil(delta / 86400)} days left`;
}

export function formatStatus(statusEnum) {
    const status = Number(statusEnum);
    const label = LOAN_STATUS[status] || "Unknown";
    const colorMap = {
        0: "text-emerald-300",
        1: "text-sky-300",
        2: "text-emerald-300",
        3: "text-red-300"
    };

    return {
        label,
        color: colorMap[status] || "text-text"
    };
}

export const daysRemaining = formatDaysLeft;
export const getStatusLabel = (status) => formatStatus(status).label;
