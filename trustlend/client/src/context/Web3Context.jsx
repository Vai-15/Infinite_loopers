import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getProvider, getTrustLendContract, withWeb3ErrorHandling } from "../utils/contract";

const Web3Context = createContext(null);

export function Web3Provider({ children }) {
    const [account, setAccount] = useState("");
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [contract, setContract] = useState(null);
    const [trustScore, setTrustScore] = useState(0);
    const [isConnected, setIsConnected] = useState(false);

    const refreshTrustScore = useCallback(
        async (activeAccount, activeContract) => {
            if (!activeAccount || !activeContract) {
                setTrustScore(0);
                return;
            }

            try {
                const score = await activeContract.getTrustScore(activeAccount);
                setTrustScore(Number(score));
            } catch (error) {
                console.error("Unable to fetch trust score:", error);
            }
        },
        []
    );

    const disconnectWallet = useCallback(() => {
        setAccount("");
        setProvider(null);
        setSigner(null);
        setContract(null);
        setTrustScore(0);
        setIsConnected(false);
    }, []);

    const connectWallet = useCallback(async () => {
        return withWeb3ErrorHandling(async () => {
            if (!window.ethereum) {
                throw new Error("MetaMask is required to connect wallet.");
            }

            const web3Provider = getProvider();
            const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });

            if (!accounts || accounts.length === 0) {
                disconnectWallet();
                return null;
            }

            const walletSigner = await web3Provider.getSigner();
            const trustLendContract = await getTrustLendContract(walletSigner);

            setProvider(web3Provider);
            setSigner(walletSigner);
            setContract(trustLendContract);
            setAccount(accounts[0]);
            setIsConnected(true);

            await refreshTrustScore(accounts[0], trustLendContract);

            return {
                account: accounts[0],
                provider: web3Provider,
                signer: walletSigner,
                contract: trustLendContract
            };
        });
    }, [disconnectWallet, refreshTrustScore]);

    useEffect(() => {
        async function reconnectWallet() {
            if (!window.ethereum) {
                return;
            }

            try {
                const accounts = await window.ethereum.request({ method: "eth_accounts" });
                if (accounts && accounts.length > 0) {
                    await connectWallet();
                }
            } catch (error) {
                console.error("Auto reconnect failed:", error);
            }
        }

        reconnectWallet();
    }, [connectWallet]);

    useEffect(() => {
        if (!window.ethereum) {
            return undefined;
        }

        const handleAccountsChanged = async (accounts) => {
            if (!accounts || accounts.length === 0) {
                disconnectWallet();
                return;
            }

            try {
                await connectWallet();
            } catch (error) {
                console.error("Account update failed:", error);
            }
        };

        const handleChainChanged = () => {
            window.location.reload();
        };

        window.ethereum.on("accountsChanged", handleAccountsChanged);
        window.ethereum.on("chainChanged", handleChainChanged);

        return () => {
            window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
            window.ethereum.removeListener("chainChanged", handleChainChanged);
        };
    }, [connectWallet, disconnectWallet]);

    const value = useMemo(
        () => ({
            account,
            provider,
            signer,
            contract,
            trustScore,
            isConnected,
            connectWallet,
            disconnectWallet,
            refreshTrustScore
        }),
        [
            account,
            provider,
            signer,
            contract,
            trustScore,
            isConnected,
            connectWallet,
            disconnectWallet,
            refreshTrustScore
        ]
    );

    return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}

export function useWeb3() {
    const context = useContext(Web3Context);
    if (!context) {
        throw new Error("useWeb3 must be used within Web3Provider");
    }

    return context;
}
