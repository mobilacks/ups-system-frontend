import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import ProtectedRoute from "../lib/protectedRoute";

function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [sortColumn, setSortColumn] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  useEffect(() => {
    fetchLogs();
  }, []);

  // ✅ Fetch Logs from Supabase with Agent Store #
  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from("logs")
      .select("id, email, action_type, details, created_at, agents(name, store_number)")
      .order("created_at", { ascending: false });

    if (!error) {
      console.log("✅ Logs Fetched:", data);
      setLogs(data);
      setFilteredLogs(data);
    } else {
      console.error("❌ Error fetching logs:", error);
    }
  };

  // ✅ Handle Search Filtering
  useEffect(() => {
    let filtered = logs;

    if (searchQuery.trim()) {
      const lowercasedQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.email.toLowerCase().includes(lowercasedQuery) ||
          log.agents?.name?.toLowerCase().includes(lowercasedQuery) ||
          log.action_type.toLowerCase().includes(lowercasedQuery) ||
          log.details.toLowerCase().includes(lowercasedQuery)
      );
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
  }, [searchQuery, sortColumn, sortOrder, logs]);

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
