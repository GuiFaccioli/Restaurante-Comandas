---
title: Claude Code
type: entity
updated: 2026-06-20
tags: [ferramenta, cli, anthropic, ia]
---

# Claude Code

## O que é

CLI oficial da Anthropic para interação com Claude em ambientes de desenvolvimento. Roda no terminal, integra com IDEs (VS Code, JetBrains) e possui sistema de skills, hooks, memória persistente e comandos slash customizáveis.

## Características principais

- Slash commands nativos e customizáveis (via `.claude/commands/`)
- Sistema de memória persistente por projeto
- Hooks configuráveis (pre/post tool use, session start)
- Suporte a MCP servers
- Modo não-interativo via `claude -p` para uso em scripts/cron

## Comandos relevantes para este projeto

| Comando | Função |
|---------|--------|
| `/ingest` | Ingere fonte no [[wiki-index]] |
| `/query` | Busca no wiki |
| `/lint` | Health check do wiki |
| `/loop` | Scheduler de tarefas recorrentes na sessão — ver [[loop-command]] |

## Relações

- Usa: [[loop-command]], [[claude-p-mode]]
- Mantém: este wiki

## Histórico de decisões

| Data | Decisão | Motivo |
|------|---------|--------|
| 2026-06-20 | Usado como motor do LLM Wiki | Integração nativa com slash commands e memória por projeto |

## Fontes

- [[claude-code-loop-command]]
