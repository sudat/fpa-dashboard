import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders FPA Dashboard text', () => {
    render(<App />)
    const elements = screen.getAllByText('FPA Dashboard')
    expect(elements.length).toBeGreaterThanOrEqual(1)
  })
})
