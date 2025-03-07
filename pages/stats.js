import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import ProtectedRoute from "../lib/protectedRoute";

function StatsPage() {
  // Sales Stats State
  const [stats, setStats] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredStats, setFilteredStats] = useState([]);
  const [agentFilter, setAgentFilter] = useState("");
  const [storeFilter, setStoreFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("agent"); 
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortColumn, setSortColumn] = useState("total_sales");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedDateRange, setSelectedDateRange] = useState("today");
  const [currentUserStore, setCurrentUserStore] = useState(null);
  
  // No Sale Stats State
  const [noSaleStats, setNoSaleStats] = useState([]);
  const [filteredNoSaleStats, setFilteredNoSaleStats] = useState([]);
  const [reasonColumns, setReasonColumns] = useState([]);
  
  // UI State
  const [activeTab, setActiveTab] = useState("sales"); // Control which section is visible

  // Fetch current user data on initial load
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Get user's store for default filtering
        const { data, error } = await supabase
          .from("agents")
          .select("store_number")
          .eq("email", user.email)
          .single();
          
        if (data && !error) {
          console.log("✅ Current user's store number:", data.store_number);
          setCurrentUserStore(data.store_number.toString());
          setStoreFilter(data.store_number.toString());
        }
      }
    };
    
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const formattedToday = today.toISOString().split("T")[0];

    setStartDate(formattedToday);
    setEndDate(formattedToday);
    setSelectedDateRange("today");
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchStats(startDate, endDate);
      fetchNoSaleStats(startDate, endDate);
    }
  }, [startDate, endDate]);

  // Function to Set Date Range Based on Dropdown Selection
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
      fetchNoSaleStats(newStartDate.toISOString().split("T")[0], newEndDate.toISOString().split("T")[0]);
    }
  };

  // Fetch Sales Stats from Supabase
  const fetchStats = async (startDate, endDate) => {
    if (!startDate || !endDate) return;

    const formattedStartDate = new Date(startDate).toISOString().split("T")[0];
    const formattedEndDate = new Date(endDate).toISOString().split("T")[0];

    console.log("📅 Fetching stats for:", formattedStartDate, "to", formattedEndDate);

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

  // Fetch No Sale Stats
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
      
      // Extract column names (excluding agent_name and store_number)
      if (data && data.length > 0) {
        const firstRecord = data[0];
        const columns = Object.keys(firstRecord).filter(
          key => key !== 'agent_name' && key !== 'store_number'
        );
        setReasonColumns(columns);
        console.log("✅ Reason columns detected:", columns);
      }
      
      setNoSaleStats(data);
      setFilteredNoSaleStats(data);
    }
  };

  // Handle Sales Stats Filters & Sorting
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
      filtered = filtered.filter((stat) => stat.role === roleFilter);
    }

    // Sorting
    filtered.sort((a, b) => {
      if (sortOrder === "asc") {
        return a[sortColumn] > b[sortColumn] ? 1 : -1;
      } else {
        return a[sortColumn] < b[sortColumn] ? 1 : -1;
      }
    });

    setFilteredStats(filtered);
  }, [searchQuery, agentFilter, storeFilter, roleFilter, sortColumn, sortOrder, stats]);

  // Handle No Sale Stats Filters
  useEffect(() => {
    let filtered = noSaleStats;

    if (agentFilter) {
      filtered = filtered.filter((stat) => 
        // Check if agent_name exists and matches the filter
        (stat.agent_name && stat.agent_name === agentFilter) || 
        // Otherwise check if agent email matches
        (stat.email && stat.email === agentFilter)
      );
    }

    if (storeFilter) {
      filtered = filtered.filter((stat) => stat.store_number.toString() === storeFilter);
    }

    setFilteredNoSaleStats(filtered);
  }, [agentFilter, storeFilter, noSaleStats]);

  // Get unique values for dropdown filters
  const uniqueAgents = [...new Set(stats.map((stat) => stat.email))];
  const uniqueStores = [...new Set(stats.map((stat) => stat.store_number))];

  // Define the expected reason columns in the order you want them to appear
  const expectedReasonOrder = [
    "Credit Issue",
    "Payments",
    "Service Issues",
    "Spouse Approval",
    "Measurements",
    "We Dont Have It",
    "Building home",
    "Exchange"
  ];

  // Order the reason columns according to the expected order
  const orderedReasonColumns = expectedReasonOrder.filter(reason => 
    reasonColumns.includes(reason)
  );

  return (
    <div className="stats-container">
      {/* Tab Navigation */}
      <div className="stats-tabs">
        <button 
          className={`tab-button ${activeTab === 'sales' ? 'active' : ''}`}
          onClick={() => setActiveTab('sales')}
        >
          Sales & Performance Stats
        </button>
        <button 
          className={`tab-button ${activeTab === 'no-sale' ? 'active' : ''}`}
          onClick={() => setActiveTab('no-sale')}
        >
          No Sale Reason Analysis
        </button>
      </div>

      {/* Common Filters Section */}
      <div className="filters">
        {activeTab === 'sales' && (
          <input
            type="text"
            placeholder="Search agent..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-bar"
          />
        )}

        <select value={selectedDateRange} onChange={(e) => handleDateRangeChange(e.target.value)}>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="last_7_days">Last 7 Days</option>
          <option value="last_30_days">Last 30 Days</option>
        </select>

        {activeTab === 'sales' && (
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All Roles</option>
            <option value="agent">Agent</option>
            <option value="store_manager">Store Manager</option>
            <option value="admin">Admin</option>
          </select>
        )}

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

      {/* Sales Stats Table (show if activeTab is 'sales') */}
      {activeTab === 'sales' && (
        <>
          <h2>Sales & Performance Stats</h2>
          <table className="stats-table">
            <thead>
              <tr>
                <th onClick={() => setSortColumn("name")}>Name</th>
                <th onClick={() => setSortColumn("store_number")}>Store #</th>
                <th onClick={() => setSortColumn("ups_count")}># of UPS</th>
                <th onClick={() => setSortColumn("sale_count")}># of Sales</th>
                <th onClick={() => setSortColumn("total_sales")}>Total Sales</th>
                <th onClick={() => setSortColumn("close_rate")}>Close Rate</th>
                <th onClick={() => setSortColumn("avg_sale")}>Average Sales</th>
                <th onClick={() => setSortColumn("sales_per_up")}>Sales per UPS</th>
              </tr>
            </thead>
            <tbody>
              {filteredStats.length > 0 ? (
                filteredStats.map((stat) => (
                  <tr key={stat.email}>
                    <td>{stat.name}</td>
                    <td>{stat.store_number}</td>
                    <td>{stat.ups_count}</td>
                    <td>{stat.sale_count}</td>
                    <td>${(stat.total_sales || 0).toFixed(2)}</td>
                    <td>{(stat.close_rate || 0).toFixed(2)}%</td>
                    <td>${(stat.avg_sale || 0).toFixed(2)}</td>
                    <td>${(stat.sales_per_up || 0).toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="no-stats">No stats available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}

      {/* No Sale Reason Analysis Table (show if activeTab is 'no-sale') */}
      {activeTab === 'no-sale' && (
        <>
          <h2>No Sale Reason Analysis</h2>
          <table className="stats-table">
            <thead>
              <tr>
                <th>Agent Name</th>
                <th>Store #</th>
                {orderedReasonColumns.map((reason) => <th key={reason}>{reason}</th>)}
              </tr>
            </thead>
            <tbody>
              {filteredNoSaleStats.length > 0 ? (
                filteredNoSaleStats.map((stat, index) => (
                  <tr key={`${stat.agent_name || stat.email}-${index}`}>
                    <td>{stat.agent_name || stat.email}</td>
                    <td>{stat.store_number}</td>
                    {orderedReasonColumns.map((reason) => (
                      <td key={reason}>{stat[reason] || 0}</td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2 + orderedReasonColumns.length} className="no-stats">No No-Sale stats available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

export default ProtectedRoute(StatsPage);
