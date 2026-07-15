# TanStack Query Integration Design

## Goal

Replace manual server-state management in the React task app with TanStack Query (`@tanstack/react-query`), while keeping the existing fetch helpers and UI behavior.

## Decisions

- Full CRUD: `useQuery` for listing tasks; `useMutation` for create, toggle, and delete.
- After each successful mutation, invalidate the tasks query so the list refetches from the server.
- Wire Query usage directly in `App.tsx`; add `QueryClientProvider` in `main.tsx`.
- Keep `api.ts` as the plain fetch layer (`listTasks`, `createTask`, `updateTask`, `deleteTask`, `ApiError`).

## Architecture

- Install `@tanstack/react-query`.
- Create a `QueryClient` in `main.tsx` and wrap the app with `QueryClientProvider`.
- Use a stable query key: `['tasks']`.
- Remove from `App` the manual `tasks`, `loadState`, `load`, `isCreating`, and `pendingTaskIds` server-state plumbing driven by `useState` / `useEffect`.
- Keep local UI state in `App`: `title`, `titleError`, and `actionError`.

## Data Flow

1. `useQuery({ queryKey: ['tasks'], queryFn: listTasks })` provides loading, error, retry, and task data.
2. Create / toggle / delete call the existing API functions via `useMutation`.
3. Each mutation `onSuccess` runs `queryClient.invalidateQueries({ queryKey: ['tasks'] })`.
4. Form field and user-facing action messages remain local React state.

## Pending and Error Behavior

- Creating: use the create mutation’s `isPending`.
- Per-task pending: derive from update/delete mutation `isPending` and `variables` so the active row stays disabled (same UX as today’s `pendingTaskIds`).
- Load failure: use query `isError` and `refetch` for the Retry button.
- Mutation failures: keep existing messages; map `ApiError.fieldErrors.title` for create validation errors.

## Out of Scope

- Optimistic updates
- React Query Devtools
- Extracting hooks or a feature folder
- Django API or response-shape changes

## Verification

- Existing Vitest / Testing Library coverage still passes, updated as needed for QueryClient wrapping.
- Manual check: list loads; create/toggle/delete refresh the list via invalidation; load and mutation errors still surface clearly.
