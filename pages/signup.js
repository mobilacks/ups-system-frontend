import AuthForm from "../components/AuthForm";
import Image from "next/image";

export default function Signup() {
  return (
    <div className="login-container">
      <div className="auth-box">
        {/* ✅ Add Logo */}
        <Image src="/logo.png" alt="Lacks Furniture Logo" width={120} height={50} />
        
        {/* ✅ Add Header */}
        <h2 className="login-header">Lacks UPS System</h2>

        {/* ✅ Signup Form */}
        <AuthForm isSignUp={true} />
      </div>
    </div>
  );
}
