Executa uma funcionalidade em pequenos loops verticais, mantendo cada etapa revisável e publicada separadamente.

**Argumento:** `$ARGUMENTS` — nome ou descrição da funcionalidade.

## Protocolo

### 1. Preparar o loop

Antes de editar:

- Leia `wiki/index.md` e as instruções do projeto.
- Verifique `git status --short`.
- Não misture alterações anteriores ou não relacionadas.
- Divida a funcionalidade em fatias verticais pequenas, cada uma entregando comportamento útil.
- Se houver uma decisão arquitetural importante, pare e peça aprovação antes de implementar.

### 2. Executar uma fatia

Para cada fatia:

1. Declare o objetivo e os arquivos que podem ser alterados.
2. Escreva ou atualize os testes relevantes antes da implementação quando aplicável.
3. Implemente somente essa fatia.
4. Execute a verificação focada e depois as verificações exigidas pelo projeto.
5. Revise `git diff --check`, `git diff --stat` e o diff completo.
6. Confirme que não há arquivos fora do escopo.

### 3. Commit e push

Só faça commit quando a fatia estiver verificável:

- Commit convencional, com uma única finalidade.
- Nunca adicionar `Co-Authored-By` ou atribuição de IA.
- Nunca fazer push de uma fatia conhecida como quebrada.
- Fazer push da branch atual imediatamente após o commit.
- Informar o hash do commit, o resultado dos testes e o próximo loop.

Exemplos de mensagens:

- `feat(stock): add tenant-scoped ingredients`
- `feat(stock): add recipe quantities by unit`
- `test(stock): cover delivery deduction`
- `fix(stock): prevent duplicate inventory movement`

### 4. Continuidade

Depois de cada push:

- Mostre um resumo curto do que foi entregue.
- Liste a próxima fatia.
- Pare para aprovação se a próxima etapa mudar o modelo, a política de negócio ou o escopo.

## Regras de segurança

- Não force push.
- Não use `git reset`, `git clean` ou exclusões destrutivas sem confirmação explícita.
- Não faça commit de segredos, `.env` ou tokens.
- Se os testes falharem por causa de uma alteração preexistente, registre isso e não oculte a falha.
- Se houver alterações não relacionadas no working tree, preserve-as e peça separação antes de continuar.

## Cancelamento

Para cancelar, use `/loops --cancel`. O cancelamento interrompe apenas a sequência futura; commits e pushes já realizados permanecem preservados.
