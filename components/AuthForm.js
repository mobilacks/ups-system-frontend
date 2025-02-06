import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function AuthForm({ isSignUp = false }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [storeNumber, setStoreNumber] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

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

    // Validate store number
    const storeNum = parseInt(storeNumber, 10);
    if (isNaN(storeNum) || storeNum <= 0) {
      setError("Please enter a valid store number.");
      setLoading(false);
      return;
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
            store_number: storeNum,
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
      }
    } catch (err) {
      console.error("🚨 Error:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center mb-4 bg-blue-600 text-white p-3 rounded-md">
          {isSignUp ? "Create Your Account" : "Login to Your Account"}
        </h2>
        {error && <p className="text-red-500 text-center">{error}</p>}
        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <>
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Store Number"
                value={storeNumber}
                onChange={(e) => setStoreNumber(e.target.value)}
                required
                className="w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </>
          )}
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-md transition duration-300"
          >
            {loading ? "Processing..." : isSignUp ? "Sign Up" : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
