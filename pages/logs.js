import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      const { data, error } = await supabase
        .from("logs")
        .select("id, user_id, agents(name), action_type, table_name, details, created_at")
        .order("created_at", { ascending: false });

      if (error) console.error("Error fetching logs:", error);
      else setLogs(data);
      setLoading(false);
    }

    fetchLogs();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">System Logs</h1>
      {loading ? (
        <p>Loading logs...</p>
      ) : (
        <table className="min-w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">User</th>
              <th className="border p-2">Action</th>
              <th className="border p-2">Table</th>
              <th className="border p-2">Details</th>
              <th className="border p-2">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border">
                <td className="border p-2">{log.agents ? log.agents.name : "Unknown"}</td>
                <td className="border p-2">{log.action_type}</td>
                <td className="border p-2">{log.table_name}</td>
                <td className="border p-2">{log.details}</td>
                <td className="border p-2">{new Date(log.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
