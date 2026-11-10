import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('shows its title as a heading and its text', () => {
    render(<EmptyState title="No orders yet" text="Your orders will appear here." />)
    expect(screen.getByRole('heading', { name: 'No orders yet' })).toBeInTheDocument()
    expect(screen.getByText('Your orders will appear here.')).toBeInTheDocument()
  })

  it('renders an optional action the user can press', async () => {
    const onClick = vi.fn()
    render(
      <EmptyState
        title="No orders yet"
        text="Browse the shop."
        action={<button onClick={onClick}>Start shopping</button>}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Start shopping' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders no action area when none is given', () => {
    render(<EmptyState title="No orders yet" text="Browse the shop." />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
