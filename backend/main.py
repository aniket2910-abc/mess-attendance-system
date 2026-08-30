import traceback
import os

from pathlib import Path
from typing import Optional
from datetime import datetime, time
from zoneinfo import ZoneInfo
from math import radians, sin, cos, sqrt, atan2

from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from supabase import create_client, Client


# =========================================================
# ENVIRONMENT
# =========================================================

BASE_DIR = Path(__file__).resolve().parent

load_dotenv(BASE_DIR / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
ADMIN_SETUP_KEY = os.getenv("ADMIN_SETUP_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")


# =========================================================
# FASTAPI
# =========================================================

app = FastAPI(
    title="Mess Attendance System",
    version="1.2.0"
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.options("/{path:path}")
async def cors_preflight(path: str):
    return Response(status_code=204)


# =========================================================
# INDIA TIMEZONE
# =========================================================

INDIA_TZ = ZoneInfo("Asia/Kolkata")


# =========================================================
# SUPABASE CLIENT HELPERS
# =========================================================

def get_supabase_client() -> Client:

    if not SUPABASE_URL or not SUPABASE_KEY:

        raise RuntimeError(
            "Supabase environment variables are missing."
        )

    return create_client(
        SUPABASE_URL,
        SUPABASE_KEY
    )


def get_admin_supabase_client() -> Client:

    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:

        raise RuntimeError(
            "Supabase service role environment variables are missing."
        )

    return create_client(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY
    )


# =========================================================
# STARTUP CHECK
# =========================================================

print("========================================")
print("MESS ATTENDANCE BACKEND STARTING")
print("========================================")

if SUPABASE_URL:
    print("SUPABASE_URL: configured")
else:
    print("SUPABASE_URL: MISSING")

if SUPABASE_KEY:
    print("SUPABASE_KEY: configured")
else:
    print("SUPABASE_KEY: MISSING")

if SUPABASE_SERVICE_ROLE_KEY:
    print("SUPABASE_SERVICE_ROLE_KEY: configured")
else:
    print("SUPABASE_SERVICE_ROLE_KEY: MISSING")

if ADMIN_SETUP_KEY:
    print("ADMIN_SETUP_KEY: configured")
else:
    print("ADMIN_SETUP_KEY: MISSING")

print("========================================")


# =========================================================
# REQUEST MODELS
# =========================================================

class StudentRegister(BaseModel):

    name: str
    email: str
    roll_no: str
    hostel: str
    room_number: str


class AdminRegisterRequest(BaseModel):

    setup_key: str
    email: str
    password: str
    role: str


class AttendanceScan(BaseModel):

    student_id: Optional[int] = None
    roll_no: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class GeofenceUpdate(BaseModel):

    name: str
    latitude: float
    longitude: float
    radius_meters: float


class PasswordChangeRequest(BaseModel):

    email: str
    password: str


# =========================================================
# MEAL DETECTION
# =========================================================

def get_current_meal():

    now = datetime.now(INDIA_TZ)

    current_time = now.time()

    # -----------------------------------------------------
    # BREAKFAST
    # 04:00 AM - 12:30 PM
    # -----------------------------------------------------

    if time(4, 0) <= current_time < time(12, 30):

        return "Breakfast"

    # -----------------------------------------------------
    # LUNCH
    # 12:30 PM - 05:15 PM
    # -----------------------------------------------------

    if time(12, 30) <= current_time < time(17, 15):

        return "Lunch"

    # -----------------------------------------------------
    # SNACKS
    # 05:15 PM - 07:30 PM
    # -----------------------------------------------------

    if time(17, 15) <= current_time < time(19, 30):

        return "Snacks"

    # -----------------------------------------------------
    # DINNER
    # 07:30 PM - 12:30 AM
    # -----------------------------------------------------

    if current_time >= time(19, 30):

        return "Dinner"

    # -----------------------------------------------------
    # CLOSED
    # 12:30 AM - 04:00 AM
    # -----------------------------------------------------

    return None


# =========================================================
# HOME
# =========================================================

@app.get("/")
def home():

    return {
        "status": "success",
        "message": "Mess Attendance Backend is running"
    }


# =========================================================
# HEALTH
# =========================================================

@app.get("/health")
def health():

    return {
        "status": "success",
        "message": "Backend is healthy"
    }


# =========================================================
# DATABASE TEST
# =========================================================

@app.get("/database-test")
def database_test():

    try:

        db = get_supabase_client()

        result = (
            db
            .table("students")
            .select("*")
            .limit(1)
            .execute()
        )

        return {
            "status": "success",
            "message": "Supabase database connected successfully",
            "data": result.data
        }

    except Exception as e:

        print(
            "DATABASE TEST ERROR:",
            repr(e)
        )

        return {
            "status": "error",
            "message": f"Supabase database error: {str(e)}"
        }


# =========================================================
# REGISTER STUDENT
# =========================================================

@app.post("/register")
def register_student(student: StudentRegister):

    try:

        db = get_supabase_client()

        # -------------------------------------------------
        # CHECK EMAIL
        # -------------------------------------------------

        existing_email = (
            db
            .table("students")
            .select("id")
            .eq(
                "email",
                student.email
            )
            .execute()
        )

        if existing_email.data:

            return {
                "status": "error",
                "message": "Student with this email already exists"
            }

        # -------------------------------------------------
        # CHECK ROLL NUMBER
        # -------------------------------------------------

        existing_roll = (
            db
            .table("students")
            .select("id")
            .eq(
                "roll_no",
                student.roll_no
            )
            .execute()
        )

        if existing_roll.data:

            return {
                "status": "error",
                "message": "Student with this roll number already exists"
            }

        # -------------------------------------------------
        # INSERT STUDENT
        # -------------------------------------------------

        result = (
            db
            .table("students")
            .insert({
                "name": student.name,
                "email": student.email,
                "roll_no": student.roll_no,
                "hostel": student.hostel,
                "room_number": student.room_number
            })
            .execute()
        )

        return {
            "status": "success",
            "message": "Student registered successfully",
            "data": result.data
        }

    except Exception as e:

        print(
            "REGISTRATION ERROR:",
            repr(e)
        )

        return {
            "status": "error",
            "message": f"Registration failed: {str(e)}"
        }


# =========================================================
# GET STUDENTS
# =========================================================

@app.get("/students")
def get_students(
    email: Optional[str] = None
):

    try:

        db = get_supabase_client()

        query = (
            db
            .table("students")
            .select("*")
        )

        # -------------------------------------------------
        # FILTER BY EMAIL
        # -------------------------------------------------

        if email:

            query = query.eq(
                "email",
                email
            )

        result = (
            query
            .order("id")
            .execute()
        )

        return {
            "status": "success",
            "data": result.data
        }

    except Exception as e:

        print(
            "GET STUDENTS ERROR:",
            repr(e)
        )

        return {
            "status": "error",
            "message": str(e)
        }


# =========================================================
# GET SINGLE STUDENT
# =========================================================

@app.get("/students/{student_id}")
def get_student(student_id: int):

    try:

        db = get_supabase_client()

        result = (
            db
            .table("students")
            .select("*")
            .eq(
                "id",
                student_id
            )
            .execute()
        )

        if not result.data:

            return {
                "status": "error",
                "message": "Student not found"
            }

        return {
            "status": "success",
            "data": result.data[0]
        }

    except Exception as e:

        print(
            "GET STUDENT ERROR:",
            repr(e)
        )

        return {
            "status": "error",
            "message": str(e)
        }


# =========================================================
# DELETE STUDENT
# =========================================================

@app.delete("/students/{student_id}")
def delete_student(student_id: int):

    try:

        db = get_supabase_client()

        result = (
            db
            .table("students")
            .delete()
            .eq(
                "id",
                student_id
            )
            .execute()
        )

        return {
            "status": "success",
            "message": "Student deleted successfully",
            "data": result.data
        }

    except Exception as e:

        print(
            "DELETE STUDENT ERROR:",
            repr(e)
        )

        return {
            "status": "error",
            "message": str(e)
        }


# =========================================================
# GEOFENCE HELPERS
# =========================================================

def calculate_distance_meters(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float
):

    earth_radius = 6371000

    lat1_rad = radians(lat1)
    lat2_rad = radians(lat2)

    delta_lat = radians(
        lat2 - lat1
    )

    delta_lon = radians(
        lon2 - lon1
    )

    a = (
        sin(delta_lat / 2) ** 2
        + cos(lat1_rad)
        * cos(lat2_rad)
        * sin(delta_lon / 2) ** 2
    )

    c = 2 * atan2(
        sqrt(a),
        sqrt(1 - a)
    )

    return earth_radius * c


def check_geofence(
    db: Client,
    latitude: float,
    longitude: float
):

    result = (
        db
        .table("geofences")
        .select(
            "name, latitude, longitude, radius_meters"
        )
        .execute()
    )

    if not result.data:

        return (
            False,
            "No geofence locations are configured.",
            None
        )

    for fence in result.data:

        distance = calculate_distance_meters(
            latitude,
            longitude,
            float(fence["latitude"]),
            float(fence["longitude"])
        )

        if distance <= float(
            fence["radius_meters"]
        ):

            return (
                True,
                f"Location verified at {fence['name']}.",
                fence["name"]
            )

    return (
        False,
        "You are outside the allowed mess/hostel location.",
        None
    )


# =========================================================
# GET GEOFENCES
# =========================================================

@app.get("/geofences")
def get_geofences():

    try:

        db = get_supabase_client()

        result = (
            db
            .table("geofences")
            .select("*")
            .order("name")
            .execute()
        )

        return {
            "status": "success",
            "data": result.data
        }

    except Exception as e:

        print(
            "GET GEOFENCES ERROR:",
            repr(e)
        )

        return {
            "status": "error",
            "message": str(e)
        }


# =========================================================
# UPDATE GEOFENCE
# =========================================================

@app.put("/geofences")
def update_geofence(
    fence: GeofenceUpdate
):

    try:

        db = get_supabase_client()

        if fence.radius_meters <= 0:

            return {
                "status": "error",
                "message": "Radius must be greater than 0 meters"
            }

        result = (
            db
            .table("geofences")
            .upsert(
                {
                    "name": fence.name,
                    "latitude": fence.latitude,
                    "longitude": fence.longitude,
                    "radius_meters": fence.radius_meters,
                    "updated_at": datetime.now(
                        INDIA_TZ
                    ).isoformat()
                },
                on_conflict="name"
            )
            .execute()
        )

        return {
            "status": "success",
            "message": "Geofence updated successfully",
            "data": result.data
        }

    except Exception as e:

        print(
            "UPDATE GEOFENCE ERROR:",
            repr(e)
        )

        return {
            "status": "error",
            "message": str(e)
        }


# =========================================================
# DELETE GEOFENCE
# =========================================================

@app.delete("/geofences/{fence_name}")
def delete_geofence(
    fence_name: str
):

    try:

        db = get_supabase_client()

        fence_name = fence_name.strip()

        if not fence_name:

            return {
                "status": "error",
                "message": "Geofence name is required"
            }

        result = (
            db
            .table("geofences")
            .delete()
            .eq(
                "name",
                fence_name
            )
            .execute()
        )

        if not result.data:

            return {
                "status": "error",
                "message": (
                    f'Geofence "{fence_name}" was not found.'
                )
            }

        return {
            "status": "success",
            "message": (
                f'Geofence "{fence_name}" deleted successfully.'
            ),
            "data": result.data
        }

    except Exception as e:

        print(
            "GEOFENCE DELETE ERROR:",
            repr(e)
        )

        return {
            "status": "error",
            "message": str(e)
        }


# =========================================================
# SCAN ATTENDANCE
# =========================================================

@app.post("/attendance/scan")
def scan_attendance(
    scan: AttendanceScan
):

    try:

        # =================================================
        # CREATE ONE CLIENT FOR THIS REQUEST
        # =================================================

        db = get_supabase_client()

        print("ATTENDANCE: Scan request received")

        # =================================================
        # RESOLVE ROLL NUMBER
        # =================================================

        roll_no = None

        incoming_roll_no = getattr(
            scan,
            "roll_no",
            None
        )

        if incoming_roll_no:

            roll_no = str(
                incoming_roll_no
            ).strip()

            if roll_no.isdigit():

                roll_no = roll_no.zfill(10)

        elif scan.student_id is not None:

            legacy = (
                db
                .table("students")
                .select("roll_no")
                .eq(
                    "id",
                    scan.student_id
                )
                .limit(1)
                .execute()
            )

            if (
                legacy.data
                and legacy.data[0].get("roll_no") is not None
            ):

                roll_no = str(
                    legacy.data[0]["roll_no"]
                ).strip()

                if roll_no.isdigit():

                    roll_no = roll_no.zfill(10)

        if not roll_no:

            return {
                "status": "error",
                "message": "Roll number is required."
            }

        print(
            "ATTENDANCE: Roll number:",
            roll_no
        )

        # =================================================
        # HOSTELLER CHECK
        # =================================================

        hosteller_result = (
            db
            .table("hostelers")
            .select("*")
            .eq(
                "roll_no",
                roll_no
            )
            .limit(1)
            .execute()
        )

        if not hosteller_result.data:

            print(
                "ATTENDANCE: Hosteller check failed"
            )

            return {
                "status": "error",
                "message": (
                    "Attendance not allowed. "
                    "You are not registered as a hosteller."
                )
            }

        hosteller = hosteller_result.data[0]

        print(
            "ATTENDANCE: Hosteller verified"
        )

        # =================================================
        # STUDENT DETAILS
        # =================================================

        student_result = (
            db
            .table("students")
            .select("*")
            .eq(
                "roll_no",
                roll_no
            )
            .limit(1)
            .execute()
        )

        student = (
            student_result.data[0]
            if student_result.data
            else hosteller
        )

        # =================================================
        # GEOFENCE
        # =================================================

        if (
            scan.latitude is None
            or scan.longitude is None
        ):

            return {
                "status": "error",
                "message": (
                    "Location permission is required "
                    "to mark attendance."
                )
            }

        print(
            "ATTENDANCE: Checking geofence"
        )

        (
            location_allowed,
            location_message,
            location_name
        ) = check_geofence(
            db,
            scan.latitude,
            scan.longitude
        )

        if not location_allowed:

            print(
                "ATTENDANCE: Geofence rejected:",
                location_message
            )

            return {
                "status": "error",
                "message": location_message
            }

        print(
            "ATTENDANCE: Geofence verified:",
            location_name
        )

        # =================================================
        # TIME / MEAL
        # =================================================

        now = datetime.now(
            INDIA_TZ
        )

        today = now.date().isoformat()

        current_time = now.strftime(
            "%I:%M:%S %p"
        )

        meal = get_current_meal()

        if meal is None:

            return {
                "status": "error",
                "message": (
                    "Attendance is currently closed. "
                    "Mess attendance is available from "
                    "04:00 AM to 12:30 AM."
                )
            }

        print(
            "ATTENDANCE: Meal:",
            meal
        )

        # =================================================
        # DUPLICATE CHECK
        # =================================================

        existing = (
            db
            .table("attendance")
            .select(
                "id, scan_time, meal_type"
            )
            .eq(
                "roll_no",
                roll_no
            )
            .eq(
                "attendance_date",
                today
            )
            .eq(
                "meal_type",
                meal
            )
            .limit(1)
            .execute()
        )

        if existing.data:

            previous = existing.data[0]

            attendance_id = previous.get(
                "id"
            )

            token_number = (
                f"GP-BARH-MESS-{int(attendance_id):07d}"
                if attendance_id is not None
                else None
            )

            print(
                "ATTENDANCE: Duplicate attendance"
            )

            return {
                "status": "duplicate",
                "message": (
                    f"{meal} attendance already marked."
                ),
                "token_number": token_number,
                "data": {
                    "student": student.get("name"),
                    "email": student.get("email"),
                    "roll_no": roll_no,
                    "hostel": (
                        student.get("hostel")
                        or hosteller.get("hostel")
                    ),
                    "room_number": (
                        student.get("room_number")
                        or hosteller.get("room_number")
                    ),
                    "date": today,
                    "meal": meal,
                    "scan_time": previous.get(
                        "scan_time"
                    ),
                    "status": "Present",
                    "token_number": token_number
                }
            }

        # =================================================
        # INSERT ATTENDANCE
        # =================================================

        attendance_data = {

            "student_name": student.get(
                "name"
            ),

            "roll_no": roll_no,

            "hostel": (
                student.get("hostel")
                or hosteller.get("hostel")
            ),

            "room_number": (
                student.get("room_number")
                or hosteller.get("room_number")
            ),

            "attendance_date": today,

            "meal_type": meal,

            "scan_time": now.isoformat(),

            "status": "Present"
        }

        print(
            "ATTENDANCE: Saving attendance"
        )

        result = (
            db
            .table("attendance")
            .insert(attendance_data)
            .execute()
        )

        inserted_row = (
            result.data[0]
            if result.data
            else None
        )

        if not inserted_row:

            return {
                "status": "error",
                "message": (
                    "Attendance could not be saved."
                )
            }

        # =================================================
        # TOKEN NUMBER
        # =================================================

        attendance_id = inserted_row.get(
            "id"
        )

        token_number = (
            f"GP-BARH-MESS-{int(attendance_id):07d}"
            if attendance_id is not None
            else None
        )

        print(
            "ATTENDANCE: SUCCESS",
            token_number
        )

        return {

            "status": "success",

            "message": (
                f"{meal} attendance marked successfully."
            ),

            "token_number": token_number,

            "data": {

                "student": student.get(
                    "name"
                ),

                "email": student.get(
                    "email"
                ),

                "roll_no": roll_no,

                "hostel": (
                    student.get("hostel")
                    or hosteller.get("hostel")
                ),

                "room_number": (
                    student.get("room_number")
                    or hosteller.get("room_number")
                ),

                "date": today,

                "time": current_time,

                "meal": meal,

                "status": "Present",

                "token_number": token_number
            }
        }

    except Exception as e:

        print(
            "========================================"
        )

        print(
            "ATTENDANCE ERROR"
        )

        print(
            "ERROR:",
            repr(e)
        )

        traceback.print_exc()

        print(
            "========================================"
        )

        return {
            "status": "error",
            "message": (
                f"Attendance failed: {str(e)}"
            )
        }


# =========================================================
# GET TODAY'S ATTENDANCE
# =========================================================

@app.get(
    "/attendance/today/{student_id}"
)
def get_today_attendance(
    student_id: int
):

    try:

        db = get_supabase_client()

        today = (
            datetime
            .now(INDIA_TZ)
            .date()
            .isoformat()
        )

        # -------------------------------------------------
        # FIND STUDENT FIRST
        # -------------------------------------------------

        student_result = (
            db
            .table("students")
            .select(
                "id, roll_no"
            )
            .eq(
                "id",
                student_id
            )
            .limit(1)
            .execute()
        )

        if not student_result.data:

            return {
                "status": "error",
                "message": "Student not found"
            }

        student = student_result.data[0]

        roll_no = student.get(
            "roll_no"
        )

        if roll_no is None:

            return {
                "status": "success",
                "date": today,
                "data": []
            }

        roll_no = str(
            roll_no
        ).strip()

        if roll_no.isdigit():

            roll_no = roll_no.zfill(10)

        # -------------------------------------------------
        # ATTENDANCE IS STORED USING ROLL_NO
        # -------------------------------------------------

        result = (
            db
            .table("attendance")
            .select("*")
            .eq(
                "roll_no",
                roll_no
            )
            .eq(
                "attendance_date",
                today
            )
            .order(
                "scan_time"
            )
            .execute()
        )

        return {

            "status": "success",

            "date": today,

            "data": result.data
        }

    except Exception as e:

        print(
            "TODAY ATTENDANCE ERROR:",
            repr(e)
        )

        return {

            "status": "error",

            "message": str(e)
        }


# =========================================================
# ADMIN PASSWORD RESET
# =========================================================

@app.post(
    "/admin/change-password"
)
def admin_change_password(
    data: PasswordChangeRequest
):

    email = (
        data.email
        .strip()
        .lower()
    )

    password = data.password

    # -----------------------------------------------------
    # BASIC VALIDATION
    # -----------------------------------------------------

    if not email:

        raise HTTPException(
            status_code=400,
            detail="Student email is required."
        )

    if not password:

        raise HTTPException(
            status_code=400,
            detail="New password is required."
        )

    if len(password) < 6:

        raise HTTPException(
            status_code=400,
            detail=(
                "Password must be at least 6 characters."
            )
        )

    try:

        # -------------------------------------------------
        # NORMAL DATABASE CLIENT
        # -------------------------------------------------

        db = get_supabase_client()

        # -------------------------------------------------
        # ADMIN DATABASE CLIENT
        # -------------------------------------------------

        admin_db = get_admin_supabase_client()

        # -------------------------------------------------
        # CHECK STUDENT
        # -------------------------------------------------

        student_result = (
            db
            .table("students")
            .select(
                "id,email,name"
            )
            .eq(
                "email",
                email
            )
            .limit(1)
            .execute()
        )

        if not student_result.data:

            raise HTTPException(
                status_code=404,
                detail=(
                    "Student with this email was not "
                    "found in students table."
                )
            )

        student = student_result.data[0]

        # -------------------------------------------------
        # GET AUTH USER
        # -------------------------------------------------

        auth_users_response = (
            admin_db
            .auth
            .admin
            .list_users()
        )

        # Supabase SDK response normally contains .users
        auth_users = getattr(
            auth_users_response,
            "users",
            auth_users_response
        )

        auth_user = None

        for user in auth_users:

            auth_email = (
                str(
                    getattr(
                        user,
                        "email",
                        ""
                    )
                    or ""
                )
                .strip()
                .lower()
            )

            if auth_email == email:

                auth_user = user

                break

        if auth_user is None:

            raise HTTPException(
                status_code=404,
                detail=(
                    "Student exists in students table, "
                    "but no Supabase Auth account was found "
                    "for this email."
                )
            )

        user_id = getattr(
            auth_user,
            "id",
            None
        )

        if not user_id:

            raise HTTPException(
                status_code=500,
                detail=(
                    "Supabase Auth user ID was not found."
                )
            )

        # -------------------------------------------------
        # CHANGE PASSWORD
        # -------------------------------------------------

        admin_db.auth.admin.update_user_by_id(
            user_id,
            {
                "password": password
            }
        )

        print(
            "ADMIN PASSWORD RESET SUCCESS:",
            email
        )

        return {

            "status": "success",

            "message": (
                "Password changed successfully."
            ),

            "email": email,

            "student_name": student.get(
                "name"
            ),

            "auth_user_id": user_id
        }

    except HTTPException:

        raise

    except Exception as e:

        print(
            "ADMIN PASSWORD RESET ERROR:",
            repr(e)
        )

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=(
                f"Password change failed: {str(e)}"
            )
        )


# =========================================================
# ADMIN VERIFY SETUP KEY
# =========================================================

@app.post(
    "/admin/verify-setup-key"
)
def verify_admin_setup_key(
    data: dict
):

    setup_key = str(
        data.get(
            "setup_key",
            ""
        )
    ).strip()

    if not setup_key:

        raise HTTPException(
            status_code=400,
            detail="Setup key is required."
        )

    if not ADMIN_SETUP_KEY:

        raise HTTPException(
            status_code=500,
            detail=(
                "Admin setup key is not configured on server."
            )
        )

    if setup_key != ADMIN_SETUP_KEY:

        raise HTTPException(
            status_code=403,
            detail="Invalid setup key."
        )

    return {

        "success": True,

        "message": "Setup key verified."
    }


# =========================================================
# ADMIN REGISTRATION
# =========================================================

@app.post(
    "/admin/register"
)
def register_admin(
    data: AdminRegisterRequest
):

    # -----------------------------------------------------
    # CHECK SETUP KEY
    # -----------------------------------------------------

    if not ADMIN_SETUP_KEY:

        raise HTTPException(
            status_code=500,
            detail=(
                "Admin setup key is not configured on server."
            )
        )

    if data.setup_key != ADMIN_SETUP_KEY:

        raise HTTPException(
            status_code=403,
            detail="Invalid admin setup key."
        )

    # -----------------------------------------------------
    # BASIC VALIDATION
    # -----------------------------------------------------

    email = (
        data.email
        .strip()
        .lower()
    )

    password = data.password

    role = (
        data.role
        .strip()
        .lower()
    )

    if not email:

        raise HTTPException(
            status_code=400,
            detail="Email is required."
        )

    if not password:

        raise HTTPException(
            status_code=400,
            detail="Password is required."
        )

    if len(password) < 6:

        raise HTTPException(
            status_code=400,
            detail=(
                "Password must be at least 6 characters."
            )
        )

    # -----------------------------------------------------
    # ONLY TWO ROLES
    # -----------------------------------------------------

    if role not in [
        "super_admin",
        "normal_admin"
    ]:

        raise HTTPException(
            status_code=400,
            detail="Invalid admin role."
        )

    try:

        # -------------------------------------------------
        # NORMAL DATABASE CLIENT
        # -------------------------------------------------

        db = get_supabase_client()

        # -------------------------------------------------
        # ADMIN SERVICE ROLE CLIENT
        # -------------------------------------------------

        admin_db = get_admin_supabase_client()

        # -------------------------------------------------
        # CHECK ROLE ACCOUNT LIMIT
        # MAXIMUM 2 PER ROLE
        # -------------------------------------------------

        existing_admins = (
            db
            .table("admin_roles")
            .select(
                "email, role"
            )
            .eq(
                "role",
                role
            )
            .execute()
        )

        existing_count = len(
            existing_admins.data or []
        )

        if existing_count >= 2:

            if role == "super_admin":

                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Maximum 2 Super Admin accounts "
                        "already exist."
                    )
                )

            else:

                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Maximum 2 Mess Incharge accounts "
                        "already exist."
                    )
                )

        # -------------------------------------------------
        # CHECK EMAIL
        # -------------------------------------------------

        existing_email = (
            db
            .table("admin_roles")
            .select("email")
            .eq(
                "email",
                email
            )
            .limit(1)
            .execute()
        )

        if existing_email.data:

            raise HTTPException(
                status_code=400,
                detail=(
                    "An admin account with this email "
                    "already exists."
                )
            )

        # -------------------------------------------------
        # CREATE SUPABASE AUTH USER
        # -------------------------------------------------

        auth_response = (
            admin_db
            .auth
            .admin
            .create_user(
                {
                    "email": email,
                    "password": password,
                    "email_confirm": True
                }
            )
        )

        auth_user = getattr(
            auth_response,
            "user",
            None
        )

        if auth_user is None:

            raise HTTPException(
                status_code=500,
                detail=(
                    "Admin Auth account could not be created."
                )
            )

        # -------------------------------------------------
        # INSERT ADMIN ROLE
        # -------------------------------------------------

        role_result = (
            db
            .table("admin_roles")
            .insert(
                {
                    "email": email,
                    "role": role
                }
            )
            .execute()
        )

        # -------------------------------------------------
        # SUCCESS
        # -------------------------------------------------

        print(
            "ADMIN REGISTRATION SUCCESS:",
            email,
            role
        )

        return {

            "status": "success",

            "message": (
                "Super Admin account created successfully."
                if role == "super_admin"
                else
                "Mess Incharge account created successfully."
            ),

            "email": email,

            "role": role
        }

    except HTTPException:

        raise

    except Exception as e:

        print(
            "ADMIN REGISTRATION ERROR:",
            repr(e)
        )

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=(
                f"Admin registration failed: {str(e)}"
            )
        )