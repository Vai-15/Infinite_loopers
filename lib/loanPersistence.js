/**
 * Shared loan store — persists to localStorage so Borrower / Lender / Guarantor
 * (different tabs, wallets, or refreshes) all read the same queue.
 * Same-tab updates use React state; other tabs use `storage` + polling.
 */

export const LOANS_KEY = "lendwise_ai_loans_v1";
export const ROLE_KEY_PREFIX = "lendwise_ai_role_v1_";

/** EIP-55 or mixed-case → lowercase for stable matching with MetaMask */
export function normalizeAddr(addr) {
  if (!addr || typeof addr !== "string") return "";
  return addr.trim().toLowerCase();
}

/** Normalize a loan row after load or create */
export function normalizeLoan(row) {
  if (!row || typeof row !== "object") return row;
  return {
    ...row,
    borrower: normalizeAddr(row.borrower),
    lender: normalizeAddr(row.lender),
    guarantor: row.guarantor ? normalizeAddr(row.guarantor) : ""
  };
}

export function loadLoansFromStorage() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOANS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeLoan);
  } catch {
    return [];
  }
}

/** Write loans and notify other tabs (storage event only fires on *other* documents). */
export function saveLoansToStorage(loans) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOANS_KEY, JSON.stringify(loans));
  } catch (e) {
    console.warn("Lendwise: could not save loans", e);
  }
}

export function loadRoleForWallet(wallet) {
  if (typeof window === "undefined" || !wallet) return null;
  try {
    const raw = sessionStorage.getItem(ROLE_KEY_PREFIX + normalizeAddr(wallet));
    if (raw === "borrower" || raw === "lender" || raw === "guarantor") return raw;
  } catch {
    /* ignore */
  }
  return null;
}

export function saveRoleForWallet(wallet, role) {
  if (typeof window === "undefined" || !wallet) return;
  try {
    sessionStorage.setItem(ROLE_KEY_PREFIX + normalizeAddr(wallet), role || "");
  } catch {
    /* ignore */
  }
}
