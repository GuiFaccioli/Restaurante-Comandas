````md
---
name: git-commit
description: Use when preparing, organizing, reviewing, staging, or creating Git commits, especially when the working tree contains multiple or pre-existing changes.
metadata:
  project: Restaurante-Comandas
  version: "1.0"
---

# Organização e criação de commits

## Activation Contract

Use esta skill quando for necessário:

- preparar um commit;
- decidir o que deve entrar em um commit;
- separar mudanças;
- revisar alterações antes de commitar;
- sugerir uma mensagem de commit;
- executar um commit solicitado pelo usuário.

## Hard Rules

- Preserve alterações preexistentes não relacionadas.
- Nunca use `git add .` sem avaliar o conteúdo que será incluído.
- Nunca inclua secrets, `.env`, credenciais ou arquivos temporários.
- Não descarte alterações do usuário.
- Não use `git reset --hard`.
- Não use force push.
- Não faça push automaticamente.
- Não misture tarefas independentes no mesmo commit apenas por conveniência.
- Não crie commits artificiais sem unidade lógica.
- Só execute o commit se o usuário tiver solicitado ou autorizado a criação do commit.

## Workflow

### 1. Inspecione o estado atual

Execute:

```bash
git status
````

Identifique:

* branch atual;
* staged;
* unstaged;
* untracked.

### 2. Leia os diffs relevantes

Analise:

```bash
git diff
git diff --staged
```

Quando necessário, inspecione arquivos individualmente.

Não deduza o conteúdo apenas pelo nome do arquivo.

### 3. Separe a tarefa atual

Classifique as mudanças em:

* pertencem à tarefa atual;
* preexistentes;
* não relacionadas;
* incertas.

Mudanças incertas devem ficar fora até serem entendidas.

### 4. Agrupe por unidade lógica

Um bom commit deve representar uma mudança coerente.

Use quando fizer sentido:

* `feat` — nova funcionalidade;
* `fix` — correção;
* `refactor` — reorganização sem mudança funcional;
* `perf` — performance;
* `test` — testes;
* `docs` — documentação;
* `chore` — manutenção/configuração;
* `style` — mudança visual sem impacto funcional.

Prefira Conventional Commits quando fizer sentido para o projeto.

### 5. Faça staging seletivo

Adicione somente os arquivos da unidade lógica atual.

Evite:

```bash
git add .
```

quando existirem alterações misturadas.

Quando um mesmo arquivo contiver mudanças independentes, use staging seletivo por hunk quando necessário.

### 6. Verifique antes do commit

Execute novamente:

```bash
git diff --staged
git status
```

Confirme:

* nenhuma mudança inesperada;
* nenhum secret;
* nenhum arquivo temporário;
* nenhum artefato gerado indevido;
* escopo coerente.

### 7. Defina a mensagem

A mensagem deve explicar a mudança, não o ato de editar.

Prefira:

```text
fix: prevent closing unpaid tables
```

Evite:

```text
update files
```

ou:

```text
changes
```

### 8. Execute apenas quando autorizado

Depois do commit:

```bash
git status
```

Informe:

* hash;
* mensagem;
* arquivos relevantes;
* mudanças que permaneceram fora.

## Output Contract

Antes de um commit, quando houver alterações misturadas, informe:

* **Entra:** arquivos ou mudanças da tarefa.
* **Fica de fora:** alterações não relacionadas.
* **Mensagem:** commit proposto.

Depois do commit, informe:

* hash curto;
* mensagem criada;
* estado atual do `git status`.

Nunca faça push sem solicitação explícita.

```
```
