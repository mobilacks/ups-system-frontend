import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function AuthForm({ isSignUp = false }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Detect system theme
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const darkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(darkMode);
  }, []);

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
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });

        if (signUpError) throw signUpError;

        const { error: agentError } = await supabase.from("agents").insert([
          { email, name, role: "agent", store_number: null, status: "offline" },
        ]);

        if (agentError) throw agentError;

      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

        if (signInError) throw signInError;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${isDark ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"}`}>
      <div className="max-w-md w-full bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center mb-4 bg-blue-600 text-white p-3 rounded-md">
          {isSignUp ? "Create Your Account" : "Login to Your Account"}
        </h2>
        {error && <p className="text-red-500 text-center">{error}</p>}
        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500"
            />
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
