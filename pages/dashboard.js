import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  // ✅ Fetch the logged-in user
  useEffect(() => {
    async function fetchUser() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error("❌ Error fetching user:", error);
      } else {
        setUser(user);
      }
    }
    fetchUser();
  }, []);

  // ✅ Handle Logout
  const handleLogout = async () => {
    console.log("🚀 Logging out...");

    if (user && user.email) {
      console.log(`🔄 Updating agent status to offline for: ${user.email}`);
      
      // ✅ Update agent status to "offline" in Supabase
      const { error: updateError } = await supabase
        .from("agents")
        .update({ status: "offline" })
        .eq("email", user.email);

      if (updateError) {
        console.error("❌ Error updating agent status:", updateError);
      } else {
        console.log("✅ Agent status updated to offline");
      }
    }

    // ✅ Perform Logout
    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      console.error("❌ Error signing out:", signOutError);
    } else {
      console.log("✅ Successfully logged out!");
      router.push("/login"); // Redirect to login page
    }
  };

  return (
    <div className="dashboard-container">
      <h1>Welcome to the Dashboard</h1>
      {user && (
        <p>
          Logged in as <strong>{user.email}</strong>
        </p>
      )}
      <button onClick={handleLogout} className="logout-button">
        Logout
      </button>
    </div>
  );
}
