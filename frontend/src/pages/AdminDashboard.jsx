import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import "../styles/AdminDashboard.css";
import * as XLSX from "xlsx";
const API_URL = import.meta.env.VITE_API_URL;

/* =====================================================
   CONSTANTS / HELPERS
===================================================== */

const menuItems = [
  { id: "dashboard", icon: "📊", label: "Dashboard" },
  { id: "attendance", icon: "✓", label: "Attendance" },
  { id: "students", icon: "🎓", label: "Students" },
  { id: "hostellers", icon: "🏫", label: "Hostellers" },
  { id: "menu", icon: "🍽️", label: "Mess Menu" },
  { id: "notices", icon: "📢", label: "Notices" },
  
  { id: "complaints", icon: "📝", label: "Complaints & Feedback" },
  { id: "password", icon: "🔐", label: "Password Reset" },
  { id: "geofences", icon: "📍", label: "Geofences" },
];

const MEALS = ["Breakfast", "Lunch", "Snacks", "Dinner"];

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const todayIndia = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());

const getMonday = (dateString) => {
  const date = new Date(`${dateString}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return todayIndia();
  }

  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  date.setDate(date.getDate() + diff);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

const addDays = (dateString, amount) => {
  const date = new Date(`${dateString}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  date.setDate(date.getDate() + amount);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

const formatDate = (dateString) => {
  if (!dateString) return "—";

  const date = new Date(`${dateString}T12:00:00`);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getDayName = (dateString) => {
  const date = new Date(`${dateString}T12:00:00`);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    timeZone: "Asia/Kolkata",
  });
};

const emptyWeek = () => ({
  Monday: {
    Breakfast: "",
    Lunch: "",
    Snacks: "",
    Dinner: "",
  },
  Tuesday: {
    Breakfast: "",
    Lunch: "",
    Snacks: "",
    Dinner: "",
  },
  Wednesday: {
    Breakfast: "",
    Lunch: "",
    Snacks: "",
    Dinner: "",
  },
  Thursday: {
    Breakfast: "",
    Lunch: "",
    Snacks: "",
    Dinner: "",
  },
  Friday: {
    Breakfast: "",
    Lunch: "",
    Snacks: "",
    Dinner: "",
  },
  Saturday: {
    Breakfast: "",
    Lunch: "",
    Snacks: "",
    Dinner: "",
  },
  Sunday: {
    Breakfast: "",
    Lunch: "",
    Snacks: "",
    Dinner: "",
  },
});

/* =====================================================
   MAIN ADMIN DASHBOARD
===================================================== */

export default function AdminDashboard() {
  const [activePage, setActivePage] = useState("dashboard");

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("adminLoggedIn");
    window.location.href = "/admin-login";
  };

  const renderPage = () => {
    switch (activePage) {
      case "attendance":
        return <AttendancePage />;

      case "students":
        return <StudentsPage />;


      case "hostellers":
        return <HostellersPage />;
      case "geofences":
  return <GeofencePage />;
      
        case "menu":
        return <MenuPage />;

      case "notices":
        return <NoticesPage />;

      case "archives":
        return <ArchivesPage />;

      case "complaints":
        return <ComplaintsFeedbackPage />;

      case "password":
        return <PasswordResetPage />;

        case "geofence":
    return <GeofencePage />;

      default:
        return <DashboardHome />;
    }
  };

  const currentTitle =
    menuItems.find((item) => item.id === activePage)?.label || "Dashboard";

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <div className="gp-logo">GP</div>

          <div>
            <h2>GP Barh</h2>
            <span>Admin Panel</span>
          </div>
        </div>

        <div className="sidebar-line"></div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`sidebar-item ${
                activePage === item.id ? "active" : ""
              }`}
              onClick={() => setActivePage(item.id)}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <button
          type="button"
          className="logout-button"
          onClick={logout}
        >
          ↪ Logout
        </button>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <div className="header-label">ADMINISTRATION</div>
            <h1>{currentTitle}</h1>
          </div>

          <div className="header-right">
            <div className="system-status">
              <span className="online-dot"></span>
              System Online
            </div>

            <button
              type="button"
              className="refresh-button"
              onClick={() => window.location.reload()}
            >
              ↻ Refresh
            </button>
          </div>
        </header>

        <section className="admin-content">
          {renderPage()}
        </section>
      </main>
    </div>
  );
}

/* =====================================================
   DASHBOARD
===================================================== */

