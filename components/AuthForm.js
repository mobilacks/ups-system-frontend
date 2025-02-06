import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function AuthForm({ isSignUp = false }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
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

    try {
      if (isSignUp) {
        // Sign up user
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;

        // Assign new user as "agent" in agents table
        const { error: agentError } = await supabase.from("agents").insert([
          {
            email,
            name,
            role: "agent", // Default role
            store_number: null, // Can be updated by admins later
            status: "offline",
          },
        ]);

        if (agentError) throw agentError;

      } else {
        // Log in user
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">{isSignUp ? "Sign Up" : "Login"}</h2>
      {error && <p className="text-red-500">{error}</p>}
      <form onSubmit={handleAuth} className="space-y-4">
        {isSignUp && (
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full p-2 border rounded"
          />
        )}
        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full p-2 border rounded"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full p-2 border rounded"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white p-2 rounded"
        >
          {loading ? "Processing..." : isSignUp ? "Sign Up" : "Login"}
        </button>
      </form>
    </div>
  );
}
