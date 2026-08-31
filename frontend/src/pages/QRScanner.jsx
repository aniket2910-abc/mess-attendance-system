import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "../lib/supabase";
import "../styles/QRScanner.css";

const QR_READER_ID = "mess-qr-reader";

// Permanent Mess QR ka fixed value
const PERMANENT_QR = "GP_BARH_MESS_2026";

function QRScanner() {
  const scannerRef = useRef(null);
  const scanningRef = useRef(false);
  const processingRef = useRef(false);

  const [student, setStudent] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tokenNumber, setTokenNumber] = useState("");
  const [loadingStudent, setLoadingStudent] = useState(true);

  // =========================================================
  // LOAD LOGGED-IN STUDENT
  // =========================================================

  useEffect(() => {
    const loadStudent = async () => {
      try {
        setLoadingStudent(true);

        const savedStudent = localStorage.getItem("student");

        if (savedStudent) {
          try {
            const parsedStudent = JSON.parse(savedStudent);

            if (parsedStudent?.id) {
              setStudent(parsedStudent);
              setLoadingStudent(false);
              return;
            }
          } catch (e) {
            console.error("Invalid saved student:", e);
            localStorage.removeItem("student");
          }
        }

        const { data, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!data.session) {
          window.location.href = "/";
          return;
        }

        const email = data.session.user.email;

        const response = await fetch(
          `https://mess-attendance-backend.vercel.app/students?email=${encodeURIComponent(
            email
          )}`
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

        localStorage.setItem(
          "student",
          JSON.stringify(profile)
        );

        setStudent(profile);
      } catch (err) {
        console.error("Student loading error:", err);

        setError(
          "Unable to load student information. Please login again."
        );
      } finally {
        setLoadingStudent(false);
      }
    };

    loadStudent();
  }, []);

  // =========================================================
  // START SCANNER
  // =========================================================

  const startScanner = async () => {
    if (scanningRef.current) {
      return;
    }

    if (!student?.id) {
      setError("Student information is not available.");
      return;
    }

    setError("");
    setMessage("");
    setSuccess(false);
    setTokenNumber("");

    processingRef.current = false;

    try {
      const scanner = new Html5Qrcode(QR_READER_ID);

      scannerRef.current = scanner;

      await scanner.start(
        {
          facingMode: "environment",
        },
        {
          fps: 10,
          qrbox: {
            width: 250,
            height: 250,
          },
          aspectRatio: 1.0,
        },

        async (decodedText) => {
          if (processingRef.current) {
            return;
          }

          processingRef.current = true;

          await handleQRCode(decodedText);
        },

        () => {
          // QR not detected yet
        }
      );

      scanningRef.current = true;
      setScanning(true);
    } catch (err) {
      console.error("Scanner start error:", err);

      scannerRef.current = null;
      scanningRef.current = false;

      setScanning(false);

      setError(
        "Camera could not be started. Please allow camera permission and try again."
      );
    }
  };

  // =========================================================
  // STOP SCANNER
  // =========================================================

  const stopScanner = async () => {
    const scanner = scannerRef.current;

    try {
      if (scanner) {
        if (scanningRef.current) {
          await scanner.stop();
        }

        await scanner.clear();
      }
    } catch (err) {
      console.error("Scanner stop error:", err);
    }

    scannerRef.current = null;
    scanningRef.current = false;

    setScanning(false);
  };

  // =========================================================
  // QR CODE HANDLER
  // =========================================================

  const handleQRCode = async (decodedText) => {
    // Stop camera immediately
    await stopScanner();

    // =======================================================
    // CHECK PERMANENT QR
    // =======================================================

    if (decodedText.trim() !== PERMANENT_QR) {
      processingRef.current = false;

      setSuccess(false);
      setTokenNumber("");
      setMessage("");

      setError(
        "Invalid Mess QR Code. Please scan the official Mess QR."
      );

      return;
    }

    // =======================================================
    // CHECK STUDENT
    // =======================================================

    if (!student?.id) {
      processingRef.current = false;

      setError(
        "Student information not available. Please login again."
      );

      return;
    }

    setError("");
    setSuccess(false);
    setTokenNumber("");

    setMessage("QR verified. Marking attendance...");

    try {
      // =====================================================
      // GET DEVICE LOCATION
      // =====================================================

      if (!navigator.geolocation) {
        throw new Error(
          "Geolocation is not supported by this browser."
        );
      }

      setMessage("Getting your current location...");

      const position = await new Promise((resolve, reject) => {
  navigator.geolocation.getCurrentPosition(
    resolve,
    (geoError) => {
      reject(geoError);
    },
    {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 0,
    }
  );
});

      const latitude = Number(position.coords.latitude);
      const longitude = Number(position.coords.longitude);

      const accuracy = Number(position.coords.accuracy);

console.log("========== GPS DEBUG ==========");
console.log("Latitude :", latitude);
console.log("Longitude:", longitude);
console.log("Accuracy :", accuracy, "meters");
console.log("================================");

setMessage(
  `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} | Accuracy: ${Math.round(accuracy)}m`
);

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        throw new Error(
          "Invalid device location received."
        );
      }

      console.log("Attendance location:", {
        latitude,
        longitude,
      });

      setMessage(
        "Location verified. Marking attendance..."
      );

      // =====================================================
      // CALL BACKEND
      // =====================================================

      const response = await fetch(
        "https://mess-attendance-backend.vercel.app/attendance/scan",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            student_id: student.id,
            roll_no: student.roll_no,
            latitude,
            longitude,
          }),
        }
      );

      let result;

      try {
        result = await response.json();
      } catch {
        throw new Error(
          "Invalid response received from attendance server."
        );
      }

      console.log(
        "Attendance API response:",
        result
      );

      // =====================================================
      // BACKEND ERROR
      // =====================================================

      if (!response.ok) {
        throw new Error(
          result.message ||
            result.detail ||
            "Attendance marking failed."
        );
      }

      if (result.status === "error") {
        throw new Error(
          result.message ||
            "Attendance marking failed."
        );
      }

      // =====================================================
      // DUPLICATE ATTENDANCE
      // =====================================================

      if (result.status === "duplicate") {
        const duplicateToken =
          result?.data?.token_number ||
          result?.token_number ||
          "";

        setSuccess(true);

        setTokenNumber(duplicateToken);

        setMessage(
          result.message ||
            "This meal attendance is already marked."
        );

        return;
      }

      // =====================================================
      // SUCCESS
      // =====================================================

      if (result.status === "success") {
        const receivedToken =
          result?.data?.token_number ||
          result?.token_number ||
          "";

        console.log(
          "TOKEN RECEIVED:",
          receivedToken
        );

        setSuccess(true);

        setTokenNumber(receivedToken);

        setMessage(
          result.message ||
            "Attendance marked successfully!"
        );

        return;
      }

      throw new Error(
        "Unexpected response from attendance server."
      );
    } catch (err) {
      console.error(
        "Attendance marking error:",
        err
      );

      setSuccess(false);
      setTokenNumber("");

      setError(
        err.message ||
          "Unable to mark attendance. Please try again."
      );
    } finally {
      processingRef.current = false;
    }
  };

  // =========================================================
  // CLEANUP
  // =========================================================

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;

      if (scanner) {
        scanner
          .stop()
          .catch(() => {})
          .finally(() => {
            scanner
              .clear()
              .catch(() => {});

            scannerRef.current = null;
            scanningRef.current = false;
          });
      }
    };
  }, []);

  // =========================================================
  // BACK TO DASHBOARD
  // =========================================================

  const goToDashboard = () => {
    window.location.href = "/dashboard";
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loadingStudent) {
    return (
      <div className="qr-page">
        <div className="qr-loading-card">
          <div className="qr-loading-spinner"></div>

          <h2>Loading Scanner...</h2>

          <p>
            Getting your student information
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="qr-page">

      <div className="qr-container">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="qr-header">

          <button
            type="button"
            className="back-button"
            onClick={goToDashboard}
          >
            ←
          </button>

          <div className="qr-heading">

            <h1>
              Scan Attendance
            </h1>

            <p>
              Mess Attendance System
            </p>

          </div>

        </div>


        {/* =================================================
            STUDENT CARD
        ================================================= */}

        {student && (

          <div className="qr-student-card">

            <div className="qr-avatar">

              {student.name
                ? student.name
                    .charAt(0)
                    .toUpperCase()
                : "S"}

            </div>

            <div className="qr-student-info">

              <h3>
                {student.name}
              </h3>

              <p>
                Roll No:{" "}
                {student.roll_no}
              </p>

            </div>

          </div>

        )}


        {/* =================================================
            SCANNER CARD
        ================================================= */}

        <div className="scanner-card">

          <div className="scanner-title">

            <div className="scanner-icon">
              📷
            </div>

            <div>

              <h2>
                Scan Mess QR
              </h2>

              <p>
                Scan the permanent QR displayed at the mess
              </p>

            </div>

          </div>


          {/* =================================================
              CAMERA
          ================================================= */}

          <div
            id={QR_READER_ID}
            className="qr-reader"
          ></div>


          {/* =================================================
              START BUTTON
          ================================================= */}

          {!scanning && !success && (

            <button
              type="button"
              className="start-scan-button"
              onClick={startScanner}
              disabled={!student?.id}
            >
              📷 Start Scanner
            </button>

          )}


          {/* =================================================
              STOP BUTTON
          ================================================= */}

          {scanning && (

            <button
              type="button"
              className="stop-scan-button"
              onClick={stopScanner}
            >
              Stop Scanner
            </button>

          )}


          {/* =================================================
              MESSAGE
          ================================================= */}

          {message && (

            <div
              className={`qr-message ${
                success ? "success" : ""
              }`}
            >

              <span className="message-icon">

                {success
                  ? "✓"
                  : "⏳"}

              </span>

              <span>
                {message}
              </span>

            </div>

          )}


          {/* =================================================
              ERROR
          ================================================= */}

          {error && (

            <div className="qr-error">

              <span>
                ⚠️
              </span>

              <span>
                {error}
              </span>

            </div>

          )}

        </div>


        {/* =================================================
            SUCCESS CARD
        ================================================= */}

        {success && (

          <div
            className="attendance-success-card"
            style={{
              marginTop: "20px",
              padding: "28px 24px",
              borderRadius: "22px",
              background: "#ffffff",
              boxShadow:
                "0 15px 40px rgba(30, 41, 59, 0.12)",
              textAlign: "center",
              border:
                "1px solid rgba(99, 102, 241, 0.12)",
            }}
          >

            {/* SUCCESS CHECK */}

            <div
              className="success-check"
              style={{
                width: "64px",
                height: "64px",
                margin: "0 auto 14px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "#e8f8ef",
                color: "#087f5b",
                fontSize: "34px",
                fontWeight: "800",
              }}
            >
              ✓
            </div>


            {/* TITLE */}

            <h2
              style={{
                margin: "0 0 8px",
                fontSize: "25px",
                fontWeight: "800",
                color: "#172033",
              }}
            >
              Hosteller Verified ✓
            </h2>


            {/* MESSAGE */}

            <p
              style={{
                margin:
                  "0 auto 22px",
                maxWidth: "520px",
                fontSize: "16px",
                lineHeight: "1.5",
                color: "#64748b",
              }}
            >
              {message ||
                "Your mess attendance has been recorded successfully."}
            </p>


            {/* =================================================
                TOKEN CARD
            ================================================= */}

            <div
              style={{
                width: "100%",
                maxWidth: "520px",
                margin: "0 auto 22px",
                padding: "0",
                overflow: "hidden",
                borderRadius: "16px",
                background:
                  "#f23b36",
                boxShadow:
                  "0 10px 25px rgba(242, 59, 54, 0.20)",
                position: "relative",
              }}
            >

              {/* TOP DECORATION */}

              <div
                style={{
                  position: "absolute",
                  top: "0",
                  left: "0",
                  right: "0",
                  height: "7px",
                  background:
                    "#d92d2a",
                }}
              />


              <div
                style={{
                  padding:
                    "25px 24px 22px",
                  background:
                    "#f23b36",
                  position: "relative",
                }}
              >

                {/* COUPON TITLE */}

                <div
                  style={{
                    color: "#ffffff",
                    fontSize: "22px",
                    fontWeight: "900",
                    letterSpacing: "1px",
                    textTransform:
                      "uppercase",
                    marginBottom: "5px",
                  }}
                >
                  COUPON
                </div>


                <div
                  style={{
                    color: "#ffffff",
                    fontSize: "16px",
                    fontWeight: "800",
                    letterSpacing:
                      "0.5px",
                    textTransform:
                      "uppercase",
                    opacity: "0.95",
                  }}
                >
                  FOOD & DRINK
                </div>


                {/* SEPARATOR */}

                <div
                  style={{
                    height: "2px",
                    background:
                      "rgba(255,255,255,0.65)",
                    margin:
                      "15px auto 13px",
                    maxWidth: "310px",
                  }}
                />


                {/* TOKEN */}

                <div
                  style={{
                    background:
                      "#ffffff",
                    color: "#263445",
                    borderRadius: "9px",
                    padding:
                      "13px 16px",
                    fontSize: "18px",
                    fontWeight: "900",
                    fontFamily:
                      "monospace",
                    letterSpacing:
                      "1.5px",
                    wordBreak:
                      "break-word",
                    boxShadow:
                      "0 4px 12px rgba(0,0,0,0.12)",
                  }}
                >

                  {tokenNumber
                    ? tokenNumber
                    : "TOKEN NOT RECEIVED"}

                </div>


                {/* LABEL */}

                <div
                  style={{
                    marginTop: "12px",
                    color: "#ffffff",
                    fontSize: "11px",
                    fontWeight: "700",
                    letterSpacing:
                      "1.5px",
                    textTransform:
                      "uppercase",
                    opacity: "0.9",
                  }}
                >
                  SHOW THIS TOKEN IN YOUR MESS TO HAVE FOOD 
                </div>

              </div>

            </div>


            {/* =================================================
                IMPORTANT TOKEN WARNING
            ================================================= */}

            {!tokenNumber && (

              <div
                style={{
                  margin:
                    "0 auto 20px",
                  maxWidth: "520px",
                  padding: "12px 15px",
                  borderRadius: "10px",
                  background: "#fff7ed",
                  color: "#c2410c",
                  fontSize: "14px",
                  fontWeight: "600",
                }}
              >
                ⚠️ Attendance was marked, but the
                server did not return a token number.
              </div>

            )}


            {/* DASHBOARD BUTTON */}

            <button
              type="button"
              onClick={goToDashboard}
              className="dashboard-button"
            >
              ← Back to Dashboard
            </button>

          </div>

        )}


        {/* =================================================
            INSTRUCTIONS
        ================================================= */}

        {!success && (

          <div className="qr-instructions">

            <h3>
              How to mark attendance
            </h3>


            <div className="instruction-item">

              <span>
                1
              </span>

              <p>
                Tap <b>Start Scanner</b>
              </p>

            </div>


            <div className="instruction-item">

              <span>
                2
              </span>

              <p>
                Allow camera permission
              </p>

            </div>


            <div className="instruction-item">

              <span>
                3
              </span>

              <p>
                Point the camera at the Mess QR
              </p>

            </div>


            <div className="instruction-item">

              <span>
                4
              </span>

              <p>
                Attendance will be recorded automatically
              </p>

            </div>

          </div>

        )}


        {/* =================================================
            BACK BUTTON
        ================================================= */}

        {!success && (

          <button
            type="button"
            className="dashboard-button"
            onClick={goToDashboard}
          >
            ← Back to Dashboard
          </button>

        )}

      </div>

    </div>
  );
}

export default QRScanner;