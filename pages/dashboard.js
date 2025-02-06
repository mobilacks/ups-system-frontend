import ProtectedRoute from "../lib/protectedRoute";

function Dashboard({ user }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Welcome, {user?.email}</h1>
      <p>This is the dashboard. Only logged-in users can see this page.</p>
    </div>
  );
}

export default ProtectedRoute(Dashboard);
