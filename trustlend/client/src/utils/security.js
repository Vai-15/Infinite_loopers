import { ethers } from "ethers";

const SAFE_TEXT_REGEX = /[^\w\s.,:;!?()"'-]/g;

export function sanitizeText(input) {
    return String(input || "")
        .replace(SAFE_TEXT_REGEX, "")
        .trim();
}

export function sanitizeNumericInput(input) {
    const cleaned = String(input ?? "").replace(/[^0-9.]/g, "");
    return cleaned === "" ? "0" : cleaned;
}

export function sanitizeIntegerInput(input) {
    const cleaned = String(input ?? "").replace(/[^0-9]/g, "");
    return cleaned === "" ? "0" : cleaned;
}

export function isValidEthAddress(address) {
    return ethers.utils.isAddress(address || "");
}

export function assertValidEthAddress(address, label = "Address") {
    if (!isValidEthAddress(address)) {
        throw new Error(`${label} is not a valid Ethereum address.`);
    }
}
