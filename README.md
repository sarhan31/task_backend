# Premium Task Management System Backend

This is the backend API engine for the Task Management System built using Express.js, MongoDB, and Node.js. It features JWT session authentication, password hashing, role-based access control, file attachment handling with Multer, and integrated Cloudinary storage.

---

## 🛠️ Stack & Technologies

* **Runtime:** Node.js
* **Framework:** Express.js (v4)
* **Database:** MongoDB & Mongoose
* **Auth:** JSON Web Tokens (JWT) & bcryptjs
* **File Uploads:** Multer (local fallback uploads folder)
* **Cloud Storage:** Cloudinary
* **Security:** Helmet, CORS

---

## 📂 Backend Structure

```
backend/
├── config/
│   ├── db.js            # MongoDB connection settings
│   └── cloudinary.js    # Cloudinary API settings
├── controllers/
│   ├── authController.js # Handles sessions, registrations & profiles
│   ├── taskController.js # Task CRUD operations, status, attachments
│   └── userController.js # Team rosters, user profiles & analytics metrics
├── middleware/
│   ├── authMiddleware.js   # JWT authentication parser
│   ├── roleMiddleware.js   # Role-based request authorization filter
│   ├── uploadMiddleware.js # Multer multipart upload rules
│   └── errorMiddleware.js  # Global Express catchers
├── models/
│   ├── User.js          # Mongoose schema for user logins
│   └── Task.js          # Mongoose schema for task parameters
├── routes/
│   ├── authRoutes.js    # Authentication pathways
│   ├── taskRoutes.js    # Task operations
│   ├── userRoutes.js    # Roster queries
│   └── analyticsRoutes.js# Dashboard statistics and reports pathways
├── utils/
│   ├── generateToken.js  # Sign user authorization token
│   └── helpers.js        # Sizing and validation utility functions
├── uploads/              # Local storage uploads folder (Created automatically)
├── .env                  # Environment configuration keys
├── server.js             # Main server entrypoint
└── package.json          # Node dependencies checklist
```

---

## 🚀 Setup & Launch Directions

### 1. Install Dependencies

Navigate into the backend directory and download dependencies:

```bash
cd backend
npm install
```

### 2. Configure Environment Keys

Create a file named `.env` in the `backend/` root directory (template copied below):

```ini
PORT=5000
MONGODB_URI=mongodb://localhost:27017/taskmanager
JWT_SECRET=super_secret_key_antigravity_task_manager_314159
NODE_ENV=development

# Cloudinary Setup for File Attachments (Optional, falls back to local uploads if omitted)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### 3. Start Database Service

Ensure you have a MongoDB instance running locally on `mongodb://localhost:27017` or use an external cluster URI in `.env`.

### 4. Start API Server

Run the development command (utilizing `nodemon` for auto-reloading):

```bash
npm run dev
```

The terminal should output:
```
[Database] MongoDB Connected: localhost
[Server] running in development mode on port 5000
```

---

## 📖 API Documentation Reference

All routes are prefixed with `/api`.

### 🔐 Authentication (`/api/auth`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| **POST** | `/auth/register` | Public | Register new user. Returns JWT and user profile. |
| **POST** | `/auth/login` | Public | Log in existing user. Returns JWT and user profile. |
| **POST** | `/auth/logout` | Protected | Success stub to trigger client-side token discard. |
| **GET** | `/auth/verify` | Protected | Verify active session. Returns authenticated profile. |
| **POST** | `/auth/forgot-password` | Public | Requests a password reset token. |
| **POST** | `/auth/reset-password` | Public | Resets password using the generated token. |
| **PUT** | `/auth/profile` | Protected | Updates authenticated user profile details. |

### 📝 Tasks (`/api/tasks`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| **GET** | `/tasks` | Protected | List tasks (standard user sees assigned/created, admin sees all). Supports query params for filter. |
| **GET** | `/tasks/:id` | Protected | Retrieve specific task details by ID. |
| **POST** | `/tasks` | Protected | Create a new task. |
| **PUT** | `/tasks/:id` | Protected | Update task details (creator or admin only). |
| **DELETE** | `/tasks/:id` | Protected | Delete task (creator or admin only). |
| **PATCH** | `/tasks/:id/status` | Protected | Update status and/or progress (assigned user or creator). |
| **POST** | `/tasks/:id/attachments` | Protected | Upload file attachment to task (Multer / Cloudinary). |
| **DELETE** | `/tasks/:id/attachments/:attachmentId` | Protected | Remove file attachment from task. |

### 👥 Users (`/api/users`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| **GET** | `/users` | Protected/Admin | Get all registered users list. Supports query search. |
| **GET** | `/users/:id` | Protected | Retrieve individual user profile by ID. |
| **POST** | `/users` | Protected/Admin | Create user manually (Admin control). |
| **PUT** | `/users/:id` | Protected/Admin | Update user details (Admin control). |
| **DELETE** | `/users/:id` | Protected/Admin | Delete user and auto-clean task assignments (Admin control). |
| **PATCH** | `/users/:id/role` | Protected/Admin | Modify role (`'user'`, `'premium'`, `'ultra'`, `'admin'`). |
| **GET** | `/users/:id/stats` | Protected | Fetch aggregate task counts and average progress for a user. |

### 📊 Analytics & Reporting (`/api/analytics`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| **GET** | `/analytics/dashboard` | Protected | Returns aggregate counts, completion rates and activity logs. |
| **GET** | `/analytics/tasks` | Protected | Returns monthly task metrics dataset for Recharts rendering. |
| **GET** | `/analytics/users` | Protected | Returns contributor list with efficiency indexes. |
| **GET** | `/analytics/reports` | Protected/Admin | Gathers global tasks lists for report screens. |
| **GET** | `/analytics/export` | Protected/Admin | Exports matching records as pdf/csv binary blob. |
