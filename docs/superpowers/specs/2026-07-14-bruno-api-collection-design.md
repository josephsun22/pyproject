# Bruno API Collection Design

## Goal

Add a native Bruno collection that lets developers manually exercise every public task API operation against the local Django server.

## Structure

- Store the collection in `bruno/` at the repository root.
- Add a `Local` environment with `baseUrl=http://127.0.0.1:8000` and an editable `taskId=1`.
- Organize requests under a `Tasks` folder in this order: list, create, retrieve, update, delete, blank-title validation, and oversized-title validation.

## Request Behavior

- Each request is standalone and uses only `baseUrl` and, for detail routes, `taskId`.
- Create sends `{ "title": "Try the Bruno collection" }`.
- Update sends `{ "completed": true }` with `PATCH`.
- Validation examples send a blank title and a 201-character title.
- Do not add scripts, request chaining, authentication, or automated assertions.

## Documentation and Verification

- Extend the root README with instructions for opening `bruno/`, selecting `Local`, starting Django, and manually updating `taskId` after creating a task.
- Verify the collection file structure and syntax. If Bruno CLI is unavailable locally, document that limitation and validate the requests against the live Django API using equivalent HTTP calls.
