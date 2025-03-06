import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";

export default function AuthForm({ isSignUp = false }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [storeNumber, setStoreNumber] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  // ✅ Check if User is Logged In
  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
    }
    checkUser();
  }, []);

  // Helper function to get CST timestamp
  const getCSTTimestamp = () => {
    const now = new Date();
    // Convert to CST (UTC-6)
    return new Date(now.getTime() - (now.getTimezoneOffset() + 360) * 60000).toISOString();
  };

  // ✅ Handle Authentication (Login & Signup)
  const handleAuth = async (event) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    // ✅ Validate email domain
    if (!email.endsWith("@lacksvalley.com")) {
      setError("You must use a valid Lacks email address.");
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        console.log("🚀 Attempting user signup...");

        // ✅ Step 1: Create User in Supabase Auth
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;
        console.log("✅ User created in Supabase Auth:", signUpData);

        // ✅ Step 2: Insert into Agents Table
        const { error: agentError } = await supabase.from("agents").insert([
          {
            email,
            name,
            store_number: parseInt(storeNumber, 10),
            role: "agent", // Default role
            status: "offline",
          },
        ]);

        if (agentError) throw agentError;
        console.log("✅ User added to Agents table.");

        alert("Signup successful! You can now log in.");
      } else {
        console.log("🚀 Attempting login...");

        // ✅ LOGIN FLOW
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
        console.log("✅ Login successful");

        // ✅ Update agent status to "online"
        console.log("🔄 Updating agent status to online...");
        const { error: updateError } = await supabase
          .from("agents")
          .update({ status: "online" })
          .eq("email", email);

        if (updateError) console.error("❌ Error updating agent status:", updateError);
        else console.log("✅ Agent status updated to online");

        // ✅ Fetch user role from agents table
        console.log("🔍 Fetching user role...");
        const { data: agentData, error: agentError } = await supabase
          .from("agents")
          .select("role, store_number")
          .eq("email", email)
          .single();

        if (agentError) {
          console.error("❌ Error fetching agent data:", agentError);
        } else {
          console.log("✅ Agent data fetched:", agentData);
          const userRole = agentData?.role;
          const storeNumber = agentData?.store_number;
          
          // ✅ Check if user is an agent
          if (userRole === "agent") {
            console.log("👤 User is an agent, checking queue status...");
            
            // ✅ Check if agent exists in queue table
            const { data: queueData, error: queueCheckError } = await supabase
              .from("queue")
              .select("id")
              .eq("email", email);
              
            if (queueCheckError) {
              console.error("❌ Error checking queue data:", queueCheckError);
            } else {
              const cstTimestamp = getCSTTimestamp();
              
              if (queueData && queueData.length > 0) {
                // ✅ Agent exists in queue table, update their status
                console.log("✅ Agent found in queue table, updating status...");
                const { error: queueUpdateError } = await supabase
                  .from("queue")
                  .update({
                    agents_waiting: true,
                    in_queue: false,
                    with_customer: false,
                    last_updated: cstTimestamp
                  })
                  .eq("email", email);
                  
                if (queueUpdateError) {
                  console.error("❌ Error updating queue status:", queueUpdateError);
                } else {
                  console.log("✅ Agent queue status updated successfully");
                }
              } else {
                // ✅ Agent doesn't exist in queue table, add them
                console.log("➕ Agent not found in queue table, adding new record...");
                const { error: queueInsertError } = await supabase
                  .from("queue")
                  .insert([{
                    email,
                    store_number: storeNumber,
                    agents_waiting: true,
                    in_queue: false,
                    with_customer: false,
                    last_updated: cstTimestamp,
                    queue_joined_at: null
                  }]);
                  
                if (queueInsertError) {
                  console.error("❌ Error inserting into queue table:", queueInsertError);
                } else {
                  console.log("✅ Agent added to queue table successfully");
                }
              }
            }
          } else {
            // ✅ User is admin or store_manager, check if they exist in queue table
            console.log("👑 User is not an agent, checking if they exist in queue table...");
            const { data: queueData, error: queueCheckError } = await supabase
              .from("queue")
              .select("id")
              .eq("email", email);
              
            if (queueCheckError) {
              console.error("❌ Error checking queue data:", queueCheckError);
            } else if (queueData && queueData.length > 0) {
              // ✅ Non-agent exists in queue table, remove them
              console.log("🗑️ Non-agent found in queue table, removing...");
              const { error: queueDeleteError } = await supabase
                .from("queue")
                .delete()
                .eq("email", email);
                
              if (queueDeleteError) {
                console.error("❌ Error removing from queue table:", queueDeleteError);
              } else {
                console.log("✅ Non-agent removed from queue table successfully");
              }
            } else {
              console.log("✅ Non-agent not found in queue table, no action needed");
            }
          }
        }

        router.push("/dashboard"); // Redirect to dashboard
      }
    } catch (err) {
      console.error("❌ Error:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle Logout (Now Resets Queue Status)
  const handleLogout = async () => {
    if (!isLoggedIn) return; // ❌ Prevents logout from showing when not logged in

    console.log("🚀 Logging out...");

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("❌ Error fetching user data:", userError);
      return;
    }

    console.log(`🔍 Checking agent before logout: ${user.email}`);

    // ✅ Update agent status to "offline"
    console.log("🔄 Setting agent status to offline...");
    const { error: updateError } = await supabase
      .from("agents")
      .update({ status: "offline" })
      .eq("email", user.email);

    if (updateError) console.error("❌ Error updating agent status:", updateError);
    else console.log("✅ Agent status updated to offline");

    // ✅ Remove agent from the queue
    console.log("🔄 Removing agent from queue for:", user.email);
    const { data, error: queueError } = await supabase
      .from("queue")
      .update({
        agents_waiting: false,
        in_queue: false,
        with_customer: false,
      })
      .eq("email", user.email)
      .select(); // ✅ Get the updated row

    if (queueError) {
      console.error("❌ Error updating queue status:", queueError);
    } else {
      console.log("✅ Queue update successful. Updated row:", data);
    }

    // ✅ Sign out user
    console.log("🚪 Signing out from Supabase...");
    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) console.error("❌ Error signing out:", signOutError);
    else {
      console.log("✅ Successfully logged out!");
      setIsLoggedIn(false);
      router.push("/login"); // Redirect to login page
    }
  };

  return (
    <div className="auth-box">
      {error && <p className="error-message">{error}</p>}
      <form onSubmit={handleAuth}>
        {isSignUp && (
          <>
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              type="number"
              placeholder="Store Number"
              value={storeNumber}
              onChange={(e) => setStoreNumber(e.target.value)}
              required
            />
          </>
        )}
        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Processing..." : isSignUp ? "Sign Up" : "Login"}
        </button>
      </form>

      {/* ✅ Show Logout Button ONLY if user is logged in */}  
      {isLoggedIn && router.pathname !== "/login" && (
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      )}

      <p>
        {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
        <a href={isSignUp ? "/login" : "/signup"} className="text-blue-500 hover:underline">
          {isSignUp ? "Login" : "Sign Up"}
        </a>
      </p>
    </div>
  );
}
