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

    if (!email.endsWith("@lacksvalley.com")) {
      setError("You must use a valid Lacks email address");
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        // ✅ SIGNUP FLOW
        console.log("🚀 Attempting user signup...");

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          console.error("❌ Signup error:", signUpError);
          throw signUpError;
        }

        console.log("✅ Signup successful:", signUpData);

        // ✅ Insert user into agents table
        console.log("🚀 Inserting user into agents table...");
        const { error: agentError } = await supabase.from("agents").insert([
          {
            email,
            name,
            store_number: parseInt(storeNumber, 10),
            role: "agent",
            status: "offline",
          },
        ]);

        if (agentError) {
          console.error("❌ Error inserting into agents:", agentError);
          throw agentError;
        }

        console.log("✅ Agent inserted successfully");
      } else {
        // ✅ LOGIN FLOW
        console.log("🚀 Attempting login...");

        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          console.error("❌ Login error:", signInError);
          throw signInError;
        }

        console.log("✅ Login successful", signInData);

        // ✅ Update agent status to "online"
        console.log("🔄 Updating agent status to online...");
        const { error: updateError } = await supabase
          .from("agents")
          .update({ status: "online" })
          .eq("email", email);

        if (updateError) {
          console.error("❌ Error updating agent status:", updateError);
        } else {
          console.log("✅ Agent status updated to online");
        }
      }

      setIsLoggedIn(true);
      router.push("/dashboard"); // Redirect to dashboard

    } catch (err) {
      console.error("🚨 Error:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle Logout
  const handleLogout = async () => {
    console.log("🚀 Logging out...");
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // ✅ Update agent status to "offline" before logging out
      console.log("🔄 Setting agent status to offline...");
      const { error } = await supabase
        .from("agents")
        .update({ status: "offline" })
        .eq("email", user.email);

      if (error) {
        console.error("❌ Error updating agent status:", error);
      } else {
        console.log("✅ Agent status updated to offline");
      }
    }

    await supabase.auth.signOut();
    setIsLoggedIn(false);
    router.push("/login");
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
        {isLoggedIn && (
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        )}
      </div>
    </div>
  );
}
