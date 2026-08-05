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

describe('Agiliza Fluxo foundation alignment', () => {
  it('defines the foundation color, radius, and accessible focus tokens', () => {
    const css = source('app/globals.css')

    expect(css).toContain('--brand-terracotta: #e24d28')
    expect(css).toContain('--canvas: #fbf9f4')
    expect(css).toContain('--radius-button: 8px')
    expect(css).toContain('--focus-ring: #e24d28')
    expect(css).toContain('--ring: var(--focus-ring)')
    expect(css).toContain('--border: #e7dfda')
  })

  it('defines accessible semantic action and focus tokens', () => {
    const css = source('app/globals.css')

    expect(token(css, 'action-positive')).toBe('#e24d28')
    expect(token(css, 'action-positive-hover')).toBe('#b83d22')
    expect(token(css, 'action-positive-solid-foreground')).toBe('#181411')
    expect(token(css, 'action-informational')).toBe('#4b3d34')
    expect(token(css, 'action-warning')).toBe('#f19d27')
    expect(token(css, 'action-warning-solid-foreground')).toBe('#241d19')
    expect(token(css, 'action-warning-soft')).toBe('#fbe7bf')
    expect(token(css, 'action-warning-soft-foreground')).toBe('#774b0b')
    expect(token(css, 'action-destructive')).toBe('#dc2828')
    expect(token(css, 'focus-ring')).toBe('#e24d28')

    expect(
      contrast(token(css, 'action-positive-solid-foreground'), token(css, 'action-positive'))
    ).toBeGreaterThanOrEqual(4.5)
    expect(contrast(token(css, 'action-informational'), '#ffffff')).toBeGreaterThanOrEqual(4.5)
    expect(
      contrast(token(css, 'action-warning-solid-foreground'), token(css, 'action-warning'))
    ).toBeGreaterThanOrEqual(4.5)
    expect(contrast(token(css, 'action-destructive'), '#ffffff')).toBeGreaterThanOrEqual(4.5)
    const hoverPairs = [
      ['action-positive-hover', '#ffffff'],
      ['action-informational-hover', '#ffffff'],
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

  it('documents the terracotta visual identity and solid/soft warning foregrounds', () => {
    const guide = source('docs/AGILIZA_FLUXO_DESIGN_SYSTEM.md')

    expect(guide).toContain('#e24d28')
    expect(guide).toContain('#f19d27')
    expect(guide).toContain('Status de pedido e estoque devem combinar cor, texto')
    expect(guide).toContain('Agiliza Fluxo')
  })

  it('limits outline contrast guarantees to approved light surfaces', () => {
    const guide = source('docs/AGILIZA_FLUXO_DESIGN_SYSTEM.md')

    expect(guide).toContain('Critérios de aceite')
    expect(guide).toContain('Foco de teclado permanece visível')
    expect(guide).toContain('alvos de toque de pelo menos `44px`')
  })

  it('uses Satoshi for headings, Inter for prose, and Fira Code for code', () => {
    const layout = source('app/layout.tsx')
    const css = source('app/globals.css')

    expect(layout).not.toContain('next/font/google')
    expect(css).toContain('--font-sans: Inter')
    expect(css).toContain('--font-heading: Satoshi')
    expect(css).toContain('--font-mono: "Fira Code"')
    expect(css).toContain('font-family: Satoshi, Inter')
  })

  it('uses touch-sized primary buttons with the shared geometry', () => {
    const button = source('components/ui/button.tsx')

    expect(button).toContain('rounded-[var(--radius-button)]')
    expect(button).toContain('h-11')
    expect(button).toContain('px-[18px]')
  })

  it('uses the shared Agiliza Fluxo brand in authenticated shells', () => {
    const brand = source('components/brand/agiliza-fluxo-brand.tsx')
    expect(brand).toContain('Agiliza Fluxo')
    expect(brand).toContain('Workflow')
    expect(source('app/admin/layout.tsx')).toContain('AgilizaFluxoBrand')
    expect(source('app/garcom/layout.tsx')).toContain('AgilizaFluxoBrand')
    expect(source('app/cozinha/layout.tsx')).toContain('AgilizaFluxoBrand')
  })

  it('uses the visual tokens in shared admin surfaces', () => {
    const adminPage = source('components/admin/admin-page.tsx')
    expect(adminPage).toContain('font-heading text-3xl font-black')
    expect(adminPage).toContain('rounded-[var(--radius-card)]')
    expect(adminPage).toContain('shadow-[var(--shadow-card)]')
    expect(adminPage).toContain('text-[var(--muted)]')
  })

  it('uses 40px inputs with the shared focus ring', () => {
    const input = source('components/ui/input.tsx')

    expect(input).toContain('h-10')
    expect(input).toContain('rounded-md')
    expect(input).toContain('focus-visible:border-ring')
  })
})
