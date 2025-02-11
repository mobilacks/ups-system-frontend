import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import ProtectedRoute from "../lib/protectedRoute";

function AdminPage() {
  const [agents, setAgents] = useState([]);
  const [reasons, setReasons] = useState([]);
  const [newReason, setNewReason] = useState("");
  const [upsCount, setUpsCount] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [updatedName, setUpdatedName] = useState("");
  const [updatedStore, setUpdatedStore] = useState("");
  const [updatedRole, setUpdatedRole] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchAgents();
    fetchReasons();
  }, []);

  // ✅ Fetch Agents
  const fetchAgents = async () => {
    const { data, error } = await supabase.from("agents").select("*");
    if (!error) setAgents(data);
  };

  // ✅ Fetch Reasons
  const fetchReasons = async () => {
    const { data, error } = await supabase.from("reasons").select("id, reason_text, ups_count");
    if (!error) setReasons(data);
  };

  // ✅ Delete Agent
  const deleteAgent = async (email) => {
    if (!confirm("Are you sure you want to delete this agent?")) return;
    await supabase.from("agents").delete().eq("email", email);
    await supabase.auth.admin.deleteUser(email);
    fetchAgents();
  };

  // ✅ Save Updated Agent Details
  const saveAgentUpdate = async () => {
    if (!editingAgent) return;

    const roleToUpdate = updatedRole === "manager" ? "store_manager" : updatedRole || editingAgent.role;

    const { error } = await supabase
      .from("agents")
      .update({
        name: updatedName || editingAgent.name,
        store_number: updatedStore || editingAgent.store_number,
        role: roleToUpdate,
      })
      .eq("email", editingAgent.email);

    if (!error) {
      setEditingAgent(null);
      setUpdatedName("");
      setUpdatedStore("");
      setUpdatedRole("");
      fetchAgents();
    } else {
      console.error("❌ Error updating agent:", error);
    }
  };

  // ✅ Delete Reason
  const deleteReason = async (id) => {
    if (!confirm("Are you sure you want to delete this reason?")) return;
    await supabase.from("reasons").delete().eq("id", id);
    fetchReasons();
  };

  // ✅ Add New Reason
  const addReason = async () => {
    if (!newReason.trim()) return;
    await supabase.from("reasons").insert([{ reason_text: newReason, ups_count: upsCount }]);
    setNewReason("");
    setUpsCount(false);
    fetchReasons();
  };

  // ✅ Filter Agents Based on Search Query
  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.store_number.toString().includes(searchQuery)
  );

  return (
    <div className="admin-container">
      
      {/* ✅ Manage Users Section */}
      <div className="admin-section">
        <h2>Manage Users</h2>

        {/* ✅ Search Bar */}
        <input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-bar"
        />

        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Store #</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAgents.map((agent) => (
              <tr key={agent.email}>
                <td>{agent.name}</td>
                <td>{agent.email}</td>
                <td>{agent.store_number}</td>
                <td>{agent.role}</td>
                <td>{agent.status}</td>
                <td>
                  <button className="btn-edit" onClick={() => setEditingAgent(agent)}>Edit</button>
                  <button className="btn-delete" onClick={() => deleteAgent(agent.email)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {editingAgent && (
          <div className="edit-section">
            <h3>Edit Agent</h3>
            <label>Name</label>
            <input
              type="text"
              value={updatedName}
              onChange={(e) => setUpdatedName(e.target.value)}
              placeholder={editingAgent.name}
            />
            <label>Store #</label>
            <input
              type="number"
              value={updatedStore}
              onChange={(e) => setUpdatedStore(e.target.value)}
              placeholder={editingAgent.store_number}
            />
            <label>Role</label>
            <select value={updatedRole} onChange={(e) => setUpdatedRole(e.target.value)}>
              <option value="agent">Agent</option>
              <option value="store_manager">Store Manager</option>
              <option value="admin">Admin</option>
            </select>
            <button className="btn-save" onClick={saveAgentUpdate}>Save</button>
            <button className="btn-cancel" onClick={() => setEditingAgent(null)}>Cancel</button>
          </div>
        )}
      </div>

      {/* ✅ Manage Reasons Section */}
      <div className="admin-section">
        <h2>Manage Reasons</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Reason</th>
              <th>UPS Count</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reasons.map((reason) => (
              <tr key={reason.id}>
                <td>{reason.reason_text}</td>
                <td>{reason.ups_count ? "Yes" : "No"}</td>
                <td>
                  <button className="btn-delete" onClick={() => deleteReason(reason.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="add-reason">
          <input type="text" placeholder="New Reason" value={newReason} onChange={(e) => setNewReason(e.target.value)} />
          <label>
            <input type="checkbox" checked={upsCount} onChange={(e) => setUpsCount(e.target.checked)} />
            Count towards UPS?
          </label>
          <button className="btn-add" onClick={addReason}>Add Reason</button>
        </div>
      </div>

    </div>
  );
}

export default ProtectedRoute(AdminPage);
