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

        // ✅ Fetch the user's role
        const { data: agentData, error: agentError } = await supabase
          .from("agents")
          .select("role")
          .eq("email", email)
          .single();

        if (agentError) {
          console.error("❌ Error fetching user role:", agentError);
          return;
        }

        const userRole = agentData?.role;

        // ✅ If user is an Admin or Store Manager, do nothing
        if (userRole === "admin" || userRole === "store_manager") {
          console.log("✅ User is an Admin or Store Manager. No queue update needed.");
        } else {
          // ✅ If user is an Agent, check if they are already in the queue
          const { data: queueData, error: queueError } = await supabase
            .from("queue")
            .select("email")
            .eq("email", email)
            .single();

          if (!queueData) {
            // ✅ If user is not in queue, add them
            const { error: insertError } = await supabase.from("queue").insert([
              {
                email,
                agents_waiting: true, // ✅ Automatically set as waiting
                in_queue: false,
                with_customer: false,
              },
            ]);

            if (insertError) {
              console.error("❌ Error adding user to queue:", insertError);
            } else {
              console.log("✅ User added to queue successfully!");
            }
          } else {
            console.log("✅ User is already in the queue.");
          }
        }

        // ✅ Update agent status to "online"
        console.log("🔄 Updating agent status to online...");
        const { error: updateError } = await supabase
          .from("agents")
          .update({ status: "online" })
          .eq("email", email);

        if (updateError) console.error("❌ Error updating agent status:", updateError);
        else console.log("✅ Agent status updated to online");

        router.push("/dashboard"); // Redirect to dashboard
      }
    } catch (err) {
      console.error("❌ Error:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
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
    </div>
  );
}
