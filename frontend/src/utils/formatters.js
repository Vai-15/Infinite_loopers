import { STATUS_LABELS } from "./constants";

export function formatAddress(address) {
  if (!address) {
    return "-";
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatCurrency(value, currency = "USDC") {
  const amount = Number(value || 0);
  return `${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`;
}

export function formatStatus(status) {
  const key = String(status || "").toUpperCase();
  const label = STATUS_LABELS[key] || key || "Unknown";

  const colorMap = {
    PENDING: "text-amber-300",
    FUNDED_PENDING_ACTIVATION: "text-orange-300",
    ACTIVE: "text-sky-300",
    REPAYING: "text-cyan-300",
    COMPLETED: "text-emerald-300",
    DEFAULTED: "text-red-300"
  };

  return { label, color: colorMap[key] || "text-text" };
}

export function formatDate(isoDateString) {
  if (!isoDateString) {
    return "-";
  }
  return new Date(isoDateString).toLocaleString();
}
