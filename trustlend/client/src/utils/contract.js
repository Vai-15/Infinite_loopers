import { ethers } from "ethers";
import { CHAIN_CONFIGS, CONTRACT_ADDRESS, SUPPORTED_CHAIN_IDS } from "./constants";

let cachedAbi = null;

export function normalizeWeb3Error(error) {
    if (error?.code === 4001) {
        return {
            type: "wallet_rejected",
            message: "Transaction rejected in MetaMask."
        };
    }

    return {
        type: "contract_revert",
        message:
            error?.error?.message ||
            error?.reason ||
            error?.data?.message ||
            error?.message ||
            "Blockchain call failed."
    };
}

export async function withWeb3ErrorHandling(operation) {
    try {
        return await operation();
    } catch (error) {
        throw normalizeWeb3Error(error);
    }
}

async function loadContractAbi() {
    if (cachedAbi) {
        return cachedAbi;
    }

    const response = await fetch(`${process.env.PUBLIC_URL || ""}/abi/TrustLend.json`);
    if (!response.ok) {
        throw new Error("Unable to load TrustLend ABI from public/abi/TrustLend.json");
    }

    const artifact = await response.json();
    cachedAbi = artifact.abi || artifact;
    return cachedAbi;
}

export function getProvider() {
    if (!window.ethereum) {
        throw new Error("MetaMask is not available.");
    }

    return new ethers.providers.Web3Provider(window.ethereum, "any");
}

export async function ensureSupportedNetwork(provider) {
    const web3Provider = provider || getProvider();
    const network = await web3Provider.getNetwork();

    if (SUPPORTED_CHAIN_IDS.includes(network.chainId)) {
        return network.chainId;
    }

    const preferredChainId = process.env.REACT_APP_TARGET_CHAIN === "11155111" ? 11155111 : 31337;
    const target = CHAIN_CONFIGS[preferredChainId] || CHAIN_CONFIGS[SUPPORTED_CHAIN_IDS[0]];
    if (!target) {
        throw new Error("No supported chain configuration found.");
    }

    try {
        await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: target.chainId }]
        });
    } catch (switchError) {
        if (switchError.code === 4902) {
            const chainToAdd = {
                ...target,
                rpcUrls: (target.rpcUrls || []).filter(Boolean)
            };

            await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [chainToAdd]
            });
        } else {
            throw switchError;
        }
    }

    const refreshed = await web3Provider.getNetwork();
    if (!SUPPORTED_CHAIN_IDS.includes(refreshed.chainId)) {
        throw new Error("Unsupported chain selected.");
    }

    return refreshed.chainId;
}

export async function getSigner(provider) {
    const web3Provider = provider || getProvider();
    await ensureSupportedNetwork(web3Provider);
    return web3Provider.getSigner();
}

export async function getTrustLendContract(signer) {
    if (!CONTRACT_ADDRESS || /^0x0{40}$/i.test(CONTRACT_ADDRESS)) {
        throw new Error("Set REACT_APP_TRUSTLEND_CONTRACT to your deployed TrustLend address.");
    }

    const abi = await loadContractAbi();
    return new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
}

export async function getContract(provider) {
    const signer = await getSigner(provider);
    return getTrustLendContract(signer);
}
