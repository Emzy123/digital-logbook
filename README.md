# Victor: SIWES Digital Logbook Management System

Welcome to the **Victor SIWES Digital Logbook** repository. This system establishes a complete digital transformation pipeline for the Student Industrial Work Experience Scheme (SIWES). It replaces the traditional physical booklets with a dynamic web application, allowing students to log daily tasks, compile weekly summaries, and receive remote evaluations from industry and school-based supervisors.

The system natively aggregates evaluations to produce the **Final ITF (Industrial Training Fund) Report PDF** required for graduation and allowance disbursement.

---

## 🛠️ Technology Stack

| Component     | Technology |
|---------------|------------|
| **Frontend**  | React 18, Vite, TypeScript, Tailwind CSS v3, React Hook Form, Recharts, HeadlessUI |
| **Backend**   | Node.js, Express, TypeScript, Mongoose, JWT, pdfmake, multer |
| **Database**  | MongoDB (v6.0+ via Docker or Local Installation) |

---

## 🚀 Running the Project Locally

To run the application locally, start the components in this order:

### 1. Database
Ensure MongoDB is running locally on port `27017` or spin up a detached MongoDB container:
```bash
docker-compose up -d mongodb
# OR if running directly:
# docker run -d -p 27017:27017 --name mongodb docker.io/library/mongo:6.0
```

### 2. Backend (Express Node.js)
The backend dynamically checks for existing tables and populates default demo data on startup.
```bash
cd backend
npm install
# Seed the database with default test users
npm run seed-users
# Start the server
npm run dev
# Running on http://localhost:5000
```
> Ensure your `backend/.env` file contains `MONGODB_URI=mongodb://localhost:27017/siwes_db` and `PORT=5000`.

### 3. Frontend (React Vite)
Open a new terminal session for the frontend UI:
```bash
cd frontend
npm install
npm run dev
# Running on http://localhost:5173/ (or the next available port like 5174)
```

---

## 🔑 Default Logins (Test Data)

The following demo accounts are created when you run `npm run seed-users`. You can use these to test the complete application lifecycle at `http://localhost:5173/login`.

### 🛡️ ITF & System Administrators
| Email | Password | Role | Access Level |
|-------|----------|------|-------------|
| `itf-admin@siwes.gov.ng` | `Itf@2024!` | ITF Admin | Full system oversight |
| `sysadmin@siwes.gov.ng` | `Admin@2024!` | System Admin | Technical administration |

### 📊 Coordinators
| Email | Password | Role | Department |
|-------|----------|------|------------|
| `coordinator@university.edu.ng` | `Coord@2024!` | Coordinator | Program management |

### 👨‍💼 Industry Supervisors
| Email | Password | Role | Company |
|-------|----------|------|---------|
| `industry.supervisor1@company.com` | `Industry@2024!` | Industry Supervisor | TechCorp Nigeria |
| `industry.supervisor2@techcorp.com` | `Industry@2024!` | Industry Supervisor | Global Engineering |

### 👩‍🏫 School Supervisors
| Email | Password | Role | Department |
|-------|----------|------|------------|
| `school.supervisor1@university.edu.ng` | `School@2024!` | School Supervisor | Computer Science |
| `school.supervisor2@university.edu.ng` | `School@2024!` | School Supervisor | Computer Science |

### 🎓 Students
| Email | Password | Matric No. | Company |
|-------|----------|------------|---------|
| `student1@university.edu.ng` | `Student@2024!` | 2024001 | TechCorp Nigeria |
| `student2@university.edu.ng` | `Student@2024!` | 2024002 | Global Engineering |
| `student3@university.edu.ng` | `Student@2024!` | 2024003 | Digital Innovations |

---

## 🏢 Test Companies

The following mock companies are seeded in the database for students and industry supervisors:

### TechCorp Nigeria Limited
- **Address**: 123 Tech Avenue, Victoria Island, Lagos
- **Industry**: Information Technology
- **Size**: 500-1000 employees

### Global Engineering Solutions
- **Address**: 456 Industrial Road, Ikeja, Lagos
- **Industry**: Engineering Services
- **Size**: 100-500 employees

### Digital Innovations Hub
- **Address**: 789 Innovation Street, Lekki, Lagos
- **Industry**: Software Development
- **Size**: 50-100 employees

---

## 💡 System Architecture & Roles

1. **Students**: 
    - Construct their profile by linking it to their designated **Placement Establishment**.
    - Log daily tasks and compile them into formal **Weekly Summaries** for supervisor sign-off.
    - Attach image/pdf evidence to logs and configure allowance details.
2. **Industry Supervisors**: 
    - Employed by the placement establishment. 
    - Review and either approve, reject, or comment on the student's **Weekly Summaries**.
    - Complete the official **ITF Form 8C** final evaluation (rating attendance, skills, conduct out of 50 points).
3. **School Supervisors**:
    - Academic staff who visit the placement locations.
    - Can log specific **Supervisor Visitation Records** internally (tracking physical presence and logbook inspection).
    - Complete the official **ITF Form 8B** final evaluation (rating logbook maintenance, technical skills, reports out of 50 points).
4. **Coordinators & Admins**: 
    - Manage the master registry of approved **Establishments** and User roles.
    - Monitor system-wide progression via the analytics dashboard.
    - Automatically aggregate the Form 8B and 8C scores to generate the **Final ITF Evaluation PDF Report** out of 100 points for industrial clearance.

---

## 🧪 Testing Scenarios

Use the default logins to explore the following workflows:

### 1. Student Workflow
1. **Login**: `student1@university.edu.ng` / `Student@2024!`
2. **Create Log Entry**: Add daily work activities
3. **Upload Evidence**: Attach photos/documents
4. **Submit for Review**: Send to industry supervisor
5. **Track Progress**: Monitor approval status

### 2. Industry Supervisor Workflow
1. **Login**: `industry.supervisor1@company.com` / `Industry@2024!`
2. **Review Submissions**: Check pending log entries
3. **Provide Feedback**: Add comments and approve/reject
4. **Assess Performance**: Complete student assessments
5. **Generate Reports**: View student analytics

### 3. School Supervisor Workflow
1. **Login**: `school.supervisor1@university.edu.ng` / `School@2024!`
2. **Monitor Students**: View cross-company progress
3. **Virtual Visits**: Conduct remote supervision
4. **Grade Assessments**: Review and grade student work

### 4. Coordinator Workflow
1. **Login**: `coordinator@university.edu.ng` / `Coord@2024!`
2. **Manage Assignments**: Assign supervisors to students
3. **Monitor Progress**: Track overall program status

### 5. ITF/Admin Workflow
1. **Login**: `itf-admin@siwes.gov.ng` / `Itf@2024!`
2. **System Oversight**: Monitor national statistics
3. **Compliance Checks**: Verify data integrity

---

## 🚨 Troubleshooting

- **Login Problems**: Ensure you've run `npm run seed-users` in the `backend/` directory so the test accounts are created.
- **Database Errors**: Verify MongoDB is running and `MONGODB_URI` is correctly pointing to `siwes_db`.
- **CORS Errors**: If the frontend starts on a port other than `5173` or `5174`, make sure the backend `app.use(cors({...}))` is configured to allow it.

To completely reset the system:
```bash
cd backend
npm run reset-test-data
npm run seed-users
```
