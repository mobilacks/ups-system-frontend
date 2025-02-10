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
      .eq("store_number", storeNum); // ✅ Fetch only agents from the same store

    if (!error) {
      setAgentsWaiting(data.filter(a => a.agents_waiting));
      setInQueue(data.filter(a => a.in_queue));
      setWithCustomer(data.filter(a => a.with_customer));
    }
  }

  async function fetchStats() {
    const { data, error } = await supabase
      .from("sales")
      .select("email, contract_number, sale_amount")
      .order("created_at", { ascending: false });

    if (!error) {
      const groupedStats = data.reduce((acc, sale) => {
        if (!acc[sale.email]) {
          acc[sale.email] = { ups: 0, sales: 0, totalSales: 0 };
        }
        acc[sale.email].ups += 1; 
        acc[sale.email].sales += sale.sale_amount ? 1 : 0;
        acc[sale.email].totalSales += sale.sale_amount || 0;
        return acc;
      }, {});

      setStats(Object.keys(groupedStats).map(email => ({
        email,
        ups: groupedStats[email].ups,
        sales: groupedStats[email].sales,
        totalSales: groupedStats[email].totalSales,
        avgSale: groupedStats[email].sales > 0 
          ? (groupedStats[email].totalSales / groupedStats[email].sales).toFixed(2)
          : 0
      })));
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

  async function handleSaleClosure(email, contractNumber, saleAmount) {
    if (email !== user.email) {
      alert("You can only log your own sales!");
      return;
    }

    const { error } = await supabase.from("sales").insert([
      { email, contract_number: contractNumber, sale_amount: saleAmount }
    ]);
    
    if (!error) {
      await handleQueueAction("move_to_agents_waiting", email);
    } else {
      console.error("Error closing sale:", error);
    }
  }

  async function handleLogout() {
    if (user) {
      await supabase.rpc("move_to_agents_waiting", { p_email: user.email });
    }
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="p-6">
      {/* Top Navigation Bar */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
 //       <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </div>

      {/* Agents Waiting Section */}
      <div className="queue-section">
        <h2>Agents Waiting</h2>
        <ul className="queue-list">
          {agentsWaiting.map(agent => (
            <li key={agent.email} className="queue-item">
              <span>{agent.email} (Store {agent.store_number})</span>
              {agent.email === user.email && (
                <button className="btn-primary" onClick={() => handleQueueAction("join_queue", agent.email)}>
                  Join Queue
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* In Queue Section */}
      <div className="queue-section">
        <h2>In Queue</h2>
        <ul className="queue-list">
          {inQueue.map(agent => (
            <li key={agent.email} className="queue-item">
              <span>{agent.email} (Store {agent.store_number})</span>
              {agent.email === user.email && (
                <div className="btn-group">
                  <button className="btn-green" onClick={() => handleQueueAction("move_to_with_customer", agent.email)}>
                    With Customer
                  </button>
                  <button className="btn-red" onClick={() => handleQueueAction("move_to_agents_waiting", agent.email)}>
                    Move to Agents Waiting
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* With Customer Section */}
      <div className="queue-section">
        <h2>With Customer</h2>
        <ul className="queue-list">
          {withCustomer.map(agent => (
            <li key={agent.email} className="queue-item">
              <span>{agent.email} (Store {agent.store_number})</span>
              {agent.email === user.email && (
                <div className="btn-group">
                  <button className="btn-primary" onClick={() => handleQueueAction("move_to_in_queue", agent.email)}>
                    Back to Queue
                  </button>
                  <button className="btn-green" onClick={() => handleSaleClosure(agent.email, prompt("Enter Contract #"), prompt("Enter Sale Amount"))}>
                    Close Sale
                  </button>
                  <button className="btn-yellow" onClick={() => handleQueueAction("move_to_agents_waiting", agent.email)}>
                    No Sale
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
