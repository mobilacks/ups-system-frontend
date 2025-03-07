import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import ProtectedRoute from "../lib/protectedRoute";

function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [actionFilter, setActionFilter] = useState("");
  const [tableFilter, setTableFilter] = useState("");
  const [agentFilter, setAgentFilter] = useState("");
  const [storeFilter, setStoreFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortColumn, setSortColumn] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentUserStore, setCurrentUserStore] = useState(null);
  const [selectedDateRange, setSelectedDateRange] = useState("today");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const logsPerPage = 100;
  const [isLoading, setIsLoading] = useState(false);

  // Set initial date to today when component loads
  useEffect(() => {
    const today = new Date();
    const formattedToday = today.toISOString().split("T")[0];
    
    setStartDate(formattedToday);
    setEndDate(formattedToday);
    setSelectedDateRange("today");

    // Get current user's store number
    getCurrentUserStore();
  }, []);

  // Fetch logs when filters change
  useEffect(() => {
    if (startDate && endDate) {
      setCurrentPage(1); // Reset to first page when filters change
      fetchLogs(1);
    }
  }, [startDate, endDate, currentUserStore]);

  // Get current user's store number
  const getCurrentUserStore = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from("agents")
          .select("store_number")
          .eq("email", user.email)
          .single();
          
        if (data && !error) {
          console.log("✅ Current user's store number:", data.store_number);
          setCurrentUserStore(data.store_number);
          setStoreFilter(data.store_number.toString());
        }
      }
    } catch (error) {
      console.error("❌ Error fetching user store:", error);
    }
  };

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
        newStartDate = today;
        newEndDate = today;
    }

    setStartDate(newStartDate.toISOString().split("T")[0]);
    setEndDate(newEndDate.toISOString().split("T")[0]);
  };

  // Handle page change
  const handlePageChange = (pageNumber) => {
    if (pageNumber < 1 || pageNumber > totalPages || pageNumber === currentPage) return;
    setCurrentPage(pageNumber);
    fetchLogs(pageNumber);
  };

  // ✅ Fetch Logs from Supabase with pagination
  const fetchLogs = async (page = 1) => {
    setIsLoading(true);
    
    try {
      // First, get the count of total logs matching our filters
      const countQuery = supabase
        .from("logs")
        .select("id", { count: "exact" });
      
      // Apply date filters
      if (startDate) {
        countQuery.gte('created_at', `${startDate}T00:00:00.000Z`);
      }
      
      if (endDate) {
        countQuery.lte('created_at', `${endDate}T23:59:59.999Z`);
      }
      
      const { count, error: countError } = await countQuery;
      
      if (countError) throw countError;
      
      setTotalLogs(count || 0);
      setTotalPages(Math.ceil((count || 0) / logsPerPage));
      
      // Now fetch the specific page of logs
      const from = (page - 1) * logsPerPage;
      const to = from + logsPerPage - 1;
      
      const query = supabase
        .from("logs")
        .select("id, email, action_type, table_name, details, created_at, agents(name, store_number)")
        .order("created_at", { ascending: false })
        .range(from, to);
      
      // Apply date filters
      if (startDate) {
        query.gte('created_at', `${startDate}T00:00:00.000Z`);
      }
      
      if (endDate) {
        query.lte('created_at', `${endDate}T23:59:59.999Z`);
      }
      
      const { data, error } = await query;

      if (error) throw error;
      
      console.log(`✅ Logs Fetched for page ${page}:`, data);
      setLogs(data || []);
      setFilteredLogs(data || []);
    } catch (error) {
      console.error("❌ Error fetching logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Handle Filters & Sorting
  useEffect(() => {
    let filtered = logs;

    if (searchQuery.trim()) {
      const lowercasedQuery = searchQuery.toLowerCase();
      filtered = filtered.filter((log) =>
        log.email.toLowerCase().includes(lowercasedQuery) ||
        log.agents?.name?.toLowerCase().includes(lowercasedQuery) ||
        log.action_type.toLowerCase().includes(lowercasedQuery) ||
        log.table_name.toLowerCase().includes(lowercasedQuery) ||
        log.details.toLowerCase().includes(lowercasedQuery)
      );
    }

    if (actionFilter) {
      filtered = filtered.filter((log) => log.action_type === actionFilter);
    }

    if (tableFilter) {
      filtered = filtered.filter((log) => log.table_name === tableFilter);
    }

    if (agentFilter) {
      filtered = filtered.filter((log) => log.email === agentFilter);
    }
    
    if (storeFilter) {
      filtered = filtered.filter((log) => 
        log.agents?.store_number?.toString() === storeFilter
      );
    }

    // ✅ Sorting Functionality
    filtered.sort((a, b) => {
      if (sortColumn === "agents.name") {
        // Special handling for nested properties
        const nameA = a.agents?.name || a.email || "";
        const nameB = b.agents?.name || b.email || "";
        return sortOrder === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      } else if (sortColumn === "agents.store_number") {
        // Special handling for nested store_number
        const storeA = a.agents?.store_number || 0;
        const storeB = b.agents?.store_number || 0;
        return sortOrder === "asc" ? storeA - storeB : storeB - storeA;
      } else {
        // Default sorting for regular columns
        if (sortOrder === "asc") {
          return a[sortColumn] > b[sortColumn] ? 1 : -1;
        } else {
          return a[sortColumn] < b[sortColumn] ? 1 : -1;
        }
      }
    });

    setFilteredLogs(filtered);
  }, [searchQuery, actionFilter, tableFilter, agentFilter, storeFilter, sortColumn, sortOrder, logs]);

  // Apply client-side filters and refresh page
  const applyFilters = () => {
    setCurrentPage(1); // Reset to first page
    fetchLogs(1);
  };

  // ✅ Get unique values for dropdown filters
  const uniqueActions = [...new Set(logs.map((log) => log.action_type))];
  const uniqueTables = [...new Set(logs.map((log) => log.table_name))];
  const uniqueAgents = [...new Set(logs.map((log) => log.email))];
  const uniqueStores = [...new Set(logs.map((log) => log.agents?.store_number?.toString()).filter(Boolean))];

  // Generate pagination controls
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    const pageNumbers = [];
    const maxPagesToShow = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    
    return (
      <div className="pagination">
        <button 
          onClick={() => handlePageChange(currentPage - 1)} 
          disabled={currentPage === 1}
          className="page-button"
        >
          &laquo; Prev
        </button>
        
        {startPage > 1 && (
          <>
            <button onClick={() => handlePageChange(1)} className="page-button">1</button>
            {startPage > 2 && <span className="ellipsis">...</span>}
          </>
        )}
        
        {pageNumbers.map(number => (
          <button
            key={number}
            onClick={() => handlePageChange(number)}
            className={`page-button ${currentPage === number ? 'active' : ''}`}
          >
            {number}
          </button>
        ))}
        
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="ellipsis">...</span>}
            <button onClick={() => handlePageChange(totalPages)} className="page-button">{totalPages}</button>
          </>
        )}
        
        <button 
          onClick={() => handlePageChange(currentPage + 1)} 
          disabled={currentPage === totalPages}
          className="page-button"
        >
          Next &raquo;
        </button>
      </div>
    );
  };

  return (
    <div className="logs-container">
      <h2>System Logs</h2>

      {/* ✅ Filters Section */}
      <div className="filters">
        <input
          type="text"
          placeholder="Search logs..."
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

        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
          <option value="">All Actions</option>
          {uniqueActions.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </select>

        <select value={tableFilter} onChange={(e) => setTableFilter(e.target.value)}>
          <option value="">All Tables</option>
          {uniqueTables.map((table) => (
            <option key={table} value={table}>
              {table}
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

        <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)}>
          <option value="">All Agents</option>
          {uniqueAgents.map((agent) => (
            <option key={agent} value={agent}>
              {agent}
            </option>
          ))}
        </select>

        <div className="date-inputs">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <button onClick={applyFilters} className="apply-filters-btn">Apply Filters</button>
        </div>
      </div>

      {/* Logs summary */}
      <div className="logs-summary">
        Showing {filteredLogs.length} of {totalLogs} logs | Page {currentPage} of {totalPages}
      </div>

      {/* Pagination controls (top) */}
      {renderPagination()}

      {/* ✅ Logs Table */}
      <div className="table-container">
        <table className="logs-table">
          <thead>
            <tr>
              <th onClick={() => setSortColumn("agents.name")}>
                User {sortColumn === "agents.name" ? (sortOrder === "asc" ? "⬆" : "⬇") : ""}
              </th>
              <th onClick={() => setSortColumn("agents.store_number")}>
                Store # {sortColumn === "agents.store_number" ? (sortOrder === "asc" ? "⬆" : "⬇") : ""}
              </th>
              <th>Details</th>
              <th onClick={() => setSortColumn("created_at")}>
                Time {sortColumn === "created_at" ? (sortOrder === "asc" ? "⬆" : "⬇") : ""}
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="4" className="loading-logs">Loading logs...</td>
              </tr>
            ) : filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td>{log.agents?.name || log.email}</td>
                  <td>{log.agents?.store_number || "N/A"}</td>
                  <td>{log.details}</td>
                  <td>{new Date(log.created_at).toLocaleString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="no-logs">No logs available.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls (bottom) */}
      {renderPagination()}

      {/* CSS for pagination */}
      <style jsx>{`
        .pagination {
          display: flex;
          justify-content: center;
          margin: 20px 0;
          gap: 5px;
        }
        
        .page-button {
          padding: 8px 12px;
          background-color: #f0f0f0;
          border: 1px solid #ddd;
          cursor: pointer;
          border-radius: 4px;
        }
        
        .page-button:hover {
          background-color: #e0e0e0;
        }
        
        .page-button.active {
          background-color: #0070f3;
          color: white;
          border-color: #0070f3;
        }
        
        .ellipsis {
          padding: 8px 12px;
        }
        
        .logs-summary {
          margin: 10px 0;
          font-size: 14px;
          color: #666;
        }
        
        .apply-filters-btn {
          padding: 8px 12px;
          background-color: #0070f3;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .apply-filters-btn:hover {
          background-color: #0060d0;
        }
        
        .date-inputs {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        
        .loading-logs {
          text-align: center;
          padding: 20px;
        }
        
        .table-container {
          overflow-x: auto;
        }
      `}</style>
    </div>
  );
}

export default ProtectedRoute(LogsPage); // ✅ Protect the Logs Page
