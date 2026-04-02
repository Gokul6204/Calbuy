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
