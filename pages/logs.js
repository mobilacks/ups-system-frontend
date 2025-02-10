import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import ProtectedRoute from "../lib/protectedRoute";

function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState("");
  
  useEffect(() => {
    fetchLogs();
  }, []);

  // ✅ Fetch Logs and Agent Names
  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from("logs")
      .select("email, action_type, table_name, record_id, details, timestamp, agents(name)")
      .order("timestamp", { ascending: false });

    if (!error) setLogs(data);
    else console.error("❌ Error fetching logs:", error);
  };

  // ✅ Handle Filter Change
  const handleFilterChange = (e) => {
    setFilter(e.target.value);
  };

  const filteredLogs = logs.filter((log) =>
    log.email.toLowerCase().includes(filter.toLowerCase()) ||
    log.name?.toLowerCase().includes(filter.toLowerCase()) ||
    log.action_type.toLowerCase().includes(filter.toLowerCase()) ||
    log.table_name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="logs-container">
      <h2>System Logs</h2>
      <input
        type="text"
        placeholder="Filter logs..."
        value={filter}
        onChange={handleFilterChange}
        className="filter-input"
      />
      <table className="logs-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Action</th>
            <th>Table</th>
            <th>Details</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log) => (
              <tr key={log.record_id}>
                <td>{log.agents?.name || "Unknown"}</td>
                <td>{log.email}</td>
                <td>{log.action_type}</td>
                <td>{log.table_name}</td>
                <td>{log.details}</td>
                <td>{new Date(log.timestamp).toLocaleString()}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6">No logs available.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ProtectedRoute(LogsPage);
