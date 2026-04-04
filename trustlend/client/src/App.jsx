import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import { useWeb3 } from "./context/Web3Context";
import BorrowerDashboard from "./pages/BorrowerDashboard";
import Landing from "./pages/Landing";
import LenderDashboard from "./pages/LenderDashboard";
import Marketplace from "./pages/Marketplace";
import TransactionHistory from "./pages/TransactionHistory";

function ProtectedRoute({ children }) {
    const { isConnected } = useWeb3();
    if (!isConnected) {
        return <Navigate to="/" replace />;
    }

    return children;
}

export default function App() {
    return (
        <BrowserRouter>
            <div className="min-h-screen bg-dark font-body text-text">
                <Navbar />
                <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/marketplace" element={<Marketplace />} />
                    <Route
                        path="/borrow"
                        element={
                            <ProtectedRoute>
                                <BorrowerDashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/lend"
                        element={
                            <ProtectedRoute>
                                <LenderDashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="/history" element={<TransactionHistory />} />
                </Routes>
            </div>
        </BrowserRouter>
    );
}
