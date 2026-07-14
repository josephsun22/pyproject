import type { FormEvent } from 'react'

interface TaskFormProps {
  title: string
  error: string
  isCreating: boolean
  isAvailable: boolean
  onTitleChange: (title: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function TaskForm({
  title,
  error,
  isCreating,
  isAvailable,
  onTitleChange,
  onSubmit,
}: TaskFormProps) {
  const isDisabled = isCreating || !isAvailable

  return (
    <form className="task-form" onSubmit={onSubmit} noValidate>
      <label htmlFor="task-title">Task title</label>
      <div className="task-entry">
        <input
          id="task-title"
          name="title"
          type="text"
          value={title}
          maxLength={200}
          placeholder="What needs doing?"
          aria-describedby={error ? 'title-error' : undefined}
          aria-invalid={Boolean(error)}
          disabled={isDisabled}
          onChange={(event) => onTitleChange(event.target.value)}
        />
        <button
          className="primary-button"
          type="submit"
          aria-label={isCreating ? 'Adding task' : 'Add task'}
          disabled={isDisabled}
        >
          <span aria-hidden="true">+</span>
          {isCreating ? 'Adding…' : 'Add task'}
        </button>
      </div>
      {error ? (
        <p id="title-error" className="field-error">
          {error}
        </p>
      ) : null}
    </form>
  )
}
