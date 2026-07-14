# Bruno API Collection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a standalone Bruno collection for manually exercising every Django task API endpoint and validation case.

**Architecture:** A repository-root `bruno/` collection uses one checked-in `Local` environment for the API base URL and editable task ID. Each `.bru` request is independent: no scripts, chaining, authentication, or assertions.

**Tech Stack:** Bruno Bru Lang, JSON, Django REST Framework API, PowerShell verification

---

### Task 1: Create the Bruno collection

**Files:**
- Create: `bruno/bruno.json`
- Create: `bruno/environments/Local.bru`
- Create: `bruno/Tasks/folder.bru`
- Create: `bruno/Tasks/01 List Tasks.bru`
- Create: `bruno/Tasks/02 Create Task.bru`
- Create: `bruno/Tasks/03 Retrieve Task.bru`
- Create: `bruno/Tasks/04 Update Task.bru`
- Create: `bruno/Tasks/05 Delete Task.bru`
- Create: `bruno/Tasks/06 Validate Blank Title.bru`
- Create: `bruno/Tasks/07 Validate Oversized Title.bru`

- [ ] **Step 1: Create the collection manifest and environment**

```json
{
  "version": "1",
  "name": "Django React Task API",
  "type": "collection",
  "ignore": ["node_modules", ".git"]
}
```

```bru
vars {
  baseUrl: http://127.0.0.1:8000
  taskId: 1
}
```

- [ ] **Step 2: Create the Tasks folder metadata**

```bru
meta {
  name: Tasks
  seq: 1
}
```

- [ ] **Step 3: Create the list and create requests**

```bru
meta {
  name: List Tasks
  type: http
  seq: 1
}

get {
  url: {{baseUrl}}/api/tasks/
  body: none
  auth: none
}

headers {
  Accept: application/json
}
```

```bru
meta {
  name: Create Task
  type: http
  seq: 2
}

post {
  url: {{baseUrl}}/api/tasks/
  body: json
  auth: none
}

headers {
  Accept: application/json
  Content-Type: application/json
}

body:json {
  {
    "title": "Try the Bruno collection"
  }
}
```

- [ ] **Step 4: Create the retrieve, update, and delete requests**

```bru
meta {
  name: Retrieve Task
  type: http
  seq: 3
}

get {
  url: {{baseUrl}}/api/tasks/{{taskId}}/
  body: none
  auth: none
}

headers {
  Accept: application/json
}
```

```bru
meta {
  name: Update Task
  type: http
  seq: 4
}

patch {
  url: {{baseUrl}}/api/tasks/{{taskId}}/
  body: json
  auth: none
}

headers {
  Accept: application/json
  Content-Type: application/json
}

body:json {
  {
    "completed": true
  }
}
```

```bru
meta {
  name: Delete Task
  type: http
  seq: 5
}

delete {
  url: {{baseUrl}}/api/tasks/{{taskId}}/
  body: none
  auth: none
}

headers {
  Accept: application/json
}
```

- [ ] **Step 5: Create the validation examples**

```bru
meta {
  name: Validate Blank Title
  type: http
  seq: 6
}

post {
  url: {{baseUrl}}/api/tasks/
  body: json
  auth: none
}

headers {
  Accept: application/json
  Content-Type: application/json
}

body:json {
  {
    "title": ""
  }
}
```

```bru
meta {
  name: Validate Oversized Title
  type: http
  seq: 7
}

post {
  url: {{baseUrl}}/api/tasks/
  body: json
  auth: none
}

headers {
  Accept: application/json
  Content-Type: application/json
}

body:json {
  {
    "title": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  }
}
```

- [ ] **Step 6: Verify the collection structure and content**

Run:

```powershell
Get-ChildItem bruno -Recurse -File
Get-Content bruno\bruno.json -Raw | ConvertFrom-Json
rg -n "baseUrl|taskId|meta \{|body:json|auth: none" bruno
```

Expected: ten collection files are present, the manifest parses as JSON, sequences 1–7 are unique, and all requests use environment variables rather than hardcoded detail IDs.

- [ ] **Step 7: Commit the collection**

```powershell
git add bruno
git commit -m "feat: add Bruno task API collection"
```

### Task 2: Document and validate the collection

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add Bruno usage documentation**

Add a `## Bruno API collection` section explaining:

```markdown
## Bruno API collection

Open the `bruno` directory in the Bruno desktop app and select the `Local` environment. Start Django on port 8000 before sending requests.

The requests are standalone. Send **Create Task**, copy the returned `id`, and update `taskId` in `bruno/environments/Local.bru` before using retrieve, update, or delete. The final two requests demonstrate the API's blank-title and 200-character limit validation.
```

- [ ] **Step 2: Validate equivalent live HTTP behavior**

Start Django with:

```powershell
.\.venv\Scripts\python.exe backend\manage.py migrate
.\.venv\Scripts\python.exe backend\manage.py runserver 127.0.0.1:8000 --noreload
```

Use `Invoke-RestMethod` to verify list returns `200`, create returns a task, retrieve returns that ID, patch sets `completed` to true, delete returns `204`, and both invalid POST bodies return `400`. Delete any verification record before stopping Django.

- [ ] **Step 3: Run repository checks**

```powershell
.\.venv\Scripts\python.exe backend\manage.py check
.\.venv\Scripts\python.exe backend\manage.py test
git diff --check
```

Expected: Django reports no issues, all seven backend tests pass, and Git reports no whitespace errors.

- [ ] **Step 4: Commit documentation**

```powershell
git add README.md docs/superpowers/plans/2026-07-14-bruno-api-collection.md
git commit -m "docs: explain Bruno collection workflow"
```
