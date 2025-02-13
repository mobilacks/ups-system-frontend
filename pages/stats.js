import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import ProtectedRoute from "../lib/protectedRoute";

function StatsPage() {
  const [stats, setStats] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredStats, setFilteredStats] = useState([]);
  const [agentFilter, setAgentFilter] = useState("");
  const [storeFilter, setStoreFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortColumn, setSortColumn] = useState("total_sales");
  const [sortOrder, setSortOrder] = useState("desc");

  useEffect(() => {
    fetchStats();
  }, []);

  // ✅ Fetch Stats from Supabase
  const fetchStats = async () => {
    const { data, error } = await supabase.rpc("get_sales_stats");

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
    console.log("📅 Selected Start Date:", startDate);
    console.log("📅 Selected End Date:", endDate);

    let filtered = stats;

    if (startDate && endDate) {
      console.log("🛠 Filtering stats by date range...");

      filtered = filtered.filter((stat) => {
        const saleDate = new Date(stat.sale_date);
        return saleDate >= new Date(startDate) && saleDate <= new Date(endDate);
      });

      console.log("✅ Filtered Data:", filtered);
    }

    if (searchQuery.trim()) {
      const lowercasedQuery = searchQuery.toLowerCase();
      filtered = filtered.filter((stat) =>
        stat.name.toLowerCase().includes(lowercasedQuery) ||
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
  }, [startDate, endDate, searchQuery, agentFilter, storeFilter, sortColumn, sortOrder, stats]);

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

        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
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
                <td>{stat.name}</td> {/* ✅ Show agent's name instead of email */}
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
