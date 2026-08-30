import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import "../styles/MessQR.css";

const PERMANENT_QR = "GP_BARH_MESS_2026";

function MessQR() {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    QRCode.toCanvas(
      canvasRef.current,
      PERMANENT_QR,
      {
        width: 500,
        margin: 2,
        errorCorrectionLevel: "H",
      },
      (error) => {
        if (error) {
          console.error("QR generation error:", error);
        }
      }
    );
  }, []);

  return (
    <div className="mess-qr-page">

      <div className="mess-qr-header">
        <h1>Government Polytechnic Barh</h1>
        <p>Mess Attendance System</p>
      </div>

      <div className="mess-qr-card">

        <h2>Scan to Mark Attendance</h2>

        <p className="mess-qr-subtitle">
          Scan this QR code using the Mess Attendance System
        </p>

        <div className="qr-display">
          <canvas ref={canvasRef}></canvas>
        </div>

        <div className="qr-status">
          <span className="status-dot"></span>
          Permanent Mess QR
        </div>

        <p className="qr-note">
          Students must scan this QR code to mark their mess attendance.
        </p>

      </div>

    </div>
  );
}

export default MessQR;