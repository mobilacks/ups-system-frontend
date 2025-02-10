import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import ProtectedRoute from "../lib/protectedRoute";

function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredLogs, setFilteredLogs] = useState([]);

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

  // ✅ Handle Search Filtering
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredLogs(logs);
    } else {
      const lowercasedQuery = searchQuery.toLowerCase();
      const filtered = logs.filter((log) =>
        log.email.toLowerCase().includes(lowercasedQuery) ||
        log.agents?.name?.toLowerCase().includes(lowercasedQuery) ||
        log.action_type.toLowerCase().includes(lowercasedQuery) ||
        log.table_name.toLowerCase().includes(lowercasedQuery) ||
        log.details.toLowerCase().includes(lowercasedQuery)
      );
      setFilteredLogs(filtered);
    }
  }, [searchQuery, logs]);

  return (
    <div className="logs-container">
      <h2>System Logs</h2>

      {/* ✅ Search Bar */}
      <input
        type="text"
        placeholder="Search logs..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="search-bar"
      />

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
