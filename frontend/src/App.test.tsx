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
