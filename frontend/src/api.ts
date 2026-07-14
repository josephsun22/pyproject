import type { Task } from './types'

type FieldErrors = Record<string, string[]>

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(
  /\/$/,
  '',
)

export class ApiError extends Error {
  fieldErrors: FieldErrors

  constructor(message: string, fieldErrors: FieldErrors = {}) {
    super(message)
    this.name = 'ApiError'
    this.fieldErrors = fieldErrors
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })

  if (!response.ok) {
    let fieldErrors: FieldErrors = {}
    try {
      const data = (await response.json()) as unknown
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        fieldErrors = data as FieldErrors
      }
    } catch {
      // Non-JSON failures still surface through the generic message below.
    }
    throw new ApiError(`Request failed with status ${response.status}`, fieldErrors)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export function listTasks() {
  return request<Task[]>('/tasks/')
}

export function createTask(title: string) {
  return request<Task>('/tasks/', {
    method: 'POST',
    body: JSON.stringify({ title }),
  })
}

export function updateTask(id: number, completed: boolean) {
  return request<Task>(`/tasks/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({ completed }),
  })
}

export function deleteTask(id: number) {
  return request<void>(`/tasks/${id}/`, { method: 'DELETE' })
}

