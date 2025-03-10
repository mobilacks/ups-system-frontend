import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [storeNumber, setStoreNumber] = useState(null);
  const [agentsWaiting, setAgentsWaiting] = useState([]);
  const [inQueue, setInQueue] = useState([]);
  const [withCustomer, setWithCustomer] = useState([]);
  const [stats, setStats] = useState([]);
  const [reasons, setReasons] = useState([]);
  const [agentNames, setAgentNames] = useState({}); // New state to store agent names
  const router = useRouter();

  useEffect(() => {
    if (!storeNumber) return;
    fetchQueueData(storeNumber);
    console.log("✅ Subscribing to Supabase Realtime...");
    const queueSubscription = supabase
      .channel("realtime_queue")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue" },
        (payload) => {
          console.log("🔄 Queue update detected:", payload);
          fetchQueueData(storeNumber);
        }
      )
      .subscribe();

    return () => {
      console.log("❌ Unsubscribing from Supabase Realtime...");
      supabase.removeChannel(queueSubscription);
    };
  }, [storeNumber]);

  useEffect(() => {
    async function fetchUser() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        fetchUserStore(user.email);
        fetchReasons();
        fetchAllAgentNames(); // Fetch all agent names
      } else {
        router.push("/login");
      }
    }
    fetchUser();
  }, []);

  // New function to fetch all agent names
  async function fetchAllAgentNames() {
    const { data, error } = await supabase
      .from("agents")
      .select("email, name");
    
    if (!error && data) {
      // Create a mapping of email -> name
      const namesMap = {};
      data.forEach(agent => {
        namesMap[agent.email] = agent.name;
      });
      setAgentNames(namesMap);
    } else {
      console.error("Error fetching agent names:", error);
    }
  }

  async function fetchUserStore(email) {
    const { data, error } = await supabase
      .from("agents")
      .select("store_number, role")
      .eq("email", email)
      .single();

    if (!error && data) {
      setStoreNumber(data.store_number);
      setUserRole(data.role);
      fetchQueueData(data.store_number, data.role);
    }
  }

  async function fetchQueueData(storeNum, userRole) {
    let query = supabase.from("queue").select("*").order("queue_joined_at", { ascending: true });

    if (userRole !== "admin") {
      query = query.eq("store_number", storeNum);
    }

    const { data, error } = await query;

    if (!error) {
      setAgentsWaiting(data.filter(a => a.agents_waiting));
      setInQueue(data.filter(a => a.in_queue));
      setWithCustomer(data.filter(a => a.with_customer));
    }
  }

  async function fetchReasons() {
    const { data, error } = await supabase.from("reasons").select("*");
    if (!error) {
      setReasons(data);
    }
  }

  const handleQueueAction = async (action, email) => {
    // All roles can now manage all users in the queue
    const functionMap = {
      "join_queue": "join_queue",
      "move_to_agents_waiting": "move_to_agents_waiting",
      "move_to_with_customer": "move_to_with_customer",
      "move_to_in_queue": "move_to_in_queue"
    };

    const { error } = await supabase.rpc(functionMap[action], { p_email: email });
    if (!error) {
      fetchQueueData(storeNumber);
    } else {
      console.error("Error updating queue:", error);
    }
  };

  async function handleSaleClosure(email) {
    // All roles can now manage sales for all users
    let contractNumber;
    while (!contractNumber) {
      contractNumber = prompt("Enter Contract # (Required)");
      if (contractNumber === null) return;
    }

    let saleAmount;
    while (!saleAmount || isNaN(saleAmount) || parseFloat(saleAmount) <= 0) {
      saleAmount = prompt("Enter Sale Amount (Required, must be a number)");
      if (saleAmount === null) return;
    }

    saleAmount = parseFloat(saleAmount);

    const { error } = await supabase.rpc("close_sale", {
      p_email: email,
      p_contract_number: contractNumber,
      p_sale_amount: saleAmount
    });

    if (!error) {
      console.log("✅ Sale recorded successfully!");
      fetchQueueData(storeNumber);
    } else {
      console.error("❌ Error closing sale:", error);
    }
  }

  async function handleNoSale(email) {
    // All roles can now manage no-sales for all users
    let reason;
    while (!reason) {
      reason = prompt(
        "Select a reason:\n" +
        reasons.map((r, index) => `${index + 1}. ${r.reason_text}`).join("\n")
      );

      if (reason === null) return;
      const selectedReason = reasons[parseInt(reason) - 1];

      if (selectedReason) {
        reason = selectedReason;
      } else {
        alert("Invalid selection. Please choose again.");
      }
    }

    const { error } = await supabase.rpc("no_sale", {
      p_email: email,
      p_reason: reason.reason_text
    });

    if (!error) {
      console.log("✅ No Sale recorded successfully!");
      fetchQueueData(storeNumber);
    } else {
      console.error("❌ Error logging no sale:", error);
    }
  }

  // Helper function to get agent name or fallback to email
  const getAgentName = (email) => {
    return agentNames[email] || email;
  };

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
                <td>{getAgentName(agent.email)}</td>
                <td>{agent.store_number}</td>
                <td>
                  {/* All roles can manage all users */}
                  <button className="btn-primary" onClick={() => handleQueueAction("join_queue", agent.email)}>
                    Join Queue
                  </button>
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
                <td>{getAgentName(agent.email)}</td>
                <td>{agent.store_number}</td>
                <td>
                  {/* All roles can manage all users */}
                  <>
                    <button className="btn-green" onClick={() => handleQueueAction("move_to_with_customer", agent.email)}>
                      With Customer
                    </button>
                    <button className="btn-red" onClick={() => handleQueueAction("move_to_agents_waiting", agent.email)}>
                      Move to Agents Waiting
                    </button>
                  </>
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
                <td>{getAgentName(agent.email)}</td>
                <td>{agent.store_number}</td>
                <td>
                  {/* All roles can manage all users */}
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
