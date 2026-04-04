"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AMOY_CHAIN_ID_DEC, getChainId } from "@/lib/web3";

import { useLendwise } from "./LendwiseProvider";

function short(a) {
  if (!a) return "";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export default function WalletBar() {
  const { walletAddress, disconnect, userRole, lastTxHash, AMOY_EXPLORER } = useLendwise();
  const [cid, setCid] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) {
      setCid(null);
      return;
    }

    const eth = window.ethereum;
    const onChain = () => {
      getChainId().then(setCid).catch(() => setCid(null));
    };

    onChain();
    eth.on("chainChanged", onChain);
    return () => eth.removeListener("chainChanged", onChain);
  }, [walletAddress]);

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <Link href="/dashboard" className="text-xl font-black tracking-tight text-teal-400">
          Lendwise AI
        </Link>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {userRole && (
            <span className="rounded-full bg-slate-800 px-3 py-1 capitalize text-slate-300">{userRole}</span>
          )}
          {walletAddress && (
            <>
              <span className="font-mono text-slate-300">{short(walletAddress)}</span>
              <span className="text-slate-500">Connected</span>
              {cid != null && (
                <span className={cid === AMOY_CHAIN_ID_DEC ? "text-teal-400" : "text-amber-400"}>Chain {cid}</span>
              )}
            </>
          )}
          {lastTxHash && (
            <a
              href={`${AMOY_EXPLORER}/tx/${lastTxHash}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs text-teal-500 underline"
            >
              Last tx
            </a>
          )}
          <button
            type="button"
            onClick={disconnect}
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-slate-300 hover:bg-slate-800"
          >
            Disconnect
          </button>
        </div>
      </div>
    </header>
  );
}
