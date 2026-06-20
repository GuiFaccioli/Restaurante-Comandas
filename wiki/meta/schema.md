---
title: Schema do Wiki
type: meta
updated: 2026-06-20
tags: [meta, schema, convenções]
---

# Schema do Wiki

## Tipos de página

### Entity (`entities/`)
Representa algo concreto e identificável no domínio do projeto.

```markdown
---
title: Nome da Entidade
type: entity
updated: YYYY-MM-DD
tags: [categoria]
---

# Nome da Entidade

## O que é
[1-2 frases]

## Características principais
- ...

## Relações
- Usa: [[outra-entidade]]
- É usada por: [[outra-entidade]]
- Relacionada com: [[conceito]]

## Histórico de decisões
| Data | Decisão | Motivo |
|------|---------|--------|

## Notas
[observações que não se encaixam acima]

## Fontes
- [[nome-da-fonte]]
```

### Concept (`concepts/`)
Representa uma ideia abstrata, padrão, decisão arquitetural ou termo do glossário.

```markdown
---
title: Nome do Conceito
type: concept
updated: YYYY-MM-DD
tags: [categoria]
---

# Nome do Conceito

## Definição
[definição clara e concisa]

## Contexto de uso
[quando e por que é relevante neste projeto]

## Exemplos
- ...

## Trade-offs
| Prós | Contras |
|------|---------|

## Relações
- Implementado em: [[entidade]]
- Relacionado com: [[outro-conceito]]

## Fontes
- [[nome-da-fonte]]
```

### Source Ref (`sources/`)
**Ponteiro** para uma fonte ingerida. Não contém sumarização — apenas metadados e links para onde o conhecimento foi extraído. O conteúdo bruto fica em `raw_sources/` (imutável).

```markdown
---
title: Título da Fonte
type: source-ref
url: https://... (se aplicável)
raw: raw_sources/nome-do-arquivo.md
ingested: YYYY-MM-DD
tags: [categoria]
---

# Título da Fonte

Conteúdo bruto em: [`raw_sources/nome-do-arquivo.md`](../../raw_sources/nome-do-arquivo.md)

## Conhecimento extraído para o wiki

- Entidade: [[entidade-1]]
- Conceito: [[conceito-1]]
```

### Raw Source (`raw_sources/` — fora do wiki)
Conteúdo verbatim da fonte original. **Nunca editado após ingestão.** Cabeçalho mínimo com URL e data de captura. Todo o restante é o conteúdo original inalterado.

## Convenções de escrita

- **Datas**: sempre `YYYY-MM-DD`
- **Cross-references**: `[[kebab-case-do-arquivo]]` sem extensão
- **Contradições**: marcar com `⚠️ CONTRADIÇÃO:` e descrever ambos os lados
- **Incerteza**: marcar com `❓` quando a informação é suspeita ou não confirmada
- **Obsoleto**: marcar com `~~texto~~` e adicionar nota explicando o motivo

## Cascade checklist

Ao atualizar qualquer página, verificar:
1. `wiki/index.md` reflete a mudança?
2. Páginas que referenciam esta precisam de atualização?
3. Novas cross-references foram adicionadas onde cabem?
4. Contradições foram sinalizadas em `index.md`?
5. `wiki/meta/changelog.md` foi atualizado?

## Critérios de lint

- Página sem cabeçalho frontmatter → erro
- Cross-reference `[[X]]` sem arquivo correspondente → warning (página futura)
- Entidade sem nenhuma fonte → warning
- Contradição não resolvida há mais de 5 ingestões → escalada para o usuário
- index.md desatualizado → erro
