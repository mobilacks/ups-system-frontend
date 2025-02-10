import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";

export default function Navbar() {
  const [role, setRole] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsLoggedIn(true);
        
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

  // ✅ Logout Function
  const handleLogout = async () => {
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
        {role === "store_manager" && <li><a href="/logs">Logs</a></li>}
        {role === "admin" && (
          <>
            <li><a href="/admin">Admin</a></li>
            <li><a href="/logs">Logs</a></li>
          </>
        )}
        <li><button onClick={handleLogout}>Logout</button></li>
      </ul>
    </nav>
  );
}
