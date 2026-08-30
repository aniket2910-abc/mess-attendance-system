import { useEffect, useState } from "react";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import QRScanner from "./pages/QRScanner";

import AdminDashboard from "./pages/AdminDashboard";
import NormalAdminDashboard from "./pages/NormalAdminDashboard";
import AdminLogin from "./pages/AdminLogin";
import AdminRegister from "./pages/AdminRegister";
import AdminResetPassword from "./pages/AdminResetPassword";

import collegeLogo from "./assets/white logo gp.jpeg";

import "./App.css";

function SplashScreen() {
  return (
    <div
      className="app-splash"
      style={{
        animation: "splashExit 0.7s ease 5.3s forwards",
      }}
    >
      <div className="splash-content">

        <div className="splash-logo">
          <img
            src={collegeLogo}
            alt="Government Polytechnic Barh"
          />
        </div>

        <div className="splash-line"></div>

        <p className="splash-college">
          GOVERNMENT POLYTECHNIC BARH
        </p>

        <h1>
          Mess Attendance System
        </h1>

        <p className="splash-developer">
          Developed by <strong>Aniket Singh</strong>
        </p>

        <span className="splash-course">
          Student Of - AI/ML (3rd Year)
             <br /> Batch- 2024 to 2027 
        </span> 
        

        <div className="splash-loader">
          <span></span>
        </div>

      </div>
    </div>
  );
}

function App() {
  const currentPath = window.location.pathname;

  const [showSplash, setShowSplash] = useState(
    currentPath === "/"
  );

  useEffect(() => {
    if (currentPath !== "/") {
      return;
    }

    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [currentPath]);

  let page;

  // =========================
  // ADMIN LOGIN
  // =========================
  if (currentPath === "/admin-login") {
    page = <AdminLogin />;
  }

  // =========================
  // ADMIN REGISTER
  // =========================
  else if (currentPath === "/admin-register") {
    page = <AdminRegister />;
  }

  // =========================
  // ADMIN RESET PASSWORD
  // =========================
  else if (currentPath === "/admin-reset-password") {
    page = <AdminResetPassword />;
  }

  // =========================
  // REGISTER
  // =========================
  else if (currentPath === "/register") {
    page = <Register />;
  }

  // =========================
  // STUDENT DASHBOARD
  // =========================
  else if (currentPath === "/dashboard") {
    page = <Dashboard />;
  }

  // =========================
  // QR SCANNER
  // =========================
  else if (currentPath === "/scan") {
    page = <QRScanner />;
  }

  // =========================
  // SUPER ADMIN / WARDEN
  // =========================
  else if (currentPath === "/admin") {
    page = <AdminDashboard />;
  }

  // =========================
  // NORMAL ADMIN / MESS STAFF
  // =========================
  else if (currentPath === "/normal-admin") {
    page = <NormalAdminDashboard />;
  }

  // =========================
  // DEFAULT STUDENT LOGIN
  // =========================
  else {
    page = <Login />;
  }

  return (
    <>
      {showSplash && <SplashScreen />}

      <div
        className={
          showSplash
            ? "app-page app-page-hidden"
            : "app-page app-page-visible"
        }
      >
        {page}
      </div>
    </>
  );
}

export default App;