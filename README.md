# DistribuTrack

DistribuTrack is a Distributor & Delivery Management Platform—a comprehensive SaaS application for managing products, inventory, warehouse stock, customer orders, delivery workers, invoices, payments, analytics, reports, and notifications.

---

## 🛠️ Native Architecture (No Docker Required)

For local development, the stack runs natively on Windows:

```
                  ┌──────────────────────┐
                  │   React / Vite       │
                  │   http://localhost:5173  │
                  └──────────┬───────────┘
                             │
                             ▼ (API calls)
                  ┌──────────────────────┐
                  │   Spring Boot REST   │
                  │   http://localhost:8080  │
                  └──────────┬───────────┘
                             │
                             ▼ (JDBC connection)
                  ┌──────────────────────┐
                  │   MySQL Database     │
                  │   localhost:3306     │
                  └──────────────────────┘
```

---

## 📋 Prerequisites

Ensure you have the following installed on your machine:

1. **Java Development Kit (JDK) 21**
2. **Apache Maven 3.9+**
3. **Node.js (v20+) & npm**
4. **MySQL Server 8.0+** running locally on port `3306`.

---

## 🚀 Quick Start Instructions

Follow these steps to run the application locally:

### Step 1: Start MySQL & Prepare Database
1. Make sure your local MySQL server is running on port `3306`.
2. Connect to your MySQL server and ensure the database exists:
   ```sql
   CREATE DATABASE IF NOT EXISTS distributrack_db;
   ```
3. Set the database environment variables if they differ from the defaults (Username: `root`, Password: `123456`). You can do this by setting environment variables (`DB_USERNAME`, `DB_PASSWORD`) or by uncommenting and editing `backend/src/main/resources/application-local.properties`.

### Step 2: Run Backend (Spring Boot)
1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Build and run the backend using Maven:
   ```bash
   mvn spring-boot:run
   ```
   Alternatively, you can load the project in IntelliJ IDEA and run the `BackendApplication` class.
3. The backend API is active at: `http://localhost:8080`

### Step 3: Run Frontend (React + Vite)
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. The frontend application is active at: `http://localhost:5173`

---

## 🛡️ Role-Based Authentication Accounts
To register or perform first-time setup, use the setup service API or the UI. The application supports role-based access for the following roles:
- `SUPER_ADMIN`
- `OWNER`
- `MANAGER`
- `SALESMAN`
- `DELIVERY_BOY`
- `SHOPKEEPER`
