import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import ProtectedRoute from "../lib/protectedRoute";

function NoSaleReasonAnalysis() {
  const [noSaleStats, setNoSaleStats] = useState([]);
  const [reasons, setReasons] = useState([]);
  const [agentFilter, setAgentFilter] = useState("");
  const [storeFilter, setStoreFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setStartDate(today);
    setEndDate(today);
    fetchNoSaleStats(today, today);
    fetchReasons();
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchNoSaleStats(startDate, endDate);
    }
  }, [startDate, endDate]);

  // ✅ Fetch No Sale Stats
  const fetchNoSaleStats = async (startDate, endDate) => {
    if (!startDate || !endDate) return;

    const { data, error } = await supabase.rpc("get_no_sale_stats", {
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error) {
      console.error("❌ Error fetching No Sale stats:", error);
    } else {
      console.log("✅ No Sale Stats Fetched:", data);
      setNoSaleStats(data);
    }
  };

  // ✅ Fetch Reasons Dynamically
  const fetchReasons = async () => {
    const { data, error } = await supabase.from("reasons").select("reason_text");

    if (error) {
      console.error("❌ Error fetching reasons:", error);
    } else {
      setReasons(data.map((r) => r.reason_text));
    }
  };

  return (
    <div className="stats-container">
      <h2>No Sale Reason Analysis</h2>

      {/* ✅ Filters Section */}
      <div className="filters">
        <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)}>
          <option value="">All Agents</option>
          {[...new Set(noSaleStats.map((stat) => stat.agent_name))].map((agent) => (
            <option key={agent} value={agent}>{agent}</option>
          ))}
        </select>

        <select value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)}>
          <option value="">All Stores</option>
          {[...new Set(noSaleStats.map((stat) => stat.store_number))].map((store) => (
            <option key={store} value={store}>Store {store}</option>
          ))}
        </select>

        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>

      {/* ✅ No Sale Reason Analysis Table */}
      <table className="stats-table">
        <thead>
          <tr>
            <th>Agent Name</th>
            <th>Store Number</th>
            {reasons.map((reason) => <th key={reason}>{reason}</th>)}
          </tr>
        </thead>
        <tbody>
          {noSaleStats.length > 0 ? (
            noSaleStats.map((stat) => (
              <tr key={stat.agent_name}>
                <td>{stat.agent_name}</td>
                <td>{stat.store_number}</td>
                {reasons.map((reason) => (
                  <td key={reason}>{stat[reason] || 0}</td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={2 + reasons.length} className="no-stats">No No-Sale stats available.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ProtectedRoute(NoSaleReasonAnalysis);
