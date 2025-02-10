import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";

export default function Dashboard() {
  const [user, setUser] = useState(null);
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
        resetQueueOnLogin(user.email); // Reset queue state on login
        fetchQueueData();
        fetchStats();
      } else {
        router.push("/login"); // Redirect to login if not authenticated
      }
    }
    fetchUser();
  }, []);

  // ✅ Reset queue state when agent logs in
  async function resetQueueOnLogin(email) {
    await supabase.rpc("move_to_agents_waiting", { p_email: email });
  }

  // ✅ Fetch queue data
  async function fetchQueueData() {
    const { data, error } = await supabase.from("queue").select("*");
    if (!error) {
      setAgentsWaiting(data.filter(a => a.agents_waiting));
      setInQueue(data.filter(a => a.in_queue));
      setWithCustomer(data.filter(a => a.with_customer));
    }
  }

  // ✅ Fetch daily stats
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

  // ✅ Handle queue movements
  async function handleQueueAction(action, email) {
    const functionMap = {
      "join_queue": "join_queue",
      "move_to_agents_waiting": "move_to_agents_waiting",
      "move_to_with_customer": "move_to_with_customer",
      "move_to_in_queue": "move_to_in_queue"
    };

    const { error } = await supabase.rpc(functionMap[action], { p_email: email });
    if (!error) {
      fetchQueueData();
      fetchStats();
    } else {
      console.error("Error updating queue:", error);
    }
  }

  // ✅ Handle sale closure
  async function handleSaleClosure(email, contractNumber, saleAmount) {
    const { error } = await supabase.from("sales").insert([
      { email, contract_number: contractNumber, sale_amount: saleAmount }
    ]);
    
    if (!error) {
      await handleQueueAction("move_to_agents_waiting", email);
    } else {
      console.error("Error closing sale:", error);
    }
  }

  // ✅ Handle logout (resets queue status)
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
        <button className="bg-red-500 text-white px-3 py-2 rounded-md text-sm" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {/* Agents Waiting Section */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold bg-gray-200 p-2 rounded-md">Agents Waiting</h2>
        <ul>
          {agentsWaiting.map(agent => (
            <li key={agent.email} className="flex justify-between items-center border-b p-2">
              <span>{agent.email} (Store {agent.store_number})</span>
              <button className="bg-blue-500 text-white px-3 py-1 rounded-md" onClick={() => handleQueueAction("join_queue", agent.email)}>
                Join Queue
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* In Queue Section */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold bg-gray-200 p-2 rounded-md">In Queue</h2>
        <ul>
          {inQueue.map(agent => (
            <li key={agent.email} className="flex justify-between items-center border-b p-2">
              <span>{agent.email} (Store {agent.store_number})</span>
              <div>
                <button className="bg-green-500 text-white px-3 py-1 rounded-md mr-2" onClick={() => handleQueueAction("move_to_with_customer", agent.email)}>
                  With Customer
                </button>
                <button className="bg-red-500 text-white px-3 py-1 rounded-md" onClick={() => handleQueueAction("move_to_agents_waiting", agent.email)}>
                  Move to Agents Waiting
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* With Customer Section */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold bg-gray-200 p-2 rounded-md">With Customer</h2>
        <ul>
          {withCustomer.map(agent => (
            <li key={agent.email} className="border-b p-2">
              <span>{agent.email} (Store {agent.store_number})</span>
              <div className="flex space-x-2 mt-2">
                <button className="bg-blue-500 text-white px-3 py-1 rounded-md" onClick={() => handleQueueAction("move_to_in_queue", agent.email)}>
                  Back to Queue
                </button>
                <button className="bg-green-500 text-white px-3 py-1 rounded-md" onClick={() => handleSaleClosure(agent.email, prompt("Enter Contract #"), prompt("Enter Sale Amount"))}>
                  Close Sale
                </button>
                <button className="bg-yellow-500 text-white px-3 py-1 rounded-md" onClick={() => handleQueueAction("move_to_agents_waiting", agent.email)}>
                  No Sale
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Daily Stats Section */}
      <div>
        <h2 className="text-xl font-semibold bg-gray-200 p-2 rounded-md">Daily Stats</h2>
        <table className="min-w-full border mt-2">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Agent</th>
              <th className="border p-2">UPS</th>
              <th className="border p-2">Sales</th>
              <th className="border p-2">Total Sales</th>
              <th className="border p-2">Avg Sale</th>
            </tr>
          </thead>
          <tbody>
            {stats.map(stat => (
              <tr key={stat.email} className="border">
                <td className="border p-2">{stat.email}</td>
                <td className="border p-2">{stat.ups}</td>
                <td className="border p-2">{stat.sales}</td>
                <td className="border p-2">${stat.totalSales}</td>
                <td className="border p-2">${stat.avgSale}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
