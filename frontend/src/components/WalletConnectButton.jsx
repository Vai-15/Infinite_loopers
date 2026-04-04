import { formatAddress } from "@/utils/formatters";

export default function WalletConnectButton({ connectWallet, disconnectWallet, account, isConnected, isConnecting }) {
  if (!isConnected) {
    return (
      <button
        type="button"
        onClick={connectWallet}
        disabled={isConnecting}
        className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="rounded-xl border border-white/10 bg-card px-3 py-2 text-sm text-text">
        {formatAddress(account)}
      </span>
      <button
        type="button"
        onClick={disconnectWallet}
        className="rounded-xl border border-primary/50 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20"
      >
        Disconnect
      </button>
    </div>
  );
}
