import { useCallback, useEffect, useState } from "react";

import { api } from "@/services/api";

export function useTransactionHistory(limit = 50) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await api.getRecentEvents(limit);
      setEvents(data || []);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Unable to fetch events");
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { events, loading, error, refresh };
}

export default useTransactionHistory;
