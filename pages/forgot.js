import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/router";
import Link from "next/link";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleResetRequest = async (event) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    // ✅ Validate email domain (same as your AuthForm)
    if (!email.endsWith("@lacksvalley.com")) {
      setError("You must use a valid Lacks email address.");
      setLoading(false);
      return;
    }

    try {
      console.log("🚀 Sending password reset email to:", email);
      
      // ✅ Send password reset email through Supabase
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`, // Redirect to password reset page
      });

      if (error) throw error;
      
      console.log("✅ Password reset email sent successfully");
      setMessage("Password reset instructions have been sent to your email. Please check your inbox.");
    } catch (err) {
      console.error("❌ Error sending reset email:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-box">
      <h1>Forgot Password</h1>
      <p className="instructions">Enter your email address below to receive a password reset link.</p>
      
      {error && <p className="error-message">{error}</p>}
      {message && <p className="success-message">{message}</p>}
      
      <form onSubmit={handleResetRequest}>
        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        
        <button type="submit" disabled={loading}>
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>
      
      <p>
        Remembered your password?{" "}
        <Link href="/login" className="text-blue-500 hover:underline">
          Back to Login
        </Link>
      </p>
    </div>
  );
}
