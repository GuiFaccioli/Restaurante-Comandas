import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const sourceDirectories = ['app', 'components', 'db', 'docs', 'lib', 'prisma', 'scripts', 'tests', 'wiki']
const rootTextFiles = ['CLAUDE.md', 'README.md']
const textExtensions = new Set(['.ts', '.tsx', '.js', '.json', '.md', '.sql', '.prisma'])
const ignoredDirectories = new Set(['.next', 'node_modules'])

const mojibakePatterns = [
  { name: 'UTF-8 two-byte sequence rendered as Latin-1', pattern: /\u00C3[\u0080-\u00BF]/u },
  { name: 'stray Latin-1 C2 prefix', pattern: /\u00C2[\u0080-\u00BF]/u },
  { name: 'misdecoded right arrow', pattern: /\u00E2\u2020\u2019/u },
  { name: 'misdecoded em dash', pattern: /\u00E2\u20AC\u201D/u },
  { name: 'misdecoded emoji prefix', pattern: /\u00F0\u0178/u },
  { name: 'Unicode replacement character', pattern: /\uFFFD/u },
] as const

function collectTextFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)

    if (entry.isDirectory()) {
      return ignoredDirectories.has(entry.name) ? [] : collectTextFiles(path)
    }

    return entry.isFile() && textExtensions.has(extname(entry.name)) ? [path] : []
  })
}

function findMojibake(value: string): string[] {
  return mojibakePatterns
    .filter(({ pattern }) => pattern.test(value))
    .map(({ name }) => name)
}

describe('source encoding', () => {
  it.each([
    ['double-encoded Portuguese text', 'N\u00C3\u00A3o'],
    ['stray middle-dot prefix', '\u00C2\u00B7'],
    ['misdecoded right arrow', '\u00E2\u2020\u2019'],
    ['misdecoded em dash', '\u00E2\u20AC\u201D'],
    ['misdecoded emoji prefix', '\u00F0\u0178'],
    ['replacement character', '\uFFFD'],
  ])('detects %s', (_, sample) => {
    expect(findMojibake(sample)).not.toEqual([])
  })

  it('does not flag legitimate Portuguese diacritics', () => {
    expect(findMojibake('parâmetros')).toEqual([])
  })

  it('contains no known mojibake sequences in runtime and test files', () => {
    const findings = [
      ...rootTextFiles.map((file) => join(root, file)).filter(existsSync),
      ...sourceDirectories
        .map((directory) => join(root, directory))
        .filter(existsSync)
        .flatMap(collectTextFiles),
    ]
      .sort()
      .flatMap((file) =>
        readFileSync(file, 'utf8')
          .split(/\r?\n/u)
          .flatMap((line, index) =>
            findMojibake(line).map(
              (patternName) =>
                `${relative(root, file).replaceAll('\\', '/')}:${index + 1}: ${patternName}`,
            ),
          ),
      )

    expect(findings, `Mojibake detected:\n${findings.join('\n')}`).toEqual([])
  })
})
