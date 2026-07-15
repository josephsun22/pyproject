# TanStack Query Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace manual server-state in the React task app with TanStack Query while preserving current UI behavior.

**Architecture:** Keep `api.ts` as plain fetch helpers. Add `QueryClientProvider` in `main.tsx`. Drive list + CRUD from `useQuery` / `useMutation` in `App.tsx`, invalidating `['tasks']` after successful mutations. Update tests to wrap with a QueryClient that disables retries and to account for post-mutation refetches.

**Tech Stack:** React 19, Vite, Vitest, Testing Library, `@tanstack/react-query`

---

## File Structure

| File | Responsibility |
|------|----------------|
| `frontend/package.json` | Add `@tanstack/react-query` dependency |
| `frontend/src/main.tsx` | Create `QueryClient`, wrap app with `QueryClientProvider` |
| `frontend/src/App.tsx` | `useQuery` + three `useMutation`s; local form/error UI state only |
| `frontend/src/api.ts` | Unchanged fetch layer |
| `frontend/src/App.test.tsx` | QueryClient wrapper; adjust mocks for invalidate refetches |
| `frontend/src/test/setup.ts` | Unchanged |

---

### Task 1: Install TanStack Query

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json` (via npm)

- [ ] **Step 1: Install the dependency**

Run from `frontend/`:

```powershell
npm install @tanstack/react-query
```

Expected: `@tanstack/react-query` appears in `dependencies`.

- [ ] **Step 2: Commit**

```powershell
git add frontend/package.json frontend/package-lock.json
git commit -m "chore: add @tanstack/react-query"
```

---

### Task 2: Add QueryClientProvider

**Files:**
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Wrap the app with QueryClientProvider**

Replace `frontend/src/main.tsx` with:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
```

- [ ] **Step 2: Commit**

```powershell
git add frontend/src/main.tsx
git commit -m "feat: wrap app with QueryClientProvider"
```

---

### Task 3: Update App tests for QueryClient and invalidation

**Files:**
- Modify: `frontend/src/App.test.tsx`

TDD: update tests first so they fail for missing provider / wrong fetch counts, then implement App.

- [ ] **Step 1: Rewrite App.test.tsx with a Query wrapper and refetch-aware mocks**

Replace `frontend/src/App.test.tsx` with:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import App from './App'

const task = {
  id: 1,
  title: 'Ship the starter',
  completed: false,
  created_at: '2026-07-14T10:00:00Z',
}

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

