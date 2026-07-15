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

  function handleCreate(event: FormEvent<HTMLFormElement>) {
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
