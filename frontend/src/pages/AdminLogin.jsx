import { useState } from "react";
import { supabase } from "../lib/supabase";
import "../styles/AdminLogin.css";


function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);


  const handleForgotPassword = async () => {
    if (!email.trim()) {
      alert("Please enter your admin email first.");
      return;
    }

    setForgotLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: `${window.location.origin}/admin-reset-password`,
        }
      );

      if (error) {
        throw error;
      }

      alert(
        "Password reset link has been sent to your email."
      );
    } catch (error) {
      alert(
        error.message ||
          "Unable to send password reset email."
      );
    } finally {
      setForgotLoading(false);
    }
  };


  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      alert("Please enter email and password.");
      return;
    }

    setLoading(true);

    try {
      // 1. Login with Supabase Auth
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

      if (authError) {
        throw new Error("Invalid email or password.");
      }

      // 2. Check admin role
      const { data: adminData, error: roleError } = await supabase
        .from("admin_roles")
        .select("email, role")
        .eq("email", email.trim().toLowerCase())
        .single();

      if (roleError || !adminData) {
        await supabase.auth.signOut();
        throw new Error("You are not authorized as an admin.");
      }

      // 3. Save admin information
      localStorage.setItem("adminLoggedIn", "true");
      localStorage.setItem("adminEmail", adminData.email);
      localStorage.setItem("adminRole", adminData.role);

      // 4. Redirect according to role
      if (adminData.role === "super_admin") {
        window.location.href = "/admin";
      } else if (adminData.role === "normal_admin") {
        window.location.href = "/normal-admin";
      } else {
        await supabase.auth.signOut();
        throw new Error("Invalid admin role.");
      }

    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-container">

        <div className="admin-login-icon">
          🛡️
        </div>

        <div className="admin-login-header">
          <h1>Admin Login</h1>
          <p>Government Polytechnic Barh</p>
        </div>

        <form
          className="admin-login-form"
          onSubmit={handleLogin}
        >

          <div className="admin-input-group">
            <label>Email Address</label>

            <input
              type="email"
              placeholder="Enter admin email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="admin-input-group">
            <label>Password</label>

            <input
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="admin-login-button"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login as Admin"}
          </button>


          {/* FORGOT PASSWORD */}

          <div className="forgot-password-link">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={forgotLoading}
            >
              {forgotLoading
                ? "Sending reset link..."
                : "Forgot Password?"}
            </button>
          </div>


          {/* REGISTER ADMIN */}

          <div className="register-admin-link">
            <span>Don't have an admin account?</span>

            <button
              type="button"
              onClick={() => {
                window.location.href = "/admin-register";
              }}
            >
              Register Admin
            </button>
          </div>

        </form>

        <div className="admin-login-footer">
          Authorized Administration Only
        </div>

      </div>
    </div>
  );
}

export default AdminLogin;