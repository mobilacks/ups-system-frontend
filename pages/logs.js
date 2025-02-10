import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import ProtectedRoute from "../lib/protectedRoute";

function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [searchUser, setSearchUser] = useState("");
  const [searchAction, setSearchAction] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchLogs();
  }, []);

  // ✅ Fetch logs from Supabase
const fetchLogs = async () => {
    const { data, error } = await supabase
      .from("logs")
      .select("email, log_action, table_name, details, timestamp") // 🔄 Updated column names
      .order("timestamp", { ascending: false });

    if (!error) {
      console.log("✅ Fetched logs:", data);
      setLogs(data);
      setFilteredLogs(data);
    } else {
      console.error("❌ Error fetching logs:", error);
    }
};

  // ✅ Handle Filtering
  const handleFilter = () => {
    let filtered = logs;

    if (searchUser) {
      filtered = filtered.filter((log) => log.email.toLowerCase().includes(searchUser.toLowerCase()));
    }

    if (searchAction) {
      filtered = filtered.filter((log) => log.action.toLowerCase().includes(searchAction.toLowerCase()));
    }

    if (startDate && endDate) {
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime();
      filtered = filtered.filter((log) => {
        const logDate = new Date(log.timestamp).getTime();
        return logDate >= start && logDate <= end;
      });
    }

    setFilteredLogs(filtered);
  };

  return (
    <div className="logs-container">
      <h2>System Logs</h2>

      {/* ✅ Filter Section */}
      <div className="filters">
        <input type="text" placeholder="Search by User" value={searchUser} onChange={(e) => setSearchUser(e.target.value)} />
        <input type="text" placeholder="Search by Action" value={searchAction} onChange={(e) => setSearchAction(e.target.value)} />
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <button className="btn-filter" onClick={handleFilter}>Apply Filters</button>
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
            filteredLogs.map((log, index) => (
              <tr key={index}>
                <td>{log.email}</td> {/* ✅ Fixed this line */}
                <td>{log.action}</td>
                <td>{log.table_name}</td>
                <td>{log.details}</td>
                <td>{new Date(log.timestamp).toLocaleString()}</td>
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

export default ProtectedRoute(LogsPage);
