import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import ProtectedRoute from "../lib/protectedRoute";

function StatsPage() {
  const [stats, setStats] = useState([]);
  const [noSaleStats, setNoSaleStats] = useState([]); // ✅ No Sale Stats
  const [reasons, setReasons] = useState([]); // ✅ Store reasons as columns
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredStats, setFilteredStats] = useState([]);
  const [filteredNoSaleStats, setFilteredNoSaleStats] = useState([]); // ✅ Filtered No-Sale Stats
  const [agentFilter, setAgentFilter] = useState("");
  const [storeFilter, setStoreFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortColumn, setSortColumn] = useState("total_sales");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedDateRange, setSelectedDateRange] = useState("today");

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const formattedToday = today.toISOString().split("T")[0];

    setStartDate(formattedToday);
    setEndDate(formattedToday);
    setSelectedDateRange("today");
    setRoleFilter("agent");
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchStats(startDate, endDate);
      fetchNoSaleStats(startDate, endDate);
    }
  }, [startDate, endDate]);

  // ✅ Fetch Stats from Supabase
  const fetchStats = async (startDate, endDate) => {
    if (!startDate || !endDate) return;
    const { data, error } = await supabase.rpc("get_sales_stats", {
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error) {
      console.error("❌ Error fetching stats:", error);
    } else {
      setStats(data);
      setFilteredStats(data);
    }
  };

  // ✅ Fetch No Sale Stats from Supabase
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
      setFilteredNoSaleStats(data);
    }
  };

  // ✅ Fetch Reasons for Dynamic Columns
  useEffect(() => {
    const fetchReasons = async () => {
      const { data, error } = await supabase.from("reasons").select("reason_text");
      if (error) {
        console.error("❌ Error fetching reasons:", error);
      } else {
        setReasons(data.map((r) => r.reason_text));
      }
    };
    fetchReasons();
  }, []);

  // ✅ Handle Filters & Sorting
  useEffect(() => {
    let filtered = stats;
    let filteredNoSales = noSaleStats;

    if (searchQuery.trim()) {
      const lowercasedQuery = searchQuery.toLowerCase();
      filtered = filtered.filter((stat) =>
        stat.name.toLowerCase().includes(lowercasedQuery) ||
        stat.email.toLowerCase().includes(lowercasedQuery)
      );
      filteredNoSales = filteredNoSales.filter((stat) =>
        stat.agent_name.toLowerCase().includes(lowercasedQuery)
      );
    }

    if (agentFilter) {
      filtered = filtered.filter((stat) => stat.email === agentFilter);
      filteredNoSales = filteredNoSales.filter((stat) => stat.agent_name === agentFilter);
    }

    if (storeFilter) {
      filtered = filtered.filter((stat) => stat.store_number.toString() === storeFilter);
      filteredNoSales = filteredNoSales.filter((stat) => stat.store_number.toString() === storeFilter);
    }

    if (roleFilter) {
      filtered = filtered.filter((stat) => stat.role === roleFilter);
    }

    filtered.sort((a, b) => {
      if (sortOrder === "asc") {
        return a[sortColumn] > b[sortColumn] ? 1 : -1;
      } else {
        return a[sortColumn] < b[sortColumn] ? 1 : -1;
      }
    });

    setFilteredStats(filtered);
    setFilteredNoSaleStats(filteredNoSales);
  }, [searchQuery, agentFilter, storeFilter, roleFilter, sortColumn, sortOrder, stats, noSaleStats]);

  const uniqueAgents = [...new Set(stats.map((stat) => stat.email))];
  const uniqueStores = [...new Set(stats.map((stat) => stat.store_number))];

  return (
    <div className="stats-container">
      <h2>Sales & Performance Stats</h2>

      <div className="filters">
        <input type="text" placeholder="Search agent..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        <select value={selectedDateRange} onChange={(e) => setSelectedDateRange(e.target.value)}>
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
            <option key={agent} value={agent}>{agent}</option>
          ))}
        </select>
        <select value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)}>
          <option value="">All Stores</option>
          {uniqueStores.map((store) => (
            <option key={store} value={store}>Store {store}</option>
          ))}
        </select>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>

      {/* ✅ Sales Stats Table */}
      <table className="stats-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th># of UPS</th>
            <th># of Sales</th>
            <th>Total Sales</th>
            <th>Close Rate</th>
            <th>Average Sales</th>
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
          ) : <tr><td colSpan="7">No stats available.</td></tr>}
        </tbody>
      </table>

      {/* ✅ No Sale Reason Analysis */}
      <h2>No Sale Reason Analysis</h2>
      <table className="stats-table">
        <thead>
          <tr>
            <th>Agent Name</th>
            <th>Store Number</th>
            {reasons.map((reason) => <th key={reason}>{reason}</th>)}
          </tr>
        </thead>
        <tbody>
          {/* Populate dynamically */}
        </tbody>
      </table>
    </div>
  );
}

export default ProtectedRoute(StatsPage);
