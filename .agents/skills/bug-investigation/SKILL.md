---
name: bug-investigation
description: Use when investigating bugs, unexpected behavior, regressions, inconsistent states, failed flows, or reports that something in the application is not working as expected.
metadata:
  project: Restaurante-Comandas
  version: "1.0"
---

# Investigação de bugs

## Activation Contract

Use esta skill antes de corrigir bugs, regressões ou comportamentos inesperados.

O objetivo é encontrar e corrigir a **causa real**, evitando alterações baseadas apenas no sintoma observado.

## Hard Rules

- Não altere código antes de entender o fluxo afetado.
- Não assuma a causa apenas pela mensagem de erro ou pelo arquivo onde o problema apareceu.
- Diferencie fato observado, hipótese e causa confirmada.
- Preserve regras de negócio existentes.
- Preserve isolamento multi-tenant.
- Não altere comportamento não relacionado ao bug.
- Prefira a menor correção capaz de resolver a causa.
- Não silencie erros apenas para fazer o fluxo continuar.
- Não remova validações ou controles de segurança para fazer um teste passar.
- Preserve alterações preexistentes não relacionadas à tarefa.

## Workflow

### 1. Entenda o problema

Determine:

- comportamento esperado;
- comportamento atual;
- onde ocorre;
- quando ocorre;
- quais usuários, papéis ou entidades são afetados;
- se o problema é reproduzível.

Se a descrição for insuficiente, investigue o código e os testes antes de pedir mais contexto.

### 2. Reproduza

Sempre que possível, reproduza o problema antes da correção.

Use o meio mais adequado:

- teste unitário;
- teste de integração;
- Playwright;
- chamada direta;
- execução local;
- inspeção de banco;
- análise de logs.

Registre a condição necessária para reproduzir.

### 3. Trace o fluxo real

Siga a execução completa.

Considere, quando aplicável:

- componente;
- formulário;
- Server Action;
- Route Handler;
- autenticação;
- autorização;
- validação;
- regra de negócio;
- query;
- transação;
- banco;
- SSE/eventos;
- atualização de estado no cliente.

Não pare no primeiro arquivo aparentemente relacionado.

### 4. Identifique a causa

Classifique o que encontrou como:

- **evidência** — comportamento observado;
- **hipótese** — possível explicação ainda não comprovada;
- **causa raiz** — explicação confirmada pelas evidências.

Antes de implementar, consiga explicar:

> O problema acontece porque X causa Y quando Z ocorre.

### 5. Verifique o impacto

Procure:

- outros fluxos que usam a mesma função;
- chamadas compartilhadas;
- estados equivalentes;
- testes existentes;
- possíveis regressões;
- efeitos sobre outros tenants;
- efeitos sobre outros papéis de usuário.

### 6. Implemente a correção

Prefira:

- mudança pequena;
- localizada;
- previsível;
- compatível com o comportamento atual.

Não faça refactors amplos durante uma correção simples, salvo quando forem necessários para eliminar a causa com segurança.

### 7. Proteja contra regressão

Quando fizer sentido, adicione ou ajuste um teste que:

1. falharia com o comportamento anterior;
2. passe com a correção;
3. represente o cenário real do bug.

### 8. Valide

Execute os testes relevantes.

Quando a mudança justificar, execute também:

- typecheck;
- testes unitários;
- testes de integração;
- Playwright;
- build.

## Output Contract

Ao concluir, informe de forma objetiva:

- **Problema:** o que estava acontecendo.
- **Causa raiz:** por que acontecia.
- **Correção:** o que foi alterado.
- **Validação:** como foi comprovado.
- **Riscos ou pendências:** somente se existirem.

Não apresente uma hipótese como causa confirmada.