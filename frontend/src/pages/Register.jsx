import { useState } from "react";
import { supabase } from "../lib/supabase";
import "../styles/Register.css";

function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    rollNumber: "",
    hostel: "",
    roomNumber: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    // ============================================
    // CLEAN DATA
    // ============================================

    const name = formData.name.trim();
    const email = formData.email.trim().toLowerCase();
    const rollNumber = formData.rollNumber.trim();
    const hostel = formData.hostel.trim();
    const roomNumber = formData.roomNumber.trim();

    // ============================================
    // VALIDATION
    // ============================================

    if (!name) {
      alert("Please enter your full name.");
      return;
    }

    if (!email) {
      alert("Please enter your email.");
      return;
    }

    if (!/^\d{10}$/.test(rollNumber)) {
      alert("Roll Number must be exactly 10 digits.");
      return;
    }

    if (!hostel) {
      alert("Please select your hostel.");
      return;
    }

    if (!roomNumber) {
      alert("Please enter your room number.");
      return;
    }

    if (formData.password.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      // ============================================
      // 1. CHECK IF STUDENT ALREADY EXISTS
      // ============================================

      const { data: existingStudent, error: checkError } =
        await supabase
          .from("students")
          .select("id, email, roll_no")
          .or(`email.eq.${email},roll_no.eq.${rollNumber}`)
          .maybeSingle();

      if (checkError) {
        console.error("Student check error:", checkError);
        throw new Error(
          "Unable to check existing student record."
        );
      }

      if (existingStudent) {
        alert(
          "Student already registered with this email or roll number."
        );
        return;
      }

      // ============================================
      // 2. CREATE SUPABASE AUTH ACCOUNT
      // ============================================

      const {
        data: authData,
        error: authError,
      } = await supabase.auth.signUp({
        email,
        password: formData.password,
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error("Account creation failed.");
      }

      const userId = authData.user.id;

      // ============================================
      // 3. INSERT INTO STUDENTS TABLE
      // ============================================
      //
      // IMPORTANT:
      // Login backend searches the `students` table.
      //
      // ============================================

      const { data: studentData, error: studentError } =
        await supabase
          .from("students")
          .insert({
            name: name,
            email: email,
            roll_no: rollNumber,
            hostel: hostel,
            room_number: roomNumber,
          })
          .select()
          .single();

      if (studentError) {
        console.error(
          "Students table insert error:",
          studentError
        );

        throw new Error(
          studentError.message ||
            "Student profile could not be created."
        );
      }
      // ============================================
      // 4. SUCCESS
      // ============================================

      // ============================================

      console.log("Supabase Auth User:", authData.user);
      console.log("Registered student record:", studentData);

      alert(
        "Registration successful! 🎉\n\n" +
        "You can now login with your email and password."
      );

      window.location.href = "/";

    } catch (error) {
      console.error("Registration error:", error);

      alert(
        error.message ||
          "Registration failed. Please try again."
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">

      <div className="register-container">

        {/* ================= HEADER ================= */}

        <div className="register-header">

          <div className="register-icon">
            🍽️
          </div>

          <h1>
            Create Account
          </h1>

          <p>
            Register once to use the mess attendance system
          </p>

        </div>


        {/* ================= FORM ================= */}

        <form
          className="register-form"
          onSubmit={handleRegister}
        >

          {/* FULL NAME */}

          <div className="input-group">

            <label htmlFor="name">
              Full Name
            </label>

            <input
              id="name"
              name="name"
              type="text"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleChange}
              required
            />

          </div>


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
            />

          </div>


          {/* ROLL NUMBER */}

          <div className="input-group">

            <label htmlFor="rollNumber">
              College Registration Number
            </label>

            <input
              id="rollNumber"
              name="rollNumber"
              type="text"
              inputMode="numeric"
              maxLength={10}
              pattern="[0-9]{10}"
              placeholder="Enter 10 digit registration number"
              value={formData.rollNumber}
              onChange={handleChange}
              required
            />

          </div>


          {/* HOSTEL */}

          <div className="input-group">

            <label htmlFor="hostel">
              Hostel
            </label>

            <select
              id="hostel"
              name="hostel"
              value={formData.hostel}
              onChange={handleChange}
              required
            >

              <option value="">
                Select your hostel
              </option>

              <option value="Boys Hostel 1">
                Boys Hostel 1
              </option>

              <option value="Boys Hostel 2">
                Boys Hostel 2
              </option>

              <option value="Girls Hostel">
                Girls Hostel
              </option>

            </select>

          </div>


          {/* ROOM NUMBER */}

          <div className="input-group">

            <label htmlFor="roomNumber">
              Room Number
            </label>

            <input
              id="roomNumber"
              name="roomNumber"
              type="text"
              placeholder="Enter your room number"
              value={formData.roomNumber}
              onChange={handleChange}
              required
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
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
              required
            />

          </div>


          {/* CONFIRM PASSWORD */}

          <div className="input-group">

            <label htmlFor="confirmPassword">
              Confirm Password
            </label>

            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />

          </div>


          {/* BUTTON */}

          <button
            type="submit"
            className="register-button"
            disabled={loading}
          >

            {loading
              ? "Creating Account..."
              : "Create Account"
            }

          </button>

        </form>


        {/* ================= FOOTER ================= */}

        <div className="register-footer">

          <span>
            Already have an account?
          </span>

          <button
            type="button"
            className="login-link"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            Login
          </button>

        </div>

      </div>

    </div>
  );
}

export default Register;