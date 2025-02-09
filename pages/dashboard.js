import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";

export default function Dashboard() {
  const [agents, setAgents] = useState([]);
  const [userEmail, setUserEmail] = useState("");
  const router = useRouter();

  // ✅ Fetch Current User & Agents Data
  useEffect(() => {
    async function fetchUserAndAgents() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login"); // Redirect if not logged in
        return;
      }
      setUserEmail(user.email);

      const { data: agentData, error } = await supabase
        .from("agents")
        .select("*");

      if (error) console.error("Error fetching agents:", error);
      else setAgents(agentData);
    }

    fetchUserAndAgents();
  }, [router]);

  // ✅ Handle Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // ✅ Categorize Agents
  const waitingAgents = agents.filter(agent => agent.queue_status === "waiting");
  const withCustomerAgents = agents.filter(agent => agent.queue_status === "with_customer");
  const idleAgents = agents.filter(agent => agent.queue_status === "idle");

  return (
    <div className="min-h-screen p-6 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
      {/* ✅ Top Section with Logout Button */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <button onClick={handleLogout} className="text-sm px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded">
          Logout
        </button>
      </div>

      {/* ✅ Queue System */}
      <div className="grid grid-cols-3 gap-6">
        {/* 🔹 Agents Waiting */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold bg-blue-600 text-white p-2 rounded">Agents Waiting</h2>
          {waitingAgents.length === 0 ? (
            <p className="text-gray-500">No agents waiting.</p>
          ) : (
            waitingAgents.map(agent => (
              <div key={agent.email} className="flex justify-between items-center p-2 border-b">
                <span>{agent.name}</span>
                <button className="bg-green-500 text-white px-3 py-1 rounded">Rejoin Queue</button>
              </div>
            ))
          )}
          <button className="mt-3 w-full bg-blue-500 text-white p-2 rounded">Join Queue</button>
        </div>

        {/* 🔹 With Customer */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold bg-yellow-600 text-white p-2 rounded">With Customer</h2>
          {withCustomerAgents.length === 0 ? (
            <p className="text-gray-500">No agents with customers.</p>
          ) : (
            withCustomerAgents.map(agent => (
              <div key={agent.email} className="flex justify-between items-center p-2 border-b">
                <span>{agent.name}</span>
                <div>
                  <button className="bg-blue-500 text-white px-3 py-1 rounded mr-2">Rejoin Queue</button>
                  <button className="bg-green-500 text-white px-3 py-1 rounded">Sale Completed</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 🔹 Idle Agents */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold bg-gray-600 text-white p-2 rounded">Idle Agents</h2>
          {idleAgents.length === 0 ? (
            <p className="text-gray-500">No idle agents.</p>
          ) : (
            idleAgents.map(agent => (
              <div key={agent.email} className="flex justify-between items-center p-2 border-b">
                <span>{agent.name}</span>
                <button className="bg-blue-500 text-white px-3 py-1 rounded">Rejoin Queue</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
