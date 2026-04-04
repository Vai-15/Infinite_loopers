"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import BorrowerDashboard from "@/components/borrower/BorrowerDashboard";
import GuarantorDashboard from "@/components/guarantor/GuarantorDashboard";
import LenderDashboard from "@/components/lender/LenderDashboard";
import { useLendwise } from "@/components/LendwiseProvider";
import RoleSelect from "@/components/RoleSelect";
import WalletBar from "@/components/WalletBar";

export default function DashboardPage() {
  const { mounted, sessionChecked, loansHydrated, walletAddress, userRole } = useLendwise();
  const router = useRouter();

  useEffect(() => {
    if (mounted && sessionChecked && !walletAddress) router.replace("/");
  }, [mounted, sessionChecked, walletAddress, router]);

  if (!mounted || !sessionChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Loading…
      </div>
    );
  }

  if (!walletAddress) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Redirecting…
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <WalletBar />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="text-sm text-slate-500 hover:text-teal-400">
            ← Home
          </Link>
          {loansHydrated && (
            <p className="text-xs text-slate-500">
              Requests sync across tabs & refresh (localStorage, auto-refresh ~2.5s)
            </p>
          )}
        </div>
        {!userRole && <RoleSelect />}
        {userRole === "borrower" && <BorrowerDashboard />}
        {userRole === "lender" && <LenderDashboard />}
        {userRole === "guarantor" && <GuarantorDashboard />}
      </div>
    </div>
  );
}
