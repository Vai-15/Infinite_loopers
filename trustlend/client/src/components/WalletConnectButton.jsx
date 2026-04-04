import { useNavigate } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";
import { formatAddress } from "../utils/formatters";

export default function WalletConnectButton({ navigateTo }) {
    const navigate = useNavigate();
    const { account, isConnected, connectWallet, disconnectWallet } = useWeb3();

    async function handleConnect() {
        try {
            await connectWallet();
            if (navigateTo) {
                navigate(navigateTo);
            }
        } catch (error) {
            alert(error.message || "Unable to connect wallet.");
        }
    }

    if (!isConnected) {
        return (
            <button
                onClick={handleConnect}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
                Connect Wallet
            </button>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <span className="rounded-xl border border-white/10 bg-card px-3 py-2 text-sm text-text">
                {formatAddress(account)}
            </span>
            <button
                onClick={disconnectWallet}
                className="rounded-xl border border-primary/50 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20"
            >
                Disconnect
            </button>
        </div>
    );
}
