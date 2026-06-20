Busca no wiki do projeto e sintetiza uma resposta fundamentada.

**Pergunta:** `$ARGUMENTS`

## Protocolo de query

### 1. Carregar contexto

1. Leia `wiki/index.md` para visão geral
2. Identifique quais seções (entidades, conceitos, fontes) são relevantes para a pergunta
3. Leia as páginas relevantes

### 2. Sintetizar resposta

Responda à pergunta com base no wiki. Formato:

---

**Resposta:** [resposta direta em 1-3 frases]

**Detalhes:**
[elaboração com base nas páginas do wiki]

**Fontes consultadas:**
- [[página-1]]: [o que contribuiu]
- [[página-2]]: [o que contribuiu]

**Incertezas:**
[se alguma informação for marcada com ❓ no wiki, sinalize aqui]

**Lacunas:**
[se a pergunta levantou algo que o wiki não cobre, liste aqui]

---

### 3. Atualizar wiki se necessário

Se a resposta gerou nova síntese que não está explícita no wiki:
- Pergunte ao usuário: "Esta resposta gerou novo conhecimento que vale adicionar ao wiki?"
- Se sim, adicione como nova seção em uma página existente ou crie página nova
- Registre no changelog

### 4. Sinalizar lacunas

Se o wiki não tem informação suficiente para responder:
- Diga claramente o que está faltando
- Adicione à seção "Conhecimento Pendente" em `wiki/index.md`
- Sugira ao usuário qual fonte poderia preencher a lacuna
