# Project Wiki — Instruções para Claude

## Carregamento obrigatório

Ao iniciar qualquer sessão neste projeto, leia `wiki/index.md` primeiro. Ele é o ponto de entrada para todo o conhecimento acumulado. Se precisar de mais contexto sobre um tópico, siga os links para as páginas específicas antes de responder.

## Seu papel

Você é o mantenedor deste wiki. Quando aprender algo novo durante a sessão — uma decisão, um conceito, um detalhe sobre entidade — atualize o wiki. Não espere o usuário pedir.

## Estrutura do wiki

```
wiki/
  index.md          # entrada principal, sumário geral
  meta/
    schema.md       # regras de manutenção e convenções
    changelog.md    # log de mudanças
  entities/         # coisas específicas: sistemas, serviços, pessoas, produtos
  concepts/         # ideias abstratas: padrões, decisões de arquitetura, glossário
  sources/          # resumos de fontes ingeridas (docs, artigos, URLs)
```

## Regras de manutenção

1. **Nunca modifique fontes brutas** — apenas crie/atualize páginas do wiki
2. **Cross-references sempre** — use `[[nome-da-página]]` ao mencionar algo que tem ou deveria ter página própria
3. **Contradições são sinalizadas**, não silenciadas — marque com `⚠️ CONTRADIÇÃO:` e registre ambas as versões
4. **Cascade automático** — ao atualizar uma página, verifique se outras páginas que a referenciam precisam de ajuste
5. **index.md é sempre atualizado** quando uma página nova é criada

## Slash commands disponíveis

- `/ingest` — ingere uma fonte e atualiza o wiki
- `/query` — busca no wiki e sintetiza resposta
- `/lint` — health check: contradições, links quebrados, lacunas

## Convenção de arquivos

- Nomes em kebab-case: `nome-do-arquivo.md`
- Cabeçalho obrigatório em todo arquivo:
  ```
  ---
  title: Título
  type: entity|concept|source
  updated: YYYY-MM-DD
  tags: [tag1, tag2]
  ---
  ```
