import ProtectedRoute from "../lib/protectedRoute";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/router";

function Dashboard({ user }) {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login"); // Redirect to login after logout
  };

  return (
    <div className="p-6 flex flex-col items-center">
      <h1 className="text-2xl font-bold bg-blue-600 text-white p-3 rounded-md">
        Welcome, {user?.email}
      </h1>
      <p className="mb-4">This is the dashboard. Only logged-in users can see this page.</p>
      <button
        onClick={handleLogout}
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition duration-300"
      >
        Logout
      </button>
    </div>
  );
}

export default ProtectedRoute(Dashboard);
