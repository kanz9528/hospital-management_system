from flask import Flask, request, jsonify, send_file, render_template
import pymysql
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import io
import json
from flask_cors import CORS # Import CORS


load_dotenv()

# Flask app initialization
app = Flask(__name__)
CORS(app) # Enable CORS for all origins by default (for development)
def index():
    return render_template('index.html')
# Database configuration
db_config = {
    "host": os.getenv('DB_HOST', 'mysql-31a9d479-kanhaiyabhatt9528-c091.i.aivencloud.co'),
    "port": int(os.getenv('DB_PORT', 21828 )),
    "user": os.getenv('DB_USER', 'Kanhaiya12'),
    "password": os.getenv('DB_PASSWORD', 'AVNS_8CVgajbEJN3nVyNXAAW  '),
    "database": os.getenv('DB_NAME', 'hospital'),
    "charset": "utf8mb4",
    "cursorclass": pymysql.cursors.DictCursor
}

def get_db_connection():
    """Establishes a new database connection."""
    return pymysql.connect(**db_config)

# --- Error Handlers ---
@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "The requested URL was not found on the server. Please check the API endpoint URL."}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error occurred. Please try again later."}), 500

@app.errorhandler(400)
def bad_request(error):
    return jsonify({"error": "Bad request. Please check your request data."}), 400

# --- Frontend Routes ---
@app.route('/')
def index():
    return render_template('index.html')

# -----------------------------------------------------------
# API Endpoints (from your provided 1.1.py, kept as is)
# -----------------------------------------------------------

