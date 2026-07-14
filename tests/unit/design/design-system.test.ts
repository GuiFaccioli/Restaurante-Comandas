import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

function source(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

function token(css: string, name: string) {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))
  expect(match, `missing --${name}`).not.toBeNull()
  return match![1]
}

function relativeLuminance(hex: string) {
  const channels = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255)
  const [red, green, blue] = channels.map((value) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  )
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function contrast(foreground: string, background: string) {
  const first = relativeLuminance(foreground)
  const second = relativeLuminance(background)
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

describe('DESIGN.MD foundation alignment', () => {
  it('defines the foundation color, radius, and accessible focus tokens', () => {
    const css = source('app/globals.css')

    expect(css).toContain('--brand-green: #00d4a4')
    expect(css).toContain('--radius: 0.75rem')
    expect(css).toContain('--focus-ring: #007f62')
    expect(css).toContain('--ring: var(--focus-ring)')
    expect(css).toContain('--hairline: #e5e5e5')
  })

  it('defines accessible semantic action and focus tokens', () => {
    const css = source('app/globals.css')

    expect(token(css, 'action-positive')).toBe('#15803d')
    expect(token(css, 'action-positive-hover')).toBe('#166534')
    expect(token(css, 'action-informational')).toBe('#175cd3')
    expect(token(css, 'action-warning')).toBe('#fde68a')
    expect(token(css, 'action-warning-solid-foreground')).toBe('#713f12')
    expect(token(css, 'action-warning-soft')).toBe('#fffbeb')
    expect(token(css, 'action-warning-soft-foreground')).toBe('#92400e')
    expect(token(css, 'action-destructive')).toBe('#b42318')
    expect(token(css, 'focus-ring')).toBe('#007f62')

    expect(contrast(token(css, 'action-positive'), '#ffffff')).toBeGreaterThanOrEqual(4.5)
    expect(contrast(token(css, 'action-informational'), '#ffffff')).toBeGreaterThanOrEqual(4.5)
    expect(
      contrast(token(css, 'action-warning-solid-foreground'), token(css, 'action-warning'))
    ).toBeGreaterThanOrEqual(4.5)
    expect(contrast(token(css, 'action-destructive'), '#ffffff')).toBeGreaterThanOrEqual(4.5)
    const hoverPairs = [
      ['action-positive-hover', '#ffffff'],
      ['action-informational-hover', '#ffffff'],
      ['action-warning-solid-foreground', token(css, 'action-warning-hover')],
      ['action-destructive-hover', '#ffffff'],
    ] as const
    const softPairs = [
      ['action-neutral-foreground', 'action-neutral-soft'],
      ['action-positive-foreground', 'action-positive-soft'],
      ['action-informational-foreground', 'action-informational-soft'],
      ['action-warning-soft-foreground', 'action-warning-soft'],
      ['action-destructive-foreground', 'action-destructive-soft'],
      ['action-disabled-foreground', 'action-disabled'],
    ] as const

    for (const [foreground, background] of hoverPairs) {
      expect(
        contrast(token(css, foreground), background.startsWith('#') ? background : token(css, background))
      ).toBeGreaterThanOrEqual(4.5)
    }
    for (const [foreground, background] of softPairs) {
      expect(contrast(token(css, foreground), token(css, background))).toBeGreaterThanOrEqual(4.5)
    }
    const approvedLightSurfaces = ['background', 'card', 'popover'] as const
    for (const outline of [
      'action-neutral-outline',
      'action-positive-outline',
      'action-informational-outline',
      'action-warning-outline',
      'action-destructive-outline',
    ]) {
      for (const surface of approvedLightSurfaces) {
        expect(contrast(token(css, outline), token(css, surface))).toBeGreaterThanOrEqual(4.5)
      }
    }
    expect(contrast(token(css, 'focus-ring'), '#ffffff')).toBeGreaterThanOrEqual(3)
    expect(contrast(token(css, 'focus-ring'), '#0a0a0a')).toBeGreaterThanOrEqual(3)
  })

  it('documents solid and soft warning foregrounds separately', () => {
    const guide = source('DESIGN.MD')

    expect(guide).toContain('neutral, positive, informational, warning, destructive')
    expect(guide).toContain('solid, soft, outline, ghost, link')
    expect(guide).toContain('warning solid `#fde68a` with `#713f12`')
    expect(guide).toContain('warning soft `#fffbeb` with `#92400e`')
    expect(guide).toContain('#007f62')
    expect(guide).toContain('Color is never the only cue')
    expect(guide).not.toContain('green success actions')
    expect(guide).not.toContain('Focus Mint')
  })

  it('limits outline contrast guarantees to approved light surfaces', () => {
    const guide = source('DESIGN.MD')

    expect(guide).toContain(
      'Outline text, border, and icon contrast is guaranteed only on the approved light `background`, `card`, and `popover` surfaces (`#ffffff`).'
    )
    expect(guide).toContain(
      'On any other surface, choose an intent and appearance combination with valid contrast.'
    )
    expect(guide).toContain('This contract does not introduce a dark action palette.')
    expect(guide).not.toMatch(
      /interactive borders,\s+icons, and focus indicators must meet 3:1 against adjacent surfaces/
    )
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

  it('uses 40px inputs with the shared focus ring', () => {
    const input = source('components/ui/input.tsx')

    expect(input).toContain('h-10')
    expect(input).toContain('rounded-md')
    expect(input).toContain('focus-visible:border-ring')
  })
})
