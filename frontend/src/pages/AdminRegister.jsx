import { useState } from "react";
import "../styles/AdminRegister.css";

function AdminRegister() {
  const [setupKey, setSetupKey] = useState("");
  const [keyVerified, setKeyVerified] = useState(false);

  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // =========================================================
  // SETUP KEY
  // =========================================================
const handleKeySubmit = async (e) => {
  e.preventDefault();

  if (!setupKey.trim()) {
    alert("Please enter setup key.");
    return;
  }

  try {
    const response = await fetch("http://127.0.0.1:8000/admin/verify-setup-key", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        setup_key: setupKey.trim(),
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.detail || "Invalid setup key.");
    }

    setKeyVerified(true);

  } catch (error) {
    alert(error.message || "Invalid setup key.");
  }
};

  // =========================================================
  // ADMIN REGISTER
  // =========================================================

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!role) {
      alert("Please select account type.");
      return;
    }

    if (!email.trim()) {
      alert("Please enter email.");
      return;
    }

    if (!password) {
      alert("Please enter password.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/admin/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          setup_key: setupKey.trim(),
          email: email.trim().toLowerCase(),
          password: password,
          role: role,
        }),
      });

      let result = {};

      try {
        result = await response.json();
      } catch {
        result = {};
      }

      if (!response.ok) {
        throw new Error(
          result.detail || "Admin registration failed."
        );
      }

      alert(
        result.message ||
          "Admin account created successfully."
      );

      // Clear registration form after success
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setRole("");

    } catch (error) {
      alert(
        error.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // SETUP KEY SCREEN
  // =========================================================

  if (!keyVerified) {
    return (
      <div className="admin-register-page">
        <div className="admin-register-card">

          <div className="admin-register-header">
            <div className="admin-register-icon">
              🛡️
            </div>

            <h1 className="admin-register-title">
              Admin Registration
            </h1>

            <p className="admin-register-subtitle">
              Enter the setup key to continue.
            </p>
          </div>

          <form
            className="admin-register-form"
            onSubmit={handleKeySubmit}
          >
            <div className="admin-register-field">
              <label htmlFor="setup-key">
                Setup Key
              </label>

              <input
                id="setup-key"
                type="password"
                placeholder="Enter setup key"
                value={setupKey}
                onChange={(e) =>
                  setSetupKey(e.target.value)
                }
                autoComplete="off"
                required
              />
            </div>

            <button
              type="submit"
              className="admin-register-button"
            >
              Continue
            </button>
          </form>

          <div className="admin-register-footer">
            Authorized Administration Only
          </div>

        </div>
      </div>
    );
  }

  // =========================================================
  // ADMIN ACCOUNT CREATION SCREEN
  // =========================================================

  return (
    <div className="admin-register-page">
      <div className="admin-register-card">

        <div className="admin-register-header">
          <div className="admin-register-icon">
            🛡️
          </div>

          <h1 className="admin-register-title">
            Create Admin Account
          </h1>

          <p className="admin-register-subtitle">
            Select the account type and create the account.
          </p>
        </div>

        <form
          className="admin-register-form"
          onSubmit={handleRegister}
        >

          {/* ACCOUNT TYPE */}

          <div className="admin-register-field">
            <label htmlFor="account-type">
              Account Type
            </label>

            <select
              id="account-type"
              value={role}
              onChange={(e) =>
                setRole(e.target.value)
              }
              required
            >
              <option value="">
                Select account type
              </option>

              <option value="super_admin">
                Super Admin
              </option>

              <option value="normal_admin">
                Mess Incharge
              </option>
            </select>
          </div>

          {/* EMAIL */}

          <div className="admin-register-field">
            <label htmlFor="admin-email">
              Email Address
            </label>

            <input
              id="admin-email"
              type="email"
              placeholder="Enter admin email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              autoComplete="email"
              required
            />
          </div>

          {/* PASSWORD */}

          <div className="admin-register-field">
            <label htmlFor="admin-password">
              Password
            </label>

            <input
              id="admin-password"
              type="password"
              placeholder="Create password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              autoComplete="new-password"
              required
            />
          </div>

          {/* CONFIRM PASSWORD */}

          <div className="admin-register-field">
            <label htmlFor="confirm-password">
              Confirm Password
            </label>

            <input
              id="confirm-password"
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
              autoComplete="new-password"
              required
            />
          </div>

          {/* CREATE BUTTON */}

          <button
            type="submit"
            className="admin-register-button"
            disabled={loading}
          >
            {loading
              ? "Creating Account..."
              : "Create Account"}
          </button>

        </form>

        <div className="admin-register-footer">
          Maximum 1 Super Admin + 2 Mess Incharge accounts
        </div>

      </div>
    </div>
  );
}

export default AdminRegister;