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
        fetchQueueData();
        fetchStats();
      } else {
        router.push("/login"); // Redirect to login if not authenticated
      }
    }
    fetchUser();
  }, []);

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

  // ✅ Handle logout
  async function handleLogout() {
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
        <table className="min-w-full border mt-2">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Agent Name</th>
              <th className="border p-2">Store</th>
              <th className="border p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {agentsWaiting.map((agent) => (
              <tr key={agent.email} className="border">
                <td className="border p-2">{agent.email}</td>
                <td className="border p-2">{agent.store_number}</td>
                <td className="border p-2">
                  <button
                    className="bg-blue-500 text-white px-2 py-1 rounded-md"
                    onClick={() => handleQueueAction("join_queue", agent.email)}
                  >
                    Join Queue
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* In Queue Section */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold bg-gray-200 p-2 rounded-md">In Queue</h2>
        <table className="min-w-full border mt-2">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Agent Name</th>
              <th className="border p-2">Store</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {inQueue.map((agent) => (
              <tr key={agent.email} className="border">
                <td className="border p-2">{agent.email}</td>
                <td className="border p-2">{agent.store_number}</td>
                <td className="border p-2 flex space-x-2">
                  <button
                    className="bg-green-500 text-white px-2 py-1 rounded-md"
                    onClick={() => handleQueueAction("move_to_with_customer", agent.email)}
                  >
                    With Customer
                  </button>
                  <button
                    className="bg-red-500 text-white px-2 py-1 rounded-md"
                    onClick={() => handleQueueAction("move_to_agents_waiting", agent.email)}
                  >
                    Move to Agents Waiting
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* With Customer Section */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold bg-gray-200 p-2 rounded-md">With Customer</h2>
        <table className="min-w-full border mt-2">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Agent Name</th>
              <th className="border p-2">Store</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {withCustomer.map((agent) => (
              <tr key={agent.email} className="border">
                <td className="border p-2">{agent.email}</td>
                <td className="border p-2">{agent.store_number}</td>
                <td className="border p-2 flex space-x-2">
                  <button
                    className="bg-blue-500 text-white px-2 py-1 rounded-md"
                    onClick={() => handleQueueAction("move_to_in_queue", agent.email)}
                  >
                    Back to Queue
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
            {stats.map((stat) => (
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
