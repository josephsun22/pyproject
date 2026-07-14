import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import './App.css'
import { ApiError, createTask, deleteTask, listTasks, updateTask } from './api'
import { TaskForm } from './components/TaskForm'
import { TaskList } from './components/TaskList'
import type { Task } from './types'

type LoadState = 'loading' | 'loaded' | 'error'

function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [title, setTitle] = useState('')
  const [titleError, setTitleError] = useState('')
  const [actionError, setActionError] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [pendingTaskIds, setPendingTaskIds] = useState<number[]>([])

  const load = useCallback(async () => {
    setLoadState('loading')
    setActionError('')
    try {
      setTasks(await listTasks())
      setLoadState('loaded')
    } catch {
      setLoadState('error')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedTitle = title.trim()

    if (!trimmedTitle) {
      setTitleError('Enter a task title.')
      return
    }

    setIsCreating(true)
    setTitleError('')
    setActionError('')

    try {
      const created = await createTask(trimmedTitle)
      setTasks((current) => [created, ...current])
      setTitle('')
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors.title?.[0]) {
        setTitleError(error.fieldErrors.title[0])
      } else {
        setActionError("We couldn't add that task. Please try again.")
      }
    } finally {
      setIsCreating(false)
    }
  }

  function markPending(id: number, pending: boolean) {
    setPendingTaskIds((current) =>
      pending
        ? [...current, id]
        : current.filter((pendingId) => pendingId !== id),
    )
  }

  async function handleToggle(task: Task) {
    markPending(task.id, true)
    setActionError('')
    try {
      const updated = await updateTask(task.id, !task.completed)
      setTasks((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
    } catch {
      setActionError("We couldn't update that task. Your list was not changed.")
    } finally {
      markPending(task.id, false)
    }
  }

  async function handleDelete(task: Task) {
    markPending(task.id, true)
    setActionError('')
    try {
      await deleteTask(task.id)
      setTasks((current) => current.filter((item) => item.id !== task.id))
    } catch {
      setActionError("We couldn't delete that task. Your list was not changed.")
    } finally {
      markPending(task.id, false)
    }
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
          {loadState === 'loaded' && tasks.length > 0 ? (
            <p className="task-count" aria-live="polite">
              {completedCount} of {tasks.length} complete
            </p>
          ) : null}
        </div>

        <TaskForm
          title={title}
          error={titleError}
          isCreating={isCreating}
          isAvailable={loadState === 'loaded'}
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

        {loadState === 'loading' ? (
          <div className="state-panel" role="status">
            <span className="spinner" aria-hidden="true" />
            Loading tasks…
          </div>
        ) : null}

        {loadState === 'error' ? (
          <div className="state-panel state-error" role="alert">
            <div>
              <strong>We couldn&apos;t load your tasks.</strong>
              <p>Check that Django is running, then try again.</p>
            </div>
            <button className="secondary-button" type="button" onClick={load}>
              Retry
            </button>
          </div>
        ) : null}

        {loadState === 'loaded' && tasks.length === 0 ? (
          <div className="empty-state">
            <span aria-hidden="true">✓</span>
            <strong>No tasks yet</strong>
            <p>Add your first task above and give today a clear starting point.</p>
          </div>
        ) : null}

        {loadState === 'loaded' && tasks.length > 0 ? (
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
