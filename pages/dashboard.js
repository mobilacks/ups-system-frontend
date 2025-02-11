import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [storeNumber, setStoreNumber] = useState(null);
  const [agentsWaiting, setAgentsWaiting] = useState([]);
  const [inQueue, setInQueue] = useState([]);
  const [withCustomer, setWithCustomer] = useState([]);
  const [stats, setStats] = useState([]);
  const [reasons, setReasons] = useState([]);
  const router = useRouter();

  useEffect(() => {
    async function fetchUser() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        fetchUserStore(user.email);
      } else {
        router.push("/login");
      }
    }
    fetchUser();
    fetchReasons(); // Load reasons on page load
  }, []);

  async function fetchUserStore(email) {
    const { data, error } = await supabase
      .from("agents")
      .select("store_number")
      .eq("email", email)
      .single();

    if (!error) {
      setStoreNumber(data.store_number);
      resetQueueOnLogin(email);
      fetchQueueData(data.store_number);
      fetchStats();
    }
  }

  async function resetQueueOnLogin(email) {
    await supabase.rpc("move_to_agents_waiting", { p_email: email });
  }

  async function fetchQueueData(storeNum) {
    const { data, error } = await supabase
      .from("queue")
      .select("*")
      .eq("store_number", storeNum);

    if (!error) {
      setAgentsWaiting(data.filter(a => a.agents_waiting));
      setInQueue(data.filter(a => a.in_queue));
      setWithCustomer(data.filter(a => a.with_customer));
    }
  }

  async function fetchStats() {
    const { data, error } = await supabase.rpc("get_sales_stats");
    if (!error) {
      setStats(data);
    }
  }

  async function fetchReasons() {
    const { data, error } = await supabase
      .from("reasons")
      .select("id, reason_text, ups_count");

    if (!error) {
      setReasons(data);
    } else {
      console.error("❌ Error fetching reasons:", error);
    }
  }

  async function handleQueueAction(action, email) {
    if (email !== user.email) {
      alert("You can only manage your own queue status!");
      return;
    }

    const functionMap = {
      "join_queue": "join_queue",
      "move_to_agents_waiting": "move_to_agents_waiting",
      "move_to_with_customer": "move_to_with_customer",
      "move_to_in_queue": "move_to_in_queue"
    };

    const { error } = await supabase.rpc(functionMap[action], { p_email: email });
    if (!error) {
      fetchQueueData(storeNumber);
      fetchStats();
    } else {
      console.error("❌ Error updating queue:", error);
    }
  }

  async function handleSaleClosure(email, contractNumber, saleAmount) {
    if (email !== user.email) {
      alert("You can only log your own sales!");
      return;
    }

    const { data: agentData, error: agentError } = await supabase
      .from("agents")
      .select("store_number")
      .eq("email", email)
      .single();

    if (agentError || !agentData) {
      console.error("❌ Error fetching agent store number:", agentError);
      alert("Error fetching agent details.");
      return;
    }

    const { error } = await supabase.from("sales").insert([
      { email, contract_number: contractNumber, sale_amount: saleAmount, store_number: agentData.store_number }
    ]);

    if (!error) {
      await supabase.from("logs").insert([
        { email, action_type: "SALE_CLOSED", table_name: "sales", details: `Contract: ${contractNumber}, Amount: $${saleAmount}` }
      ]);
      await handleQueueAction("move_to_agents_waiting", email);
      alert("✅ Sale recorded successfully!");
    } else {
      console.error("❌ Error closing sale:", error);
    }
  }

  async function handleNoSale(email) {
    if (email !== user.email) {
      alert("You can only log your own no-sale reason!");
      return;
    }

    const selectedReason = prompt("Select a reason:\n" + reasons.map(r => `${r.id}: ${r.reason_text}`).join("\n"));

    if (!selectedReason || !reasons.find(r => r.id == selectedReason)) {
      alert("Invalid reason selected.");
      return;
    }

    const reasonText = reasons.find(r => r.id == selectedReason).reason_text;
    const upsCount = reasons.find(r => r.id == selectedReason).ups_count;

    const { error } = await supabase.rpc("no_sale", { p_email: email, p_reason: reasonText });

    if (!error) {
      await supabase.from("logs").insert([
        { email, action_type: "QUEUE_NO_SALE", table_name: "queue", details: `Reason: ${reasonText}` }
      ]);
      if (upsCount) {
        await supabase.rpc("increment_ups_count", { p_email: email });
      }
      fetchQueueData(storeNumber);
      fetchStats();
      alert("✅ No Sale logged successfully!");
    } else {
      console.error("❌ Error logging No Sale:", error);
    }
  }

  return (
    <div className="dashboard-container">
      <h1 className="text-2xl font-bold text-center mb-4">Dashboard</h1>

      {/* Agents Waiting Section */}
      <div className="dashboard-section">
        <h3>Agents Waiting</h3>
        <table>
          <thead>
            <tr>
              <th>Agent Name</th>
              <th>Store</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {agentsWaiting.map(agent => (
              <tr key={agent.email}>
                <td>{agent.email}</td>
                <td>{agent.store_number}</td>
                <td>
                  {agent.email === user.email && (
                    <button onClick={() => handleQueueAction("join_queue", agent.email)}>Join Queue</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* In Queue Section */}
      <div className="dashboard-section">
        <h3>In Queue</h3>
        <table>
          <thead>
            <tr>
              <th>Agent Name</th>
              <th>Store</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {inQueue.map(agent => (
              <tr key={agent.email}>
                <td>{agent.email}</td>
                <td>{agent.store_number}</td>
                <td>
                  {agent.email === user.email && (
                    <>
                      <button onClick={() => handleQueueAction("move_to_with_customer", agent.email)}>With Customer</button>
                      <button onClick={() => handleQueueAction("move_to_agents_waiting", agent.email)}>Move to Agents Waiting</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* With Customer Section */}
      <div className="dashboard-section">
        <h3>With Customer</h3>
        <table>
          <tbody>
            {withCustomer.map(agent => (
              <tr key={agent.email}>
                <td>{agent.email}</td>
                <td>
                  <button onClick={() => handleQueueAction("move_to_in_queue", agent.email)}>Back to Queue</button>
                  <button onClick={() => handleSaleClosure(agent.email, prompt("Enter Contract #"), prompt("Enter Sale Amount"))}>Close Sale</button>
                  <button onClick={() => handleNoSale(agent.email)}>No Sale</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
