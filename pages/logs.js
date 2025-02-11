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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortColumn, setSortColumn] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  useEffect(() => {
    fetchLogs();
  }, []);

  // ✅ Fetch Logs from Supabase
  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from("logs")
      .select("id, email, action_type, table_name, details, created_at, agents(name, store_number)")
      .order("created_at", { ascending: false });

    if (!error) {
      console.log("✅ Logs Fetched:", data);
      setLogs(data);
      setFilteredLogs(data);
    } else {
      console.error("❌ Error fetching logs:", error);
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

    if (startDate) {
      filtered = filtered.filter((log) => new Date(log.created_at) >= new Date(startDate));
    }

    if (endDate) {
      filtered = filtered.filter((log) => new Date(log.created_at) <= new Date(endDate));
    }

    // ✅ Sorting Functionality
    filtered.sort((a, b) => {
      if (sortOrder === "asc") {
        return a[sortColumn] > b[sortColumn] ? 1 : -1;
      } else {
        return a[sortColumn] < b[sortColumn] ? 1 : -1;
      }
    });

    setFilteredLogs(filtered);
  }, [searchQuery, actionFilter, tableFilter, agentFilter, startDate, endDate, sortColumn, sortOrder, logs]);

  // ✅ Get unique values for dropdown filters
  const uniqueActions = [...new Set(logs.map((log) => log.action_type))];
  const uniqueTables = [...new Set(logs.map((log) => log.table_name))];
  const uniqueAgents = [...new Set(logs.map((log) => log.email))];

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

        <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)}>
          <option value="">All Agents</option>
          {uniqueAgents.map((agent) => (
            <option key={agent} value={agent}>
              {agent}
            </option>
          ))}
        </select>

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
      </div>

      {/* ✅ Logs Table */}
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
          {filteredLogs.length > 0 ? (
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
  );
}

export default ProtectedRoute(LogsPage); // ✅ Protect the Logs Page