# --- Patients API ---
@app.route('/api/patients', methods=['GET', 'POST'])
@app.route('/api/patients/<int:patient_id>', methods=['GET', 'PUT', 'DELETE'])
def manage_patients(patient_id=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if request.method == 'GET':
            if patient_id:
                cursor.execute("SELECT * FROM patient WHERE patient_id = %s", (patient_id,))
                patient = cursor.fetchone()
                if patient:
                    # Convert date/time objects to strings if present
                    for key, value in patient.items():
                        if isinstance(value, (datetime, timedelta)):
                            patient[key] = str(value)
                    return jsonify(patient), 200
                return jsonify({"error": "Patient not found"}), 404
            else:
                cursor.execute("SELECT patient_id, name, age, gender, blood_type, phone, email, disease, created_at as registrationDate FROM patient")
                patients = cursor.fetchall()
                # Convert date/time objects to strings for all patients
                for p in patients:
                    for key, value in p.items():
                        if isinstance(value, (datetime, timedelta)):
                            p[key] = str(value)
                return jsonify(patients), 200

        elif request.method == 'POST':
            data = request.json
            required_fields = ['name', 'age', 'gender']
            if not all(field in data for field in required_fields):
                return jsonify({"error": "Missing required fields"}), 400
                
            sql = """
            INSERT INTO patient (name, age, gender, blood_type, address, phone, email, 
                                insurance_provider_id, insurance_policy_number, primary_physician,
                                emergency_contact, emergency_phone, medical_history,
                                current_medications, allergies, disease)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(sql, (
                data['name'], data['age'], data['gender'], data.get('blood_type'), data.get('address'),
                data.get('phone'), data.get('email'), data.get('insurance_provider_id'),
                data.get('insurance_policy_number'), data.get('primary_physician'),
                data.get('emergency_contact'), data.get('emergency_phone'), data.get('medical_history'),
                data.get('current_medications'), data.get('allergies'), data.get('disease')
            ))
            conn.commit()
            return jsonify({"message": "Patient added successfully", "id": cursor.lastrowid}), 201

        elif request.method == 'PUT':
            data = request.json
            if not data:
                return jsonify({"error": "No data provided for update"}), 400
            
            updates = {k: v for k, v in data.items() if v is not None}
            if not updates:
                return jsonify({"error": "No valid data provided for update"}), 400
            
            set_clause = ', '.join([f"{key} = %s" for key in updates.keys()])
            values = list(updates.values())
            values.append(patient_id)
            
            sql = f"UPDATE patient SET {set_clause} WHERE patient_id = %s"
            cursor.execute(sql, tuple(values))
            conn.commit()
            if cursor.rowcount > 0:
                return jsonify({"message": "Patient updated successfully"}), 200
            return jsonify({"error": "Patient not found"}), 404
        
        elif request.method == 'DELETE':
            cursor.execute("DELETE FROM patient WHERE patient_id = %s", (patient_id,))
            conn.commit()
            if cursor.rowcount > 0:
                return jsonify({"message": "Patient deleted successfully"}), 200
            return jsonify({"error": "Patient not found"}), 404

    except pymysql.Error as e:
        conn.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# --- Doctors API ---
@app.route('/api/doctors', methods=['GET', 'POST'])
@app.route('/api/doctors/<int:doctor_id>', methods=['GET', 'PUT', 'DELETE'])
def manage_doctors(doctor_id=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if request.method == 'GET':
            if doctor_id:
                cursor.execute("""
                    SELECT d.*, dept.name as department_name 
                    FROM doctor d 
                    LEFT JOIN department dept ON d.department_id = dept.department_id 
                    WHERE d.doctor_id = %s
                """, (doctor_id,))
                doctor = cursor.fetchone()
                if doctor:
                    for key, value in doctor.items():
                        if isinstance(value, (datetime, timedelta)):
                            doctor[key] = str(value)
                    return jsonify(doctor), 200
                return jsonify({"error": "Doctor not found"}), 404
            else:
                cursor.execute("""
                    SELECT d.doctor_id, d.name, d.specialization, d.department_id, 
                           d.years_of_experience as experience, d.consultation_fee as fee, 
                           dept.name as departmentName, d.phone, d.email, d.availability, d.bio
                    FROM doctor d
                    LEFT JOIN department dept ON d.department_id = dept.department_id
                """)
                doctors = cursor.fetchall()
                for d in doctors:
                    for key, value in d.items():
                        if isinstance(value, (datetime, timedelta)):
                            d[key] = str(value)
                return jsonify(doctors), 200

        elif request.method == 'POST':
            data = request.json
            required_fields = ['name', 'specialization', 'consultation_fee']
            if not all(field in data for field in required_fields):
                return jsonify({"error": "Missing required fields"}), 400
                
            sql = """
            INSERT INTO doctor (name, specialization, department_id, qualification, years_of_experience,
                                phone, email, consultation_fee, availability, bio)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(sql, (
                data['name'], data['specialization'], data.get('department_id'), data.get('qualification'),
                data.get('years_of_experience'), data.get('phone'), data.get('email'),
                data['consultation_fee'], data.get('availability'), data.get('bio')
            ))
            conn.commit()
            return jsonify({"message": "Doctor added successfully", "id": cursor.lastrowid}), 201

        elif request.method == 'PUT':
            data = request.json
            updates = {k: v for k, v in data.items() if v is not None}
            if not updates:
                return jsonify({"error": "No data provided for update"}), 400
            
            set_clause = ', '.join([f"{key} = %s" for key in updates.keys()])
            values = list(updates.values())
            values.append(doctor_id)
            
            sql = f"UPDATE doctor SET {set_clause} WHERE doctor_id = %s"
            cursor.execute(sql, tuple(values))
            conn.commit()
            if cursor.rowcount > 0:
                return jsonify({"message": "Doctor updated successfully"}), 200
            return jsonify({"error": "Doctor not found"}), 404
        
        elif request.method == 'DELETE':
            cursor.execute("DELETE FROM doctor WHERE doctor_id = %s", (doctor_id,))
            conn.commit()
            if cursor.rowcount > 0:
                return jsonify({"message": "Doctor deleted successfully"}), 200
            return jsonify({"error": "Doctor not found"}), 404

    except pymysql.Error as e:
        conn.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# --- Appointments API ---
@app.route('/api/appointments', methods=['GET', 'POST'])
@app.route('/api/appointments/<int:appointment_id>', methods=['GET', 'PUT', 'DELETE'])
def manage_appointments(appointment_id=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if request.method == 'GET':
            if appointment_id:
                cursor.execute("""
                    SELECT a.*, p.name as patient_name, d.name as doctor_name
                    FROM appointment a
                    JOIN patient p ON a.patient_id = p.patient_id
                    JOIN doctor d ON a.doctor_id = d.doctor_id
                    WHERE a.appointment_id = %s
                """, (appointment_id,))
                appointment = cursor.fetchone()
                if appointment:
                    for key, value in appointment.items():
                        if isinstance(value, (datetime, timedelta)):
                            appointment[key] = str(value)
                    return jsonify(appointment), 200
                return jsonify({"error": "Appointment not found"}), 404
            else:
                cursor.execute("""
                    SELECT a.appointment_id as id, a.date, a.time, a.status, a.reason,
                           p.patient_id, p.name as patientName,
                           d.doctor_id, d.name as doctorName, d.specialization
                    FROM appointment a
                    JOIN patient p ON a.patient_id = p.patient_id
                    JOIN doctor d ON a.doctor_id = d.doctor_id
                    ORDER BY a.date, a.time
                """)
                appointments = cursor.fetchall()
                for a in appointments:
                    for key, value in a.items():
                        if isinstance(value, (datetime, timedelta)):
                            a[key] = str(value)
                return jsonify(appointments), 200

        elif request.method == 'POST':
            data = request.json
            required_fields = ['patient_id', 'doctor_id', 'date', 'time']
            if not all(field in data for field in required_fields):
                return jsonify({"error": "Missing required fields"}), 400
                
            sql = """
            INSERT INTO appointment (patient_id, doctor_id, date, time, duration, reason, notes, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(sql, (
                data['patient_id'], data['doctor_id'], data['date'], data['time'],
                data.get('duration', 30), data.get('reason'), data.get('notes'), data.get('status', 'Scheduled')
            ))
            conn.commit()
            return jsonify({
                "message": "Appointment scheduled successfully",
                "id": cursor.lastrowid,
                "invoice_number": f"APT-{cursor.lastrowid:04d}-{datetime.now().strftime('%Y%m%d')}"
            }), 201

        elif request.method == 'PUT':
            data = request.json
            allowed_fields = ['date', 'time', 'duration', 'reason', 'notes', 'status', 'patient_id', 'doctor_id']
            updates = {k: v for k, v in data.items() if k in allowed_fields and v is not None}
            
            if not updates:
                return jsonify({"error": "No valid data provided for update"}), 400
            
            set_clause = ', '.join([f"{key} = %s" for key in updates.keys()])
            values = list(updates.values())
            values.append(appointment_id)
            
            sql = f"UPDATE appointment SET {set_clause} WHERE appointment_id = %s"
            cursor.execute(sql, tuple(values))
            conn.commit()
            if cursor.rowcount > 0:
                return jsonify({"message": "Appointment updated successfully"}), 200
            return jsonify({"error": "Appointment not found"}), 404

        elif request.method == 'DELETE':
            cursor.execute("DELETE FROM appointment WHERE appointment_id = %s", (appointment_id,))
            conn.commit()
            if cursor.rowcount > 0:
                return jsonify({"message": "Appointment canceled successfully"}), 200
            return jsonify({"error": "Appointment not found"}), 404

    except pymysql.Error as e:
        conn.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# --- Billing API ---
@app.route('/api/bills', methods=['GET', 'POST'])
@app.route('/api/bills/<int:bill_id>', methods=['GET', 'PUT', 'DELETE'])
def manage_bills(bill_id=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if request.method == 'GET':
            if bill_id:
                cursor.execute("""
                    SELECT b.*, p.name as patient_name, d.name as doctor_name
                    FROM billing b
                    JOIN patient p ON b.patient_id = p.patient_id
                    LEFT JOIN doctor d ON b.doctor_id = d.doctor_id
                    WHERE b.bill_id = %s
                """, (bill_id,))
                bill = cursor.fetchone()
                if bill:
                    for key, value in bill.items():
                        if isinstance(value, (datetime, timedelta)):
                            bill[key] = str(value)
                    # Handle 'items' JSON string
                    if 'items' in bill and bill['items']:
                        try:
                            bill['items'] = json.loads(bill['items'])
                        except json.JSONDecodeError:
                            bill['items'] = [] # Or handle as error
                    return jsonify(bill), 200
                return jsonify({"error": "Bill not found"}), 404
            else:
                cursor.execute("""
                    SELECT b.bill_id as id, b.invoice_number as invoiceNumber, b.amount, b.status, b.date,
                           b.payment_method as paymentMethod,
                           p.patient_id, p.name as patientName,
                           d.doctor_id, d.name as doctorName
                    FROM billing b
                    JOIN patient p ON b.patient_id = p.patient_id
                    LEFT JOIN doctor d ON b.doctor_id = d.doctor_id
                    ORDER BY b.date DESC
                """)
                bills = cursor.fetchall()
                for b in bills:
                    for key, value in b.items():
                        if isinstance(value, (datetime, timedelta)):
                            b[key] = str(value)
                    # Handle 'items' JSON string
                    if 'items' in b and b['items']:
                        try:
                            b['items'] = json.loads(b['items'])
                        except json.JSONDecodeError:
                            b['items'] = [] # Or handle as error
                return jsonify(bills), 200

        elif request.method == 'POST':
            data = request.json
            required_fields = ['patient_id', 'amount']
            if not all(field in data for field in required_fields):
                return jsonify({"error": "Missing required fields"}), 400
                
            invoice_number = f"INV-{datetime.now().strftime('%Y%m%d')}-{data['patient_id']:04d}"
            due_date = data.get('due_date') or (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
            
            sql = """
            INSERT INTO billing (patient_id, doctor_id, appointment_id, invoice_number,
                                amount, tax, discount, date, due_date, status, payment_method, items)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(sql, (
                data['patient_id'], data.get('doctor_id'), data.get('appointment_id'), invoice_number,
                data['amount'], data.get('tax', 0.00), data.get('discount', 0.00), 
                data.get('date', datetime.now().strftime('%Y-%m-%d')),
                due_date, data.get('status', 'Unpaid'), data.get('payment_method'), 
                json.dumps(data.get('items', [])) if data.get('items') else None
            ))
            conn.commit()
            return jsonify({
                "message": "Bill generated successfully", 
                "id": cursor.lastrowid,
                "invoice_number": invoice_number
            }), 201

        elif request.method == 'PUT':
            data = request.json
            allowed_fields = ['amount', 'tax', 'discount', 'status', 'payment_method', 'items', 'patient_id', 'doctor_id', 'appointment_id']
            updates = {k: v for k, v in data.items() if k in allowed_fields and v is not None}
            
            if 'items' in updates:
                updates['items'] = json.dumps(updates['items'])
            
            if not updates:
                return jsonify({"error": "No valid data provided for update"}), 400
            
            set_clause = ', '.join([f"{key} = %s" for key in updates.keys()])
            values = list(updates.values())
            values.append(bill_id)
            
            sql = f"UPDATE billing SET {set_clause} WHERE bill_id = %s"
            cursor.execute(sql, tuple(values))
            conn.commit()
            if cursor.rowcount > 0:
                return jsonify({"message": "Bill updated successfully"}), 200
            return jsonify({"error": "Bill not found"}), 404

        elif request.method == 'DELETE':
            cursor.execute("DELETE FROM billing WHERE bill_id = %s", (bill_id,))
            conn.commit()
            if cursor.rowcount > 0:
                return jsonify({"message": "Bill deleted successfully"}), 200
            return jsonify({"error": "Bill not found"}), 404

    except pymysql.Error as e:
        conn.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# --- Medical Records API ---
@app.route('/api/records', methods=['GET', 'POST'])
@app.route('/api/records/<int:record_id>', methods=['GET', 'PUT', 'DELETE'])
def manage_records(record_id=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if request.method == 'GET':
            if record_id:
                cursor.execute("""
                    SELECT mr.*, p.name as patient_name, d.name as doctor_name
                    FROM medical_record mr
                    JOIN patient p ON mr.patient_id = p.patient_id
                    LEFT JOIN doctor d ON mr.doctor_id = d.doctor_id
                    WHERE mr.record_id = %s
                """, (record_id,))
                record = cursor.fetchone()
                if record:
                    for key, value in record.items():
                        if isinstance(value, (datetime, timedelta)):
                            record[key] = str(value)
                    return jsonify(record), 200
                return jsonify({"error": "Medical record not found"}), 404
            else:
                cursor.execute("""
                    SELECT mr.record_id as id, mr.diagnosis, mr.date, 
                           mr.treatment, mr.prescription, mr.notes,
                           p.patient_id, p.name as patientName,
                           d.doctor_id, d.name as doctorName
                    FROM medical_record mr
                    JOIN patient p ON mr.patient_id = p.patient_id
                    LEFT JOIN doctor d ON mr.doctor_id = d.doctor_id
                    ORDER BY mr.date DESC
                """)
                records = cursor.fetchall()
                for r in records:
                    for key, value in r.items():
                        if isinstance(value, (datetime, timedelta)):
                            r[key] = str(value)
                return jsonify(records), 200

        elif request.method == 'POST':
            data = request.json
            required_fields = ['patient_id', 'diagnosis']
            if not all(field in data for field in required_fields):
                return jsonify({"error": "Missing required fields"}), 400
                
            sql = """
            INSERT INTO medical_record (patient_id, doctor_id, visit_type, diagnosis, symptoms,
                                      treatment, prescription, tests_ordered, test_results,
                                      notes, follow_up_required, follow_up_date, date)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(sql, (
                data['patient_id'], data.get('doctor_id'), data.get('visit_type'), data['diagnosis'],
                data.get('symptoms'), data.get('treatment'), data.get('prescription'),
                data.get('tests_ordered'), data.get('test_results'), data.get('notes'),
                data.get('follow_up_required', False), data.get('follow_up_date'),
                data.get('date', datetime.now().strftime('%Y-%m-%d'))
            ))
            conn.commit()
            return jsonify({"message": "Medical record added successfully", "id": cursor.lastrowid}), 201

        elif request.method == 'PUT':
            data = request.json
            allowed_fields = ['diagnosis', 'symptoms', 'treatment', 'prescription', 
                            'tests_ordered', 'test_results', 'notes', 'follow_up_required', 
                            'follow_up_date', 'patient_id', 'doctor_id', 'visit_type', 'date']
            updates = {k: v for k, v in data.items() if k in allowed_fields and v is not None}
            
            if not updates:
                return jsonify({"error": "No valid data provided for update"}), 400
            
            set_clause = ', '.join([f"{key} = %s" for key in updates.keys()])
            values = list(updates.values())
            values.append(record_id)
            
            sql = f"UPDATE medical_record SET {set_clause} WHERE record_id = %s"
            cursor.execute(sql, tuple(values))
            conn.commit()
            if cursor.rowcount > 0:
                return jsonify({"message": "Medical record updated successfully"}), 200
            return jsonify({"error": "Medical record not found"}), 404

        elif request.method == 'DELETE':
            cursor.execute("DELETE FROM medical_record WHERE record_id = %s", (record_id,))
            conn.commit()
            if cursor.rowcount > 0:
                return jsonify({"message": "Medical record deleted successfully"}), 200
            return jsonify({"error": "Medical record not found"}), 404

    except pymysql.Error as e:
        conn.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# --- Departments API ---
@app.route('/api/departments', methods=['GET', 'POST'])
@app.route('/api/departments/<int:department_id>', methods=['GET', 'PUT', 'DELETE'])
def manage_departments(department_id=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if request.method == 'GET':
            if department_id:
                cursor.execute("SELECT * FROM department WHERE department_id = %s", (department_id,))
                department = cursor.fetchone()
                if department:
                    for key, value in department.items():
                        if isinstance(value, (datetime, timedelta)):
                            department[key] = str(value)
                    return jsonify(department), 200
                return jsonify({"error": "Department not found"}), 404
            else:
                cursor.execute("SELECT department_id as id, name FROM department")
                departments = cursor.fetchall()
                for d in departments:
                    for key, value in d.items():
                        if isinstance(value, (datetime, timedelta)):
                            d[key] = str(value)
                return jsonify(departments), 200

        elif request.method == 'POST':
            data = request.json
            required_fields = ['name']
            if not all(field in data for field in required_fields):
                return jsonify({"error": "Missing required fields"}), 400
                
            sql = "INSERT INTO department (name, head_of_department, phone, email, description) VALUES (%s, %s, %s, %s, %s)"
            cursor.execute(sql, (
                data['name'], data.get('head_of_department'), data.get('phone'), 
                data.get('email'), data.get('description')
            ))
            conn.commit()
            return jsonify({"message": "Department added successfully", "id": cursor.lastrowid}), 201

        elif request.method == 'PUT':
            data = request.json
            allowed_fields = ['name', 'head_of_department', 'phone', 'email', 'description']
            updates = {k: v for k, v in data.items() if k in allowed_fields and v is not None}
            
            if not updates:
                return jsonify({"error": "No valid data provided for update"}), 400
            
            set_clause = ', '.join([f"{key} = %s" for key in updates.keys()])
            values = list(updates.values())
            values.append(department_id)
            
            sql = f"UPDATE department SET {set_clause} WHERE department_id = %s"
            cursor.execute(sql, tuple(values))
            conn.commit()
            if cursor.rowcount > 0:
                return jsonify({"message": "Department updated successfully"}), 200
            return jsonify({"error": "Department not found"}), 404

        elif request.method == 'DELETE':
            cursor.execute("DELETE FROM department WHERE department_id = %s", (department_id,))
            conn.commit()
            if cursor.rowcount > 0:
                return jsonify({"message": "Department deleted successfully"}), 200
            return jsonify({"error": "Department not found"}), 404

    except pymysql.Error as e:
        conn.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# --- Staff API ---
@app.route('/api/staff', methods=['GET', 'POST'])
@app.route('/api/staff/<int:staff_id>', methods=['GET', 'PUT', 'DELETE'])
def manage_staff(staff_id=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if request.method == 'GET':
            if staff_id:
                cursor.execute("""
                    SELECT s.*, d.name as department_name 
                    FROM staff s 
                    LEFT JOIN department d ON s.department_id = d.department_id 
                    WHERE s.staff_id = %s
                """, (staff_id,))
                staff = cursor.fetchone()
                if staff:
                    for key, value in staff.items():
                        if isinstance(value, (datetime, timedelta)):
                            staff[key] = str(value)
                    return jsonify(staff), 200
                return jsonify({"error": "Staff member not found"}), 404
            else:
                cursor.execute("""
                    SELECT s.staff_id as id, s.name, s.role, s.department_id, 
                           s.phone, s.email, d.name as departmentName
                    FROM staff s
                    LEFT JOIN department d ON s.department_id = d.department_id
                """)
                staff_members = cursor.fetchall()
                for s in staff_members:
                    for key, value in s.items():
                        if isinstance(value, (datetime, timedelta)):
                            s[key] = str(value)
                return jsonify(staff_members), 200

        elif request.method == 'POST':
            data = request.json
            required_fields = ['name', 'role']
            if not all(field in data for field in required_fields):
                return jsonify({"error": "Missing required fields"}), 400
                
            sql = "INSERT INTO staff (name, role, department_id, phone, email, address, hire_date) VALUES (%s, %s, %s, %s, %s, %s, %s)"
            cursor.execute(sql, (
                data['name'], data['role'], data.get('department_id'), data.get('phone'), 
                data.get('email'), data.get('address'), data.get('hire_date', datetime.now().date())
            ))
            conn.commit()
            return jsonify({"message": "Staff member added successfully", "id": cursor.lastrowid}), 201

        elif request.method == 'PUT':
            data = request.json
            allowed_fields = ['name', 'role', 'department_id', 'phone', 'email', 'address', 'hire_date']
            updates = {k: v for k, v in data.items() if k in allowed_fields and v is not None}
            
            if not updates:
                return jsonify({"error": "No valid data provided for update"}), 400
            
            set_clause = ', '.join([f"{key} = %s" for key in updates.keys()])
            values = list(updates.values())
            values.append(staff_id)
            
            sql = f"UPDATE staff SET {set_clause} WHERE staff_id = %s"
            cursor.execute(sql, tuple(values))
            conn.commit()
            if cursor.rowcount > 0:
                return jsonify({"message": "Staff member updated successfully"}), 200
            return jsonify({"error": "Staff member not found"}), 404

        elif request.method == 'DELETE':
            cursor.execute("DELETE FROM staff WHERE staff_id = %s", (staff_id,))
            conn.commit()
            if cursor.rowcount > 0:
                return jsonify({"message": "Staff member deleted successfully"}), 200
            return jsonify({"error": "Staff member not found"}), 404

    except pymysql.Error as e:
        conn.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# --- Insurance API ---
@app.route('/api/insurance', methods=['GET', 'POST'])
@app.route('/api/insurance/<int:provider_id>', methods=['GET', 'PUT', 'DELETE'])
def manage_insurance(provider_id=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if request.method == 'GET':
            if provider_id:
                cursor.execute("SELECT * FROM insurance_provider WHERE provider_id = %s", (provider_id,))
                provider = cursor.fetchone()
                if provider:
                    for key, value in provider.items():
                        if isinstance(value, (datetime, timedelta)):
                            provider[key] = str(value)
                    return jsonify(provider), 200
                return jsonify({"error": "Insurance provider not found"}), 404
            else:
                cursor.execute("SELECT provider_id as id, name, contact_person as contact, phone FROM insurance_provider")
                providers = cursor.fetchall()
                for p in providers:
                    for key, value in p.items():
                        if isinstance(value, (datetime, timedelta)):
                            p[key] = str(value)
                return jsonify(providers), 200

        elif request.method == 'POST':
            data = request.json
            required_fields = ['name']
            if not all(field in data for field in required_fields):
                return jsonify({"error": "Missing required fields"}), 400
                
            sql = "INSERT INTO insurance_provider (name, contact_person, phone, email, address, website) VALUES (%s, %s, %s, %s, %s, %s)"
            cursor.execute(sql, (
                data['name'], data.get('contact_person'), data.get('phone'), 
                data.get('email'), data.get('address'), data.get('website')
            ))
            conn.commit()
            return jsonify({"message": "Insurance provider added successfully", "id": cursor.lastrowid}), 201

        elif request.method == 'PUT':
            data = request.json
            allowed_fields = ['name', 'contact_person', 'phone', 'email', 'address', 'website']
            updates = {k: v for k, v in data.items() if k in allowed_fields and v is not None}
            
            if not updates:
                return jsonify({"error": "No valid data provided for update"}), 400
            
            set_clause = ', '.join([f"{key} = %s" for key in updates.keys()])
            values = list(updates.values())
            values.append(provider_id)
            
            sql = f"UPDATE insurance_provider SET {set_clause} WHERE provider_id = %s"
            cursor.execute(sql, tuple(values))
            conn.commit()
            if cursor.rowcount > 0:
                return jsonify({"message": "Insurance provider updated successfully"}), 200
            return jsonify({"error": "Insurance provider not found"}), 404

        elif request.method == 'DELETE':
            cursor.execute("DELETE FROM insurance_provider WHERE provider_id = %s", (provider_id,))
            conn.commit()
            if cursor.rowcount > 0:
                return jsonify({"message": "Insurance provider deleted successfully"}), 200
            return jsonify({"error": "Insurance provider not found"}), 404

    except pymysql.Error as e:
        conn.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# --- Tests API ---
@app.route('/api/tests/types', methods=['GET', 'POST'])
@app.route('/api/tests/types/<int:test_id>', methods=['GET', 'PUT', 'DELETE'])
def manage_test_types(test_id=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if request.method == 'GET':
            if test_id:
                cursor.execute("SELECT * FROM test_type WHERE test_id = %s", (test_id,))
                test = cursor.fetchone()
                if test:
                    for key, value in test.items():
                        if isinstance(value, (datetime, timedelta)):
                            test[key] = str(value)
                    return jsonify(test), 200
                return jsonify({"error": "Test type not found"}), 404
            else:
                cursor.execute("SELECT test_id as id, name, cost FROM test_type")
                tests = cursor.fetchall()
                for t in tests:
                    for key, value in t.items():
                        if isinstance(value, (datetime, timedelta)):
                            t[key] = str(value)
                return jsonify(tests), 200

        elif request.method == 'POST':
            data = request.json
            required_fields = ['name', 'cost']
            if not all(field in data for field in required_fields):
                return jsonify({"error": "Missing required fields"}), 400
                
            sql = "INSERT INTO test_type (name, cost, description, preparation_instructions, turnaround_time) VALUES (%s, %s, %s, %s, %s)"
            cursor.execute(sql, (
                data['name'], data['cost'], data.get('description'), 
                data.get('preparation_instructions'), data.get('turnaround_time')
            ))
            conn.commit()
            return jsonify({"message": "Test type added successfully", "id": cursor.lastrowid}), 201

        elif request.method == 'PUT':
            data = request.json
            allowed_fields = ['name', 'cost', 'description', 'preparation_instructions', 'turnaround_time']
            updates = {k: v for k, v in data.items() if k in allowed_fields and v is not None}
            
            if not updates:
                return jsonify({"error": "No valid data provided for update"}), 400
            
            set_clause = ', '.join([f"{key} = %s" for key in updates.keys()])
            values = list(updates.values())
            values.append(test_id)
            
            sql = f"UPDATE test_type SET {set_clause} WHERE test_id = %s"
            cursor.execute(sql, tuple(values))
            conn.commit()
            if cursor.rowcount > 0:
                return jsonify({"message": "Test type updated successfully"}), 200
            return jsonify({"error": "Test type not found"}), 404

        elif request.method == 'DELETE':
            cursor.execute("DELETE FROM test_type WHERE test_id = %s", (test_id,))
            conn.commit()
            if cursor.rowcount > 0:
                return jsonify({"message": "Test type deleted successfully"}), 200
            return jsonify({"error": "Test type not found"}), 404

    except pymysql.Error as e:
        conn.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# --- Patient Tests API ---
@app.route('/api/tests/patients', methods=['GET', 'POST'])
@app.route('/api/tests/patients/<int:patient_test_id>', methods=['GET', 'PUT', 'DELETE'])
def manage_patient_tests(patient_test_id=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if request.method == 'GET':
            if patient_test_id:
                cursor.execute("""
                    SELECT pt.*, p.name as patient_name, d.name as doctor_name, tt.name as test_name
                    FROM patient_test pt
                    JOIN patient p ON pt.patient_id = p.patient_id
                    LEFT JOIN doctor d ON pt.doctor_id = d.doctor_id
                    JOIN test_type tt ON pt.test_id = tt.test_id
                    WHERE pt.patient_test_id = %s
                """, (patient_test_id,))
                test = cursor.fetchone()
                if test:
                    for key, value in test.items():
                        if isinstance(value, (datetime, timedelta)):
                            test[key] = str(value)
                    return jsonify(test), 200
                return jsonify({"error": "Patient test not found"}), 404
            else:
                cursor.execute("""
                    SELECT pt.patient_test_id as id, pt.date_ordered as dateOrdered, pt.status,
                           p.patient_id, p.name as patientName,
                           d.doctor_id, d.name as doctorName,
                           tt.test_id, tt.name as testName
                    FROM patient_test pt
                    JOIN patient p ON pt.patient_id = p.patient_id
                    LEFT JOIN doctor d ON pt.doctor_id = d.doctor_id
                    JOIN test_type tt ON pt.test_id = tt.test_id
                    ORDER BY pt.date_ordered DESC
                """)
                tests = cursor.fetchall()
                for t in tests:
                    for key, value in t.items():
                        if isinstance(value, (datetime, timedelta)):
                            t[key] = str(value)
                return jsonify(tests), 200

        elif request.method == 'POST':
            data = request.json
            required_fields = ['patient_id', 'test_id']
            if not all(field in data for field in required_fields):
                return jsonify({"error": "Missing required fields"}), 400
                
            sql = """
            INSERT INTO patient_test (patient_id, doctor_id, test_id, date_ordered, date_completed, results, status, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(sql, (
                data['patient_id'], data.get('doctor_id'), data['test_id'], 
                data.get('date_ordered', datetime.now().date()), data.get('date_completed'),
                data.get('results'), data.get('status', 'Ordered'), data.get('notes')
            ))
            conn.commit()
            return jsonify({"message": "Patient test added successfully", "id": cursor.lastrowid}), 201

        elif request.method == 'PUT':
            data = request.json
            allowed_fields = ['date_completed', 'results', 'status', 'notes', 'patient_id', 'doctor_id', 'test_id', 'date_ordered']
            updates = {k: v for k, v in data.items() if k in allowed_fields and v is not None}
            
            if not updates:
                return jsonify({"error": "No valid data provided for update"}), 400
            
            set_clause = ', '.join([f"{key} = %s" for key in updates.keys()])
            values = list(updates.values())
            values.append(patient_test_id)
            
            sql = f"UPDATE patient_test SET {set_clause} WHERE patient_test_id = %s"
            cursor.execute(sql, tuple(values))
            conn.commit()
            if cursor.rowcount > 0:
                return jsonify({"message": "Patient test updated successfully"}), 200
            return jsonify({"error": "Patient test not found"}), 404

        elif request.method == 'DELETE':
            cursor.execute("DELETE FROM patient_test WHERE patient_test_id = %s", (patient_test_id,))
            conn.commit()
            if cursor.rowcount > 0:
                return jsonify({"message": "Patient test deleted successfully"}), 200
            return jsonify({"error": "Patient test not found"}), 404

    except pymysql.Error as e:
        conn.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# --- Inventory API ---
@app.route('/api/inventory', methods=['GET', 'POST'])
@app.route('/api/inventory/<int:item_id>', methods=['GET', 'PUT', 'DELETE'])
def manage_inventory(item_id=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if request.method == 'GET':
            if item_id:
                cursor.execute("SELECT * FROM inventory WHERE item_id = %s", (item_id,))
                item = cursor.fetchone()
                if item:
                    for key, value in item.items():
                        if isinstance(value, (datetime, timedelta)):
                            item[key] = str(value)
                    return jsonify(item), 200
                return jsonify({"error": "Inventory item not found"}), 404
            else:
                cursor.execute("SELECT item_id as id, name, category, quantity, unit, price, supplier, expiry_date as expiryDate, threshold FROM inventory ORDER BY name")
                items = cursor.fetchall()
                for i in items:
                    for key, value in i.items():
                        if isinstance(value, (datetime, timedelta)):
                            i[key] = str(value)
                return jsonify(items), 200

        elif request.method == 'POST':
            data = request.json
            required_fields = ['name', 'category', 'quantity', 'unit', 'price']
            if not all(field in data for field in required_fields):
                return jsonify({"error": "Missing required fields"}), 400
                
            sql = """
            INSERT INTO inventory (name, category, quantity, unit, price, supplier, expiry_date, 
                                  threshold, last_restocked, location, description)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(sql, (
                data['name'], data['category'], data['quantity'], data['unit'], data['price'],
                data.get('supplier'), data.get('expiry_date'), data.get('threshold', 10),
                data.get('last_restocked', datetime.now().date()), data.get('location'),
                data.get('description')
            ))
            conn.commit()
            return jsonify({"message": "Inventory item added successfully", "id": cursor.lastrowid}), 201

        elif request.method == 'PUT':
            data = request.json
            allowed_fields = ['name', 'category', 'quantity', 'unit', 'price', 'supplier', 
                            'expiry_date', 'threshold', 'last_restocked', 'location', 'description']
            updates = {k: v for k, v in data.items() if k in allowed_fields and v is not None}
            
            if not updates:
                return jsonify({"error": "No valid data provided for update"}), 400
            
            set_clause = ', '.join([f"{key} = %s" for key in updates.keys()])
            values = list(updates.values())
            values.append(item_id)
            
            sql = f"UPDATE inventory SET {set_clause} WHERE item_id = %s"
            cursor.execute(sql, tuple(values))
            conn.commit()
            if cursor.rowcount > 0:
                return jsonify({"message": "Inventory item updated successfully"}), 200
            return jsonify({"error": "Inventory item not found"}), 404

        elif request.method == 'DELETE':
            cursor.execute("DELETE FROM inventory WHERE item_id = %s", (item_id,))
            conn.commit()
            if cursor.rowcount > 0:
                return jsonify({"message": "Inventory item deleted successfully"}), 200
            return jsonify({"error": "Inventory item not found"}), 404

    except pymysql.Error as e:
        conn.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# --- Reports API ---
@app.route('/api/reports/low-stock', methods=['GET'])
def get_low_stock():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT item_id as id, name, quantity, threshold, unit, supplier 
            FROM inventory 
            WHERE quantity <= threshold
            ORDER BY quantity ASC
        """)
        low_stock_items = cursor.fetchall()
        return jsonify(low_stock_items), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/reports/today-appointments', methods=['GET'])
def get_today_appointments():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        today = datetime.now().strftime('%Y-%m-%d')
        cursor.execute("""
            SELECT a.appointment_id as id, a.time, a.status,
                   p.patient_id, p.name as patient_name,
                   d.doctor_id, d.name as doctor_name, d.specialization
            FROM appointment a
            JOIN patient p ON a.patient_id = p.patient_id
            JOIN doctor d ON a.doctor_id = d.doctor_id
            WHERE a.date = %s
            ORDER BY a.time
        """, (today,))
        appointments = cursor.fetchall()
        for a in appointments:
            for key, value in a.items():
                if isinstance(value, (datetime, timedelta)):
                    a[key] = str(value)
        return jsonify(appointments), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# --- Helper Endpoints for Dropdowns ---
@app.route('/api/patients/list', methods=['GET'])
def get_patients_list():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT patient_id as id, name FROM patient ORDER BY name")
        patients = cursor.fetchall()
        return jsonify(patients), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/doctors/list', methods=['GET'])
def get_doctors_list():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT doctor_id as id, name, specialization FROM doctor ORDER BY name")
        doctors = cursor.fetchall()
        return jsonify(doctors), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/departments/list', methods=['GET'])
def get_departments_list():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT department_id as id, name FROM department ORDER BY name")
        departments = cursor.fetchall()
        return jsonify(departments), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/appointments/list', methods=['GET'])
def get_appointments_list():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT appointment_id as id, patient_id, doctor_id, date, time FROM appointment ORDER BY date DESC, time DESC")
        appointments = cursor.fetchall()
        for a in appointments:
            for key, value in a.items():
                if isinstance(value, (datetime, timedelta)):
                    a[key] = str(value)
        return jsonify(appointments), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/tests/list', methods=['GET'])
def get_test_types_list():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT test_id as id, name, cost FROM test_type ORDER BY name")
        tests = cursor.fetchall()
        return jsonify(tests), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# --- Data Export Endpoints ---
@app.route('/api/patients/export/json', methods=['GET'])
def export_patients_json():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM patient")
        patients = cursor.fetchall()
        json_string = json.dumps(patients, indent=2, default=str)
        buffer = io.BytesIO(json_string.encode('utf-8'))
        buffer.seek(0)
        return send_file(
            buffer,
            as_attachment=True,
            download_name=f'patients_export_{datetime.now().strftime("%Y%m%d")}.json',
            mimetype='application/json'
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/patients/export/csv', methods=['GET'])
def export_patients_csv():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM patient")
        patients = cursor.fetchall()
        
        # Convert to CSV
        output = io.StringIO()
        if patients:
            # Write header
            output.write(','.join(patients[0].keys()) + '\n')
            # Write data
            for patient in patients:
                output.write(','.join(str(v) for v in patient.values()) + '\n')
        
        buffer = io.BytesIO(output.getvalue().encode('utf-8'))
        buffer.seek(0)
        return send_file(
            buffer,
            as_attachment=True,
            download_name=f'patients_export_{datetime.now().strftime("%Y%m%d")}.csv',
            mimetype='text/csv'
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# --- Health Check ---
@app.route('/api/health', methods=['GET'])
def health_check():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        return jsonify({"status": "healthy", "database": "connected"}), 200
    except Exception as e:
        return jsonify({"status": "unhealthy", "error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    # Make sure to set up your .env file with DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
    # e.g., DB_HOST=localhost, DB_USER=your_user, DB_PASSWORD=your_password, DB_NAME=hospital
    app.run(host='0.0.0.0', port=5000, debug=True)
