import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import ProtectedRoute from "../lib/protectedRoute";

function LogsPage() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetchLogs();
  }, []);

  // ✅ Fetch Logs from Supabase
  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from("logs")
      .select("id, email, action_type, table_name, details, created_at")
      .order("created_at", { ascending: false });
    
    if (!error) setLogs(data);
    else console.error("❌ Error fetching logs:", error);
  };

  return (
    <div className="logs-container">
      <h2>System Logs</h2>
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
          {logs.length > 0 ? (
            logs.map((log) => (
              <tr key={log.id}>
                <td>{log.user_email}</td>
                <td>{log.action_type}</td>
                <td>{log.table_name}</td>
                <td>{log.details}</td>
                <td>{new Date(log.created_at).toLocaleString()}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5">No logs available.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ProtectedRoute(LogsPage);
