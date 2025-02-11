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
  const [reasons, setReasons] = useState([]); // Store reasons for "No Sale"
  const [selectedStore, setSelectedStore] = useState(""); // Store filter
  const router = useRouter();

  useEffect(() => {
    async function fetchUser() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        fetchUserStore(user.email);
        fetchReasons(); // Fetch reasons on load
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

  async function handleSaleClosure(email) {
    if (email !== user.email) {
      alert("You can only log your own sales!");
      return;
    }

    const contractNumber = prompt("Enter Contract #");
    const saleAmount = prompt("Enter Sale Amount");

    if (!contractNumber || !saleAmount) {
      alert("Contract # and Sale Amount are required.");
      return;
    }

    const { data: agentData, error: agentError } = await supabase
      .from("agents")
      .select("store_number")
      .eq("email", email)
      .single();

    if (agentError || !agentData) {
      alert("Error fetching agent details.");
      return;
    }

    const { error } = await supabase.from("sales").insert([
      {
        email,
        contract_number: contractNumber,
        sale_amount: saleAmount,
        store_number: agentData.store_number,
      }
    ]);

    if (!error) {
      await supabase.from("logs").insert([
        {
          email,
          action_type: "SALE_CLOSED",
          table_name: "sales",
          details: `Contract: ${contractNumber}, Amount: $${saleAmount}`,
        }
      ]);

      await handleQueueAction("move_to_agents_waiting", email);
      alert("Sale recorded successfully!");
    } else {
      alert("Error recording sale.");
    }
  }

  async function handleNoSale(email) {
    if (email !== user.email) {
      alert("You can only log your own actions!");
      return;
    }

    const reason = prompt("Enter Reason ID (Use dropdown in final UI)"); // Replace with UI dropdown in future
    const selectedReason = reasons.find(r => r.id === parseInt(reason));

    if (!selectedReason) {
      alert("Invalid reason selected.");
      return;
    }

    await supabase.from("logs").insert([
      {
        email,
        action_type: "NO_SALE",
        table_name: "sales",
        details: `No Sale Reason: ${selectedReason.reason_text}`,
      }
    ]);

    if (selectedReason.ups_count) {
      console.log("✅ Adding +1 UPS due to reason policy.");
      await supabase.rpc("increment_ups", { p_email: email });
    }

    await handleQueueAction("move_to_agents_waiting", email);
    alert("No Sale recorded successfully!");
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
      {/* Daily Stats Section */}
      <div className="dashboard-section">
        <h3>Daily Stats</h3>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th># of UPS</th>
              <th># of Sales</th>
              <th>Total Sales</th>
              <th>Close Rate</th>
              <th>Avg Sale</th>
            </tr>
          </thead>
          <tbody>
            {stats.map(stat => (
              <tr key={stat.email}>
                <td>{stat.name}</td>
                <td>{stat.ups_count}</td>
                <td>{stat.sale_count}</td>
                <td>${stat.total_sales}</td>
                <td>{stat.close_rate}%</td>
                <td>${stat.avg_sale}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
