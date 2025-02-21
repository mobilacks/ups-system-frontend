import AuthForm from "../components/AuthForm";

export default function Login() {
  return (
    <div className="login-container">
      <div className="login-box">
        {/* ✅ Logo Fix */}
        <img src="/logo.png" alt="Lacks UPS System" className="login-logo" />

        {/* ✅ Header */}
        <h1 className="login-title">Lacks UPS System</h1>

        {/* ✅ AuthForm (No Changes) */}
        <AuthForm isSignUp={false} />
      </div>
    </div>
  );
}
