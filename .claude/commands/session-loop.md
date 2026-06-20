Captura o contexto da sessão atual e propõe um ingest no wiki com aprovação do usuário antes de escrever qualquer coisa.

## Protocolo

### 1. Analisar a sessão

Revise toda a conversa atual e extraia:

**Decisões tomadas**
- O que foi decidido, por que, por quem

**Novos conceitos discutidos**
- Ideias, padrões, termos que surgiram na conversa

**Entidades mencionadas**
- Sistemas, ferramentas, serviços, pessoas referenciados

**Links externos absorvidos**
- Qualquer URL que foi visitada, lida ou cujo conteúdo foi usado — liste cada uma

**Conhecimento novo vs wiki atual**
- Leia `wiki/index.md` e compare: o que existe na conversa que ainda não está no wiki?

---

### 2. HITL — Apresentar plano antes de qualquer escrita

Monte o plano e apresente ao usuário no seguinte formato:

---
**Session Loop — Plano de Ingestão**

**Contexto capturado desta sessão:**
- [lista de decisões, conceitos, entidades encontrados]

**Links externos para ingerir:**
- [URL 1] → será salvo em `raw_sources/` e extraído para o wiki
- [URL 2] → ...

**Páginas do wiki que serão criadas:**
- `wiki/entities/X.md`
- `wiki/concepts/Y.md`

**Páginas do wiki que serão atualizadas:**
- `wiki/entities/Z.md` — [o que muda]

**O que será ignorado (já está no wiki ou irrelevante):**
- [lista]

Aprovar? **sim** para executar / **não** para cancelar / **editar** para ajustar o plano
---

Aguarde a resposta do usuário antes de prosseguir.

---

### 3. Executar após aprovação

Se o usuário aprovar ("sim" ou variante):

**Para cada link externo listado:**
1. Busque o conteúdo completo da URL
2. Salve verbatim em `raw_sources/[nome-kebab-case].md` com cabeçalho de comentário (URL + data)
3. Extraia entidades e conceitos para o wiki
4. Crie ponteiro em `wiki/sources/[nome-kebab-case].md`

**Para contexto da sessão (sem URL):**
1. Sintetize o conhecimento novo em páginas de entities/concepts
2. Se for um conjunto de decisões sem entidade clara, crie `wiki/concepts/decisoes-[data].md`

**Cascade:**
- Adicione cross-references nas páginas relacionadas
- Atualize `wiki/index.md`
- Registre em `wiki/meta/changelog.md`

**Relatório final:**
- ✅ Raw sources salvos
- ✅ Páginas criadas/atualizadas
- ⚠️ Contradições encontradas (se houver)
- ❓ Lacunas identificadas

---

### 4. Se o usuário disser "editar"

Apresente o plano como lista numerada editável. O usuário pode dizer "remove o item 3" ou "adiciona X". Reapresente o plano revisado e peça confirmação novamente.

---

### 5. Agendar próxima execução

Após concluir (ou se o usuário cancelar), informe:

> Loop concluído. Próxima captura em [intervalo configurado].
> Para cancelar o loop: `/loop --cancel`
