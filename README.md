# Calby Procurement – BOM Upload

Web application to upload and store Bill of Materials (BOM) from XLSX, CSV, and PDF files. Data is stored in MySQL with columns: **bom_id**, **material**, **quantity**, **date of requirement**.

## Tech stack

- **Frontend:** React 18 + Vite (JSX)
- **Backend:** Python Django + Django REST Framework
- **Database:** MySQL

## Prerequisites

- Node.js 18+ and npm
- Python 3.10+
- MySQL 8 (or compatible) with database `Calby_procurement` created

### Create MySQL database

```sql
CREATE DATABASE Calby_procurement CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Credentials used by the app (configured in `backend/Calby_procurement/settings.py`):

- **User:** root  
- **Password:** Caldim@2026  
- **Database:** Calby_procurement  
- **Host:** 127.0.0.1  
- **Port:** 3306  

## Backend setup

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
# source venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

API runs at **http://127.0.0.1:8000**.  
Endpoints:

- `GET /api/bom/` – list all BOM rows (optional query: `?bom_id=...&material=...`)
- `POST /api/bom/upload/` – upload file (form field: `file`); accepts `.xlsx`, `.xls`, `.csv`, `.pdf`

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

App runs at **http://localhost:5173**.  
Vite proxies `/api` to the Django backend, so both can run locally without CORS issues.

## Usage

1. Start MySQL and ensure `Calby_procurement` exists.
2. Start Django: `cd backend && python manage.py runserver`.
3. Start Vite: `cd frontend && npm run dev`.
4. Open http://localhost:5173, choose a BOM file (XLSX, CSV, or PDF), and click **Upload**.
5. View stored BOM data in the table below.

## File format notes

- **XLSX/XLS:** First row is treated as headers. Supported column names (case-insensitive):  
  BOM ID (or “bom”, “part no”, “item”), Material (or “description”, “part”), Quantity (or “qty”), Date of requirement (or “requirement date”, “due date”).
- **CSV:** Same header logic; UTF-8 or Latin-1.
- **PDF:** Tables are extracted with `pdfplumber`; column mapping follows the same logic where possible.

## Project structure

```
Calby(1)/
├── backend/
│   ├── Calby_procurement/   # Django project settings
│   ├── bom/                 # BOM app (models, parsers, API)
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/             # API client
│   │   ├── components/      # BOMUpload, BOMTable
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Security note

The default Django `SECRET_KEY` and DB password are for development. For production, use environment variables and a strong secret key.

## Hosting & Deployment

This project is configured for deployment using **Vercel** (Frontend), **Render** (Backend), and **Supabase** (Database).

### 1. Database (Supabase)
1. Create a new project on [Supabase](https://supabase.com/).
2. Go to **Project Settings > Database** and copy the **Connection string** (URI).
3. It should look like `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`.

### 2. Backend (Render)
1. Create a new **Web Service** on [Render](https://render.com/).
2. Connect your GitHub repository.
3. Set the **Root Directory** to `backend`.
4. **Environment Variables**:
   - `DATABASE_URL`: Your Supabase connection string.
   - `DJANGO_SETTINGS_MODULE`: `Calbuy_procurement.settings`
   - `SECRET_KEY`: A random long string.
   - `ALLOWED_HOSTS`: `your-app-name.onrender.com`
   - `PYTHON_VERSION`: `3.10.0` (or your preferred version)
5. **Build Command**: `./build.sh`
6. **Start Command**: `daphne -b 0.0.0.0 -p $PORT Calbuy_procurement.asgi:application`
   - *Note: Using Daphne for both HTTP and WebSockets.*

### 3. Frontend (Vercel)
1. Create a new project on [Vercel](https://vercel.com/).
2. Connect your GitHub repository.
3. Set the **Root Directory** to `frontend`.
4. **Environment Variables**:
   - `VITE_API_URL`: `https://your-app-name.onrender.com` (Your Render URL)
5. Vercel will automatically detect Vite and build the project.
