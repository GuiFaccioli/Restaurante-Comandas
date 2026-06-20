---
title: /loop Command
type: concept
updated: 2026-06-20
tags: [claude-code, automação, agendamento, sessão]
---

# /loop Command

## Definição

Scheduler de sessão do [[claude-code]]. Permite automatizar tarefas recorrentes dentro de uma sessão ativa. Para quando a sessão fecha.

## Sintaxe

```bash
# Interval-based
/loop "prompt descrevendo a tarefa" --interval 15m

# Cron-based
/loop "prompt descrevendo a tarefa" --cron "0 9 * * 1-5"
```

## Contexto de uso neste projeto

Será usado para captura automática de contexto de sessão — ao final de uma conversa, ingere o que foi discutido no [[wiki-index]], incluindo links externos que foram absorvidos. Ver plano de implementação do session-loop.

## Trade-offs

| Prós | Contras |
|------|---------|
| Nativo no Claude Code, sem setup extra | Para quando a sessão fecha (session-dependent) |
| Suporta interval e cron | Context accumulation: tokens crescem por ciclo |
| Simples de configurar com prompt | Output pode variar entre ciclos idênticos |
| Ideal para tasks de monitoring | Custo de API escala com intervalos curtos |

## Alternativa para execução garantida

Quando o loop precisa rodar independente de sessão ativa:

```bash
# Sistema de cron + modo não-interativo
0 9 * * * claude -p "tarefa aqui"
```

Ver [[claude-p-mode]].

## Casos de uso validados

- Code quality reviews automáticos
- Análise de falhas de testes
- Daily commit summaries
- Auditorias de dependências/segurança
- Detecção de documentation drift
- File monitoring em data pipelines
- **Session context capture** (uso planejado neste projeto)

## Relações

- Implementado em: [[claude-code]]
- Alternativa: [[claude-p-mode]]

## Fontes

- [[claude-code-loop-command]]
