import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import ProtectedRoute from "../lib/protectedRoute";

function StatsPage() {
  const [stats, setStats] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredStats, setFilteredStats] = useState([]);
  const [agentFilter, setAgentFilter] = useState("");
  const [storeFilter, setStoreFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState(""); // ✅ Role filter added
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortColumn, setSortColumn] = useState("total_sales");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedDateRange, setSelectedDateRange] = useState("today"); // ✅ Default to Today

  useEffect(() => {
    handleDateRangeChange("today"); // ✅ Load Today's Data on First Load
  }, []);

  // ✅ Function to Set Date Range Based on Dropdown Selection
  const handleDateRangeChange = (value) => {
    setSelectedDateRange(value);

    const today = new Date();
    let newStartDate, newEndDate;

    switch (value) {
      case "today":
        newStartDate = today;
        newEndDate = today;
        break;
      case "yesterday":
        newStartDate = new Date(today);
        newStartDate.setDate(today.getDate() - 1);
        newEndDate = newStartDate;
        break;
      case "last_7_days":
        newStartDate = new Date(today);
        newStartDate.setDate(today.getDate() - 7);
        newEndDate = today;
        break;
      case "last_30_days":
        newStartDate = new Date(today);
        newStartDate.setDate(today.getDate() - 30);
        newEndDate = today;
        break;
      default:
        newStartDate = "";
        newEndDate = "";
    }

    setStartDate(newStartDate ? newStartDate.toISOString().split("T")[0] : "");
    setEndDate(newEndDate ? newEndDate.toISOString().split("T")[0] : "");

    if (newStartDate && newEndDate) {
      fetchStats(newStartDate.toISOString().split("T")[0], newEndDate.toISOString().split("T")[0]);
    }
  };

// ✅ Fetch Stats from Supabase
const fetchStats = async (startDate, endDate) => {
  if (!startDate || !endDate) return;

  const formattedStartDate = new Date(startDate).toISOString().split("T")[0];  // ✅ Ensure format
  const formattedEndDate = new Date(endDate).toISOString().split("T")[0];      // ✅ Ensure format

  const { data, error } = await supabase.rpc("get_sales_stats", {
    p_start_date: formattedStartDate,
    p_end_date: formattedEndDate,
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

    if (roleFilter) {
      filtered = filtered.filter((stat) => stat.role === roleFilter); // ✅ Role filtering
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
  }, [searchQuery, agentFilter, storeFilter, roleFilter, sortColumn, sortOrder, stats]);

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

        <select value={selectedDateRange} onChange={(e) => handleDateRangeChange(e.target.value)}>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="last_7_days">Last 7 Days</option>
          <option value="last_30_days">Last 30 Days</option>
        </select>

        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          <option value="agent">Agent</option>
          <option value="store_manager">Store Manager</option>
          <option value="admin">Admin</option>
        </select>

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
            <th onClick={() => setSortColumn("name")}>Name</th>
            <th onClick={() => setSortColumn("role")}>Role</th>
            <th onClick={() => setSortColumn("ups_count")}># of UPS</th>
            <th onClick={() => setSortColumn("sale_count")}># of Sales</th>
            <th onClick={() => setSortColumn("total_sales")}>Total Sales</th>
            <th onClick={() => setSortColumn("close_rate")}>Close Rate</th>
            <th onClick={() => setSortColumn("avg_sale")}>Average Sales</th>
          </tr>
        </thead>
        <tbody>
          {filteredStats.length > 0 ? (
            filteredStats.map((stat) => (
              <tr key={stat.email}>
                <td>{stat.name}</td>
                <td>{stat.role}</td>
                <td>{stat.ups_count}</td>
                <td>{stat.sale_count}</td>
                <td>${(stat.total_sales || 0).toFixed(2)}</td>
                <td>{(stat.close_rate || 0).toFixed(2)}%</td>
                <td>${(stat.avg_sale || 0).toFixed(2)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7" className="no-stats">No stats available.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ProtectedRoute(StatsPage);
