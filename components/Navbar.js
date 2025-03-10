import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";

export default function Navbar() {
  const [role, setRole] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState(null); // Store logged-in user's email
  const router = useRouter();

  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsLoggedIn(true);
        setUserEmail(user.email);
        // ✅ Fetch role from Supabase agents table
        const { data, error } = await supabase
          .from("agents")
          .select("role")
          .eq("email", user.email)
          .single();
        if (!error && data) {
          setRole(data.role);
        }
      } else {
        setIsLoggedIn(false);
      }
    };
    fetchUserRole();
  }, []);

  // ✅ Logout Function - Updates Status and Queue Before Logging Out
  const handleLogout = async () => {
    if (userEmail) {
      console.log(`🔄 Setting ${userEmail} status to offline and resetting queue status...`);
      // ✅ Update agent's status to offline
      const { error: statusError } = await supabase
        .from("agents")
        .update({ status: "offline" })
        .eq("email", userEmail);
      if (statusError) {
        console.error("❌ Error updating agent status:", statusError);
      } else {
        console.log("✅ Agent status updated to offline.");
      }
      // ✅ Reset queue status for the agent
      const { error: queueError } = await supabase
        .from("queue")
        .update({
          agents_waiting: false,
          in_queue: false,
          with_customer: false
        })
        .eq("email", userEmail);
      if (queueError) {
        console.error("❌ Error resetting queue status:", queueError);
      } else {
        console.log("✅ Agent queue status reset successfully.");
      }
    }
    await supabase.auth.signOut();
    router.push("/login"); // Redirect to login page
  };

  // ✅ Don't show Navbar on Login or Signup pages
  if (router.pathname === "/login" || router.pathname === "/signup") return null;

  return (
    <nav className="navbar">
      <ul>
        <li><a href="/dashboard">Dashboard</a></li>
        <li><a href="/stats">Stats</a></li>
        
        {/* Store Manager & Admin can access Logs */}
        {(role === "store_manager" || role === "admin") && (
          <li><a href="/logs">Logs</a></li>
        )}
        
        {/* Store Manager & Admin can access Sales */}
        {(role === "store_manager" || role === "admin") && (
          <li><a href="/sales">Sales</a></li>
        )}
        
        {/* Only Admin can access Admin page */}
        {role === "admin" && (
          <li><a href="/admin">Admin</a></li>
        )}
        
        <li><button className="logout-btn" onClick={handleLogout}>Logout</button></li>
        
        {/* Feedback Link */}
        <li className="feedback-link">
          <a 
            href="https://forms.office.com/r/ZwsavbAN0i" 
            target="_blank" 
            rel="noopener noreferrer"
            title="Contact Us"
          >
            🐛/💡
          </a>
        </li>
      </ul>
    </nav>
  );
}
