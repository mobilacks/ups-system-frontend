import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/router";
import Link from "next/link";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isResetSession, setIsResetSession] = useState(false);
  const router = useRouter();

  // ✅ Check if the user is in a password reset session
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      // If user has a session and came from a password reset link
      if (session && router.query.type === 'recovery') {
        setIsResetSession(true);
      } else if (!session) {
        // If no session, redirect to login
        setMessage("Your password reset link is invalid or has expired. Please request a new one.");
      }
    };
    
    checkSession();
  }, [router]);

  const handlePasswordReset = async (event) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    // ✅ Validate password and confirmation
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      console.log("🚀 Updating password...");
      
      // ✅ Update user's password
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;
      
      console.log("✅ Password updated successfully");
      setMessage("Your password has been reset successfully!");
      
      // Redirect to login after a short delay
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err) {
      console.error("❌ Error resetting password:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-box">
      <h1>Reset Your Password</h1>
      
      {error && <p className="error-message">{error}</p>}
      {message && <p className="success-message">{message}</p>}
      
      {isResetSession ? (
        <form onSubmit={handlePasswordReset}>
          <p className="instructions">Please enter your new password below.</p>
          
          <input
            type="password"
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          
          <input
            type="password"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          
          <button type="submit" disabled={loading}>
            {loading ? "Updating..." : "Reset Password"}
          </button>
        </form>
      ) : (
        <div className="redirect-message">
          <p>If you need to reset your password, please go to the forgot password page.</p>
          <Link href="/forgot" className="button">
            Go to Forgot Password
          </Link>
        </div>
      )}
      
      <p>
        <Link href="/login" className="text-blue-500 hover:underline">
          Back to Login
        </Link>
      </p>
    </div>
  );
}
