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

        // ✅ Move agent to "Agents Waiting" in Queue
        console.log("🔄 Moving agent to Agents Waiting in queue...");
        const { error: queueError } = await supabase
          .from("queue")
          .update({ agents_waiting: true })
          .eq("email", email);

        if (queueError) console.error("❌ Error updating queue status:", queueError);
        else console.log("✅ Agent moved to Agents Waiting in queue.");

        router.push("/dashboard"); // Redirect to dashboard
      }
    } catch (err) {
      console.error("❌ Error:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle Logout (Only for Logged-in Users)
  const handleLogout = async () => {
    if (!isLoggedIn) return; // ❌ Prevents logout from showing when not logged in

    console.log("🚀 Logging out...");

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("❌ Error fetching user data:", userError);
      return;
    }

    console.log(`🔍 Checking agent before logout: ${user.email}`);

    // ✅ Update agent status to "offline" before logging out
    console.log("🔄 Setting agent status to offline...");
    const { error: updateError } = await supabase
      .from("agents")
      .update({ status: "offline" })
      .eq("email", user.email);

    if (updateError) console.error("❌ Error updating agent status:", updateError);
    else console.log("✅ Agent status updated to offline");

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
    <div className="auth-container">
      <div className="auth-box">
        <h2>{isSignUp ? "Create Your Account" : "Login to Your Account"}</h2>
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
    </div>
  );
}
