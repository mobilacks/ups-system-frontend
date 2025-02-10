import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function AdminPage() {
  const [agents, setAgents] = useState([]);
  const [reasons, setReasons] = useState([]);
  const [newAgent, setNewAgent] = useState({ name: "", email: "", storeNumber: "", role: "agent" });
  const [newReason, setNewReason] = useState({ reason_text: "", ups_count: false });

  useEffect(() => {
    fetchAgents();
    fetchReasons();
  }, []);

  async function fetchAgents() {
    const { data, error } = await supabase.from("agents").select("*");
    if (error) console.error("❌ Error fetching agents:", error);
    else setAgents(data);
  }

  async function fetchReasons() {
    const { data, error } = await supabase.from("reasons").select("*");
    if (error) console.error("❌ Error fetching reasons:", error);
    else setReasons(data);
  }

  async function addAgent() {
    if (!newAgent.email.endsWith("@lacksvalley.com")) {
      alert("Agents must have a valid Lacks email.");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: newAgent.email,
      password: "TemporaryPass123", // Temporary password
    });

    if (error) {
      console.error("❌ Error creating user:", error);
      return;
    }

    const { error: agentError } = await supabase.from("agents").insert([
      {
        email: newAgent.email,
        name: newAgent.name,
        store_number: parseInt(newAgent.storeNumber, 10),
        role: newAgent.role,
        status: "offline",
      },
    ]);

    if (agentError) console.error("❌ Error adding agent:", agentError);
    else fetchAgents();
  }

  async function deleteAgent(email) {
    if (!window.confirm("Are you sure you want to delete this agent?")) return;

    await supabase.from("agents").delete().eq("email", email);
    await supabase.auth.admin.deleteUser(email);
    fetchAgents();
  }

  async function addReason() {
    const { error } = await supabase.from("reasons").insert([newReason]);
    if (error) console.error("❌ Error adding reason:", error);
    else fetchReasons();
  }

  async function deleteReason(id) {
    if (!window.confirm("Are you sure you want to delete this reason?")) return;

    await supabase.from("reasons").delete().eq("id", id);
    fetchReasons();
  }

  return (
    <div className="admin-container">
      <h1>Admin Panel</h1>

      {/* Manage Users */}
      <section className="admin-section">
        <h2>Manage Users</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Store</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((agent) => (
              <tr key={agent.email}>
                <td>{agent.name}</td>
                <td>{agent.email}</td>
                <td>{agent.store_number}</td>
                <td>{agent.role}</td>
                <td>{agent.status}</td>
                <td>
                  <button className="btn-red" onClick={() => deleteAgent(agent.email)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Add Agent Form */}
        <div className="admin-form">
          <input type="text" placeholder="Full Name" onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })} />
          <input type="email" placeholder="Email" onChange={(e) => setNewAgent({ ...newAgent, email: e.target.value })} />
          <input type="number" placeholder="Store #" onChange={(e) => setNewAgent({ ...newAgent, storeNumber: e.target.value })} />
          <select onChange={(e) => setNewAgent({ ...newAgent, role: e.target.value })}>
            <option value="agent">Agent</option>
            <option value="store_manager">Store Manager</option>
            <option value="admin">Admin</option>
          </select>
          <button className="btn-green" onClick={addAgent}>Add Agent</button>
        </div>
      </section>

      {/* Manage Reasons */}
      <section className="admin-section">
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
                  <button className="btn-red" onClick={() => deleteReason(reason.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Add Reason Form */}
        <div className="admin-form">
          <input type="text" placeholder="New Reason" onChange={(e) => setNewReason({ ...newReason, reason_text: e.target.value })} />
          <label>
            <input type="checkbox" onChange={(e) => setNewReason({ ...newReason, ups_count: e.target.checked })} />
            Count towards UPS?
          </label>
          <button className="btn-green" onClick={addReason}>Add Reason</button>
        </div>
      </section>
    </div>
  );
}
