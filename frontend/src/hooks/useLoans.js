import { useCallback, useEffect, useState } from "react";

import { api } from "@/services/api";

export function useLoans(filters = {}) {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await api.listLoans(filters);
      setLoans(data);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Failed to fetch loans");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { loans, loading, error, refresh };
}

export default useLoans;
