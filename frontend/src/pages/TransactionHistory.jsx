import { useMemo, useState } from "react";

import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { formatAddress, formatCurrency } from "@/utils/formatters";

const eventTypes = ["All", "LoanCreated", "LoanFunded", "LoanRepaid", "LoanDefaulted"];

export default function TransactionHistory() {
  const { events, loading, error } = useTransactionHistory(100);
  const [filter, setFilter] = useState("All");

  const visibleEvents = useMemo(() => {
    if (filter === "All") {
      return events;
    }
    return events.filter((event) => event.eventType === filter);
  }, [events, filter]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-4 flex justify-end">
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="rounded-xl border border-white/10 bg-dark px-4 py-2 text-sm text-text"
        >
          {eventTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}

      <section className="overflow-x-auto rounded-2xl border border-white/10 bg-card/80 p-4">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="text-text/70">
              <th className="py-2">Type</th>
              <th className="py-2">Loan ID</th>
              <th className="py-2">Amount</th>
              <th className="py-2">Address</th>
              <th className="py-2">Tx Hash</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="py-6 text-center text-text/60">
                  Loading events...
                </td>
              </tr>
            ) : visibleEvents.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-6 text-center text-text/60">
                  No events found.
                </td>
              </tr>
            ) : (
              visibleEvents.map((event) => (
                <tr key={event.id || event.txHash} className="border-t border-white/10 text-text/90">
                  <td className="py-3">{event.eventType}</td>
                  <td className="py-3">#{event.loanId}</td>
                  <td className="py-3">{formatCurrency(event.amount)}</td>
                  <td className="py-3">{formatAddress(event.address)}</td>
                  <td className="py-3">{String(event.txHash || "").slice(0, 10)}...</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
