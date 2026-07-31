# EduBot Student Academic System – Complete API Documentation

Comprehensive REST API Specification for Authentication, Student CRUD, Academic Management, Analytics, AI Prediction, Reports, Notifications, User Profiles, System Settings, Audit Logs, Global Search, Backup, and Health Monitoring.

---

## Base URL
```
Development: http://localhost:5000/api
Production:  https://your-domain.onrender.com/api
```

## Authentication Header
All protected endpoints require the HTTP Authorization header:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## 1. Authentication APIs (`/api/auth`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Admin / Public Bootstrap | Register Admin (if bootstrap) or Faculty/Student account |
| `POST` | `/api/auth/login` | Public | Authenticate user and receive JWT token + user details |
| `GET` | `/api/auth/profile` | Authenticated | Retrieve profile of logged-in user |
| `POST` | `/api/auth/logout` | Authenticated | Log out current user session |
| `POST` | `/api/auth/forgot-password` | Public | Request password reset token via email |
| `POST` | `/api/auth/reset-password` | Public | Reset password using valid token |

---

## 2. Health Monitoring APIs (`/api/health`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/health` | Public | Server uptime, status, DB connection, and memory usage |
| `GET` | `/health` | Public | Alias health check endpoint |

---

## 3. Student CRUD APIs (`/api/students`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/students` | Admin, Faculty | Retrieve list of students (filtered by dept for faculty) |
| `POST` | `/api/students` | Admin | Add new student record |
| `GET` | `/api/students/:id` | Admin, Faculty, Student | Get specific student details |
| `PUT` | `/api/students/:id` | Admin, Faculty | Update student record (Faculty can update marks) |
| `DELETE` | `/api/students/:id` | Admin | Delete student record |

---

## 4. Academic Data Management APIs (`/api/academic`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/academic/subjects` | Admin, Faculty, Student | List all subjects |
| `POST` | `/api/academic/subjects` | Admin | Add new subject |
| `PUT` | `/api/academic/subjects/:id` | Admin | Update subject |
| `DELETE` | `/api/academic/subjects/:id` | Admin | Delete subject |
| `GET` | `/api/academic/attendance` | Admin, Faculty, Student | Fetch attendance records |
| `POST` | `/api/academic/attendance/bulk` | Faculty | Mark bulk class attendance |
| `GET` | `/api/academic/assignments` | Admin, Faculty, Student | Fetch assignment marks |
| `POST` | `/api/academic/assignments` | Faculty | Submit assignment marks |

---

## 5. Performance Analytics APIs (`/api/analytics`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/analytics/admin` | Admin, Faculty | College KPI summary, dept & subject pass rates, Top/Bottom 10 |
| `GET` | `/api/analytics/faculty` | Admin, Faculty | Faculty Performance Evaluation score (out of 100) & metrics |
| `GET` | `/api/analytics/student` | Admin, Faculty, Student | Personal student analytics (CGPA, rank, attendance %, strengths) |
| `GET` | `/api/analytics/reports` | Admin, Faculty | Filterable performance reports generator |

---

## 6. AI Prediction APIs (`/api/prediction`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/prediction/all` | Admin, Faculty | AI risk level predictions for all students |
| `GET` | `/api/prediction/student` | Admin, Faculty, Student | Personal expected CGPA, pass probability, and recommendations |
| `GET` | `/api/prediction/faculty-insights` | Admin, Faculty | Faculty class risk breakdown & attendance trends |

---

## 7. Reports & Export APIs (`/api/reports`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/reports/generate` | Admin, Faculty | Generate structured report datasets for Excel/CSV and PDF exports |

---

## 8. Notifications APIs (`/api/notifications`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/notifications` | All Roles | Retrieve user inbox notifications and unread count |
| `POST` | `/api/notifications/send` | Admin, Faculty | Broadcast announcements or send class notifications |
| `PUT` | `/api/notifications/:id/read` | All Roles | Mark notification as read |
| `POST` | `/api/notifications/auto-alerts` | Admin | Trigger automated low attendance & performance alerts |

---

## 9. NLQ Chatbot APIs (`/api/chat`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/chat/message` | All Roles | Send natural language question in English, Tamil, or Tanglish |

---

## 10. System Management APIs (`/api/profile`, `/api/settings`, `/api/audit`, `/api/search`, `/api/backup`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/profile` | All Roles | View user profile details |
| `PUT` | `/api/profile/update` | All Roles | Update profile details and phone/address |
| `PUT` | `/api/profile/password` | All Roles | Change password |
| `GET` | `/api/settings` | All Roles | Retrieve system settings |
| `PUT` | `/api/settings` | Admin | Update system configuration settings |
| `GET` | `/api/audit/logs` | All Roles | Retrieve audit activity logs |
| `GET` | `/api/audit/activity` | All Roles | Retrieve real-time activity feed |
| `GET` | `/api/search` | All Roles | Instant cross-collection global search |
| `GET` | `/api/backup/export` | Admin | Download JSON database backup |
| `POST` | `/api/backup/import` | Admin | Restore database state from JSON backup |
