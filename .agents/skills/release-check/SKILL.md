````md
---
name: release-check
description: Use when preparing or validating a release, staging deployment, production deployment, version publication, or when deciding whether the current application state is safe to deploy.
metadata:
  project: Restaurante-Comandas
  version: "1.0"
---

# Validação de release e deploy

## Activation Contract

Use esta skill antes de considerar uma versão pronta para:

- staging;
- produção;
- publicação;
- deploy;
- mudança de infraestrutura relacionada à versão.

O objetivo é avaliar prontidão e risco.

Esta skill não concede autorização para executar deploy.

## Hard Rules

- Não faça deploy em produção automaticamente.
- Não execute migration em produção sem autorização explícita.
- Não altere secrets sem autorização.
- Não ignore testes falhando.
- Não esconda falhas de build ou typecheck.
- Não force push.
- Não apague dados.
- Não considere uma versão pronta apenas porque o build passou.
- Preserve separação entre staging e produção.

## Workflow

### 1. Identifique o ambiente

Determine o alvo:

- development;
- staging;
- production.

Não assuma produção quando o ambiente não estiver claro.

### 2. Verifique o Git

Confira:

```bash
git status
git branch --show-current
````

Identifique:

* branch;
* alterações não commitadas;
* arquivos untracked relevantes;
* commits que fazem parte da versão.

Sinalize working tree inesperadamente suja.

### 3. Classifique as mudanças

Identifique se a release inclui:

* frontend;
* backend;
* autenticação;
* autorização;
* banco;
* migrations;
* variáveis de ambiente;
* dependências;
* infraestrutura;
* integrações;
* SSE;
* regras críticas de negócio.

Quanto maior o alcance, maior a necessidade de validação.

### 4. Execute gates técnicos

Use os comandos reais definidos pelo projeto.

Quando existirem, valide:

* lint;
* typecheck;
* testes unitários;
* testes de integração;
* testes E2E;
* build.

Não invente comandos.

Consulte `package.json` antes.

### 5. Verifique banco e migrations

Determine:

* existe nova migration?
* ela já foi aplicada no ambiente correto?
* depende de versão específica do código?
* existe risco para dados existentes?
* rollback é possível?
* aplicação antiga e nova conseguem coexistir durante a publicação?

Mudanças destrutivas devem ser destacadas.

### 6. Verifique configuração

Procure mudanças em:

* `.env.example`;
* variáveis da Vercel;
* Neon;
* URLs;
* tokens;
* callbacks;
* serviços externos;
* flags de ambiente.

Não imprima valores secretos.

### 7. Verifique dependências

Se `package.json` ou lockfile mudou:

* identifique dependências adicionadas ou removidas;
* verifique impacto de runtime;
* confirme que o lockfile corresponde ao manifesto.

### 8. Avalie fluxos críticos

Priorize smoke tests compatíveis com a mudança.

Para este produto, considere quando afetados:

* login;
* seleção de área;
* mesas;
* criação de pedido;
* envio para cozinha;
* atualização de status;
* entrega;
* caixa;
* pagamento;
* estoque;
* isolamento entre estabelecimentos.

Não execute todos indiscriminadamente quando a mudança for localizada.

### 9. Classifique o risco

Classifique como:

#### Baixo

* mudança localizada;
* sem migration;
* testes relevantes passando;
* rollback simples.

#### Médio

* múltiplos fluxos;
* alteração de dependência;
* migration aditiva;
* mudança relevante de comportamento.

#### Alto

* autenticação ou autorização;
* pagamentos;
* dados;
* migration destrutiva;
* alteração de infraestrutura;
* dificuldade de rollback.

### 10. Defina rollback

Antes de recomendar produção, identifique como voltar atrás.

Considere:

* redeploy da versão anterior;
* reversão de configuração;
* compatibilidade da migration;
* restauração de dados quando aplicável.

Não chame algo de rollback seguro sem verificar dependências de banco.

## Depois do deploy

Quando o deploy tiver sido executado com autorização, valide:

* aplicação responde;
* autenticação;
* rota ou fluxo alterado;
* logs relevantes;
* migrations;
* erros inesperados;
* integração com banco.

## Output Contract

Entregue um resumo no formato:

**Ambiente:** staging / production
**Status:** pronto / não pronto / pronto com ressalvas
**Risco:** baixo / médio / alto

### Checks

* testes: ✅ / ❌
* typecheck: ✅ / ❌
* build: ✅ / ❌
* migrations: ✅ / ⚠️ / ❌
* configuração: ✅ / ⚠️ / ❌

### Bloqueadores

Liste somente problemas que realmente impedem o deploy.

### Ressalvas

Liste riscos que não bloqueiam necessariamente a publicação.

### Rollback

Informe a estratégia aplicável à versão.

Nunca declare uma release pronta se existir um gate obrigatório falhando.

```
```
