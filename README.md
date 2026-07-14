# Django + React Task App

A small full-stack task list with a Django REST API and a React TypeScript frontend. Django stores tasks in SQLite; Vite serves the frontend and proxies `/api` requests to Django during local development.

## Requirements

- Python 3.14
- Node.js 22.12 or newer
- npm

## First-time setup

Run these commands from the repository root in PowerShell:

```powershell
py -3.14 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
python backend\manage.py migrate

Set-Location frontend
npm install
Set-Location ..
```

The backend has safe local defaults, so environment variables are optional for development. `backend/.env.example` documents the available Django settings. To override one for the current PowerShell session:

```powershell
$env:DJANGO_SECRET_KEY = "your-local-secret"
$env:DJANGO_DEBUG = "true"
$env:DJANGO_ALLOWED_HOSTS = "localhost,127.0.0.1,testserver"
```

Vite uses `/api` by default. To override it, copy `frontend/.env.example` to `frontend/.env.local` and change `VITE_API_BASE_URL`.

## Run locally

Start Django in the first PowerShell window:

```powershell
.\.venv\Scripts\Activate.ps1
python backend\manage.py runserver 8000
```

Start React in a second PowerShell window:

```powershell
Set-Location frontend
npm run dev
```

Open <http://localhost:5173>. Vite forwards `/api` requests to Django at <http://127.0.0.1:8000>, so no CORS configuration is needed for this development workflow.

## Bruno API collection

Open the `bruno` directory in the Bruno desktop app and select the `Local` environment. Start Django on port 8000 before sending requests.

Each request is standalone. Send **Create Task**, copy the returned `id`, and set `taskId` in `bruno/environments/Local.bru` before using the retrieve, update, or delete requests. The final two requests demonstrate the API's blank-title and 200-character title-limit validation.

## Django admin

Create an administrator:

```powershell
.\.venv\Scripts\Activate.ps1
python backend\manage.py createsuperuser
```

With Django running, open <http://127.0.0.1:8000/admin/>. Tasks are registered with searchable titles and a completion filter.

## Tests and checks

Backend:

```powershell
.\.venv\Scripts\Activate.ps1
python backend\manage.py check
python backend\manage.py test tasks
python backend\manage.py makemigrations --check --dry-run
```

Frontend:

```powershell
Set-Location frontend
npm test
npm run lint
npm run build
```

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/tasks/` | List tasks newest-first |
| `POST` | `/api/tasks/` | Create a task from `{ "title": "..." }` |
| `GET` | `/api/tasks/{id}/` | Retrieve one task |
| `PATCH` | `/api/tasks/{id}/` | Update fields such as `{ "completed": true }` |
| `DELETE` | `/api/tasks/{id}/` | Delete a task |

A task response has this shape:

```json
{
  "id": 1,
  "title": "Ship the starter",
  "completed": false,
  "created_at": "2026-07-14T10:00:00Z"
}
```

Validation failures use Django REST Framework field errors, for example:

```json
{
  "title": ["This field may not be blank."]
}
```

## Project layout

```text
backend/
  config/       Django settings and root URLs
  tasks/        Task model, API, admin, migration, and tests
frontend/
  src/          React components, API client, styles, and tests
bruno/
  Tasks/        Standalone task CRUD and validation requests
  environments/ Bruno environment variables for local development
```
