# SIWES Digital Logbook - Default Login Credentials

## 🚀 Quick Start Guide

### 📋 Login Credentials

#### 🛡️ ITF & System Administrators
| Email | Password | Role | Access Level |
|-------|----------|------|-------------|
| `itf-admin@siwes.gov.ng` | `Itf@2024!` | ITF Admin | Full system oversight |
| `sysadmin@siwes.gov.ng` | `Admin@2024!` | System Admin | Technical administration |

#### 📊 Coordinators
| Email | Password | Role | Department |
|-------|----------|------|------------|
| `coordinator@university.edu.ng` | `Coord@2024!` | Coordinator | Program management |

#### 👨‍💼 Industry Supervisors
| Email | Password | Role | Company |
|-------|----------|------|---------|
| `industry.supervisor1@company.com` | `Industry@2024!` | Industry Supervisor | TechCorp Nigeria |
| `industry.supervisor2@techcorp.com` | `Industry@2024!` | Industry Supervisor | Global Engineering |

#### 👩‍🏫 School Supervisors
| Email | Password | Role | Department |
|-------|----------|------|------------|
| `school.supervisor1@university.edu.ng` | `School@2024!` | School Supervisor | Computer Science |
| `school.supervisor2@university.edu.ng` | `School@2024!` | School Supervisor | Computer Science |

#### 🎓 Students
| Email | Password | Matric No. | Company |
|-------|----------|------------|---------|
| `student1@university.edu.ng` | `Student@2024!` | 2024001 | TechCorp Nigeria |
| `student2@university.edu.ng` | `Student@2024!` | 2024002 | Global Engineering |
| `student3@university.edu.ng` | `Student@2024!` | 2024003 | Digital Innovations |

---

## 🏢 Test Companies

### TechCorp Nigeria Limited
- **Address**: 123 Tech Avenue, Victoria Island, Lagos
- **Industry**: Information Technology
- **Size**: 500-1000 employees
- **Supervisor**: James Williams

### Global Engineering Solutions
- **Address**: 456 Industrial Road, Ikeja, Lagos
- **Industry**: Engineering Services
- **Size**: 100-500 employees
- **Supervisor**: Fatima Aliyu

### Digital Innovations Hub
- **Address**: 789 Innovation Street, Lekki, Lagos
- **Industry**: Software Development
- **Size**: 50-100 employees
- **Supervisor**: Available for assignment

---

## 🧪 Testing Scenarios

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
5. **Weekly Reports**: Generate summary reports

### 4. Coordinator Workflow
1. **Login**: `coordinator@university.edu.ng` / `Coord@2024!`
2. **Manage Assignments**: Assign supervisors to students
3. **Monitor Progress**: Track overall program status
4. **Handle Issues**: Address problems and concerns
5. **Generate Reports**: Create institutional reports

### 5. ITF/Admin Workflow
1. **Login**: `itf-admin@siwes.gov.ng` / `Itf@2024!`
2. **System Oversight**: Monitor national statistics
3. **Compliance Checks**: Verify data integrity
4. **Policy Analysis**: Review trends and analytics
5. **Export Data**: Generate government reports

---

## 🔧 Setup Instructions

### 1. Create Default Users
```bash
cd backend
npm run seed-users
```

### 2. Start Backend Server
```bash
npm run dev
```

### 3. Start Frontend Application
```bash
cd ../frontend
npm run dev
```

### 4. Access Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api-docs

---

## 📱 Mobile Testing

The application is fully responsive and works on mobile devices. Test with:
- **iOS Safari**: iPhone/iPad testing
- **Android Chrome**: Mobile browser testing
- **Responsive Design**: Various screen sizes

---

## 🔍 Key Features to Test

### ✅ Authentication & Authorization
- [ ] Login with different user roles
- [ ] Role-based access control
- [ ] Session management
- [ ] Password security

### ✅ Student Functionality
- [ ] Daily log entry creation
- [ ] Photo/document upload
- [ ] Submission workflow
- [ ] Progress tracking

### ✅ Supervisor Functionality
- [ ] Log review and approval
- [ ] Comment and feedback system
- [ ] Assessment completion
- [ ] Analytics and reporting

### ✅ Coordinator Functionality
- [ ] Student assignment management
- [ ] Progress monitoring
- [ ] Report generation
- [ ] Issue resolution

### ✅ ITF/Admin Functionality
- [ ] System oversight
- [ ] National statistics
- [ ] Data export
- [ ] Compliance monitoring

### ✅ Digital Record Keeping
- [ ] Encrypted storage
- [ ] Advanced search
- [ ] Audit trails
- [ ] Data integrity

---

## 🚨 Troubleshooting

### Common Issues
1. **Login Problems**: Check email/password combinations
2. **Database Errors**: Ensure MongoDB is running
3. **Permission Issues**: Verify user roles and assignments
4. **File Upload**: Check file size and format limits

### Reset Instructions
```bash
# Clear all test data and recreate
cd backend
npm run reset-test-data
npm run seed-users
```

---

## 📞 Support

For testing issues:
1. Check console errors in browser
2. Verify backend server is running
3. Ensure database connection is active
4. Review API response codes

---

**Happy Testing! 🎉**
