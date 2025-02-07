import { useState } from "react";
import { useRouter } from "next/router"; // Import Next.js router for navigation
import { supabase } from "../lib/supabase";

export default function AuthForm({ isSignUp = false }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [storeNumber, setStoreNumber] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter(); // Initialize Next.js router

  const handleAuth = async (event) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    // Validate email domain
    if (!email.endsWith("@lacksvalley.com")) {
      setError("You must use a valid Lacks email address");
      setLoading(false);
      return;
    }

    // Only validate store number for signup
    if (isSignUp) {
      const storeNum = parseInt(storeNumber, 10);
      if (isNaN(storeNum) || storeNum <= 0) {
        setError("Please enter a valid store number.");
        setLoading(false);
        return;
      }
    }

    try {
      if (isSignUp) {
        console.log("🚀 Attempting user signup...");
        
        // Sign up user
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          console.error("❌ Signup error:", signUpError);
          throw signUpError;
        }

        console.log("✅ Signup successful:", signUpData);

        // Insert user into agents table
        console.log("🚀 Inserting user into agents table...");
        const { data: agentData, error: agentError } = await supabase.from("agents").insert([
          {
            email,
            name,
            store_number: isSignUp ? parseInt(storeNumber, 10) : null, // Store number only for signup
            role: "agent",
            status: "offline",
          },
        ]);

        if (agentError) {
          console.error("❌ Error inserting into agents:", agentError);
          throw agentError;
        }

        console.log("✅ Agent inserted successfully:", agentData);

      } else {
        console.log("🚀 Attempting login...");
        
        // Log in user
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          console.error("❌ Login error:", signInError);
          throw signInError;
        }

        console.log("✅ Login successful");

        // ✅ UPDATE AGENT STATUS TO ONLINE ON LOGIN
        console.log("🔍 Checking if agent exists before update with email:", email);
        const { data: existingAgent, error: fetchError } = await supabase
          .from("agents")
          .select("*") // Fetch all columns for debugging
          .ilike("email", email);  // Case-insensitive search

        console.log("🔍 Raw Supabase Response:", existingAgent);
        console.log("⚠️ Fetch Error (if any):", fetchError);

        if (existingAgent.length > 0) {
          const { data: updateResponse, error: updateError } = await supabase
            .from("agents")
            .update({ status: "online" })
            .eq("email", email)
            .select();

          console.log("🛠️ SQL Query Response:", updateResponse);
          console.log("⚠️ SQL Query Error (if any):", updateError);
        } else {
          console.error("❌ No matching agent found in the database!");
        }
      }

      // ✅ Redirect to Dashboard on Success
      router.push("/dashboard");

    } catch (err) {
      console.error("🚨 Error:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
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
      </div>
    </div>
  );
}
