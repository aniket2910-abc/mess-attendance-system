import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import "../styles/Dashboard.css";
import collegeLogo from "../assets/white logo gp.jpeg";

const MEALS = ["Breakfast", "Lunch", "Snacks", "Dinner"];

const getTodayIndia = () => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());
};


const MEAL_WINDOWS = {
  Breakfast: { start: "04:00", end: "12:30" },
  Lunch: { start: "12:30", end: "17:15" },
  Snacks: { start: "17:15", end: "19:30" },
  Dinner: { start: "19:30", end: "23:59" },
};

const formatHistoryDate = (value) => {
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatHistoryTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

const getDateDaysAgo = (daysAgo) => {
  const date = new Date();

  date.setDate(date.getDate() - daysAgo);

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(date);
};

const isMealWindowClosed = (dateString, mealName) => {
  const today = getTodayIndia();

  if (dateString < today) return true;
  if (dateString > today) return false;

  const window = MEAL_WINDOWS[mealName];

  if (!window) return false;

  const nowParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const hour = Number(
    nowParts.find((part) => part.type === "hour")?.value || 0
  );

  const minute = Number(
    nowParts.find((part) => part.type === "minute")?.value || 0
  );

  const currentMinutes = hour * 60 + minute;

  const [endHour, endMinute] = window.end.split(":").map(Number);

  return currentMinutes >= endHour * 60 + endMinute;
};

function Dashboard() {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  const [menu, setMenu] = useState([]);
  const [notices, setNotices] = useState([]);

  const [menuLoading, setMenuLoading] = useState(true);
  const [noticeLoading, setNoticeLoading] = useState(true);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyFilter, setHistoryFilter] = useState("All");
  const [historyOpen, setHistoryOpen] = useState(false);

  const [activeModal, setActiveModal] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [complaintType, setComplaintType] = useState("Complaint");
const [complaintSubject, setComplaintSubject] = useState("");
const [complaintMessage, setComplaintMessage] = useState("");
const [complaintRating, setComplaintRating] = useState("");
const [complaintSubmitting, setComplaintSubmitting] = useState(false);

  /* ================= STUDENT ================= */

  useEffect(() => {
    const loadStudent = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (!data.session) {
          window.location.href = "/";
          return;
        }

        const savedStudent = localStorage.getItem("student");

        if (savedStudent) {
          setStudent(JSON.parse(savedStudent));
          setLoading(false);
          return;
        }

        const email = data.session.user.email;

        const response = await fetch(
          `http://127.0.0.1:8000/students?email=${encodeURIComponent(email)}`
        );

        const result = await response.json();

        if (
          !response.ok ||
          result.status !== "success" ||
          !result.data?.length
        ) {
          throw new Error("Student profile not found.");
        }

        const profile = result.data[0];

        localStorage.setItem("student", JSON.stringify(profile));
        setStudent(profile);
      } catch (error) {
        console.error("Dashboard error:", error);

        await supabase.auth.signOut();

        localStorage.removeItem("student");
        localStorage.removeItem("isLoggedIn");

        window.location.href = "/";
      } finally {
        setLoading(false);
      }
    };

    loadStudent();
  }, []);

  /* ================= MENU ================= */

  const loadMenu = async () => {
    setMenuLoading(true);

    try {
      const today = getTodayIndia();

      const { data, error } = await supabase
        .from("mess_menu")
        .select("*")
        .eq("menu_date", today);

      if (error) {
        console.error("Menu error:", error);
        setMenu([]);
      } else {
        const sorted = [...(data || [])].sort((a, b) => {
          return (
            MEALS.indexOf(
              String(a.meal_type || "").toLowerCase().replace(/^./, (x) => x.toUpperCase())
            ) -
            MEALS.indexOf(
              String(b.meal_type || "").toLowerCase().replace(/^./, (x) => x.toUpperCase())
            )
          );
        });

        setMenu(sorted);
      }
    } catch (error) {
      console.error("Menu loading error:", error);
      setMenu([]);
    } finally {
      setMenuLoading(false);
    }
  };

  /* ================= NOTICES ================= */

  const loadNotices = async () => {
    setNoticeLoading(true);

    try {
      const { data, error } = await supabase
        .from("notices")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Notice error:", error);
        setNotices([]);
      } else {
        setNotices(data || []);
      }
    } catch (error) {
      console.error("Notice loading error:", error);
      setNotices([]);
    } finally {
      setNoticeLoading(false);
    }
  };

  /* ================= 30 DAYS MEAL HISTORY ================= */

  const loadHistory = async () => {
    // Attendance table is linked by roll_no in the current system.
    // Do NOT use attendance.student_id here because the current
    // attendance records are identified by roll_no.
    const rollNo = String(student?.roll_no || "").trim();

    if (!rollNo) {
      console.error("History error: student roll number is missing.");
      setHistory([]);
      setHistoryLoading(false);
      return;
    }

    setHistoryLoading(true);

    try {
      const endDate = getTodayIndia();
      const startDate = getDateDaysAgo(29);

      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("roll_no", rollNo)
        .gte("attendance_date", startDate)
        .lte("attendance_date", endDate)
        .order("attendance_date", { ascending: false })
        .order("scan_time", { ascending: false });

      if (error) {
        console.error("History error:", error);
        setHistory([]);
        return;
      }

      console.log("Meal history loaded:", {
        rollNo,
        rows: data?.length || 0,
        data,
      });

      const attendanceMap = new Map();

      (data || []).forEach((row) => {
        const normalizedMeal = String(row.meal_type || "")
          .trim()
          .toLowerCase();

        const meal = MEALS.find(
          (item) => item.toLowerCase() === normalizedMeal
        );

        if (!meal) return;

        const key = `${row.attendance_date}|${meal}`;

        if (!attendanceMap.has(key)) {
          attendanceMap.set(key, {
            ...row,
            meal_type: meal,
          });
        }
      });

      const generatedHistory = [];

      for (let daysAgo = 0; daysAgo < 30; daysAgo += 1) {
        const date = getDateDaysAgo(daysAgo);

        MEALS.forEach((meal) => {
          const key = `${date}|${meal}`;
          const row = attendanceMap.get(key);

          if (row) {
            generatedHistory.push({
              ...row,
              historyStatus:
                String(row.status || "").trim().toLowerCase() === "present"
                  ? "Present"
                  : row.status || "Absent",
            });
          } else {
            generatedHistory.push({
              id: `absent-${date}-${meal}`,
              attendance_date: date,
              meal_type: meal,
              scan_time: null,
              created_at: null,
              status: "Absent",
              historyStatus: isMealWindowClosed(date, meal)
                ? "Absent"
                : "Pending",
            });
          }
        });
      }

      setHistory(generatedHistory);
    } catch (error) {
      console.error("History loading error:", error);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (student?.id) {
      loadHistory();
    }
  }, [student?.id]);

  /* ================= LOAD MENU + NOTICE ================= */

  useEffect(() => {
    loadMenu();
    loadNotices();

    const refreshData = () => {
      loadMenu();
      loadNotices();
    };

    window.addEventListener("focus", refreshData);

    const interval = setInterval(refreshData, 30000);

    return () => {
      window.removeEventListener("focus", refreshData);
      clearInterval(interval);
    };
  }, []);

  /* ================= COMPLAINT / FEEDBACK ================= */

