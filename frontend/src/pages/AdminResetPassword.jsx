import { useState } from "react";
import { supabase } from "../lib/supabase";
import "../styles/AdminResetPassword.css";

function AdminResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      alert("Please enter both passwords.");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        throw error;
      }

      alert("Password updated successfully. Please login again.");

      await supabase.auth.signOut();

      window.location.href = "/admin-login";

    } catch (error) {
      alert(
        error.message ||
          "Unable to reset password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-reset-page">
      <div className="admin-reset-card">

        <div className="admin-reset-icon">
          🛡️
        </div>

        <h1 className="admin-reset-title">
          Reset Admin Password
        </h1>

        <p className="admin-reset-subtitle">
          Create a new password for your admin account.
        </p>

        <form
          className="admin-reset-form"
          onSubmit={handleResetPassword}
        >

          <div className="admin-reset-field">
            <label>
              New Password
            </label>

            <input
              type="password"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <div className="admin-reset-field">
            <label>
              Confirm New Password
            </label>

            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
              autoComplete="new-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="admin-reset-button"
          >
            {loading
              ? "Updating Password..."
              : "Update Password"}
          </button>

        </form>

        <p className="admin-reset-footer">
          Government Polytechnic Barh
        </p>

      </div>
    </div>
  );
}

export default AdminResetPassword;