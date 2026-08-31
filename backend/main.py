import traceback
from fastapi.responses import Response
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from supabase import create_client, Client
from pathlib import Path
from typing import Optional
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo
from math import radians, sin, cos, sqrt, atan2
import os



app = FastAPI()


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
# FRESH SUPABASE CLIENT HELPER
# =========================================================
# Vercel/serverless requests should not share one long-lived
# sync Supabase HTTP client. A fresh client is created when
# the attendance request starts.
def get_supabase_client() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError("Supabase environment variables are missing.")

    return create_client(
        SUPABASE_URL,
        SUPABASE_KEY
    )

# =========================================================
# SUPABASE REST HELPER
# =========================================================
# Attendance uses the REST API directly instead of the Supabase
# Python/PostgREST sync client. This avoids the Vercel serverless
# httpx socket error: [Errno 16] Device or resource busy.
def supabase_rest_request(method: str, table: str, params=None, json_data=None):
    import requests

    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError("Supabase environment variables are missing.")

    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/{table}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }

    if method.upper() == "POST":
        headers["Prefer"] = "return=representation"

    response = requests.request(
        method=method.upper(),
        url=url,
        headers=headers,
        params=params or {},
        json=json_data,
        timeout=15,
    )

    if not response.ok:
        try:
            detail = response.json()
        except Exception:
            detail = response.text
        raise RuntimeError(
            f"Supabase REST error {response.status_code}: {detail}"
        )

    if not response.text:
        return []

    try:
        return response.json()
    except Exception:
        return []

# =========================================================
# SUPABASE CLIENT
# =========================================================

supabase: Optional[Client] = None

if SUPABASE_URL and SUPABASE_KEY:

    try:
        supabase = create_client(
            SUPABASE_URL,
            SUPABASE_KEY
        )

        print("SUPABASE: Client created successfully")

    except Exception as e:

        print(
            "SUPABASE: Client creation failed:",
            e
        )

else:

    print(
        "SUPABASE: URL or KEY missing in .env"
    )

# =========================================================
# ADMIN CLIENT - SERVICE ROLE
# =========================================================

admin_supabase: Optional[Client] = None

