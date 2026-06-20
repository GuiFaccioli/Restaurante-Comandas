Ingere uma fonte no wiki do projeto e atualiza o conhecimento acumulado.

**Argumento:** `$ARGUMENTS` — pode ser:
- Um caminho de arquivo (ex: `docs/requisitos.md`)
- Uma URL
- Texto colado diretamente

## Protocolo de ingestão

Execute cada etapa em ordem. Não pule etapas.

### 1. Ler a fonte
Leia o conteúdo inteiro da fonte fornecida.

### 2. Extrair informações estruturadas

Identifique e liste:

**Entidades** (sistemas, serviços, pessoas, produtos, organizações):
- Nome, o que é, características, relações

**Conceitos** (padrões, decisões, termos do domínio):
- Nome, definição, contexto de uso, trade-offs

**Decisões importantes:**
- O que foi decidido, por quê, quando

**Contradições com o wiki existente:**
- Leia `wiki/index.md` e páginas relevantes antes de escrever
- Liste qualquer informação que conflite com o que já está no wiki

### 3. Salvar raw source (imutável)

Salve o conteúdo **verbatim** da fonte em `raw_sources/[nome-kebab-case].md`:
- Para URLs: o texto completo da página, sem sumarização
- Para arquivos: cópia exata do conteúdo
- Para texto colado: o texto exato como fornecido
- Adicione apenas um cabeçalho HTML de comentário com URL e data de captura

**Nunca sumarize o raw source. Nunca edite após salvar.**

### 4. Criar/atualizar páginas do wiki

Para cada entidade e conceito identificado:
1. Verifique se já existe página em `wiki/entities/` ou `wiki/concepts/`
2. Se existe: atualize, preserve histórico, sinalize contradições com `⚠️ CONTRADIÇÃO:`
3. Se não existe: crie seguindo o schema em `wiki/meta/schema.md`

Crie o ponteiro da fonte em `wiki/sources/[nome-kebab-case].md` — **apenas metadados e links**, sem sumarização.

### 5. Cascade automático

Após criar/atualizar páginas:
1. Adicione cross-references `[[nome-da-página]]` em todas as páginas relacionadas
2. Verifique se páginas existentes que mencionam as entidades precisam de atualização
3. Sinalize lacunas de conhecimento que a fonte levantou mas não respondeu

### 6. Atualizar index.md

Atualize `wiki/index.md`:
- Adicione entrada na tabela correspondente (Entidades, Conceitos, ou Fontes)
- Atualize o Sumário Executivo se relevante
- Adicione à seção "Contradições Abertas" se houver conflitos
- Atualize "Conhecimento Pendente" com lacunas identificadas
- Atualize a data e o contador de páginas

### 7. Registrar no changelog

Adicione entrada em `wiki/meta/changelog.md`:
```
## YYYY-MM-DD — Ingestão: [nome da fonte]
- Criado: [lista de páginas novas]
- Atualizado: [lista de páginas modificadas]
- Contradições: [se houver]
- Lacunas: [se houver]
```

### 8. Relatório final

Ao terminar, mostre ao usuário:
- ✅ Páginas criadas
- 🔄 Páginas atualizadas  
- ⚠️ Contradições encontradas (com detalhes)
- ❓ Lacunas de conhecimento identificadas
- 🔗 Cross-references adicionados