const handleComplaintSubmit = async (e) => {
  e.preventDefault();

  if (!complaintSubject.trim() || !complaintMessage.trim()) {
    alert("Please fill Subject and Message.");
    return;
  }

  setComplaintSubmitting(true);

  try {
    const { error } = await supabase
      .from("complaints_feedback")
      .insert([
        {
          student_name: student.name,
          student_email: student.email,
          type: complaintType,
          subject: complaintSubject.trim(),
          message: complaintMessage.trim(),
          rating: complaintRating
            ? Number(complaintRating)
            : null,
        },
      ]);

    if (error) {
      console.error("Complaint submission error:", error);
      alert(`Failed to submit: ${error.message}`);
      return;
    }

    alert("Complaint / Feedback submitted successfully!");

    setComplaintType("Complaint");
    setComplaintSubject("");
    setComplaintMessage("");
    setComplaintRating("");
    setActiveModal(null);

  } catch (error) {
    console.error("Complaint submission error:", error);
    alert("Something went wrong. Please try again.");
  } finally {
    setComplaintSubmitting(false);
  }
};

  /* ================= LOGOUT ================= */

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();

      localStorage.removeItem("student");
      localStorage.removeItem("isLoggedIn");

      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  /* ================= LOADING ================= */

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-logo">
          <img src={collegeLogo} alt="GP Barh" />
        </div>

        <div className="loading-spinner"></div>

        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (!student) return null;

  const initial = student.name
    ? student.name.charAt(0).toUpperCase()
    : "S";

  /* ================= HELPERS ================= */

  const getMeal = (mealName) => {
    return menu.find(
      (item) =>
        String(item.meal_type || "").toLowerCase() ===
        mealName.toLowerCase()
    );
  };

  return (
    <div className="dashboard-page">

      {/* ================= NAVBAR ================= */}

      <header className="top-navbar">

        <div className="navbar-left">

          <div className="logo-box">
            <img
              src={collegeLogo}
              alt="Government Polytechnic Barh"
            />
          </div>

          <div className="college-title">
            <h1>Government Polytechnic Barh</h1>
            <span>Mess Attendance System</span>
          </div>

        </div>
<div className="navbar-right">

  <div className="online-status">
    <span className="status-dot"></span>
    <span>System Online</span>
  </div>

  <button
    className="logout-btn"
    onClick={handleLogout}
  >
    <span>↪</span>
    Logout
  </button>

  {/* MOBILE MENU BUTTON */}
  <button
    type="button"
    className={`mobile-menu-toggle ${
      mobileMenuOpen ? "open" : ""
    }`}
    onClick={() => setMobileMenuOpen((prev) => !prev)}
    aria-label="Open menu"
  >
    <span></span>
    <span></span>
    <span></span>
  </button>

</div>

      </header>





{/* ================= MOBILE QUICK MENU ================= */}

{mobileMenuOpen && (
  <div className="mobile-quick-menu">

    <button
      type="button"
      onClick={() => {
        setMobileMenuOpen(false);
        window.location.href = "/scan";
      }}
    >
      <span className="mobile-menu-icon">✓</span>
      <span>Mark Attendance</span>
      <span className="mobile-menu-arrow">→</span>
    </button>

    <button
      type="button"
      onClick={() => {
        setMobileMenuOpen(false);
        loadMenu();
        setActiveModal("menu");
      }}
    >
      <span className="mobile-menu-icon">🍛</span>
      <span>Today's Menu</span>
      <span className="mobile-menu-arrow">→</span>
    </button>

    <button
      type="button"
      onClick={() => {
        setMobileMenuOpen(false);
        loadNotices();
        setActiveModal("notices");
      }}
    >
      <span className="mobile-menu-icon">📢</span>
      <span>Notices & Updates</span>
      <span className="mobile-menu-arrow">→</span>
    </button>

    <button
      type="button"
      onClick={() => {
        setMobileMenuOpen(false);
        setHistoryOpen(true);
      }}
    >
      <span className="mobile-menu-icon">📊</span>
      <span>My Meal History</span>
      <span className="mobile-menu-arrow">→</span>
    </button>

  </div>
)}




      {/* ================= MAIN ================= */}

      <main className="dashboard-content">

        <div className="breadcrumb">
          <span>Home</span>
          <b>/</b>-
          <strong>Student Dashboard</strong>
        </div>


        {/* ================= HERO ================= */}

        <section className="hero-card">

          <div className="hero-glow glow-one"></div>
          <div className="hero-glow glow-two"></div>

          <div className="hero-content">

            <div className="hero-tag">
              <span>✦</span>
              STUDENT PORTAL
            </div>

            <p className="hero-greeting">
              Welcome back,
            </p>

            <h2>
              {student.name} <span>👋</span>
            </h2>

            <p className="hero-subtitle">
              Manage your mess attendance, check today's menu
              and stay updated with important notices.
            </p>

            <div className="hero-meta">

              <div className="hero-meta-item">

                <div className="meta-icon">
                  🎓
                </div>

                <div>
                  <small>ROLL NUMBER</small>
                  <strong>{student.roll_no}</strong>
                </div>

              </div>

              <div className="hero-divider"></div>

              <div className="hero-meta-item">

                <div className="meta-icon">
                  🏠
                </div>

                <div>
                  <small>HOSTEL</small>
                  <strong>{student.hostel}</strong>
                </div>

              </div>

            </div>

          </div>


          <div className="hero-profile">

            <div className="profile-ring">

              <div className="profile-avatar">
                {initial}
              </div>

            </div>

            <span className="profile-verified">
              ✓
            </span>

            <p>ACTIVE STUDENT</p>

          </div>

        </section>


        {/* ================= PROFILE STATS ================= */}

        <section className="stats-grid">

          <div className="stat-card">
            <div className="stat-icon gold">🎓</div>

            <div className="stat-info">
              <span>Roll Number</span>
              <strong>{student.roll_no}</strong>
            </div>
          </div>


          <div className="stat-card">
            <div className="stat-icon gold">🏠</div>

            <div className="stat-info">
              <span>Hostel</span>
              <strong>{student.hostel}</strong>
            </div>
          </div>


          <div className="stat-card">
            <div className="stat-icon gold">🚪</div>

            <div className="stat-info">
              <span>Room Number</span>
              <strong>{student.room_number}</strong>
            </div>
          </div>


          <div className="stat-card">
            <div className="stat-icon gold">✉</div>

            <div className="stat-info">
              <span>Email</span>
              <strong title={student.email}>
                {student.email}
              </strong>
            </div>
          </div>

        </section>


        {/* ================= SERVICES ================= */}

        <div className="section-header">

          <div>
            <span className="section-kicker">
              QUICK ACCESS
            </span>

            <h2>Mess Services</h2>

            <p>
              Everything you need in one place.
            </p>
          </div>

        </div>


        <section className="services-grid">


          {/* ATTENDANCE */}

          <article className="service-card">

            <div className="service-card-top">

              <div className="service-icon">
                ✓
              </div>

              <span className="service-arrow">
                →
              </span>

            </div>

            <div className="service-number">
              01
            </div>

            <h3>
              Mess Attendance
            </h3>

            <p>
              Mark your daily meal attendance and
              view your complete attendance history.
            </p>

            <button
              onClick={() => {
                window.location.href = "/scan";
              }}
              className="service-btn"
            >
              Open Attendance
              <span>→</span>
            </button>

          </article>


          {/* MENU */}

          <article className="service-card">

            <div className="service-card-top">

              <div className="service-icon">
                🍛
              </div>

              <span className="service-arrow">
                →
              </span>

            </div>

            <div className="service-number">
              02
            </div>

            <h3>
              Today's Menu
            </h3>

            <p>
              Check breakfast, lunch, snacks and dinner
              before heading to the mess.
            </p>

            <button
              onClick={() => {
                loadMenu();
                setActiveModal("menu");
              }}
              className="service-btn"
            >
              View Today's Menu
              <span>→</span>
            </button>

          </article>


          {/* NOTICES */}

          <article className="service-card">

            <div className="service-card-top">

              <div className="service-icon">
                📢
              </div>

              <span className="service-arrow">
                →
              </span>

            </div>

            <div className="service-number">
              03
            </div>

            <h3>
  Notices & Updates
  {notices.length > 0 && (
    <span className="notice-badge">
      NEW 1
    </span>
  )}
</h3>

            <p>
              Stay informed about important mess
              announcements and college updates.
            </p>

            <button
              onClick={() => {
                loadNotices();
                setActiveModal("notices");
              }}
              className="service-btn"
            >
              View Notices
              </button>
<button
  onClick={() => setActiveModal("complaint")}
  className="service-btn"
>
  Complaint / Feedback
  <span>→</span>
</button>
              

          </article>

        </section>


        {/* ================= 30 DAYS HISTORY ================= */}
        <section className="history-section">

          {/* Collapsed / expandable history header */}
          <button
            type="button"
            onClick={() => setHistoryOpen((previous) => !previous)}
            style={{
              width: "100%",
              border: "none",
              background: "transparent",
              padding: 0,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div
              className="section-header"
              style={{
                marginBottom: historyOpen ? "22px" : 0,
                alignItems: "center",
              }}
            >
              <div>
                <span className="section-kicker">
                  ATTENDANCE REPORT
                </span>

                <h2
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "6px",
                  }}
                >
                  My Meal History
                  <span
                    aria-hidden="true"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "30px",
                      height: "30px",
                      borderRadius: "50%",
                      background: "#eef2ff",
                      color: "#4f46e5",
                      fontSize: "22px",
                      fontWeight: 700,
                      lineHeight: 1,
                      transition: "transform 0.2s ease",
                    }}
                  >
                    {historyOpen ? "⌄" : ">"}
                  </span>
                </h2>

                <p>
                  {historyOpen
                    ? "Your last 30 days meal attendance."
                    : "Tap to view your last 30 days meal attendance."}
                </p>
              </div>

              {historyOpen && (
                <span
                  className="service-btn"
                  style={{
                    pointerEvents: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  {historyLoading ? "Loading..." : "↻ Refresh"}
                </span>
              )}
            </div>
          </button>

          {historyOpen && (
            <>
              {/* Refresh remains available without changing the old logic */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginBottom: "18px",
                }}
              >
                <button
                  type="button"
                  className="service-btn"
                  onClick={loadHistory}
                  disabled={historyLoading}
                >
                  {historyLoading ? "Loading..." : "↻ Refresh"}
                </button>
              </div>

              {/* ================= SUMMARY ================= */}
              <div className="history-summary-grid">

                {MEALS.map((meal) => {
                  const mealRows = history.filter(
                    (item) => item.meal_type === meal
                  );

                  const presentCount = mealRows.filter(
                    (item) => item.historyStatus === "Present"
                  ).length;

                  const absentCount = mealRows.filter(
                    (item) => item.historyStatus === "Absent"
                  ).length;

                  return (
                    <div
                      className="history-summary-card"
                      key={meal}
                    >
                      <span>
                        {meal}
                      </span>

                      <strong>
                        {presentCount}/30
                      </strong>

                      <small>
                        Present · {absentCount} Absent
                      </small>
                    </div>
                  );
                })}

                <div className="history-summary-card total">
                  <span>
                    Total Meals
                  </span>

                  <strong>
                    {
                      history.filter(
                        (item) =>
                          item.historyStatus === "Present"
                      ).length
                    }
                  </strong>

                  <small>
                    Present in 30 days
                  </small>
                </div>

              </div>

              {/* ================= FILTER ================= */}
              <div className="history-filter">
                <label>
                  Filter History
                </label>

                <select
                  value={historyFilter}
                  onChange={(e) =>
                    setHistoryFilter(e.target.value)
                  }
                >
                  <option value="All">
                    All Meals
                  </option>

                  <option value="Present">
                    Present
                  </option>

                  <option value="Absent">
                    Absent
                  </option>

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

              {/* ================= HISTORY TABLE ================= */}
              {historyLoading ? (
                <div className="history-empty">
                  Loading your last 30 days history...
                </div>
              ) : (
                <div className="history-table-wrapper">
                  <table className="history-table history-grouped-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        {MEALS.map((meal) => (
                          <th key={meal}>{meal}</th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {(() => {
                        const filteredHistory = history.filter((item) => {
                          if (historyFilter === "All") {
                            return true;
                          }

                          if (
                            historyFilter === "Present" ||
                            historyFilter === "Absent"
                          ) {
                            return item.historyStatus === historyFilter;
                          }

                          return item.meal_type === historyFilter;
                        });

                        const groupedByDate = {};

                        filteredHistory.forEach((item) => {
                          if (!groupedByDate[item.attendance_date]) {
                            groupedByDate[item.attendance_date] = {};
                          }

                          groupedByDate[item.attendance_date][item.meal_type] = item;
                        });

                        return Object.entries(groupedByDate).map(
                          ([date, meals]) => (
                            <tr key={date}>
                              <td className="history-date-cell">
                                {formatHistoryDate(date)}
                              </td>

                              {MEALS.map((meal) => {
                                const item = meals[meal];

                                if (!item) {
                                  return (
                                    <td key={meal}>
                                      <span className="history-status pending">
                                        —
                                      </span>
                                    </td>
                                  );
                                }

                                return (
                                  <td key={meal}>
                                    <div className="history-meal-cell">
                                      <span
                                        className={`history-status ${
                                          item.historyStatus === "Present"
                                            ? "present"
                                            : item.historyStatus === "Absent"
                                            ? "absent"
                                            : "pending"
                                        }`}
                                      >
                                        {item.historyStatus}
                                      </span>

                                      {item.scan_time && (
                                        <small className="history-scan-time">
                                          {formatHistoryTime(item.scan_time)}
                                        </small>
                                      )}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          )
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>


        {/* ================= TODAY ================= */}

        <section className="today-section">

          <div className="today-left">

            <div className="today-icon">
              🍽️
            </div>

            <div>

              <span>
                GOOD TO SEE YOU
              </span>

              <h3>
                Ready for today's meals?
              </h3>

              <p>
                Keep your attendance updated every day.
              </p>

            </div>

          </div>

          <div className="today-date">

            <span>TODAY</span>

            <strong>
              {new Date().toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </strong>

          </div>

        </section>

{/* ================= FOOTER ================= */}

<footer className="dashboard-footer">

  <div className="footer-main">

    <div className="footer-brand">

      <div className="footer-logo-wrap">
        <img
          src={collegeLogo}
          alt="Government Polytechnic Barh"
          className="footer-logo"
        />
      </div>

      <div className="footer-brand-text">
        <strong>
          Government Polytechnic Barh
        </strong>

        <span>
          Mess Attendance System
        </span>
      </div>

    </div>

    <div className="footer-developer">

      <span className="footer-label">
        DEVELOPED BY
      </span>

      <strong>
        Aniket Singh
      </strong>

      <span>
        AI/ML · 5th Semester
      </span>

    </div>

  </div>

  <div className="footer-bottom">

  <span>
    © 2026 Government Polytechnic Barh
  </span>

  <span className="footer-dot">
    •
  </span>

  <span>
    Mess Attendance System
  </span>

  <span className="footer-dot">
    •
  </span>

  <span>
    All Rights Reserved
  </span>

</div>

</footer>

</main>

      {/* ==================================================
          MENU MODAL
      ================================================== */}

      {activeModal === "menu" && (

        <div
          className="dashboard-modal-overlay"
          onClick={() => setActiveModal(null)}
        >

          <div
            className="dashboard-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="modal-header">

              <div>
                <span className="modal-kicker">
                  TODAY'S MENU
                </span>

                <h2>
                  🍛 Mess Menu
                </h2>

                <p>
                  {new Date().toLocaleDateString("en-IN", {
                    weekday: "long",
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>

              <button
                className="modal-close"
                onClick={() => setActiveModal(null)}
              >
                ×
              </button>

            </div>


            {menuLoading ? (

              <div className="modal-loading">
                Loading today's menu...
              </div>

            ) : (

              <div className="meal-list">

                {MEALS.map((meal) => {

                  const item = getMeal(meal);

                  return (

                    <div
                      className="meal-item"
                      key={meal}
                    >

                      <div className="meal-icon">

                        {meal === "Breakfast" && "☕"}
                        {meal === "Lunch" && "🍛"}
                        {meal === "Snacks" && "🥪"}
                        {meal === "Dinner" && "🍽️"}

                      </div>

                      <div className="meal-content">

                        <span>
                          {meal}
                        </span>

                        <strong>
                          {item?.menu_items || "Menu not added yet"}
                        </strong>

                      </div>

                    </div>

                  );

                })}

              </div>

            )}

          </div>

        </div>

      )}


      {/* ==================================================
          NOTICE MODAL
      ================================================== */}

      {activeModal === "notices" && (

        <div
          className="dashboard-modal-overlay"
          onClick={() => setActiveModal(null)}
        >

          <div
            className="dashboard-modal notice-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="modal-header">

              <div>
                <span className="modal-kicker">
                  IMPORTANT UPDATES
                </span>

                <h2>
                  📢 Notices
                </h2>

                <p>
                  Latest announcements from administration
                </p>
              </div>

              <button
                className="modal-close"
                onClick={() => setActiveModal(null)}
              >
                ×
              </button>

            </div>


            {noticeLoading ? (

              <div className="modal-loading">
                Loading notices...
              </div>

            ) : notices.length === 0 ? (

              <div className="empty-modal">

                <div>📭</div>

                <h3>
                  No notices available
                </h3>

                <p>
                  There are no active notices right now.
                </p>

              </div>

            ) : (

              <div className="notice-list">

                {notices.map((notice) => (

                  <div
                    className="student-notice"
                    key={notice.id}
                  >

                    <div className="notice-icon">
                      📢
                    </div>

                    <div className="notice-content">

                      <h3>
                        {notice.title}
                      </h3>

                      <p>
                        {notice.message}
                      </p>

                      {notice.created_at && (
                        <small>
                          {new Date(
                            notice.created_at
                          ).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </small>
                      )}

                    </div>

                  </div>

                ))}

              </div>

            )}

          </div>

        </div>

      )}

      

      {/* ==================================================
          COMPLAINT / FEEDBACK MODAL
      ================================================== */}

      {activeModal === "complaint" && (

        <div
          className="dashboard-modal-overlay"
          onClick={() => setActiveModal(null)}
        >

          <div
            className="dashboard-modal complaint-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="modal-header">

              <div>
                <span className="modal-kicker">
                  FEEDBACK & SUPPORT
                </span>

                <h2>
                  📝 Complaint / Feedback
                </h2>

                <p>
                  Share your complaint or feedback with administration
                </p>
              </div>

              <button
                className="modal-close"
                onClick={() => setActiveModal(null)}
              >
                ×
              </button>

            </div>

            <form onSubmit={handleComplaintSubmit}>

              <label>Type</label>

              <select
                value={complaintType}
                onChange={(e) => setComplaintType(e.target.value)}
              >
                <option value="Complaint">Complaint</option>
                <option value="Feedback">Feedback</option>
              </select>


              <label>Subject</label>

              <input
                type="text"
                value={complaintSubject}
                onChange={(e) => setComplaintSubject(e.target.value)}
                placeholder="Enter subject"
              />


              <label>Message</label>

              <textarea
                value={complaintMessage}
                onChange={(e) => setComplaintMessage(e.target.value)}
                placeholder="Write your complaint or feedback..."
                rows="5"
              />


              <label>Rating</label>

              <select
                value={complaintRating}
                onChange={(e) => setComplaintRating(e.target.value)}
              >
                <option value="">Select rating</option>
                <option value="5">⭐⭐⭐⭐⭐ 5</option>
                <option value="4">⭐⭐⭐⭐ 4</option>
                <option value="3">⭐⭐⭐ 3</option>
                <option value="2">⭐⭐ 2</option>
                <option value="1">⭐ 1</option>
              </select>


              <button
                type="submit"
                className="service-btn"
                disabled={complaintSubmitting}
              >
                {complaintSubmitting
                  ? "Submitting..."
                  : "Submit Complaint / Feedback"}
              </button>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}





export default Dashboard;