import { useCallback, useEffect, useState } from "react";

import { api } from "@/services/api";

export function useAnalytics() {
  const [overview, setOverview] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [volume, setVolume] = useState([]);
  const [topBorrowers, setTopBorrowers] = useState([]);
  const [topLenders, setTopLenders] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [overviewData, dashboardData, volumeData, borrowersData, lendersData, eventsData] =
        await Promise.all([
          api.getAnalyticsOverview(),
          api.getAnalyticsDashboard(),
          api.getAnalyticsVolume(30),
          api.getTopBorrowers(),
          api.getTopLenders(),
          api.getAnalyticsFeed(10)
        ]);

      setOverview(overviewData);
      setDashboard(dashboardData);
      const rawVol = Array.isArray(volumeData) ? volumeData : volumeData?.points || [];
      setVolume(
        rawVol.map((p) => ({
          date: p.date || p.day,
          volume_usdc: p.volume_usdc ?? p.volumeEth ?? 0
        }))
      );
      setTopBorrowers(borrowersData || []);
      setTopLenders(lendersData || []);
      setEvents(eventsData || []);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Unable to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const feed = await api.getAnalyticsFeed(10);
        setEvents(feed || []);
      } catch {
        /* ignore */
      }
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return {
    overview,
    dashboard,
    volume,
    topBorrowers,
    topLenders,
    events,
    loading,
    error,
    refresh
  };
}

export default useAnalytics;
