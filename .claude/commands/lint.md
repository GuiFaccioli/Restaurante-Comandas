Executa health check completo no wiki e corrige problemas encontrados.

**Argumento opcional:** `$ARGUMENTS` — `--fix` para corrigir automaticamente, `--report` para só reportar

## Protocolo de lint

### 1. Inventário

Liste todos os arquivos em:
- `wiki/entities/`
- `wiki/concepts/`
- `wiki/sources/`
- `wiki/meta/`
- `wiki/index.md`

### 2. Verificações estruturais

Para cada arquivo markdown no wiki, verifique:

**Erros (bloqueiam qualidade):**
- [ ] Arquivo sem frontmatter (`---` ... `---`)
- [ ] Frontmatter sem campos obrigatórios: `title`, `type`, `updated`
- [ ] Seções obrigatórias ausentes (ver `wiki/meta/schema.md` para o tipo)
- [ ] index.md com entrada faltando para página existente

**Warnings (degradam qualidade):**
- [ ] Cross-reference `[[X]]` sem arquivo correspondente em nenhuma pasta do wiki
- [ ] Entidade ou conceito sem nenhuma fonte referenciada
- [ ] Página sem nenhum cross-reference outbound
- [ ] `updated` com data há mais de 30 dias sem nenhuma ingestão relacionada
- [ ] Contradição (`⚠️ CONTRADIÇÃO:`) presente há mais de 5 entradas no changelog sem resolução

### 3. Verificações de consistência

- [ ] Todas as entidades em `index.md` têm arquivo correspondente?
- [ ] Todos os conceitos em `index.md` têm arquivo correspondente?
- [ ] Todas as fontes em `index.md` têm arquivo correspondente?
- [ ] O sumário executivo em `index.md` reflete o estado atual do wiki?
- [ ] Há entidades mencionadas em páginas de conceitos que deveriam ter página própria?
- [ ] Há conceitos mencionados em páginas de entidades que deveriam ter página própria?

### 4. Verificações de conhecimento

- [ ] Há lacunas em "Conhecimento Pendente" que poderiam ser resolvidas com informações já no wiki?
- [ ] Há cross-references óbvios faltando entre páginas relacionadas?

### 5. Corrigir (se --fix ou padrão)

Para cada problema encontrado:
- **Erros estruturais**: corrija diretamente
- **Cross-references quebrados**: adicione nota `❓ Página não existe ainda` junto ao link
- **index.md desatualizado**: atualize com páginas faltantes
- **Sumário desatualizado**: reescreva baseado no conteúdo atual

### 6. Relatório

```
## Lint Report — YYYY-MM-DD

### Erros corrigidos
- ...

### Warnings
- ...

### Melhorias sugeridas
- ...

### Estado geral
- Total de páginas: N
- Cobertura de cross-references: X%
- Contradições abertas: N
- Lacunas de conhecimento: N
```

Registre o lint no `wiki/meta/changelog.md`.
