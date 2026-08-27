# UPSA Final Year Project Management System

A centralized web application for managing final year project submissions at the University of
Professional Studies, Accra (UPSA), replacing unstructured, ad hoc submission processes.

Built from the project's Master Technical Blueprint as a Laravel API + React SPA monorepo.

## Stack

- **Backend:** Laravel 13, Sanctum (API tokens), MySQL, Laravel Excel, Pest PHP
- **Frontend:** React 19, React Router, Tailwind CSS v4, Vite, Axios

## Structure

```
backend/    Laravel REST API (auth, business logic, database)
frontend/   React + Tailwind SPA (consumes the API)
```

## Core Features

- **Dual-authentication gateway** — students sign in with their Index Number, staff with their
  official email, from a single login form.
- **Admin CSV import** — bulk-onboard students (Name, Index Number, Email, DOB); each student's
  hashed date of birth (`YYYYMMDD`) becomes their initial password, with a forced password change
  on first login.
- **Student pipeline** — a group leader creates a project draft, adds members by Index Number
  (group membership is exclusive — one student can only belong to one group), and submits for
  review.
- **Admin pipeline** — analytics dashboard, manual assessor assignment, full Project → Members →
  Assessor data export to Excel, login audit trail, and a support ticketing system.
- **Assessor pipeline** — review assigned projects and either approve or send back for refinement
  with mandatory feedback.
- **Role-based access control** — `IsAdmin`, `IsAssessor`, `IsStudent` middleware guard every API
  route; the frontend mirrors this with per-role protected routes.

## Getting Started

### Backend

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
# create a MySQL database matching .env, then:
php artisan migrate --seed
php artisan serve
```

The seeder creates a default admin (`admin@upsa.edu.gh`) and assessor (`j.ofoeda@upsa.edu.gh`),
both with password `password`. Change these before deploying.

Run the test suite:

```bash
php artisan test
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

By default the frontend expects the API at `http://localhost:8000/api` (see `VITE_API_URL` in
`frontend/.env`) and the backend expects the frontend at `http://localhost:5173` for CORS (see
`FRONTEND_URL` in `backend/.env`).

## Database Schema

See the blueprint's entity schema for full details. Core tables: `users` (role-based: admin,
assessor, student), `projects`, `project_student` (pivot, one student per project), `login_logs`
(audit trail), `complaints` (support tickets).
