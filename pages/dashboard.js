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
  const [selectedStore, setSelectedStore] = useState("");
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
      fetchReasons();
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
      console.error("Error updating queue:", error);
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
      console.error("❌ Error fetching agent's store number:", agentError);
      alert("Error fetching agent details. Please try again.");
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
      console.log("✅ Sale recorded successfully!");
      
      // ✅ Log the sale in logs
      await supabase.from("logs").insert([
        {
          email,
          action_type: "SALE_CLOSED",
          table_name: "sales",
          details: `Contract: ${contractNumber}, Amount: ${saleAmount}`
        }
      ]);

      await handleQueueAction("move_to_agents_waiting", email);
    } else {
      console.error("❌ Error closing sale:", error);
    }
  }

  async function handleNoSale(email) {
    if (email !== user.email) {
      alert("You can only log your own sales!");
      return;
    }

    const reasonOptions = reasons.map((r, index) => `${index + 1}: ${r.reason_text}`).join("\n");
    const reasonIndex = prompt(`Select a reason:\n${reasonOptions}`);

    if (!reasonIndex || isNaN(reasonIndex) || reasonIndex < 1 || reasonIndex > reasons.length) {
      alert("Invalid selection. Please try again.");
      return;
    }

    const selectedReason = reasons[reasonIndex - 1];

    const { error } = await supabase.rpc("no_sale", {
      p_email: email,
      p_reason: selectedReason.reason_text
    });

    if (!error) {
      console.log("✅ No Sale logged successfully!");

      await supabase.from("logs").insert([
        {
          email,
          action_type: "QUEUE_NO_SALE",
          table_name: "queue",
          details: `Reason: ${selectedReason.reason_text}`
        }
      ]);

      if (selectedReason.ups_count) {
        await supabase.rpc("increment_ups", { p_email: email });
      }
      fetchQueueData(storeNumber);
    } else {
      console.error("❌ Error logging No Sale:", error);
    }
  }

  return (
    <div className="dashboard-container">
      <h1 className="text-2xl font-bold text-center mb-4">Dashboard</h1>

      <div className="dashboard-section">
        <h3>Agents Waiting</h3>
        <table>
          <tbody>
            {agentsWaiting.map(agent => (
              <tr key={agent.email}>
                <td>{agent.email}</td>
                <td>
                  {agent.email === user.email && (
                    <button onClick={() => handleQueueAction("join_queue", agent.email)}>
                      Join Queue
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="dashboard-section">
        <h3>With Customer</h3>
        <table>
          <tbody>
            {withCustomer.map(agent => (
              <tr key={agent.email}>
                <td>{agent.email}</td>
                <td>
                  {agent.email === user.email && (
                    <>
                      <button onClick={() => handleQueueAction("move_to_in_queue", agent.email)}>Back to Queue</button>
                      <button onClick={() => handleSaleClosure(agent.email, prompt("Enter Contract #"), prompt("Enter Sale Amount"))}>Close Sale</button>
                      <button onClick={() => handleNoSale(agent.email)}>No Sale</button>
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
