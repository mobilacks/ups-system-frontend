import AuthForm from "../components/AuthForm";

export default function Login() {
  return (
    <div className="login-container">
      <div className="login-box">
        {/* ✅ Logo Now Inside the Box */}
        <img src="/logo.png" alt="Lacks UPS System" className="login-logo" />

        {/* ✅ Title Now Inside the Box */}
        <h1 className="login-title">Lacks UPS System</h1>

        {/* ✅ Login Form (No Changes) */}
        <AuthForm isSignUp={false} />
      </div>
    </div>
  );
}
