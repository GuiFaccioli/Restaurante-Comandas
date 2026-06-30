import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

function source(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('DESIGN.MD foundation alignment', () => {
  it('defines Mintlify-inspired color and radius tokens', () => {
    const css = source('app/globals.css')

    expect(css).toContain('--brand-green: #00d4a4')
    expect(css).toContain('--radius: 0.75rem')
    expect(css).toContain('--ring: #00d4a4')
    expect(css).toContain('--hairline: #e5e5e5')
  })

  it('keeps Inter for prose and Geist Mono for code', () => {
    const layout = source('app/layout.tsx')
    const css = source('app/globals.css')

    expect(layout).not.toContain('next/font/google')
    expect(css).toContain('--font-sans: Inter')
    expect(css).toContain('--font-mono: "Geist Mono"')
  })

  it('uses pill-shaped primary buttons', () => {
    const button = source('components/ui/button.tsx')

    expect(button).toContain('rounded-full')
    expect(button).toContain('h-10')
    expect(button).toContain('px-5')
  })

  it('uses 40px inputs with mint focus rings', () => {
    const input = source('components/ui/input.tsx')

    expect(input).toContain('h-10')
    expect(input).toContain('rounded-md')
    expect(input).toContain('focus-visible:border-ring')
  })
})
