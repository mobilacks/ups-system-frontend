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
        fetchReasons();
      } else {
        router.push("/login");
      }
    }
    fetchUser();
  }, []);

  async function fetchUserStore(email) {
    const { data, error } = await supabase
      .from("agents")
      .select("store_number")
      .eq("email", email)
      .single();

    if (!error) {
      setStoreNumber(data.store_number);
      fetchQueueData(data.store_number);
      fetchStats();
    }
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
    const { data, error } = await supabase.from("reasons").select("*");
    if (!error) {
      setReasons(data);
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
      console.error("Error updating queue:", error);
    }
  }

  async function handleNoSale(email) {
    if (email !== user.email) {
      alert("You can only log your own no-sale reasons!");
      return;
    }

    let reasonId;
    let reasonText;
    let upsCount;

    while (!reasonId) {
      const reasonSelection = prompt(
        "Select a reason:\n" +
        reasons.map((r, index) => `${index + 1}. ${r.reason_text}`).join("\n")
      );

      if (reasonSelection === null) return;
      const selectedReason = reasons[parseInt(reasonSelection) - 1];

      if (selectedReason) {
        reasonId = selectedReason.id;
        reasonText = selectedReason.reason_text;
        upsCount = selectedReason.ups_count;
      } else {
        alert("Invalid selection. Please choose again.");
      }
    }

    const moveFunction = reasonText === "Not A Customer" ? "move_to_in_queue" : "move_to_agents_waiting";
    await handleQueueAction(moveFunction, email);

    const { error: logError } = await supabase.from("logs").insert([
      {
        email,
        action_type: "NO_SALE",
        table_name: "queue",
        details: `No Sale Reason: ${reasonText}`,
        created_at: new Date().toLocaleString("en-US", { timeZone: "America/Chicago" }),
      }
    ]);

    if (logError) {
      console.error("❌ Error logging no sale:", logError);
    } else {
      console.log("✅ No Sale logged successfully!");
    }

    const { error: upsError } = await supabase.from("ups_tracking").insert([
      {
        email,
        store_number: storeNumber,
        timestamp: new Date().toISOString(),
        ups_sale: reasonText,
        ups_count: upsCount ? 1 : 0
      }
    ]);

    if (upsError) {
      console.error("❌ Error updating UPS tracking:", upsError);
    } else {
      console.log("✅ UPS tracking updated successfully!");
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
                    <button className="btn-primary" onClick={() => handleQueueAction("join_queue", agent.email)}>
                      Join Queue
                    </button>
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
                      <button className="btn-green" onClick={() => handleQueueAction("move_to_with_customer", agent.email)}>
                        With Customer
                      </button>
                      <button className="btn-red" onClick={() => handleQueueAction("move_to_agents_waiting", agent.email)}>
                        Move to Agents Waiting
                      </button>
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
          <thead>
            <tr>
              <th>Agent Name</th>
              <th>Store</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {withCustomer.map(agent => (
              <tr key={agent.email}>
                <td>{agent.email}</td>
                <td>{agent.store_number}</td>
                <td>
                  {agent.email === user.email && (
                    <>
                      <button className="btn-primary" onClick={() => handleQueueAction("move_to_in_queue", agent.email)}>
                        Back to Queue
                      </button>
                      <button className="btn-green" onClick={() => handleSaleClosure(agent.email)}>
                        Close Sale
                      </button>
                      <button className="btn-yellow" onClick={() => handleNoSale(agent.email)}>
                        No Sale
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
