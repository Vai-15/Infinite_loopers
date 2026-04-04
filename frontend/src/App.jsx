import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Navbar from "@/components/Navbar";
import { useContract } from "@/hooks/useContract";
import Analytics from "@/pages/Analytics";
import BorrowerDashboard from "@/pages/BorrowerDashboard";
import Landing from "@/pages/Landing";
import LenderDashboard from "@/pages/LenderDashboard";
import LoanApply from "@/pages/LoanApply";
import Marketplace from "@/pages/Marketplace";
import Profile from "@/pages/Profile";
import Dispute from "@/pages/Dispute";
import TransactionHistory from "@/pages/TransactionHistory";
import { ROUTES } from "@/utils/constants";

function ProtectedRoute({ children }) {
  const { isConnected } = useContract();
  if (!isConnected) {
    return <Navigate to={ROUTES.landing} replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-100 font-body text-slate-900 dark:bg-dark dark:text-text">
        <Navbar />
        <Routes>
          <Route path={ROUTES.landing} element={<Landing />} />
          <Route path={ROUTES.marketplace} element={<Marketplace />} />
          <Route path={ROUTES.borrow} element={<Navigate to={ROUTES.dashboard} replace />} />
          <Route
            path={ROUTES.dashboard}
            element={
              <ProtectedRoute>
                <BorrowerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.lend}
            element={
              <ProtectedRoute>
                <LenderDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.apply}
            element={
              <ProtectedRoute>
                <LoanApply />
              </ProtectedRoute>
            }
          />
          <Route path={ROUTES.analytics} element={<Analytics />} />
          <Route
            path={ROUTES.dispute}
            element={
              <ProtectedRoute>
                <Dispute />
              </ProtectedRoute>
            }
          />
          <Route path={ROUTES.profile} element={<Profile />} />
          <Route path={ROUTES.history} element={<TransactionHistory />} />
          <Route path="*" element={<Navigate to={ROUTES.landing} replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
