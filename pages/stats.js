import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import ProtectedRoute from "../lib/protectedRoute";

function StatsPage() {
  const [stats, setStats] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredStats, setFilteredStats] = useState([]);
  const [agentFilter, setAgentFilter] = useState("");
  const [storeFilter, setStoreFilter] = useState("");
  const [dateRange, setDateRange] = useState("today"); // Default to Today
  const [sortColumn, setSortColumn] = useState("total_sales");
  const [sortOrder, setSortOrder] = useState("desc");

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  // ✅ Helper Function to Get Date Range
  const getDateRange = () => {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0)).toISOString().split("T")[0];

    if (dateRange === "today") return { startDate: startOfToday, endDate: startOfToday };
    if (dateRange === "yesterday") {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const startOfYesterday = yesterday.toISOString().split("T")[0];
      return { startDate: startOfYesterday, endDate: startOfYesterday };
    }
    if (dateRange === "last30") {
      const last30Days = new Date(today);
      last30Days.setDate(today.getDate() - 30);
      const startOfLast30 = last30Days.toISOString().split("T")[0];
      return { startDate: startOfLast30, endDate: startOfToday };
    }
    return { startDate: "2000-01-01", endDate: startOfToday }; // Historical (All-time)
  };

  // ✅ Fetch Stats from Supabase
  const fetchStats = async () => {
    const { startDate, endDate } = getDateRange();
    console.log(`🔍 Fetching stats for range: ${startDate} to ${endDate}`);

    const { data, error } = await supabase.rpc("get_sales_stats", {
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error) {
      console.error("❌ Error fetching stats:", error);
    } else {
      console.log("✅ Sales Stats Fetched:", data);
      setStats(data);
      setFilteredStats(data);
    }
  };

  // ✅ Handle Filters & Sorting
  useEffect(() => {
    let filtered = stats;

    if (searchQuery.trim()) {
      const lowercasedQuery = searchQuery.toLowerCase();
      filtered = filtered.filter((stat) =>
        stat.name?.toLowerCase().includes(lowercasedQuery) ||
        stat.email.toLowerCase().includes(lowercasedQuery)
      );
    }

    if (agentFilter) {
      filtered = filtered.filter((stat) => stat.email === agentFilter);
    }

    if (storeFilter) {
      filtered = filtered.filter((stat) => stat.store_number.toString() === storeFilter);
    }

    // ✅ Sorting
    filtered.sort((a, b) => {
      if (sortOrder === "asc") {
        return a[sortColumn] > b[sortColumn] ? 1 : -1;
      } else {
        return a[sortColumn] < b[sortColumn] ? 1 : -1;
      }
    });

    setFilteredStats(filtered);
  }, [searchQuery, agentFilter, storeFilter, sortColumn, sortOrder, stats]);

  // ✅ Get unique values for dropdown filters
  const uniqueAgents = [...new Set(stats.map((stat) => stat.email))];
  const uniqueStores = [...new Set(stats.map((stat) => stat.store_number))];

  return (
    <div className="stats-container">
      <h2>Sales & Performance Stats</h2>

      {/* ✅ Filters Section */}
      <div className="filters">
        <input
          type="text"
          placeholder="Search agent..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-bar"
        />

        <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)}>
          <option value="">All Agents</option>
          {uniqueAgents.map((agent) => (
            <option key={agent} value={agent}>
              {agent}
            </option>
          ))}
        </select>

        <select value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)}>
          <option value="">All Stores</option>
          {uniqueStores.map((store) => (
            <option key={store} value={store}>
              Store {store}
            </option>
          ))}
        </select>

        <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="last30">Last 30 Days</option>
          <option value="historical">All-Time</option>
        </select>
      </div>

      {/* ✅ Stats Table */}
      <table className="stats-table">
        <thead>
          <tr>
            <th onClick={() => setSortColumn("name")}>
              Name {sortColumn === "name" ? (sortOrder === "asc" ? "⬆" : "⬇") : ""}
            </th>
            <th onClick={() => setSortColumn("ups_count")}>
              # of UPS {sortColumn === "ups_count" ? (sortOrder === "asc" ? "⬆" : "⬇") : ""}
            </th>
            <th onClick={() => setSortColumn("sale_count")}>
              # of Sales {sortColumn === "sale_count" ? (sortOrder === "asc" ? "⬆" : "⬇") : ""}
            </th>
            <th onClick={() => setSortColumn("total_sales")}>
              Total Sales {sortColumn === "total_sales" ? (sortOrder === "asc" ? "⬆" : "⬇") : ""}
            </th>
            <th onClick={() => setSortColumn("close_rate")}>
              Close Rate {sortColumn === "close_rate" ? (sortOrder === "asc" ? "⬆" : "⬇") : ""}
            </th>
            <th onClick={() => setSortColumn("avg_sale")}>
              Average Sales {sortColumn === "avg_sale" ? (sortOrder === "asc" ? "⬆" : "⬇") : ""}
            </th>
          </tr>
        </thead>
        <tbody>
          {filteredStats.length > 0 ? (
            filteredStats.map((stat) => (
              <tr key={stat.email}>
                <td>{stat.name}</td>
                <td>{stat.ups_count}</td>
                <td>{stat.sale_count}</td>
                <td>${stat.total_sales.toFixed(2)}</td>
                <td>{stat.close_rate.toFixed(2)}%</td>
                <td>${stat.avg_sale.toFixed(2)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" className="no-stats">No stats available.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ProtectedRoute(StatsPage); // ✅ Protect the Stats Page
