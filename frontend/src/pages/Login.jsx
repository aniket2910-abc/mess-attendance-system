import { useState } from "react";
import { supabase } from "../lib/supabase";
import "../styles/Login.css";

function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!formData.email.trim() || !formData.password) {
      alert("Please enter email and password.");
      return;
    }

    setLoading(true);

    try {
      // =====================================================
      // 1. SUPABASE AUTH LOGIN
      // =====================================================

      const email = formData.email.trim().toLowerCase();

      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email,
          password: formData.password,
        });

      if (authError) {
        console.error("Supabase Auth Error:", authError);
        throw new Error(authError.message);
      }

      if (!authData?.user) {
        throw new Error("User authentication failed.");
      }

      console.log("Authenticated user:", authData.user);

      // Use the email actually returned by Supabase Auth
      const authEmail =
        authData.user.email?.trim().toLowerCase() || email;

      console.log("Searching student profile for:", authEmail);

      // =====================================================
      // 2. GET STUDENT PROFILE DIRECTLY FROM SUPABASE
      // =====================================================

      const {
        data: student,
        error: studentError,
      } = await supabase
        .from("students")
        .select("*")
        .ilike("email", authEmail)
        .limit(1)
        .maybeSingle();

      // =====================================================
      // 3. CHECK DATABASE QUERY ERROR
      // =====================================================

      if (studentError) {
        console.error(
          "Student profile query error:",
          studentError
        );

        throw new Error(
          `Student profile database error: ${studentError.message}`
        );
      }

      // =====================================================
      // 4. CHECK STUDENT PROFILE
      // =====================================================

      if (!student) {
        console.error(
          "NO STUDENT PROFILE FOUND FOR:",
          authEmail
        );

        throw new Error(
          `Student profile not found for ${authEmail}. Please register this email first.`
        );
      }

      console.log("Student profile found:", student);

      // =====================================================
      // 5. SAVE STUDENT LOGIN DATA
      // =====================================================

      localStorage.setItem(
        "student",
        JSON.stringify(student)
      );

      localStorage.setItem(
        "isLoggedIn",
        "true"
      );

      // =====================================================
      // 6. SAVE AUTH USER DATA
      // =====================================================

      localStorage.setItem(
        "authUser",
        JSON.stringify(authData.user)
      );

      // =====================================================
      // 7. SUCCESS
      // =====================================================

      alert(
        `Login successful! 🎉\n\nWelcome ${student.name}`
      );

      window.location.href = "/dashboard";

    } catch (error) {
      console.error("Login error:", error);

      alert(
        error?.message ||
          "Login failed. Please check your email and password."
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      <div className="login-container">

        {/* ================= HEADER ================= */}

        <div className="login-header">

          <div className="login-icon">
            🍽️
          </div>

          <h1>
            Welcome Back
          </h1>

          <p>
            Login to your mess attendance account
          </p>

        </div>


        {/* ================= LOGIN FORM ================= */}

        <form
          className="login-form"
          onSubmit={handleLogin}
        >

          {/* EMAIL */}

          <div className="input-group">

            <label htmlFor="email">
              Email
            </label>

            <input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />

          </div>


          {/* PASSWORD */}

          <div className="input-group">

            <label htmlFor="password">
              Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
            />

          </div>


          {/* LOGIN BUTTON */}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading
              ? "Logging in..."
              : "Login"
            }
          </button>

        </form>


        {/* ================= FOOTER ================= */}

        <div className="login-footer">

          {/* REGISTER */}

          <div className="register-section">

            <span>
              Don't have an account?
            </span>

            <button
              type="button"
              className="register-link"
              onClick={() => {
                window.location.href = "/register";
              }}
            >
              Create Account
            </button>

          </div>


          {/* ADMIN LOGIN */}

          <div className="admin-login-section">

            <div className="admin-divider">
              <span>OR</span>
            </div>

            <p>
              Are you an administrator?
            </p>

            <button
              type="button"
              className="admin-login-link"
              onClick={() => {
                window.location.href = "/admin-login";
              }}
            >
              🛡️ Login as Admin
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}

export default Login;