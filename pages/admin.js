import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import ProtectedRoute from "../lib/protectedRoute";

function AdminPage() {
  const [agents, setAgents] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reasons, setReasons] = useState([]);
  const [newReason, setNewReason] = useState("");
  const [upsCount, setUpsCount] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [updatedName, setUpdatedName] = useState("");
  const [updatedStore, setUpdatedStore] = useState("");
  const [updatedRole, setUpdatedRole] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("users"); // Control which section is visible

  useEffect(() => {
    async function fetchUserRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("agents")  // ✅ Query the "agents" table
        .select("role")
        .eq("email", user.email)
        .single();  // ✅ Since email is unique, fetch only one row

      if (!error && data) {
        setUserRole(data.role);
      }
      setLoading(false);
    }

    fetchUserRole();  // ✅ Get user role
    fetchAgents();  // ✅ Load agents (only if user is authorized)
    fetchReasons();  // ✅ Load reasons (only if user is authorized)
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

  // ✅ Set up editing
  const startEditing = (agent) => {
    setEditingAgent(agent);
    setUpdatedName(agent.name || "");
    setUpdatedStore(agent.store_number || "");
    setUpdatedRole(agent.role || "agent"); // Default to agent if no role
  };

  // ✅ Save Updated Agent Details
  const saveAgentUpdate = async () => {
    if (!editingAgent) return;

    // Get the role value from the form
    let roleToUpdate = updatedRole;
    
    // If it's "manager", convert it to "store_manager"
    if (roleToUpdate === "manager") {
      roleToUpdate = "store_manager";
    }
    
    // If no role was selected, use the current one
    if (!roleToUpdate) {
      roleToUpdate = editingAgent.role;
    }

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
    agent.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.store_number?.toString().includes(searchQuery)
  );

  if (loading) return <p>Loading...</p>;

  if (userRole !== "admin") {
    return (
      <div className="not-authorized">
        <h2>You are not authorized to view this page.</h2>
      </div>
    );
  }

  return (
    <div className="admin-container">
      {/* Tab Navigation */}
      <div className="admin-tabs">
        <button 
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Manage Users
        </button>
        <button 
          className={`tab-button ${activeTab === 'reasons' ? 'active' : ''}`}
          onClick={() => setActiveTab('reasons')}
        >
          Manage Reasons
        </button>
      </div>
      
      {/* ✅ Manage Users Section */}
      {activeTab === 'users' && (
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
                    <button className="btn-edit" onClick={() => startEditing(agent)}>Edit</button>
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
              <select 
                value={updatedRole} 
                onChange={(e) => setUpdatedRole(e.target.value)}
              >
                <option value="">Select Role</option>
                <option value="agent">Agent</option>
                <option value="store_manager">Store Manager</option>
                <option value="admin">Admin</option>
              </select>
              <div className="button-group">
                <button className="btn-save" onClick={saveAgentUpdate}>Save</button>
                <button className="btn-cancel" onClick={() => setEditingAgent(null)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ✅ Manage Reasons Section */}
      {activeTab === 'reasons' && (
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
      )}

      <style jsx>{`
        .admin-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .admin-tabs {
          display: flex;
          border-bottom: 1px solid #ddd;
          margin-bottom: 20px;
        }
        
        .tab-button {
          padding: 10px 20px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          font-size: 16px;
          margin-right: 10px;
        }
        
        .tab-button.active {
          border-bottom: 2px solid #0070f3;
          color: #0070f3;
          font-weight: bold;
        }
        
        .admin-section {
          margin-bottom: 30px;
        }
        
        .admin-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        
        .admin-table th, .admin-table td {
          padding: 10px;
          border: 1px solid #ddd;
          text-align: left;
        }
        
        .admin-table th {
          background-color: #f5f5f5;
        }
        
        .search-bar {
          width: 100%;
          padding: 10px;
          margin-bottom: 15px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        .edit-section {
          background: #f5f5f5;
          padding: 20px;
          border-radius: 5px;
          margin-top: 20px;
        }
        
        .edit-section h3 {
          margin-top: 0;
        }
        
        .edit-section label {
          display: block;
          margin-top: 10px;
          font-weight: bold;
        }
        
        .edit-section input, .edit-section select {
          width: 100%;
          padding: 8px;
          margin-top: 5px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        .button-group {
          display: flex;
          gap: 10px;
          margin-top: 15px;
        }
        
        .btn-save, .btn-cancel, .btn-edit, .btn-delete, .btn-add {
          padding: 5px 10px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .btn-save {
          background-color: #4caf50;
          color: white;
        }
        
        .btn-cancel {
          background-color: #f44336;
          color: white;
        }
        
        .btn-edit {
          background-color: #2196f3;
          color: white;
        }
        
        .btn-delete {
          background-color: #f44336;
          color: white;
        }
        
        .btn-add {
          background-color: #4caf50;
          color: white;
          padding: 8px 15px;
          margin-left: 10px;
        }
        
        .add-reason {
          margin-top: 20px;
          display: flex;
          align-items: center;
        }
        
        .add-reason input[type="text"] {
          flex: 1;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        .add-reason label {
          margin: 0 15px;
        }
      `}</style>
    </div>
  );
}

export default ProtectedRoute(AdminPage);