if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    try:
        admin_supabase = create_client(
            SUPABASE_URL,
            SUPABASE_SERVICE_ROLE_KEY
        )

        print("SUPABASE: Admin client created successfully")

    except Exception as e:
        print(
            "SUPABASE: Admin client creation failed:",
            e
        )
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

    if supabase is None:

        return {
            "status": "error",
            "message": "Supabase client is not available"
        }

    try:

        result = (
            supabase
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

        return {
            "status": "error",
            "message": f"Supabase database error: {str(e)}"
        }


# =========================================================
# REGISTER STUDENT
# =========================================================

@app.post("/register")
def register_student(student: StudentRegister):

    if supabase is None:

        return {
            "status": "error",
            "message": "Supabase client is not available"
        }

    try:

        # -------------------------------------------------
        # CHECK EMAIL
        # -------------------------------------------------

        existing_email = (
            supabase
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
            supabase
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
            supabase
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

    if supabase is None:

        return {
            "status": "error",
            "message": "Supabase client is not available"
        }

    try:

        query = (
            supabase
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

        return {
            "status": "error",
            "message": str(e)
        }


# =========================================================
# GET SINGLE STUDENT
# =========================================================

@app.get("/students/{student_id}")
def get_student(student_id: int):

    if supabase is None:

        return {
            "status": "error",
            "message": "Supabase client is not available"
        }

    try:

        result = (
            supabase
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

        return {
            "status": "error",
            "message": str(e)
        }


# =========================================================
# DELETE STUDENT
# =========================================================

@app.delete("/students/{student_id}")
def delete_student(student_id: int):

    if supabase is None:

        return {
            "status": "error",
            "message": "Supabase client is not available"
        }

    try:

        result = (
            supabase
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

        return {
            "status": "error",
            "message": str(e)
        }


# =========================================================
# GEOFENCE HELPERS
# =========================================================

def calculate_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float):
    earth_radius = 6371000

    lat1_rad = radians(lat1)
    lat2_rad = radians(lat2)
    delta_lat = radians(lat2 - lat1)
    delta_lon = radians(lon2 - lon1)

    a = (
        sin(delta_lat / 2) ** 2
        + cos(lat1_rad)
        * cos(lat2_rad)
        * sin(delta_lon / 2) ** 2
    )

    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return earth_radius * c


def check_geofence(latitude: float, longitude: float, db: Optional[Client] = None):
    try:
        client = db if db is not None else get_supabase_client()
    except Exception as e:
        return False, f"Supabase client is not available: {str(e)}", None

    result = (
        client
        .table("geofences")
        .select("name, latitude, longitude, radius_meters")
        .execute()
    )

    if not result.data:
        return False, "No geofence locations are configured.", None

    for fence in result.data:
        distance = calculate_distance_meters(
            latitude,
            longitude,
            float(fence["latitude"]),
            float(fence["longitude"])
        )

        if distance <= float(fence["radius_meters"]):
            return True, f"Location verified at {fence['name']}.", fence["name"]

    return False, "You are outside the allowed mess/hostel location.", None


# =========================================================
# GEOFENCE CONFIGURATION
# =========================================================

@app.get("/geofences")
def get_geofences():

    if supabase is None:
        return {
            "status": "error",
            "message": "Supabase client is not available"
        }

    try:
        result = (
            supabase
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
        return {
            "status": "error",
            "message": str(e)
        }


class GeofenceUpdate(BaseModel):
    name: str
    latitude: float
    longitude: float
    radius_meters: float


@app.put("/geofences")
def update_geofence(fence: GeofenceUpdate):

    if supabase is None:
        return {
            "status": "error",
            "message": "Supabase client is not available"
        }

    try:
        if fence.radius_meters <= 0:
            return {
                "status": "error",
                "message": "Radius must be greater than 0 meters"
            }

        result = (
            supabase
            .table("geofences")
            .upsert({
                "name": fence.name,
                "latitude": fence.latitude,
                "longitude": fence.longitude,
                "radius_meters": fence.radius_meters,
                "updated_at": datetime.now(INDIA_TZ).isoformat()
            }, on_conflict="name")
            .execute()
        )

        return {
            "status": "success",
            "message": "Geofence updated successfully",
            "data": result.data
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }


# =========================================================
# DELETE GEOFENCE
# =========================================================

@app.delete("/geofences/{fence_name}")
def delete_geofence(fence_name: str):

    if supabase is None:
        return {
            "status": "error",
            "message": "Supabase client is not available"
        }

    try:
        fence_name = fence_name.strip()

        if not fence_name:
            return {
                "status": "error",
                "message": "Geofence name is required"
            }

        result = (
            supabase
            .table("geofences")
            .delete()
            .eq("name", fence_name)
            .execute()
        )

        # Nothing was deleted
        if not result.data:
            return {
                "status": "error",
                "message": f'Geofence "{fence_name}" was not found.'
            }

        return {
            "status": "success",
            "message": f'Geofence "{fence_name}" deleted successfully.',
            "data": result.data
        }

    except Exception as e:
        print("GEOFENCE DELETE ERROR:", repr(e))

        return {
            "status": "error",
            "message": str(e)
        }


# =========================================================
# SCAN ATTENDANCE
# =========================================================

@app.post("/attendance/scan")
def scan_attendance(scan: AttendanceScan):
    try:
        # Attendance uses direct Supabase REST calls here.
        # This avoids the Vercel/httpx [Errno 16] resource-busy error.

        # -----------------------------------------------------
        # RESOLVE ROLL NUMBER
        # -----------------------------------------------------
        roll_no = None

        incoming_roll_no = getattr(scan, "roll_no", None)

        if incoming_roll_no:
            roll_no = str(incoming_roll_no).strip()
            if roll_no.isdigit():
                roll_no = roll_no.zfill(10)

        elif scan.student_id is not None:
            legacy = supabase_rest_request(
                "GET",
                "students",
                params={
                    "select": "roll_no",
                    "id": f"eq.{scan.student_id}",
                    "limit": "1",
                },
            )

            if legacy and legacy[0].get("roll_no") is not None:
                roll_no = str(legacy[0]["roll_no"]).strip()
                if roll_no.isdigit():
                    roll_no = roll_no.zfill(10)

        if not roll_no:
            return {
                "status": "error",
                "message": "Roll number is required."
            }

        # =====================================================
        # HOSTELLER CHECK -- SECURITY GATE
        # =====================================================
        hosteller_rows = supabase_rest_request(
            "GET",
            "hostelers",
            params={
                "select": "*",
                "roll_no": f"eq.{roll_no}",
                "limit": "1",
            },
        )

        if not hosteller_rows:
            return {
                "status": "error",
                "message": (
                    "Attendance not allowed. "
                    "You are not registered as a hosteller."
                )
            }

        hosteller = hosteller_rows[0]

        # -----------------------------------------------------
        # STUDENT DETAILS
        # -----------------------------------------------------
        student_rows = supabase_rest_request(
            "GET",
            "students",
            params={
                "select": "*",
                "roll_no": f"eq.{roll_no}",
                "limit": "1",
            },
        )

        student = student_rows[0] if student_rows else hosteller

        # =====================================================
        # LOCATION / GEOFENCE
        # =====================================================
        if scan.latitude is None or scan.longitude is None:
            return {
                "status": "error",
                "message": (
                    "Location permission is required "
                    "to mark attendance."
                )
            }

        fences = supabase_rest_request(
            "GET",
            "geofences",
            params={
                "select": "name,latitude,longitude,radius_meters",
            },
        )

        if not fences:
            return {
                "status": "error",
                "message": "No geofence locations are configured."
            }

        location_allowed = False
        location_message = "You are outside the allowed mess/hostel location."

        for fence in fences:
            distance = calculate_distance_meters(
                float(scan.latitude),
                float(scan.longitude),
                float(fence["latitude"]),
                float(fence["longitude"]),
            )

            if distance <= float(fence["radius_meters"]):
                location_allowed = True
                location_message = (
                    f"Location verified at {fence['name']}."
                )
                break

        if not location_allowed:
            return {
                "status": "error",
                "message": location_message
            }

        # =====================================================
        # TIME / MEAL
        # =====================================================
        now = datetime.now(INDIA_TZ)
        today = now.date().isoformat()
        current_time = now.strftime("%I:%M:%S %p")
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

        # =====================================================
        # DUPLICATE CHECK
        # =====================================================
        existing = supabase_rest_request(
            "GET",
            "attendance",
            params={
                "select": "id,scan_time,meal_type",
                "roll_no": f"eq.{roll_no}",
                "attendance_date": f"eq.{today}",
                "meal_type": f"eq.{meal}",
                "limit": "1",
            },
        )

        if existing:
            previous = existing[0]
            attendance_id = previous.get("id")
            token_number = (
                f"GP-BARH-MESS-{int(attendance_id):07d}"
                if attendance_id is not None
                else None
            )

            return {
                "status": "duplicate",
                "message": f"{meal} attendance already marked.",
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
                    "scan_time": previous.get("scan_time"),
                    "status": "Present",
                    "token_number": token_number,
                },
            }

        # =====================================================
        # INSERT ATTENDANCE
        # =====================================================
        attendance_data = {
            "student_name": student.get("name"),
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
            "status": "Present",
        }

        inserted = supabase_rest_request(
            "POST",
            "attendance",
            json_data=attendance_data,
        )

        inserted_row = inserted[0] if inserted else None

        if not inserted_row:
            return {
                "status": "error",
                "message": "Attendance could not be saved."
            }

        attendance_id = inserted_row.get("id")
        token_number = (
            f"GP-BARH-MESS-{int(attendance_id):07d}"
            if attendance_id is not None
            else None
        )

        return {
            "status": "success",
            "message": f"{meal} attendance marked successfully.",
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
                "time": current_time,
                "meal": meal,
                "status": "Present",
                "token_number": token_number,
            },
        }

    except Exception as e:
        print("========= ATTENDANCE ERROR =========")
        print("ERROR:", repr(e))
        traceback.print_exc()
        print("====================================")

        return {
            "status": "error",
            "message": f"Attendance failed: {str(e)}"
        }

# =========================================================
# GET STUDENT ATTENDANCE
# =========================================================

@app.get(
    "/attendance/student/{student_id}"
)
def get_student_attendance(
    student_id: int
):

    if supabase is None:

        return {
            "status": "error",
            "message": "Supabase client is not available"
        }

    try:

        end_date = datetime.now(INDIA_TZ).date()
        start_date = end_date - timedelta(days=29)

        result = (
            supabase
            .table("attendance")
            .select("*")
            .eq(
                "student_id",
                student_id
            )
            .gte(
                "attendance_date",
                start_date.isoformat()
            )
            .lte(
                "attendance_date",
                end_date.isoformat()
            )
            .order(
                "attendance_date",
                desc=True
            )
            .order(
                "scan_time",
                desc=True
            )
            .execute()
        )

        return {

            "status":
                "success",

            "data":
                result.data
        }

    except Exception as e:

        return {

            "status":
                "error",

            "message":
                str(e)
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

    if supabase is None:

        return {
            "status": "error",
            "message": "Supabase client is not available"
        }

    try:

        today = (
            datetime
            .now(INDIA_TZ)
            .date()
            .isoformat()
        )

        result = (
            supabase
            .table("attendance")
            .select("*")
            .eq(
                "student_id",
                student_id
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

            "status":
                "success",

            "date":
                today,

            "data":
                result.data
        }

    except Exception as e:

        return {

            "status":
                "error",

            "message":
                str(e)
        }

    # =========================================================
# ADMIN PASSWORD RESET
# =========================================================

from fastapi import HTTPException
import requests


class PasswordChangeRequest(BaseModel):
    email: str
    password: str

@app.post("/admin/change-password")
def admin_change_password(data: PasswordChangeRequest):

    email = data.email.strip().lower()
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
            detail="Password must be at least 6 characters."
        )

    try:

        # -------------------------------------------------
        # 1. CHECK STUDENT IN DATABASE
        # -------------------------------------------------

        student_result = (
            supabase
            .table("students")
            .select("id,email,name")
            .eq("email", email)
            .limit(1)
            .execute()
        )

        if not student_result.data:
            raise HTTPException(
                status_code=404,
                detail="Student with this email was not found in students table."
            )

        student = student_result.data[0]

        # -------------------------------------------------
        # 2. GET AUTH USER
        # -------------------------------------------------

        auth_users = supabase.auth.admin.list_users()

        auth_user = None

        # Supabase Python SDK normally returns a list
        # of User objects.
        for user in auth_users:

            auth_email = (
                str(getattr(user, "email", "") or "")
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

        user_id = getattr(auth_user, "id", None)

        if not user_id:
            raise HTTPException(
                status_code=500,
                detail="Supabase Auth user ID was not found."
            )

        # -------------------------------------------------
        # 3. CHANGE PASSWORD DIRECTLY USING SUPABASE ADMIN
        # -------------------------------------------------

        update_response = (
            supabase
            .auth
            .admin
            .update_user_by_id(
                user_id,
                {
                    "password": password
                }
            )
        )

        # -------------------------------------------------
        # 4. SUCCESS
        # -------------------------------------------------

        print(
            f"ADMIN PASSWORD RESET SUCCESS: "
            f"{student.get('name')} - {email}"
        )

        return {
            "status": "success",
            "message": "Password changed successfully.",
            "email": email,
            "student_name": student.get("name"),
            "auth_user_id": user_id
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            "ADMIN PASSWORD RESET ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail=f"Password change failed: {str(e)}"
        )



    # =========================================================
# ADMIN REGISTRATION
# =========================================================
@app.post("/admin/verify-setup-key")
def verify_admin_setup_key(data: dict):
    setup_key = str(data.get("setup_key", "")).strip()

    if not setup_key:
        raise HTTPException(
            status_code=400,
            detail="Setup key is required."
        )

    if not ADMIN_SETUP_KEY:
        raise HTTPException(
            status_code=500,
            detail="Admin setup key is not configured on server."
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




@app.post("/admin/register")
def register_admin(data: AdminRegisterRequest):

    # -----------------------------------------------------
    # 1. CHECK SETUP KEY
    # -----------------------------------------------------

    if not ADMIN_SETUP_KEY:
        raise HTTPException(
            status_code=500,
            detail="Admin setup key is not configured on server."
        )

    if data.setup_key != ADMIN_SETUP_KEY:
        raise HTTPException(
            status_code=403,
            detail="Invalid admin setup key."
        )

    # -----------------------------------------------------
    # 2. BASIC VALIDATION
    # -----------------------------------------------------

    email = data.email.strip().lower()
    password = data.password
    role = data.role.strip().lower()

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
            detail="Password must be at least 6 characters."
        )

    # Only these two roles are allowed.
    if role not in ["super_admin", "normal_admin"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid admin role."
        )

    if supabase is None:
        raise HTTPException(
            status_code=500,
            detail="Supabase client is not available."
        )

    try:

        # -------------------------------------------------
        # 3. CHECK ROLE ACCOUNT LIMIT
        # Maximum 2 accounts per role
        # -------------------------------------------------

        existing_admins = (
            supabase
            .table("admin_roles")
            .select("email, role")
            .eq("role", role)
            .execute()
        )

        existing_count = len(existing_admins.data or [])

        if existing_count >= 2:
            if role == "super_admin":
                raise HTTPException(
                    status_code=400,
                    detail="Maximum 2 Super Admin accounts already exist."
                )
            else:
                raise HTTPException(
                    status_code=400,
                    detail="Maximum 2 Mess Incharge accounts already exist."
                )

        # -------------------------------------------------
        # 4. CHECK EMAIL IN admin_roles
        # -------------------------------------------------

        existing_email = (
            supabase
            .table("admin_roles")
            .select("email")
            .eq("email", email)
            .limit(1)
            .execute()
        )

        if existing_email.data:
            raise HTTPException(
                status_code=400,
                detail="An admin account with this email already exists."
            )

        # -------------------------------------------------
        # 5. CREATE SUPABASE AUTH USER
        # -------------------------------------------------

        auth_response = (
            supabase
            .auth
            .admin
            .create_user({
                "email": email,
                "password": password,
                "email_confirm": True
            })
        )

        auth_user = getattr(auth_response, "user", None)

        if auth_user is None:
            raise HTTPException(
                status_code=500,
                detail="Admin Auth account could not be created."
            )

        # -------------------------------------------------
        # 6. INSERT ADMIN ROLE
        # -------------------------------------------------

        role_result = (
            supabase
            .table("admin_roles")
            .insert({
                "email": email,
                "role": role
            })
            .execute()
        )

        # -------------------------------------------------
        # 7. SUCCESS
        # -------------------------------------------------

        return {
            "status": "success",
            "message": (
                "Super Admin account created successfully."
                if role == "super_admin"
                else "Mess Incharge account created successfully."
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

        raise HTTPException(
            status_code=500,
            detail=f"Admin registration failed: {str(e)}"
        )