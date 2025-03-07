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
  const [storeFilter, setStoreFilter] = useState(""); // Store filter state
  const [uniqueStores, setUniqueStores] = useState([]); // Unique store numbers
  const router = useRouter();

  useEffect(() => {
    if (!storeNumber) return;
    
    fetchQueueData(storeFilter || storeNumber);
    console.log("✅ Subscribing to Supabase Realtime...");
    const queueSubscription = supabase
      .channel("realtime_queue")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue" },
        (payload) => {
          console.log("🔄 Queue update detected:", payload);
          fetchQueueData(storeFilter || storeNumber);
        }
      )
      .subscribe();

    return () => {
      console.log("❌ Unsubscribing from Supabase Realtime...");
      supabase.removeChannel(queueSubscription);
    };
  }, [storeNumber, storeFilter]);

  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        fetchUserStore(user.email);
        fetchReasons();
        fetchAllAgentNames(); // Fetch all agent names
        
        // Only fetch stores if user is admin
        if (userRole === "admin") {
          fetchUniqueStores();
        }
      } else {
        router.push("/login");
      }
    }
    fetchUser();
  }, [userRole]);

  // New function to fetch all unique store numbers
  async function fetchUniqueStores() {
    const { data, error } = await supabase
      .from("agents")
      .select("store_number")
      .order("store_number");
    
    if (!error && data) {
      // Extract unique store numbers
      const stores = [...new Set(data.map(agent => agent.store_number))];
      setUniqueStores(stores);
    } else {
      console.error("Error fetching store numbers:", error);
    }
  }

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
      
      // If admin, allow store filtering, but for others, always filter to their store
      if (data.role === "admin") {
        setStoreFilter("");
        // Fetch stores for admins
        fetchUniqueStores();
      } else {
        // For non-admins, set their store as the filter and don't allow changing
        setStoreFilter(data.store_number.toString());
      }
      
      fetchQueueData(data.store_number, data.role);
    }
  }

  async function fetchQueueData(storeNum, userRole) {
    let query = supabase.from("queue").select("*").order("queue_joined_at", { ascending: true });

    // For admins, apply store filter if selected
    if (userRole === "admin" && storeFilter) {
      query = query.eq("store_number", storeFilter);
    } else if (userRole === "admin" && !storeFilter) {
      // Admin with no filter - show all stores
    } else {
      // Non-admins always see only their store
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
    // All of our functions now use the new signature with actor email
    const functionMap = {
      "join_queue": "join_queue",
      "move_to_agents_waiting": "move_to_agents_waiting",
      "move_to_with_customer": "move_to_with_customer",
      "move_to_in_queue": "move_to_in_queue"
    };

    console.log(`Performing ${action} for ${email}, actor: ${user.email}`);
    
    const { error } = await supabase.rpc(functionMap[action], { 
      p_email: email,
      p_actor_email: user.email 
    });
    
    if (error) {
      console.error(`Error with ${action}:`, error);
    } else {
      console.log(`✅ ${action} completed successfully!`);
      fetchQueueData(storeFilter || storeNumber, userRole);
    }
  };

  async function handleSaleClosure(email) {
    // Updated to include actor tracking
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

    console.log(`Recording sale for ${email}, amount: $${saleAmount}, contract: ${contractNumber}, actor: ${user.email}`);
    
    // Pass both the target email and the actor email (current user)
    const { error } = await supabase.rpc("close_sale", {
      p_email: email,
      p_contract_number: contractNumber,
      p_sale_amount: saleAmount,
      p_actor_email: user.email
    });

    if (!error) {
      console.log("✅ Sale recorded successfully!");
      fetchQueueData(storeFilter || storeNumber, userRole);
    } else {
      console.error("❌ Error closing sale:", error);
      alert("Error recording sale. Please try again.");
    }
  }

  async function handleNoSale(email) {
    // Updated to include actor tracking
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

    console.log(`Recording no sale for ${email}, reason: ${reason.reason_text}, actor: ${user.email}`);
    
    // Pass both the target email and the actor email (current user)
    const { error } = await supabase.rpc("no_sale", {
      p_email: email,
      p_reason: reason.reason_text,
      p_actor_email: user.email
    });

    if (!error) {
      console.log("✅ No Sale recorded successfully!");
      fetchQueueData(storeFilter || storeNumber, userRole);
    } else {
      console.error("❌ Error logging no sale:", error);
      alert("Error recording no sale. Please try again.");
    }
  }

  // Helper function to get agent name or fallback to email
  const getAgentName = (email) => {
    return agentNames[email] || email;
  };

  // Handle store filter change
  const handleStoreFilterChange = (e) => {
    // Only admins can change the store filter
    if (userRole === "admin") {
      const newStoreFilter = e.target.value;
      setStoreFilter(newStoreFilter);
      fetchQueueData(newStoreFilter || storeNumber, userRole);
    }
  };

  return (
    <div className="dashboard-container">
      <h1 className="text-2xl font-bold text-center mb-4">Dashboard</h1>
      
      {/* Store Filter Dropdown - ONLY show for admins */}
      {userRole === "admin" && (
        <div className="store-filter-container">
          <label htmlFor="storeFilter">Filter by Store: </label>
          <select 
            id="storeFilter" 
            value={storeFilter} 
            onChange={handleStoreFilterChange}
            className="store-filter-dropdown"
          >
            <option value="">All Stores</option>
            {uniqueStores.map(store => (
              <option key={store} value={store.toString()}>Store {store}</option>
            ))}
          </select>
        </div>
      )}
      
      {/* Current Store Display for non-admins */}
      {userRole !== "admin" && storeNumber && (
        <div className="current-store">
          <p>Store: {storeNumber}</p>
        </div>
      )}
      
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
            {agentsWaiting.length > 0 ? (
              agentsWaiting.map(agent => (
                <tr key={agent.email}>
                  <td>{getAgentName(agent.email)}</td>
                  <td>{agent.store_number}</td>
                  <td>
                    <button className="btn-primary" onClick={() => handleQueueAction("join_queue", agent.email)}>
                      Join Queue
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" className="no-agents">No agents waiting</td>
              </tr>
            )}
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
            {inQueue.length > 0 ? (
              inQueue.map(agent => (
                <tr key={agent.email}>
                  <td>{getAgentName(agent.email)}</td>
                  <td>{agent.store_number}</td>
                  <td className="action-buttons">
                    <button className="btn-green" onClick={() => handleQueueAction("move_to_with_customer", agent.email)}>
                      With Customer
                    </button>
                    <button className="btn-red" onClick={() => handleQueueAction("move_to_agents_waiting", agent.email)}>
                      Move to Agents Waiting
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" className="no-agents">No agents in queue</td>
              </tr>
            )}
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
            {withCustomer.length > 0 ? (
              withCustomer.map(agent => (
                <tr key={agent.email}>
                  <td>{getAgentName(agent.email)}</td>
                  <td>{agent.store_number}</td>
                  <td className="action-buttons">
                    <button className="btn-primary" onClick={() => handleQueueAction("move_to_in_queue", agent.email)}>
                      Back to Queue
                    </button>
                    <button className="btn-green" onClick={() => handleSaleClosure(agent.email)}>
                      Close Sale
                    </button>
                    <button className="btn-yellow" onClick={() => handleNoSale(agent.email)}>
                      No Sale
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" className="no-agents">No agents with customers</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Add styling for store filter and empty states */}
      <style jsx>{`
        .store-filter-container {
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        
        .store-filter-dropdown {
          padding: 8px;
          border-radius: var(--border-radius);
          border: 2px solid var(--primary-color);
          background-color: white;
          min-width: 150px;
        }
        
        .current-store {
          text-align: center;
          margin-bottom: 20px;
          padding: 8px;
          background-color: rgba(0, 123, 255, 0.1);
          border-radius: var(--border-radius);
          font-weight: bold;
        }
        
        @media (prefers-color-scheme: dark) {
          .store-filter-dropdown {
            background-color: #333;
            color: white;
            border-color: var(--primary-color);
          }
          
          .current-store {
            background-color: rgba(0, 123, 255, 0.2);
          }
        }
        
        .store-filter-dropdown:focus {
          outline: none;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }
        
        .no-agents {
          text-align: center;
          padding: 15px;
          font-style: italic;
          color: #777;
        }
        
        .action-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }
        
        @media (prefers-color-scheme: dark) {
          .no-agents {
            color: #aaa;
          }
        }
      `}</style>
    </div>
  );
}
