import type { Task } from '../types'

interface TaskListProps {
  tasks: Task[]
  pendingTaskIds: number[]
  onToggle: (task: Task) => void
  onDelete: (task: Task) => void
}

export function TaskList({
  tasks,
  pendingTaskIds,
  onToggle,
  onDelete,
}: TaskListProps) {
  return (
    <ul className="task-list" aria-label="Tasks">
      {tasks.map((task) => {
        const isPending = pendingTaskIds.includes(task.id)
        const toggleLabel = task.completed
          ? `Mark ${task.title} incomplete`
          : `Mark ${task.title} complete`

        return (
          <li className={task.completed ? 'task-item completed' : 'task-item'} key={task.id}>
            <label className="check-control">
              <input
                type="checkbox"
                checked={task.completed}
                disabled={isPending}
                aria-label={toggleLabel}
                onChange={() => onToggle(task)}
              />
              <span className="custom-check" aria-hidden="true" />
            </label>
            <span className="task-title">{task.title}</span>
            <button
              className="delete-button"
              type="button"
              aria-label={`Delete ${task.title}`}
              disabled={isPending}
              onClick={() => onDelete(task)}
            >
              {isPending ? 'Working…' : 'Delete'}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

