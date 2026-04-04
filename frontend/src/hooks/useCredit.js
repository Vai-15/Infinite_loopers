import { useCallback, useState } from "react";

import { api } from "@/services/api";

export function useCredit() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const scoreWallet = useCallback(async (walletAddress, features) => {
    try {
      setLoading(true);
      setError("");
      const response = await api.scoreCredit({ wallet_address: walletAddress, features });
      setData(response);
      return response;
    } catch (err) {
      const message = err?.response?.data?.detail || err?.message || "Unable to score wallet";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, scoreWallet };
}

export default useCredit;
