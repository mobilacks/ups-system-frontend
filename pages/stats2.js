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
  const [noSaleStats, setNoSaleStats] = useState([]);
  const [filteredNoSaleStats, setFilteredNoSaleStats] = useState([]);
  const [reasons, setReasons] = useState([]);

useEffect(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // ✅ Reset time to avoid timezone shifts
  const formattedToday = today.toISOString().split("T")[0]; // ✅ Ensure proper format

  setStartDate(formattedToday);
  setEndDate(formattedToday);
  setSelectedDateRange("today");
  setRoleFilter("agent");
}, []);


useEffect(() => {
  if (startDate && endDate) {
    fetchStats(startDate, endDate); // ✅ Fetch stats AFTER setting the state
	fetchNoSaleStats(startDate, endDate); // ✅ Fetch No Sale stats together
  }
}, [startDate, endDate]);


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
      newStartDate.setDate(today.getDate() - 1); // ✅ Subtract 1 day
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

  const formattedStartDate = new Date(startDate).toISOString().split("T")[0];
  const formattedEndDate = new Date(endDate).toISOString().split("T")[0];

  console.log("📅 Fetching stats for:", formattedStartDate, "to", formattedEndDate); // ✅ Log sent dates

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

// ✅ Fetch No Sales Stats from Supabase
const fetchNoSaleStats = async (startDate, endDate) => {
  if (!startDate || !endDate) return;

  const { data, error } = await supabase.rpc("get_no_sale_stats", {
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) {
    console.error("❌ Error fetching No Sale stats:", error);
  } else {
    setNoSaleStats(data);
    setFilteredNoSaleStats(data);
  }
};

// ✅ Fetch Reasons for Dynamic Columns
const fetchReasons = async () => {
  const { data, error } = await supabase.from("reasons").select("reason_text");
  if (error) {
    console.error("❌ Error fetching reasons:", error);
  } else {
    setReasons(data.map((r) => r.reason_text));
  }
};

useEffect(() => {
  fetchReasons();
}, []);



// ✅ Sorting is already applied in useEffect, so remove duplicate sorting
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

  // ✅ Sorting applied correctly in useEffect
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
   <div className="stats-container">
     <h2>No Sale Reason Analysis</h2>
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
	{/* ✅ No Sale Reason Analysis Section */}
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

    <select value={selectedDateRange} onChange={(e) => handleDateRangeChange(e.target.value)}>
      <option value="today">Today</option>
      <option value="yesterday">Yesterday</option>
      <option value="last_7_days">Last 7 Days</option>
      <option value="last_30_days">Last 30 Days</option>
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
      {filteredNoSaleStats.length > 0 ? (
        filteredNoSaleStats.map((stat) => (
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
  </table>  {/* ✅ Closing the No Sale table */}
</div>  {/* ✅ Closing the No Sale Analysis Section */}
</div>  {/* ✅ Closing the main stats-container */}
);
export default ProtectedRoute(StatsPage);
