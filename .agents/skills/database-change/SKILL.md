---
name: database-change
description: Use when changing database schemas, tables, columns, relations, indexes, constraints, migrations, queries, persisted data structures, or behavior that affects PostgreSQL, Neon, Drizzle, or SQLite compatibility.
metadata:
  project: Restaurante-Comandas
  version: "1.0"
---

# Alterações de banco de dados

## Activation Contract

Use esta skill sempre que uma tarefa alterar:

- schema;
- tabela;
- coluna;
- relacionamento;
- índice;
- constraint;
- enum;
- migration;
- dados persistidos;
- comportamento de leitura ou escrita que dependa da estrutura do banco.

## Hard Rules

- Preserve isolamento multi-tenant.
- Nunca remova dados de produção como atalho para resolver incompatibilidades.
- Nunca execute migration em produção sem autorização explícita.
- Não altere migrations já aplicadas apenas para esconder uma nova mudança.
- Prefira criar uma nova migration quando o histórico já estiver compartilhado ou aplicado.
- Não invente valores para dados existentes sem justificar a estratégia.
- Não introduza breaking changes silenciosamente.
- Considere PostgreSQL/Neon como ambiente persistente real.
- Verifique compatibilidade com SQLite quando o trecho afetado ainda fizer parte do fluxo local que depende dele.
- Nunca exponha secrets ou connection strings.

## Workflow

### 1. Entenda a mudança de domínio

Antes de editar o schema, determine:

- qual problema de produto está sendo resolvido;
- qual entidade muda;
- quais relações existem;
- quais dados atuais dependem dela;
- se a mudança é obrigatória ou opcional.

Não modele apenas para satisfazer a tela atual.

### 2. Localize a fonte de verdade

Identifique:

- schema Drizzle utilizado;
- migrations existentes;
- queries afetadas;
- Server Actions ou serviços que escrevem dados;
- leituras dependentes;
- seeds;
- testes;
- tipos derivados.

Evite criar uma segunda representação da mesma entidade sem necessidade.

### 3. Avalie dados existentes

Antes de adicionar constraints ou campos obrigatórios, responda:

- existem registros antigos?
- eles possuem valor compatível?
- é necessário default?
- é necessário backfill?
- a migration pode falhar com dados atuais?
- há risco de perda de informação?

### 4. Verifique multi-tenancy

Para dados pertencentes a um estabelecimento, confirme quando aplicável:

- presença de `restaurantId` ou identificador equivalente;
- filtro por tenant nas queries;
- relações limitadas ao tenant correto;
- unicidade com escopo adequado;
- ausência de acesso cruzado entre estabelecimentos.

Nunca confie apenas em filtros de interface.

### 5. Planeje a migration

Prefira migrations:

- pequenas;
- explícitas;
- reversíveis quando possível;
- compatíveis com dados existentes.

Classifique a alteração como:

- aditiva;
- compatível;
- potencialmente destrutiva;
- destrutiva.

Mudanças destrutivas exigem atenção explícita.

### 6. Avalie índices e constraints

Adicione índices somente quando houver motivo concreto.

Considere:

- filtros frequentes;
- joins;
- ordenações;
- chaves estrangeiras;
- unicidade;
- volume esperado.

Não crie índices preventivos indiscriminadamente.

### 7. Atualize o código dependente

Depois do schema, procure alterações necessárias em:

- inserts;
- updates;
- selects;
- tipos;
- validações;
- formulários;
- seeds;
- testes;
- serialização;
- regras de negócio.

Não deixe o schema e a aplicação em estados incompatíveis.

### 8. Valide

Execute os testes relacionados.

Quando aplicável:

- valide migrations localmente;
- execute typecheck;
- execute testes;
- execute build;
- confirme que dados existentes continuam legíveis;
- confirme que escrita e leitura funcionam após a mudança.

## Mudanças sensíveis

Pare e sinalize antes de executar quando envolver:

- `DROP TABLE`;
- `DROP COLUMN`;
- alteração que possa apagar registros;
- mudança irreversível;
- migration em produção;
- backfill de grande volume;
- alteração de chave primária;
- mudança de relacionamento com risco de órfãos.

## Output Contract

Ao concluir, informe:

- **Mudança de domínio:** o que passou a existir ou funcionar diferente.
- **Schema:** estruturas alteradas.
- **Migration:** criada ou necessária.
- **Dados existentes:** impacto identificado.
- **Multi-tenant:** como o isolamento foi preservado.
- **Validação:** testes e verificações executados.
- **Risco:** somente quando houver impacto relevante.