function renderApp(ui: ReactElement = <App />) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('App', () => {
  it('disables task creation until the initial list has loaded', async () => {
    let resolveLoad!: (response: Response) => void
    const pendingLoad = new Promise<Response>((resolve) => {
      resolveLoad = resolve
    })
    vi.stubGlobal('fetch', vi.fn(() => pendingLoad))

    renderApp()

    const input = screen.getByRole('textbox', { name: 'Task title' })
    const button = screen.getByRole('button', { name: 'Add task' })
    expect(input).toBeDisabled()
    expect(button).toBeDisabled()

    resolveLoad(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    await screen.findByText('No tasks yet')
    expect(input).toBeEnabled()
    expect(button).toBeEnabled()
  })

  it('shows loading and then an empty state', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse([])))

    renderApp()

    expect(screen.getByRole('status')).toHaveTextContent('Loading tasks')
    expect(await screen.findByText('No tasks yet')).toBeInTheDocument()
  })

  it('retries when the initial task request fails', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockImplementationOnce(() => jsonResponse([]))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    renderApp()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "We couldn't load your tasks",
    )
    await user.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByText('No tasks yet')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('creates a task and clears the title field', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse([]))
      .mockImplementationOnce(() => jsonResponse(task, 201))
      .mockImplementationOnce(() => jsonResponse([task]))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    renderApp()
    await screen.findByText('No tasks yet')
    const input = screen.getByRole('textbox', { name: 'Task title' })
    await user.type(input, task.title)
    await user.click(screen.getByRole('button', { name: 'Add task' }))

    expect(await screen.findByText(task.title)).toBeInTheDocument()
    expect(input).toHaveValue('')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/tasks/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ title: task.title }),
      }),
    )
  })

  it('disables the create controls while a task is being added', async () => {
    let resolveCreate!: (response: Response) => void
    const pendingCreate = new Promise<Response>((resolve) => {
      resolveCreate = resolve
    })
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementationOnce(() => jsonResponse([]))
        .mockImplementationOnce(() => pendingCreate)
        .mockImplementationOnce(() => jsonResponse([task])),
    )
    const user = userEvent.setup()

    renderApp()
    await screen.findByText('No tasks yet')
    const input = screen.getByRole('textbox', { name: 'Task title' })
    await user.type(input, task.title)
    await user.click(screen.getByRole('button', { name: 'Add task' }))

    expect(input).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Adding task' })).toBeDisabled()

    resolveCreate(
      new Response(JSON.stringify(task), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    expect(await screen.findByText(task.title)).toBeInTheDocument()
  })

  it('shows field validation returned by the API', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementationOnce(() => jsonResponse([]))
        .mockImplementationOnce(() =>
          jsonResponse({ title: ['This title is not available.'] }, 400),
        ),
    )
    const user = userEvent.setup()

    renderApp()
    await screen.findByText('No tasks yet')
    await user.type(screen.getByRole('textbox', { name: 'Task title' }), 'Taken')
    await user.click(screen.getByRole('button', { name: 'Add task' }))

    expect(await screen.findByText('This title is not available.')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Task title' })).toHaveValue('Taken')
  })

  it('toggles a task and disables its checkbox while pending', async () => {
    let resolvePatch!: (response: Response) => void
    const pendingPatch = new Promise<Response>((resolve) => {
      resolvePatch = resolve
    })
    const updated = { ...task, completed: true }
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse([task]))
      .mockImplementationOnce(() => pendingPatch)
      .mockImplementationOnce(() => jsonResponse([updated]))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    renderApp()
    const checkbox = await screen.findByRole('checkbox', {
      name: `Mark ${task.title} complete`,
    })
    await user.click(checkbox)

    expect(checkbox).toBeDisabled()
    expect(checkbox).not.toBeChecked()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/tasks/1/',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ completed: true }),
      }),
    )

    resolvePatch(
      new Response(JSON.stringify(updated), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    await waitFor(() => expect(checkbox).toBeChecked())
  })

  it('keeps a task unchanged when an update fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementationOnce(() => jsonResponse([task]))
        .mockRejectedValueOnce(new Error('offline')),
    )
    const user = userEvent.setup()

    renderApp()
    const checkbox = await screen.findByRole('checkbox', {
      name: `Mark ${task.title} complete`,
    })
    await user.click(checkbox)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "We couldn't update that task",
    )
    expect(checkbox).not.toBeChecked()
    expect(checkbox).toBeEnabled()
  })

  it('deletes a task after the API confirms deletion', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse([task]))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockImplementationOnce(() => jsonResponse([]))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    renderApp()
    await screen.findByText(task.title)
    await user.click(
      screen.getByRole('button', { name: `Delete ${task.title}` }),
    )

    expect(await screen.findByText('No tasks yet')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/tasks/1/',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail without App migration**

Run from `frontend/`:

```powershell
npm test
```

Expected: FAIL — missing `QueryClientProvider` and/or old App still not wired for invalidation-aware flow.

- [ ] **Step 3: Commit test updates**

```powershell
git add frontend/src/App.test.tsx
git commit -m "test: prepare App tests for TanStack Query"
```

---

### Task 4: Migrate App.tsx to useQuery / useMutation

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Replace App.tsx with TanStack Query wiring**

Replace `frontend/src/App.tsx` with:

```tsx
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { FormEvent } from 'react'

import './App.css'
import { ApiError, createTask, deleteTask, listTasks, updateTask } from './api'
import { TaskForm } from './components/TaskForm'
import { TaskList } from './components/TaskList'
import type { Task } from './types'

const tasksQueryKey = ['tasks'] as const

function App() {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [titleError, setTitleError] = useState('')
  const [actionError, setActionError] = useState('')

  const tasksQuery = useQuery({
    queryKey: tasksQueryKey,
    queryFn: listTasks,
  })

  const createMutation = useMutation({
    mutationFn: (nextTitle: string) => createTask(nextTitle),
    onSuccess: async () => {
      setTitle('')
      setTitleError('')
      await queryClient.invalidateQueries({ queryKey: tasksQueryKey })
    },
    onError: (error) => {
      if (error instanceof ApiError && error.fieldErrors.title?.[0]) {
        setTitleError(error.fieldErrors.title[0])
      } else {
        setActionError("We couldn't add that task. Please try again.")
      }
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, completed }: { id: number; completed: boolean }) =>
      updateTask(id, completed),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tasksQueryKey })
    },
    onError: () => {
      setActionError("We couldn't update that task. Your list was not changed.")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteTask(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tasksQueryKey })
    },
    onError: () => {
      setActionError("We couldn't delete that task. Your list was not changed.")
    },
  })

  const tasks = tasksQuery.data ?? []
  const isLoaded = tasksQuery.isSuccess
  const pendingTaskIds = [
    ...(updateMutation.isPending && updateMutation.variables
      ? [updateMutation.variables.id]
      : []),
    ...(deleteMutation.isPending && deleteMutation.variables != null
      ? [deleteMutation.variables]
      : []),
  ]

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedTitle = title.trim()

    if (!trimmedTitle) {
      setTitleError('Enter a task title.')
      return
    }

    setTitleError('')
    setActionError('')
    createMutation.mutate(trimmedTitle)
  }

  function handleToggle(task: Task) {
    setActionError('')
    updateMutation.mutate({ id: task.id, completed: !task.completed })
  }

  function handleDelete(task: Task) {
    setActionError('')
    deleteMutation.mutate(task.id)
  }

  const completedCount = tasks.filter((task) => task.completed).length

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="eyebrow">Daily focus</p>
        <h1>Make space for what matters.</h1>
        <p className="hero-copy">
          A small, calm list for the work you want to move forward today.
        </p>
      </header>

      <section className="task-card" aria-labelledby="task-heading">
        <div className="card-heading">
          <div>
            <p className="section-kicker">Your list</p>
            <h2 id="task-heading">Today&apos;s tasks</h2>
          </div>
          {isLoaded && tasks.length > 0 ? (
            <p className="task-count" aria-live="polite">
              {completedCount} of {tasks.length} complete
            </p>
          ) : null}
        </div>

        <TaskForm
          title={title}
          error={titleError}
          isCreating={createMutation.isPending}
          isAvailable={isLoaded}
          onTitleChange={(nextTitle) => {
            setTitle(nextTitle)
            if (titleError) setTitleError('')
          }}
          onSubmit={handleCreate}
        />

        {actionError ? (
          <p className="message message-error" role="alert">
            {actionError}
          </p>
        ) : null}

        {tasksQuery.isPending ? (
          <div className="state-panel" role="status">
            <span className="spinner" aria-hidden="true" />
            Loading tasks…
          </div>
        ) : null}

        {tasksQuery.isError ? (
          <div className="state-panel state-error" role="alert">
            <div>
              <strong>We couldn&apos;t load your tasks.</strong>
              <p>Check that Django is running, then try again.</p>
            </div>
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                void tasksQuery.refetch()
              }}
            >
              Retry
            </button>
          </div>
        ) : null}

        {isLoaded && tasks.length === 0 ? (
          <div className="empty-state">
            <span aria-hidden="true">✓</span>
            <strong>No tasks yet</strong>
            <p>Add your first task above and give today a clear starting point.</p>
          </div>
        ) : null}

        {isLoaded && tasks.length > 0 ? (
          <TaskList
            tasks={tasks}
            pendingTaskIds={pendingTaskIds}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
        ) : null}
      </section>

      <footer>Built with Django, React, and a little breathing room.</footer>
    </main>
  )
}

export default App
```

- [ ] **Step 2: Run tests**

Run from `frontend/`:

```powershell
npm test
```

Expected: all App tests PASS.

- [ ] **Step 3: Run typecheck/build**

```powershell
npm run build
```

Expected: succeed with no TypeScript errors.

- [ ] **Step 4: Commit**

```powershell
git add frontend/src/App.tsx
git commit -m "feat: manage tasks with TanStack Query"
```

---

### Task 5: Final verification

- [ ] **Step 1: Re-run the full frontend test suite**

```powershell
npm test
```

Expected: all tests PASS.

- [ ] **Step 2: Confirm `api.ts` was not changed**

```powershell
git diff HEAD -- frontend/src/api.ts
```

Expected: empty diff (fetch layer unchanged).
