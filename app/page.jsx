"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useLendwise } from "@/components/LendwiseProvider";

export default function LandingPage() {
  const { mounted, sessionChecked, hasMM, walletAddress, connectWallet, error } = useLendwise();
  const router = useRouter();

  useEffect(() => {
    if (mounted && sessionChecked && walletAddress) router.replace("/dashboard");
  }, [mounted, sessionChecked, walletAddress, router]);

  if (!mounted || !sessionChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Loading…
      </div>
    );
  }

  if (!hasMM) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
        <h1 className="text-3xl font-black text-white">Lendwise AI</h1>
        <p className="mt-4 text-slate-400">Install MetaMask (or another Web3 wallet) to use this application.</p>
        <a
          href="https://metamask.io/download/"
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-block rounded-xl bg-teal-600 px-6 py-3 font-semibold text-white"
        >
          Get a wallet
        </a>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <h1 className="text-center text-4xl font-black tracking-tight text-white md:text-5xl">Lendwise AI</h1>
      <p className="mt-4 max-w-md text-center text-slate-400">
        Borrow, lend, and guarantee on-chain — Polygon Amoy · MetaMask
      </p>
      <button
        type="button"
        onClick={connectWallet}
        className="mt-10 rounded-2xl bg-teal-500 px-10 py-4 text-lg font-bold text-slate-950 shadow-lg shadow-teal-500/25 transition hover:bg-teal-400"
      >
        Connect Wallet
      </button>
      {error && <p className="mt-4 text-center text-sm text-red-400">{error}</p>}
      <p className="mt-8 text-xs text-slate-600">
        <Link href="/dashboard" className="underline">
          Dashboard
        </Link>{" "}
        (after connect)
      </p>
    </main>
  );
}