function DashboardHome() {
  const [stats, setStats] = useState({
    students: 0,
    attendance: 0,
    menu: 0,
    notices: 0,
    complaints: 0,
  });

  const [weeklyAttendance, setWeeklyAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    setLoading(true);

    try {
      const today = todayIndia();
      const startDate = addDays(today, -6);

      const [
        studentsResult,
        attendanceResult,
        menuResult,
        noticesResult,
        complaintsResult,
      ] = await Promise.all([
        supabase
          .from("students")
          .select("*", { count: "exact", head: true }),

        supabase
          .from("attendance")
          .select("*", { count: "exact", head: true })
          .eq("attendance_date", today),

        supabase
          .from("mess_menu")
          .select("*", { count: "exact", head: true })
          .eq("menu_date", today),

        supabase
          .from("notices")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true),

        supabase
          .from("complaints_feedback")
          .select("*", { count: "exact", head: true }),
      ]);

      setStats({
        students: studentsResult.count || 0,
        attendance: attendanceResult.count || 0,
        menu: menuResult.count || 0,
        notices: noticesResult.count || 0,
        complaints: complaintsResult.count || 0,
      });

      const { data: attendanceRows, error: attendanceError } =
        await supabase
          .from("attendance")
          .select("attendance_date")
          .gte("attendance_date", startDate)
          .lte("attendance_date", today);

      if (attendanceError) {
        console.error(
          "Weekly attendance error:",
          attendanceError
        );
        setWeeklyAttendance([]);
      } else {
        const weekly = DAYS.map((_, index) => {
          const date = addDays(startDate, index);

          const count = (attendanceRows || []).filter(
            (row) => row.attendance_date === date
          ).length;

          const dateObj = new Date(`${date}T12:00:00`);

          return {
            date,
            count,
            label: dateObj.toLocaleDateString("en-IN", {
              weekday: "short",
            }),
          };
        });

        setWeeklyAttendance(weekly);
      }
    } catch (error) {
      console.error("Dashboard error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();

    const timer = setInterval(
      loadDashboard,
      60 * 1000
    );

    return () => clearInterval(timer);
  }, []);

  const maxAttendance = Math.max(
    ...weeklyAttendance.map((item) => item.count),
    1
  );

  return (
    <>
      <div className="page-heading dashboard-heading">
        <div>
          <span className="section-label">OVERVIEW</span>

          <h2>Admin Dashboard</h2>

          <p>
            Manage the complete mess attendance system.
          </p>
        </div>

        <div className="today-pill">
          <span>Today</span>
          <strong>{formatDate(todayIndia())}</strong>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          icon="🎓"
          title="Total Students"
          value={loading ? "..." : stats.students}
          type="blue"
        />

        <StatCard
          icon="✓"
          title="Today's Attendance"
          value={loading ? "..." : stats.attendance}
          type="green"
        />

        <StatCard
          icon="🍽️"
          title="Today's Menu"
          value={loading ? "..." : stats.menu}
          type="gold"
        />

        <StatCard
          icon="📢"
          title="Active Notices"
          value={loading ? "..." : stats.notices}
          type="red"
        />

        <StatCard
          icon="📝"
          title="Complaints & Feedback"
          value={loading ? "..." : stats.complaints}
          type="gold"
        />
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-panel chart-panel">
          <div className="panel-header">
            <div>
              <span className="section-label">ANALYTICS</span>
              <h3>Attendance Overview</h3>
              <p>Present attendance for the last 7 days.</p>
            </div>

            <span className="panel-badge">7 DAYS</span>
          </div>

          <div className="attendance-chart">
            {weeklyAttendance.map((item) => {
              const height =
                item.count === 0
                  ? 5
                  : Math.max(
                      (item.count / maxAttendance) * 100,
                      10
                    );

              return (
                <div
                  className="chart-column"
                  key={item.date}
                >
                  <span className="chart-value">
                    {item.count}
                  </span>

                  <div className="chart-bar-area">
                    <div
                      className="chart-bar"
                      style={{
                        height: `${height}%`,
                      }}
                    />
                  </div>

                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="dashboard-panel summary-panel">
          <div className="panel-header">
            <div>
              <span className="section-label">SYSTEM</span>
              <h3>Quick Summary</h3>
              <p>Current system information</p>
            </div>
          </div>

          <div className="summary-list">
            <div className="summary-row">
              <span>👨‍🎓 Registered Students</span>
              <strong>{stats.students}</strong>
            </div>

            <div className="summary-row">
              <span>✓ Present Today</span>
              <strong>{stats.attendance}</strong>
            </div>

            <div className="summary-row">
              <span>🍽️ Today's Menu Items</span>
              <strong>{stats.menu}</strong>
            </div>

            <div className="summary-row">
              <span>📢 Active Notices</span>
              <strong>{stats.notices}</strong>
            </div>

            <div className="summary-row">
              <span>📝 Complaints & Feedback</span>
              <strong>{stats.complaints}</strong>
            </div>
          </div>

          <div className="admin-system-box">
            <div className="system-check">✓</div>

            <div>
              <strong>System Online</strong>
              <span>All services are working normally.</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function StatCard({ icon, title, value, type }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${type}`}>{icon}</div>

      <div>
        <span>{title}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

/* =====================================================
   ATTENDANCE - FILTERS & REPORTS
===================================================== */

function AttendancePage() {
  const today = todayIndia();
  const defaultFrom = addDays(today, -29);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter mode: specific date or date range
  const [filterMode, setFilterMode] = useState("date");

  const [selectedDate, setSelectedDate] = useState(today);
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(today);

  const [selectedMeal, setSelectedMeal] = useState("");
  const [selectedHostel, setSelectedHostel] = useState("");
  const [studentSearch, setStudentSearch] = useState("");

  const loadAttendance = async () => {
    setLoading(true);

    try {
      let query = supabase
        .from("attendance")
        .select("*")
        .order("attendance_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (filterMode === "date") {
        query = query.eq("attendance_date", selectedDate);
      } else {
        query = query
          .gte("attendance_date", fromDate)
          .lte("attendance_date", toDate);
      }

      if (selectedMeal) {
        query = query.eq("meal_type", selectedMeal);
      }

      if (selectedHostel) {
        query = query.eq("hostel", selectedHostel);
      }

      const { data: rows, error } = await query;

      if (error) {
        console.error("Attendance error:", error);
        setData([]);
        return;
      }

      let result = rows || [];

      const search = studentSearch.trim().toLowerCase();

      if (search) {
        result = result.filter((row) => {
          return (
            String(row.student_name || "")
              .toLowerCase()
              .includes(search) ||
            String(row.roll_no || "")
              .toLowerCase()
              .includes(search)
          );
        });
      }

      setData(result);
    } catch (error) {
      console.error("Attendance filter error:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadAttendance();
    }, 150);

    return () => clearTimeout(timer);
  }, [
    filterMode,
    selectedDate,
    fromDate,
    toDate,
    selectedMeal,
    selectedHostel,
    studentSearch,
  ]);

  const resetFilters = () => {
    setFilterMode("date");
    setSelectedDate(today);
    setFromDate(defaultFrom);
    setToDate(today);
    setSelectedMeal("");
    setSelectedHostel("");
    setStudentSearch("");
  };

  const getMealCount = (meal) => {
    const students = new Set();

    data.forEach((row) => {
      if (
        row.meal_type === meal &&
        row.status === "Present"
      ) {
        students.add(
          row.student_id ??
            row.student_name ??
            row.id
        );
      }
    });

    return students.size;
  };

  const getDateLabel = () => {
    if (filterMode === "date") {
      return formatDate(selectedDate);
    }

    return `${formatDate(fromDate)} – ${formatDate(toDate)}`;
  };

  /* =====================================================
     EXPORT HELPERS
     Export ONLY the currently filtered `data` array.
  ===================================================== */

  const escapeExcel = (value) => {
    const text = String(value ?? "");
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;");
  };

  const exportExcel = () => {
    if (!data.length) {
      alert("No attendance data to export.");
      return;
    }

    const headers = [
      "Date",
      "Student Name",
      "Roll No.",
      "Hostel",
      "Room Number",
      "Meal",
      "Created At",
      "Scan Time",
      "Status",
      "ID",
    ];

    const rows = data.map((row) => [
      formatDate(row.attendance_date),
      row.student_name || "—",
      row.roll_no || "—",
      row.hostel || "—",
      row.room_number || "—",
      row.meal_type || "—",
      formatDateTimeForExport(row.created_at),
      formatDateTimeForExport(row.scan_time),
      row.status || "—",
      row.id ?? "—",
    ]);

    const tableRows = [headers, ...rows]
      .map(
        (row) =>
          `<tr>${row
            .map((cell) => `<td>${escapeExcel(cell)}</td>`)
            .join("")}</tr>`
      )
      .join("");

    const html = `
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            table { border-collapse: collapse; font-family: Arial, sans-serif; }
            th, td { border: 1px solid #d1d5db; padding: 8px; white-space: nowrap; }
            th { background: #172554; color: #ffffff; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>GP Barh — Mess Attendance Report</h2>
          <p>Period: ${escapeExcel(getDateLabel())}</p>
          <p>Total Records: ${data.length}</p>
          <table><thead></thead><tbody>${tableRows}</tbody></table>
        </body>
      </html>
    `;

    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `GP_Barh_Attendance_${todayIndia()}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const formatDateTimeForExport = (value) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const exportPDF = () => {
    if (!data.length) {
      alert("No attendance data to export.");
      return;
    }

    const popup = window.open("", "_blank", "width=1200,height=800");

    if (!popup) {
      alert("Please allow pop-ups to export the PDF.");
      return;
    }

    const tableRows = data
      .map(
        (row) => `
          <tr>
            <td>${escapeExcel(formatDate(row.attendance_date))}</td>
            <td>${escapeExcel(row.student_name || "—")}</td>
            <td>${escapeExcel(row.roll_no || "—")}</td>
            <td>${escapeExcel(row.hostel || "—")}</td>
            <td>${escapeExcel(row.room_number || "—")}</td>
            <td>${escapeExcel(row.meal_type || "—")}</td>
            <td>${escapeExcel(formatDateTimeForExport(row.created_at))}</td>
            <td>${escapeExcel(formatDateTimeForExport(row.scan_time))}</td>
            <td>${escapeExcel(row.status || "—")}</td>
            <td>${escapeExcel(row.id ?? "—")}</td>
          </tr>
        `
      )
      .join("");

    popup.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>GP Barh — Attendance Report</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; color: #111827; margin: 0; }
            .report-header { margin-bottom: 18px; }
            h1 { margin: 0 0 5px; font-size: 22px; }
            .subtitle { color: #475569; font-size: 12px; }
            .meta { margin-top: 10px; display: flex; gap: 25px; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 8.5px; }
            th { background: #172554; color: white; padding: 7px 5px; border: 1px solid #172554; text-align: left; }
            td { padding: 6px 5px; border: 1px solid #cbd5e1; vertical-align: top; }
            tr:nth-child(even) td { background: #f8fafc; }
            .footer { margin-top: 14px; font-size: 9px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="report-header">
            <h1>GP Barh — Mess Attendance Report</h1>
            <div class="subtitle">Government Polytechnic Barh</div>
            <div class="meta">
              <span><strong>Period:</strong> ${escapeExcel(getDateLabel())}</span>
              <span><strong>Records:</strong> ${data.length}</span>
              <span><strong>Generated:</strong> ${escapeExcel(formatDateTimeForExport(new Date().toISOString()))}</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Student Name</th>
                <th>Roll No.</th>
                <th>Hostel</th>
                <th>Room</th>
                <th>Meal</th>
                <th>Created At</th>
                <th>Scan Time</th>
                <th>Status</th>
                <th>ID</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>

          <div class="footer">Generated from the Admin Attendance report. Only the currently applied filters are included.</div>
        </body>
      </html>
    `);

    popup.document.close();

    setTimeout(() => {
      popup.focus();
      popup.print();
    }, 400);
  };

  return (
    <div className="content-card">

      {/* ================= HEADER ================= */}
      <div className="card-header">
        <div>
          <span className="section-label">
            REPORTS & FILTERS
          </span>

          <h2>Attendance</h2>

          <p>
            Search and filter attendance records
            for the selected period.
          </p>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="secondary-button export-button"
            onClick={exportExcel}
            disabled={loading || data.length === 0}
            title="Export currently filtered data to Excel"
          >
            📊 Excel
          </button>

          <button
            type="button"
            className="secondary-button export-button"
            onClick={exportPDF}
            disabled={loading || data.length === 0}
            title="Export currently filtered data to PDF"
          >
            📄 PDF
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={resetFilters}
          >
            Clear Filters
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={loadAttendance}
            disabled={loading}
          >
            {loading ? "Loading..." : "↻ Refresh"}
          </button>
        </div>
      </div>

      {/* ================= FILTERS ================= */}
      <div className="attendance-filter reports-filter">

        {/* DATE MODE */}
        <div className="report-filter-group">
          <label>Date Filter</label>

          <div className="filter-mode-buttons">
            <button
              type="button"
              className={
                filterMode === "date"
                  ? "filter-mode active"
                  : "filter-mode"
              }
              onClick={() =>
                setFilterMode("date")
              }
            >
              Specific Date
            </button>

            <button
              type="button"
              className={
                filterMode === "range"
                  ? "filter-mode active"
                  : "filter-mode"
              }
              onClick={() =>
                setFilterMode("range")
              }
            >
              Date Range
            </button>
          </div>
        </div>

        {/* SPECIFIC DATE */}
        {filterMode === "date" && (
          <div className="report-filter-group">
            <label>Specific Date</label>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) =>
                setSelectedDate(e.target.value)
              }
            />
          </div>
        )}

        {/* DATE RANGE */}
        {filterMode === "range" && (
          <>
            <div className="report-filter-group">
              <label>From Date</label>

              <input
                type="date"
                value={fromDate}
                max={toDate}
                onChange={(e) =>
                  setFromDate(e.target.value)
                }
              />
            </div>

            <div className="report-filter-group">
              <label>To Date</label>

              <input
                type="date"
                value={toDate}
                min={fromDate}
                max={today}
                onChange={(e) =>
                  setToDate(e.target.value)
                }
              />
            </div>
          </>
        )}

        {/* MEAL */}
        <div className="report-filter-group">
          <label>Meal</label>

          <select
            value={selectedMeal}
            onChange={(e) =>
              setSelectedMeal(e.target.value)
            }
          >
            <option value="">All Meals</option>

            {MEALS.map((meal) => (
              <option
                value={meal}
                key={meal}
              >
                {meal}
              </option>
            ))}
          </select>
        </div>

        {/* HOSTEL */}
        <div className="report-filter-group">
          <label>Hostel</label>

          <select
            value={selectedHostel}
            onChange={(e) =>
              setSelectedHostel(e.target.value)
            }
          >
            <option value="">All Hostels</option>
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

        {/* STUDENT SEARCH */}
        <div className="report-filter-group search-filter-group">
          <label>Name / Roll No.</label>

          <input
            type="text"
            placeholder="Search student..."
            value={studentSearch}
            onChange={(e) =>
              setStudentSearch(e.target.value)
            }
          />
        </div>
      </div>

      {/* ================= ACTIVE FILTER INFO ================= */}
      <div className="active-filter-info">
        <div>
          <span>Showing</span>
          <strong>{data.length}</strong>
          <span>attendance records</span>
        </div>

        <div>
          <span>Period:</span>
          <strong>{getDateLabel()}</strong>
        </div>
      </div>

      {/* ================= MEAL SUMMARY ================= */}
      {!loading && (
        <div className="meal-summary-grid">

          <div className="meal-summary-card breakfast">
            <span>☀ Breakfast</span>
            <strong>
              {getMealCount("Breakfast")}
            </strong>
            <small>students ate</small>
          </div>

          <div className="meal-summary-card lunch">
            <span>☼ Lunch</span>
            <strong>
              {getMealCount("Lunch")}
            </strong>
            <small>students ate</small>
          </div>

          <div className="meal-summary-card snacks">
            <span>☕ Snacks</span>
            <strong>
              {getMealCount("Snacks")}
            </strong>
            <small>students ate</small>
          </div>

          <div className="meal-summary-card dinner">
            <span>🌙 Dinner</span>
            <strong>
              {getMealCount("Dinner")}
            </strong>
            <small>students ate</small>
          </div>

        </div>
      )}

      {/* ================= TABLE ================= */}
      {loading ? (
        <div className="loading-state">
          Loading attendance...
        </div>
      ) : data.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            ✓
          </div>

          <h3>
            No attendance found
          </h3>

          <p>
            No attendance records match
            the selected filters.
          </p>
        </div>
      ) : (
        <AttendanceTable data={data} />
      )}
    </div>
  );
}


/* =====================================================
   ATTENDANCE TABLE
===================================================== */

function AttendanceTable({ data }) {
  if (!data || data.length === 0) {
    return null;
  }

  const formatDateTime = (value) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Student Name</th>
            <th>Roll No.</th>
            <th>Hostel</th>
            <th>Room Number</th>
            <th>Meal</th>
            <th>Created At</th>
            <th>Scan Time</th>
            <th>Status</th>
            <th>ID</th>
          </tr>
        </thead>

        <tbody>
          {data.map((row, index) => (
            <tr key={row.id ?? index}>

              <td>
                {formatDate(row.attendance_date)}
              </td>

              <td>
                <strong>
                  {row.student_name || "—"}
                </strong>
              </td>

              <td>
                {row.roll_no || "—"}
              </td>

              <td>
                {row.hostel || "—"}
              </td>

              <td>
                {row.room_number || "—"}
              </td>

              <td>
                {row.meal_type || "—"}
              </td>

              <td>
                {formatDateTime(row.created_at)}
              </td>

              <td>
                {formatDateTime(row.scan_time)}
              </td>

              <td>
                <span
                  className={
                    row.status === "Present"
                      ? "attendance-status present"
                      : "attendance-status absent"
                  }
                >
                  {row.status || "—"}
                </span>
              </td>

              <td>
                {row.id ?? "—"}
              </td>

            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* =====================================================
   STUDENTS
===================================================== */

function StudentsPage() {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [hostelFilter, setHostelFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  const loadStudents = async () => {
    setLoading(true);

    const { data: rows, error } = await supabase
      .from("students")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error("Students error:", error);
      setData([]);
    } else {
      setData(rows || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const filteredData = data.filter((student) => {
    const q = search.trim().toLowerCase();

    const hostel = String(student.hostel || "").toLowerCase();

    if (hostelFilter !== "All") {
      if (hostelFilter === "Boys Hostel") {
        if (!hostel.includes("boys")) return false;
      } else if (hostelFilter === "Girls Hostel") {
        if (!hostel.includes("girls")) return false;
      }
    }

    if (!q) return true;

    return (
      String(student.name || "")
        .toLowerCase()
        .includes(q) ||
      String(student.room_number || "")
        .toLowerCase()
        .includes(q) ||
      String(student.hostel || "")
        .toLowerCase()
        .includes(q) ||
      String(student.roll_no || "")
        .toLowerCase()
        .includes(q) ||
      String(student.email || "")
        .toLowerCase()
        .includes(q)
    );
  });

  const studentColumns = [
    { key: "id", label: "ID" },
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "roll_no", label: "Roll No." },
    { key: "hostel", label: "Hostel" },
    { key: "room_number", label: "Room Number" },
  ];

  const exportStudentExcel = () => {
    if (!filteredData.length) {
      alert("No student data to export.");
      return;
    }

    const escapeHtml = (value) =>
      String(value ?? "—")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");

    const rows = filteredData
      .map(
        (student) => `
          <tr>
            ${studentColumns
              .map(
                (column) =>
                  `<td>${escapeHtml(student[column.key])}</td>`
              )
              .join("")}
          </tr>`
      )
      .join("");

    const table = `
      <table border="1">
        <thead>
          <tr>
            ${studentColumns
              .map((column) => `<th>${escapeHtml(column.label)}</th>`)
              .join("")}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;

    const blob = new Blob(
      [`<html><head><meta charset="UTF-8"></head><body>${table}</body></html>`],
      { type: "application/vnd.ms-excel;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `students_${todayIndia()}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const exportStudentPDF = () => {
    if (!filteredData.length) {
      alert("No student data to export.");
      return;
    }

    const printWindow = window.open("", "_blank", "width=1200,height=800");

    if (!printWindow) {
      alert("Please allow pop-ups to export the PDF.");
      return;
    }

    const escapeHtml = (value) =>
      String(value ?? "—")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");

    const rows = filteredData
      .map(
        (student) => `
          <tr>
            ${studentColumns
              .map(
                (column) =>
                  `<td>${escapeHtml(student[column.key])}</td>`
              )
              .join("")}
          </tr>`
      )
      .join("");

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Student Report</title>
          <style>
            @page { size: landscape; margin: 14mm; }
            body { font-family: Arial, sans-serif; color: #14213d; margin: 0; }
            .header { text-align: center; margin-bottom: 22px; }
            h1 { margin: 0 0 6px; font-size: 24px; }
            p { margin: 4px 0; color: #667085; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 18px; }
            th { background: #eef2f7; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; }
            th, td { border: 1px solid #d8dee8; padding: 9px 8px; text-align: left; font-size: 11px; }
            tr:nth-child(even) td { background: #fafbfd; }
            .footer { margin-top: 18px; text-align: right; font-size: 10px; color: #7b8494; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>GP Barh — Student Report</h1>
            <p>Registered Students</p>
            <p>Showing ${filteredData.length} student${filteredData.length === 1 ? "" : "s"}${search.trim() ? ` · Search: ${escapeHtml(search.trim())}` : ""}${hostelFilter !== "All" ? ` · Hostel: ${escapeHtml(hostelFilter)}` : ""}</p>
          </div>
          <table>
            <thead>
              <tr>
                ${studentColumns
                  .map((column) => `<th>${escapeHtml(column.label)}</th>`)
                  .join("")}
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="footer">Generated: ${escapeHtml(new Date().toLocaleString("en-IN"))}</div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  return (
    <div className="content-card">
      <div className="card-header">
        <div>
          <span className="section-label">MANAGEMENT</span>
          <h2>Students</h2>
          <p>All registered student records.</p>
        </div>

        <div className="header-actions">
          <input
            type="text"
            className="admin-search"
            placeholder="Search name, room, hostel..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <button
            type="button"
            className="secondary-button export-button"
            onClick={exportStudentExcel}
            title="Export currently filtered students to Excel"
          >
            📊 Excel
          </button>

          <button
            type="button"
            className="secondary-button export-button"
            onClick={exportStudentPDF}
            title="Export currently filtered students to PDF"
          >
            📄 PDF
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={loadStudents}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Loading students...</div>
      ) : filteredData.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎓</div>
          <h3>No students found</h3>
          <p>
            {search || hostelFilter !== "All"
              ? "No student matches the selected filters."
              : "Registered students will appear here."}
          </p>
        </div>
      ) : (
        <DataTable data={filteredData} />
      )}
    </div>
  );
}

/* =====================================================
   VERIFIED HOSTELLERS
===================================================== */

function HostellersPage() {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const emptyForm = {
    name: "",
    email: "",
    roll_no: "",
    hostel: "",
    room_number: "",
  };

  const [formData, setFormData] = useState(emptyForm);

  const loadHostellers = async () => {
    setLoading(true);
    const { data: rows, error } = await supabase
      .from("hostelers")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error("Hostellers load error:", error);
      alert(error.message || "Unable to load verified hostellers.");
      setData([]);
    } else {
      setData(rows || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadHostellers();
  }, []);

  const resetForm = () => {
    setFormData({ ...emptyForm });
    setEditingId(null);
    setShowAddForm(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleRollChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 10) {
      setFormData((previous) => ({ ...previous, roll_no: value }));
    }
  };

  const handleExcelImport = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls") && !fileName.endsWith(".csv")) {
      alert("Please select an Excel (.xlsx/.xls) or CSV file.");
      return;
    }

    setImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: "", raw: false });

      if (!rows.length) throw new Error("The Excel file is empty.");

      const normalise = (value) => String(value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
      const getValue = (row, aliases) => {
        const keys = Object.keys(row);
        for (const alias of aliases) {
          const wanted = normalise(alias);
          const key = keys.find((currentKey) => normalise(currentKey) === wanted);
          if (key !== undefined && String(row[key]).trim() !== "") return String(row[key]).trim();
        }
        return "";
      };

      const imported = rows.map((row, index) => {
        const name = getValue(row, ["name", "full_name", "student_name"]);
        const email = getValue(row, ["email", "email_id", "mail"]);
        const roll_no = getValue(row, ["roll_no", "roll_number", "roll", "rollno"]).replace(/\s/g, "");
        const hostel = getValue(row, ["hostel", "hostel_name"]);
        const room_number = getValue(row, ["room_number", "room_no", "room", "roomno"]);

        if (!name || !email || !roll_no || !hostel || !room_number) {
          throw new Error(`Row ${index + 2} is missing required data. Required columns: name, email, roll_no, hostel, room_number.`);
        }
        if (!/^\d{10}$/.test(roll_no)) {
          throw new Error(`Row ${index + 2}: Roll Number "${roll_no}" must be exactly 10 digits.`);
        }
        return { name, email: email.toLowerCase(), roll_no, hostel, room_number };
      });

      const uniqueByRoll = new Map();
      for (const student of imported) {
        if (uniqueByRoll.has(student.roll_no)) {
          throw new Error(`Duplicate Roll Number ${student.roll_no} found in the Excel file.`);
        }
        uniqueByRoll.set(student.roll_no, student);
      }

      const cleanRows = Array.from(uniqueByRoll.values());
      const rollNumbers = cleanRows.map((student) => student.roll_no);
      const { data: existingRows, error: existingError } = await supabase
        .from("hostelers")
        .select("roll_no")
        .in("roll_no", rollNumbers);
      if (existingError) throw existingError;

      const existingRolls = new Set((existingRows || []).map((row) => String(row.roll_no)));
      const rowsToInsert = cleanRows.filter((student) => !existingRolls.has(student.roll_no));

      if (!rowsToInsert.length) throw new Error("All students in this file are already verified hostellers.");

      const { error: insertError } = await supabase.from("hostelers").insert(rowsToInsert);
      if (insertError) throw insertError;

      const skipped = cleanRows.length - rowsToInsert.length;
      alert(`Excel import successful! ✅\n\nAdded: ${rowsToInsert.length}\nAlready verified/skipped: ${skipped}`);
      await loadHostellers();
    } catch (error) {
      console.error("Excel import error:", error);
      alert(error.message || "Excel import failed. Please check the file format.");
    } finally {
      setImporting(false);
    }
  };

  const startEdit = (student) => {
    setEditingId(student.id);
    setFormData({
      name: String(student.name || ""),
      email: String(student.email || ""),
      roll_no: String(student.roll_no || ""),
      hostel: String(student.hostel || ""),
      room_number: String(student.room_number || ""),
    });
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveHosteller = async (e) => {
    e.preventDefault();
    const name = formData.name.trim();
    const email = formData.email.trim().toLowerCase();
    const roll_no = formData.roll_no.trim();
    const hostel = formData.hostel.trim();
    const room_number = formData.room_number.trim();

    if (!name || !email || !hostel || !room_number) {
      alert("Please fill all hosteller details.");
      return;
    }
    if (!/^\d{10}$/.test(roll_no)) {
      alert("Roll Number must be exactly 10 digits.");
      return;
    }

    setSaving(true);
    try {
      const duplicateQuery = supabase.from("hostelers").select("id, roll_no").eq("roll_no", roll_no);
      const { data: existing, error: existingError } = editingId
        ? await duplicateQuery.neq("id", editingId).maybeSingle()
        : await duplicateQuery.maybeSingle();
      if (existingError) throw existingError;
      if (existing) throw new Error("This Roll Number is already verified as another hosteller.");

      const payload = { name, email, roll_no, hostel, room_number };
      let error;
      if (editingId) {
        ({ error } = await supabase.from("hostelers").update(payload).eq("id", editingId));
      } else {
        ({ error } = await supabase.from("hostelers").insert(payload));
      }
      if (error) throw error;

      alert(editingId ? "Hosteller updated successfully! ✅" : "Hosteller verified successfully! ✅");
      resetForm();
      await loadHostellers();
    } catch (error) {
      console.error("Save hosteller error:", error);
      alert(error.message || "Failed to save hosteller.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHosteller = async (student) => {
    const confirmed = window.confirm(
      `Delete ${student.name} (${student.roll_no}) from verified hostellers?\n\nThis removes them from the hostelers table. Existing attendance records are not deleted.`
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      const { error } = await supabase.from("hostelers").delete().eq("id", student.id);
      if (error) throw error;
      if (editingId === student.id) resetForm();
      alert("Hosteller deleted successfully. 🗑️");
      await loadHostellers();
    } catch (error) {
      console.error("Delete hosteller error:", error);
      alert(error.message || "Failed to delete hosteller.");
    } finally {
      setSaving(false);
    }
  };

  const filteredData = data.filter((student) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      String(student.name || "").toLowerCase().includes(q) ||
      String(student.email || "").toLowerCase().includes(q) ||
      String(student.roll_no || "").toLowerCase().includes(q) ||
      String(student.hostel || "").toLowerCase().includes(q) ||
      String(student.room_number || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="content-card">
      <div className="card-header">
        <div>
          <span className="section-label">VERIFICATION</span>
          <h2>Verified Hostellers</h2>
          <p>Only students added here are considered official hostel residents.</p>
        </div>

        <div className="header-actions">
          <input
            type="text"
            className="admin-search"
            placeholder="Search name, roll, room..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <button type="button" className="primary-button" onClick={() => {
            if (showAddForm) resetForm();
            else setShowAddForm(true);
          }}>
            {showAddForm ? "✕ Close" : "+ Add Hosteller"}
          </button>

          <label
            className="primary-button"
            style={{ cursor: importing ? "not-allowed" : "pointer", opacity: importing ? 0.6 : 1 }}
          >
            {importing ? "Importing..." : "📊 Import Excel"}
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleExcelImport}
              disabled={importing || saving}
              style={{ display: "none" }}
            />
          </label>

          <button type="button" className="primary-button" onClick={loadHostellers} disabled={saving || importing}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {showAddForm && (
        <div style={{ marginBottom: "24px", padding: "22px", border: "1px solid #e5e7eb", borderRadius: "14px" }}>
          <h3>{editingId ? "Edit Verified Hosteller" : "Add Verified Hosteller"}</h3>
          <p>{editingId ? "Update the verified hosteller details." : "Is section me sirf admin official hostel students add karega."}</p>

          <form onSubmit={handleSaveHosteller}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
              <div className="input-group">
                <label>Full Name</label>
                <input type="text" name="name" placeholder="Enter full name" value={formData.name} onChange={handleChange} required />
              </div>
              <div className="input-group">
                <label>Email</label>
                <input type="email" name="email" placeholder="Enter email" value={formData.email} onChange={handleChange} required />
              </div>
              <div className="input-group">
                <label>10 Digit Roll Number</label>
                <input type="text" name="roll_no" inputMode="numeric" maxLength={10} pattern="[0-9]{10}" placeholder="Enter 10 digit roll number" value={formData.roll_no} onChange={handleRollChange} required />
              </div>
              <div className="input-group">
                <label>Hostel</label>
                <select name="hostel" value={formData.hostel} onChange={handleChange} required>
                  <option value="">Select Hostel</option>
                  <option value="Boys Hostel 1">Boys Hostel 1</option>
                  <option value="Boys Hostel 2">Boys Hostel 2</option>
                  <option value="Girls Hostel">Girls Hostel</option>
                </select>
              </div>
              <div className="input-group">
                <label>Room Number</label>
                <input type="text" name="room_number" placeholder="Enter room number" value={formData.room_number} onChange={handleChange} required />
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button type="submit" className="primary-button" disabled={saving || importing}>
                {saving ? "Saving..." : editingId ? "✓ Save Changes" : "✓ Verify & Add Hosteller"}
              </button>
              <button type="button" className="secondary-button" onClick={resetForm} disabled={saving}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading-state">Loading verified hostellers...</div>
      ) : filteredData.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏫</div>
          <h3>No verified hostellers found</h3>
          <p>{search ? "No verified hosteller matches your search." : "Add official hostel students from this section."}</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>NAME</th>
                <th>EMAIL</th>
                <th>ROLL NO</th>
                <th>HOSTEL</th>
                <th>ROOM NUMBER</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((student) => (
                <tr key={student.id}>
                  <td>{student.id}</td>
                  <td>{student.name}</td>
                  <td>{student.email}</td>
                  <td>{student.roll_no}</td>
                  <td>{student.hostel}</td>
                  <td>{student.room_number}</td>
                  <td>
                    <div style={{ display: "flex", gap: "8px", whiteSpace: "nowrap" }}>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => startEdit(student)}
                        disabled={saving || importing}
                        style={{ padding: "8px 12px" }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => handleDeleteHosteller(student)}
                        disabled={saving || importing}
                        style={{ padding: "8px 12px" }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* =====================================================
   WEEKLY MESS MENU - DIRECT UPDATE
===================================================== */

function MenuPage() {
  const mealIcons = {
    Breakfast: "☀",
    Lunch: "☼",
    Snacks: "☕",
    Dinner: "🌙",
  };

  const [loading, setLoading] = useState(true);
  const [savingDay, setSavingDay] = useState("");
  const [weekStart, setWeekStart] = useState(
    getMonday(todayIndia())
  );
  const [weekData, setWeekData] = useState(emptyWeek());

  const loadMenus = async () => {
    setLoading(true);

    const weekEnd = addDays(weekStart, 6);

    const { data, error } = await supabase
      .from("mess_menu")
      .select("*")
      .gte("menu_date", weekStart)
      .lte("menu_date", weekEnd)
      .order("menu_date", { ascending: true });

    if (error) {
      console.error("Menu load error:", error);
      setWeekData(emptyWeek());
      setLoading(false);
      return;
    }

    const newWeek = emptyWeek();

    (data || []).forEach((item) => {
      const day =
        item.day ||
        getDayName(item.menu_date);

      if (
        newWeek[day] &&
        Object.prototype.hasOwnProperty.call(
          newWeek[day],
          item.meal_type
        )
      ) {
        newWeek[day][item.meal_type] =
          item.menu_items || "";
      }
    });

    setWeekData(newWeek);
    setLoading(false);
  };

  useEffect(() => {
    loadMenus();
  }, [weekStart]);

  const handleWeekChange = (value) => {
    if (!value) return;
    setWeekStart(getMonday(value));
  };

  const updateMeal = (day, meal, value) => {
    setWeekData((previous) => ({
      ...previous,
      [day]: {
        ...previous[day],
        [meal]: value,
      },
    }));
  };

  const updateSingleDay = async (day, dayIndex) => {
    const date = addDays(weekStart, dayIndex);

    if (!window.confirm(`Update complete menu for ${day}?`)) {
      return;
    }

    setSavingDay(day);

    try {
      const { error: deleteError } = await supabase
        .from("mess_menu")
        .delete()
        .eq("menu_date", date);

      if (deleteError) {
        throw deleteError;
      }

      const rows = MEALS
        .map((meal) => ({
          menu_date: date,
          meal_type: meal,
          menu_items: weekData[day][meal]?.trim() || "",
          day,
        }))
        .filter((row) => row.menu_items);

      if (rows.length > 0) {
        const { error: insertError } = await supabase
          .from("mess_menu")
          .insert(rows);

        if (insertError) {
          throw insertError;
        }
      }

      alert(`${day} menu updated successfully! ✅`);
      await loadMenus();
    } catch (error) {
      console.error(`Failed to update ${day}:`, error);
      alert(`Failed to update ${day}: ${error.message}`);
    } finally {
      setSavingDay("");
    }
  };

  return (
    <div className="content-card direct-menu-page">
      <div className="card-header direct-menu-header">
        <div>
          <span className="section-label">MEAL MANAGEMENT</span>
          <h2>Weekly Mess Menu</h2>
          <p>
            Monday to Sunday, with a separate update button for each day.
          </p>
        </div>

        <div className="direct-menu-actions">
          <div className="week-selector">
            <label>Week Starting</label>

            <input
              type="date"
              value={weekStart}
              onChange={(e) => handleWeekChange(e.target.value)}
            />

            <small>
              {formatDate(weekStart)} →{" "}
              {formatDate(addDays(weekStart, 6))}
            </small>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={loadMenus}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingState text="Loading weekly menu..." />
      ) : (
        <div className="direct-week-grid">
          {DAYS.map((day, dayIndex) => {
            const date = addDays(weekStart, dayIndex);

            return (
              <div className="direct-day-card" key={day}>
                <div className="direct-day-header">
                  <div className="direct-day-title">
                    <span className="direct-day-number">
                      {String(dayIndex + 1).padStart(2, "0")}
                    </span>

                    <div>
                      <h3>{day}</h3>
                      <p>{formatDate(date)}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="day-update-button"
                    onClick={() =>
                      updateSingleDay(day, dayIndex)
                    }
                    disabled={savingDay === day}
                  >
                    {savingDay === day
                      ? "Updating..."
                      : `Update ${day}`}
                  </button>
                </div>

                <div className="direct-meal-list">
                  {MEALS.map((meal) => (
                    <div
                      className="direct-meal-row"
                      key={meal}
                    >
                      <div
                        className={`direct-meal-icon ${meal.toLowerCase()}`}
                      >
                        {mealIcons[meal]}
                      </div>

                      <div className="direct-meal-field">
                        <label>{meal}</label>

                        <input
                          type="text"
                          value={weekData[day][meal]}
                          placeholder={`Enter ${meal.toLowerCase()}...`}
                          onChange={(e) =>
                            updateMeal(
                              day,
                              meal,
                              e.target.value
                            )
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* =====================================================
   NOTICES
===================================================== */


/* =========================================================
   GEOFENCE MANAGEMENT
========================================================= */

function GeofencePage() {
  const [geofences, setGeofences] = useState([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radius, setRadius] = useState("100");

  const [editingName, setEditingName] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const loadGeofences = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/geofences`
      );

      const result = await response.json();

      if (!response.ok || result.status !== "success") {
        throw new Error(
          result.message || "Failed to load geofences."
        );
      }

      setGeofences(result.data || []);

    } catch (error) {
      console.error("Geofence load error:", error);
      alert(error.message || "Failed to load geofences.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGeofences();
  }, []);

  const clearForm = () => {
    setName("");
    setLatitude("");
    setLongitude("");
    setRadius("100");
    setEditingName(null);
  };

  const saveGeofence = async () => {

    if (!name.trim()) {
      alert("Enter geofence name.");
      return;
    }

    if (!latitude || !longitude) {
      alert("Enter latitude and longitude.");
      return;
    }

    if (!radius || Number(radius) <= 0) {
      alert("Radius must be greater than 0.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        `${API_URL}/geofences`
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            latitude: Number(latitude),
            longitude: Number(longitude),
            radius_meters: Number(radius),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || result.status !== "success") {
        throw new Error(
          result.message || "Failed to save geofence."
        );
      }

      alert(
        editingName
          ? "Geofence updated successfully."
          : "Geofence added successfully."
      );

      clearForm();
      await loadGeofences();

    } catch (error) {
      console.error("Geofence save error:", error);
      alert(error.message || "Failed to save geofence.");
    } finally {
      setSaving(false);
    }
  };

  const editGeofence = (fence) => {

    setEditingName(fence.name);

    setName(fence.name || "");
    setLatitude(String(fence.latitude || ""));
    setLongitude(String(fence.longitude || ""));
    setRadius(String(fence.radius_meters || 100));

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const deleteGeofence = async (fenceName) => {

    if (!window.confirm(
      `Delete "${fenceName}" geofence?`
    )) {
      return;
    }

    try {
      setDeleting(fenceName);

      const response = await fetch(
        `https://mess-attendance-backend.vercel.app/geofences/${encodeURIComponent(
          fenceName
        )}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok || result.status !== "success") {
        throw new Error(
          result.message || "Failed to delete geofence."
        );
      }

      alert("Geofence deleted successfully.");

      if (editingName === fenceName) {
        clearForm();
      }

      await loadGeofences();

    } catch (error) {
      console.error("Geofence delete error:", error);
      alert(error.message || "Failed to delete geofence.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="content-card">

      <div className="card-header">

        <div>
          <span className="section-label">
            LOCATION CONTROL
          </span>

          <h2>
            Geofence Management
          </h2>

          <p>
            Manage allowed attendance locations.
          </p>
        </div>

        <button
          className="secondary-button"
          onClick={loadGeofences}
        >
          ↻ Refresh
        </button>

      </div>


      {/* ADD / EDIT */}

      <div className="dashboard-panel">

        <div className="panel-header">

          <div>
            <span className="section-label">
              {editingName ? "EDIT" : "ADD"}
            </span>

            <h3>
              {editingName
                ? "Edit Geofence"
                : "Add Geofence"}
            </h3>
          </div>

        </div>


        <div className="filter-bar">

          <div className="filter-item">
            <label>Name</label>

            <input
              type="text"
              placeholder="Mess 2"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
            />
          </div>


          <div className="filter-item">
            <label>Latitude</label>

            <input
              type="number"
              step="any"
              placeholder="25.451630"
              value={latitude}
              onChange={(e) =>
                setLatitude(e.target.value)
              }
            />
          </div>


          <div className="filter-item">
            <label>Longitude</label>

            <input
              type="number"
              step="any"
              placeholder="85.746380"
              value={longitude}
              onChange={(e) =>
                setLongitude(e.target.value)
              }
            />
          </div>


          <div className="filter-item">
            <label>Radius (meters)</label>

            <input
              type="number"
              min="1"
              value={radius}
              onChange={(e) =>
                setRadius(e.target.value)
              }
            />
          </div>

        </div>


        <div
          style={{
            display: "flex",
            gap: "10px",
            marginTop: "15px",
          }}
        >

          <button
            className="primary-button"
            onClick={saveGeofence}
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : editingName
              ? "Update Geofence"
              : "Add Geofence"}
          </button>


          {editingName && (
            <button
              className="secondary-button"
              onClick={clearForm}
            >
              Cancel
            </button>
          )}

        </div>

      </div>


      {/* LIST */}

      <div
        className="dashboard-panel"
        style={{ marginTop: "20px" }}
      >

        <div className="panel-header">

          <div>
            <span className="section-label">
              ACTIVE LOCATIONS
            </span>

            <h3>
              Configured Geofences
            </h3>
          </div>

        </div>


        {loading ? (
          <LoadingState text="Loading geofences..." />
        ) : geofences.length === 0 ? (

          <EmptyState
            icon="📍"
            title="No Geofences"
            text="No geofence locations configured."
          />

        ) : (

          <div className="table-wrapper">

            <table className="admin-table">

              <thead>

                <tr>
                  <th>Name</th>
                  <th>Latitude</th>
                  <th>Longitude</th>
                  <th>Radius</th>
                  <th>Actions</th>
                </tr>

              </thead>


              <tbody>

                {geofences.map((fence) => (

                  <tr key={fence.name}>

                    <td>
                      <strong>
                        {fence.name}
                      </strong>
                    </td>

                    <td>
                      {fence.latitude}
                    </td>

                    <td>
                      {fence.longitude}
                    </td>

                    <td>
                      {fence.radius_meters} m
                    </td>

                    <td>

                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() =>
                          editGeofence(fence)
                        }
                        style={{
                          marginRight: "8px",
                        }}
                      >
                        ✏️ Edit
                      </button>


                      <button
                        type="button"
                        className="delete-button"
                        onClick={() =>
                          deleteGeofence(fence.name)
                        }
                        disabled={
                          deleting === fence.name
                        }
                      >
                        {deleting === fence.name
                          ? "Deleting..."
                          : "🗑 Delete"}
                      </button>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </div>
  );
}



function NoticesPage() {
  const [data, setData] = useState([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const loadNotices = async () => {
    setLoading(true);

    const { data: rows, error } = await supabase
      .from("notices")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error("Notices error:", error);
      setData([]);
      setStatus(error.message);
    } else {
      setData(rows || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadNotices();
  }, []);

  const publishNotice = async () => {
    if (!title.trim() || !message.trim()) {
      setStatus("Please enter title and message.");
      return;
    }

    const { error } = await supabase
      .from("notices")
      .insert([
        {
          title: title.trim(),
          message: message.trim(),
        },
      ]);

    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus("Notice published successfully.");
    setTitle("");
    setMessage("");
    await loadNotices();
  };

  const deleteNotice = async (id) => {
    if (!window.confirm("Delete this notice?")) return;

    const { error } = await supabase
      .from("notices")
      .delete()
      .eq("id", id);

    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus("Notice deleted successfully.");
    await loadNotices();
  };

  return (
    <div className="content-card">
      <div className="card-header">
        <div>
          <span className="section-label">MESSAGES</span>
          <h2>Notices</h2>
          <p>Publish important messages for students.</p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={loadNotices}
        >
          ↻ Refresh
        </button>
      </div>

      <div className="admin-form">
        <label>Notice Title</label>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter notice title"
        />

        <label>Notice Message</label>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter notice message"
          rows="5"
        />

        <button
          type="button"
          className="primary-button"
          onClick={publishNotice}
        >
          📢 Publish Notice
        </button>

        {status && (
          <div className="form-message">
            {status}
          </div>
        )}
      </div>

      {loading ? (
        <LoadingState text="Loading notices..." />
      ) : data.length > 0 ? (
        <div className="table-wrapper">
          <table className="admin-table notices-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Message</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {data.map((notice) => (
                <tr key={notice.id}>
                  <td>
                    <strong>{notice.title || "—"}</strong>
                  </td>

                  <td className="notice-message-cell">
                    {notice.message || "—"}
                  </td>

                  <td>
                    {notice.created_at
                      ? new Date(
                          notice.created_at
                        ).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </td>

                  <td>
                    <button
                      type="button"
                      className="delete-button"
                      onClick={() => deleteNotice(notice.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">📢</div>
          <h3>No notices found</h3>
          <p>Published notices will appear here.</p>
        </div>
      )}
    </div>
  );
}



/* =====================================================
   COMPLAINTS & FEEDBACK
===================================================== */

function ComplaintsFeedbackPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadComplaintsFeedback = async () => {
    setLoading(true);

    const { data: rows, error } = await supabase
      .from("complaints_feedback")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(
        "Error loading complaints & feedback:",
        error
      );
      setData([]);
    } else {
      setData(rows || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadComplaintsFeedback();
  }, []);

  const deleteComplaint = async (id) => {
  if (!window.confirm("Delete this complaint / feedback permanently?")) {
    return;
  }

  const { error, count } = await supabase
    .from("complaints_feedback")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) {
    console.error("Delete complaint error:", error);
    alert(`Failed to delete: ${error.message}`);
    return;
  }

  if (count === 0) {
    alert(
      "Nothing was deleted. Supabase RLS is blocking the delete."
    );
    return;
  }

  setData((previous) =>
    previous.filter((item) => item.id !== id)
  );

  alert("Complaint / Feedback deleted successfully.");
};

  return (
    <div className="content-card">
      <div className="card-header">
        <div>
          <span className="section-label">
            STUDENT RESPONSES
          </span>

          <h2>Complaints & Feedback</h2>

          <p>
            View complaints and feedback submitted by students.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={loadComplaintsFeedback}
        >
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <LoadingState text="Loading complaints & feedback..." />
      ) : data.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h3>No complaints or feedback found</h3>
          <p>New student submissions will appear here.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Email</th>
                <th>Type</th>
                <th>Subject</th>
                <th>Message</th>
                <th>Rating</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {data.map((item) => (
                <tr key={item.id}>
                  <td>{item.student_name || "—"}</td>
                  <td>{item.student_email || "—"}</td>
                  <td>{item.type || "—"}</td>
                  <td>{item.subject || "—"}</td>
                  <td>{item.message || "—"}</td>
                  <td>
                    {item.rating !== null &&
                    item.rating !== undefined &&
                    item.rating !== ""
                      ? `${item.rating}/5`
                      : "—"}
                  </td>
                  <td>
                    {item.created_at
                      ? new Date(
                          item.created_at
                        ).toLocaleString("en-IN")
                      : "—"}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="delete-button"
                      onClick={() => deleteComplaint(item.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* =====================================================
   PASSWORD RESET
===================================================== */

function PasswordResetPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const changePassword = async () => {
    if (!email.trim() || !password) {
      setMessage(
        "Please enter email and new password."
      );
      return;
    }

    if (password.length < 6) {
      setMessage(
        "Password must be at least 6 characters."
      );
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        "https://mess-attendance-backend.vercel.app/admin/change-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.detail ||
            result.message ||
            "Password change failed."
        );
      }

      setMessage("Password changed successfully.");
      setEmail("");
      setPassword("");
    } catch (error) {
      setMessage(
        error.message || "Unable to change password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content-card password-card">
      <div className="card-header">
        <div>
          <span className="section-label">SECURITY</span>
          <h2>Password Reset</h2>
          <p>Change a student's password directly.</p>
        </div>
      </div>

      <div className="reset-form">
        <label>Student Email</label>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="student@example.com"
        />

        <label>New Password</label>

        <input
          type="password"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
          placeholder="Enter new password"
        />

        <button
          type="button"
          className="primary-button"
          onClick={changePassword}
          disabled={loading}
        >
          {loading
            ? "Changing..."
            : "Change Password"}
        </button>

        {message && (
          <div className="form-message">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

/* =====================================================
   GENERIC UI HELPERS
===================================================== */

function LoadingState({ text = "Loading..." }) {
  return (
    <div className="loading-state">
      {text}
    </div>
  );
}

function DataTable({ data }) {
  if (!data || data.length === 0) {
    return null;
  }

  const columns = Object.keys(data[0]);

  return (
    <div className="table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>
                {column.replaceAll("_", " ")}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.map((row, index) => (
            <tr key={row.id ?? index}>
              {columns.map((column) => (
                <td key={column}>
                  {row[column] === null ||
                  row[column] === undefined
                    ? "—"
                    : typeof row[column] === "object"
                    ? JSON.stringify(row[column])
                    : String(row[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}