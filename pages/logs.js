import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import ProtectedRoute from "../lib/protectedRoute";

function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [actionFilter, setActionFilter] = useState(""); // ✅ Filter by Action
  const [tableFilter, setTableFilter] = useState(""); // ✅ Filter by Table Name

  useEffect(() => {
    fetchLogs();
  }, []);

  // ✅ Fetch Logs from Supabase
  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from("logs")
      .select("id, email, action_type, table_name, details, created_at, agents(name)")
      .order("created_at", { ascending: false });

    if (!error) {
      console.log("✅ Logs Fetched:", data);
      setLogs(data);
      setFilteredLogs(data); // Initialize filtered logs
    } else {
      console.error("❌ Error fetching logs:", error);
    }
  };

  // ✅ Handle Search & Filters
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

    setFilteredLogs(filtered);
  }, [searchQuery, actionFilter, tableFilter, logs]);

  // ✅ Get unique actions & tables for dropdowns
  const uniqueActions = [...new Set(logs.map((log) => log.action_type))];
  const uniqueTables = [...new Set(logs.map((log) => log.table_name))];

  return (
    <div className="logs-container">
      <h2>System Logs</h2>

      {/* ✅ Filters */}
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
      </div>

      {/* ✅ Logs Table */}
      <table className="logs-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Action</th>
            <th>Table</th>
            <th>Details</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log) => (
              <tr key={log.id}>
                <td>{log.agents?.name || log.email}</td> {/* ✅ Show Agent Name if available */}
                <td>{log.action_type}</td>
                <td>{log.table_name}</td>
                <td>{log.details}</td>
                <td>{new Date(log.created_at).toLocaleString()}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" className="no-logs">No logs available.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ProtectedRoute(LogsPage); // ✅ Protect the Logs Page
