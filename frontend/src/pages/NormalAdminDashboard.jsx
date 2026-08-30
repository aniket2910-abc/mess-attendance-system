import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import "../styles/AdminDashboard.css";

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

export default function NormalAdminDashboard() {
  const [activePage, setActivePage] = useState("dashboard");

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("adminLoggedIn");
    localStorage.removeItem("adminRole");
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

      case "menu":
        return <MenuPage />;

      case "notices":
        return <NoticesPage />;

      case "archives":
        return <ArchivesPage />;

      case "complaints":
        return <ComplaintsFeedbackPage />;

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
            <span>MESS ADMIN</span>
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
            <div className="header-label">MESS ADMINISTRATION</div>
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
    if (!id) return;

    const confirmed = window.confirm(
      "Delete this notice? This action cannot be undone."
    );

    if (!confirmed) return;

    setStatus("");

    const { error } = await supabase
      .from("notices")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Notice delete error:", error);
      setStatus(`Unable to delete notice: ${error.message}`);
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
                      🗑 Delete
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
   HOSTELLERS — READ ONLY
===================================================== */

function HostellersPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [hostelFilter, setHostelFilter] = useState("All");

  const loadHostellers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("students")
      .select("id, name, email, roll_no, hostel, room_number")
      .not("hostel", "is", null)
      .order("id", { ascending: false });

    if (error) {
      console.error("Hostellers error:", error);
      setStudents([]);
      alert(error.message);
    } else {
      setStudents(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { loadHostellers(); }, []);

  const hostels = ["All", ...new Set(students.map(s => s.hostel).filter(Boolean))];
  const filtered = students.filter((student) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q ||
      String(student.name || "").toLowerCase().includes(q) ||
      String(student.roll_no || "").toLowerCase().includes(q) ||
      String(student.room_number || "").toLowerCase().includes(q);
    const matchesHostel = hostelFilter === "All" || student.hostel === hostelFilter;
    return matchesSearch && matchesHostel;
  });

  return (
    <div className="content-card">
      <div className="card-header">
        <div>
          <span className="section-label">VERIFICATION</span>
          <h2>Verified Hostellers</h2>
          <p>Hostel residents maintained by the College Warden.</p>
        </div>
        <button type="button" className="primary-button" onClick={loadHostellers}>↻ Refresh</button>
      </div>

      <div className="filter-bar">
        <div className="search-box">
          <span>⌕</span>
          <input placeholder="Search name, roll, room..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={hostelFilter} onChange={(e) => setHostelFilter(e.target.value)}>
          {hostels.map(h => <option key={h}>{h}</option>)}
        </select>
        <div className="result-count">{filtered.length} Hostellers</div>
      </div>

      {loading ? <LoadingState text="Loading hostellers..." /> : filtered.length === 0 ? (
        <EmptyState icon="🏫" title="No Hostellers Found" text="No hostel residents match the selected filters." />
      ) : (
        <div className="table-wrapper">
          <table className="admin-table">
            <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Roll No.</th><th>Hostel</th><th>Room Number</th></tr></thead>
            <tbody>{filtered.map(s => (
              <tr key={s.id}>
                <td>{s.id}</td><td><strong>{s.name || "—"}</strong></td><td>{s.email || "—"}</td>
                <td>{s.roll_no || "—"}</td><td>{s.hostel || "—"}</td><td>{s.room_number || "—"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* =====================================================
   ARCHIVES — READ ONLY
===================================================== */

function ArchivesPage() {
  const [archives, setArchives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadArchives = async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("http://127.0.0.1:8000/admin/monthly-archives");
      const result = await response.json();
      if (!response.ok || result.status === "error") throw new Error(result.message || "Unable to load archives.");
      setArchives(result.data || result.archives || []);
    } catch (err) {
      console.error("Archives error:", err);
      setArchives([]); setError(err.message || "Unable to load archives.");
    } finally { setLoading(false); }
  };

  useEffect(() => { loadArchives(); }, []);

  const downloadArchive = async (archive) => {
    if (!archive?.id) return;
    try {
      const response = await fetch(`http://127.0.0.1:8000/admin/monthly-archives/${archive.id}/download`);
      const result = await response.json();
      if (!response.ok || result.status === "error") throw new Error(result.message || "Unable to create download link.");
      const url = result.url || result.signed_url || result.download_url;
      if (!url) throw new Error("Archive download URL was not returned.");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) { alert(err.message || "Archive download failed."); }
  };

  return (
    <div className="content-card">
      <div className="card-header">
        <div>
          <span className="section-label">ARCHIVES</span>
          <h2>Monthly Archives</h2>
          <p>View archived attendance reports. Archive management is controlled by the College Warden.</p>
        </div>
        <button type="button" className="primary-button" onClick={loadArchives}>↻ Refresh</button>
      </div>

      {loading ? <LoadingState text="Loading archives..." /> : error ? (
        <div className="empty-state"><div className="empty-icon">📁</div><h3>Unable to load archives</h3><p>{error}</p></div>
      ) : archives.length === 0 ? (
        <EmptyState icon="📁" title="No archives found" text="Monthly archived reports will appear here." />
      ) : (
        <div className="table-wrapper">
          <table className="admin-table">
            <thead><tr><th>Period</th><th>File</th><th>Created</th><th>Action</th></tr></thead>
            <tbody>{archives.map((archive, index) => (
              <tr key={archive.id || index}>
                <td>{archive.period_start && archive.period_end ? `${formatDate(archive.period_start)} – ${formatDate(archive.period_end)}` : archive.month || "—"}</td>
                <td><strong>{archive.file_name || archive.filename || "Monthly Attendance PDF"}</strong></td>
                <td>{archive.created_at ? new Date(archive.created_at).toLocaleString("en-IN") : "—"}</td>
                <td><button type="button" className="secondary-button" onClick={() => downloadArchive(archive)}>📄 View / Download</button></td>
              </tr>
            ))}</tbody>
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
        "http://127.0.0.1:8000/admin/change-password",
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