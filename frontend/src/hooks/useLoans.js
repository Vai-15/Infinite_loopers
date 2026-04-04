import { useCallback, useEffect, useState } from "react";

import { getLoans } from "@/services/api";

export function useLoans(filters = {}, refreshMs = null, skip = false) {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const key = JSON.stringify(filters);

  const refresh = useCallback(async () => {
    if (skip) return;
    try {
      setLoading(true);
      setError("");
      const f = JSON.parse(key);
      const data = await getLoans(f);
      setLoans(data);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Failed to fetch loans");
    } finally {
      setLoading(false);
    }
  }, [key, skip]);

  useEffect(() => {
    if (!skip) refresh();
  }, [refresh, skip]);

  useEffect(() => {
    if (!refreshMs || skip) return undefined;
    const id = setInterval(() => {
      refresh();
    }, refreshMs);
    return () => clearInterval(id);
  }, [refresh, refreshMs, skip]);

  return { loans, loading, error, refresh };
}

export default useLoans;
