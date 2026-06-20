<!-- RAW SOURCE — NÃO EDITAR. Conteúdo verbatim capturado em 2026-06-20 -->
<!-- URL: https://www.mindstudio.ai/blog/what-is-claude-code-loop-command-recurring-tasks -->

# When You're Tired of Typing the Same Prompt Every Day

Most Claude Code users discover the same problem after a few weeks: they're running the same prompt manually, on repeat, every time they need a status check, a code review, or a fresh summary of recent changes. It works, but it's busywork. You open a terminal, type something you've typed a hundred times, wait for the output, and move on.

The Claude Code `/loop` command exists to fix that. It lets you schedule prompts to fire automatically on a set cadence — no manual triggering, no cron scripts from scratch, no third-party scheduler. You define what you want Claude to do, you define when you want it to happen, and it runs.

This article covers exactly how the `/loop` command works, how to set it up in your session, the types of tasks it handles well, where it falls short, and what to do when you need something more than terminal-level scheduling. If you're exploring how to automate recurring AI tasks — whether with Claude Code or beyond — this is the full picture.

---

## What Claude Code Is and Why Automation Matters

### Claude Code at a Glance

Claude Code is Anthropic's terminal-based AI coding tool. Unlike chat interfaces, it runs directly in your development environment. It can read your codebase, make edits, run shell commands, check test output, browse the web, and operate as an autonomous agent — all from the command line.

It ships with a set of slash commands for managing sessions, configuration, memory, and workflow. Commands like `/clear`, `/compact`, `/config`, `/memory`, and `/review` let you control Claude's behavior without leaving the terminal.

The tool also supports non-interactive mode. With the `-p` flag, you can pass Claude a prompt and pipe the output elsewhere — to a log file, another script, a CI pipeline, or whatever downstream system needs it.

### Why Recurring Tasks Are a Real Problem

The issue is that most useful AI automation isn't one-and-done. Checking whether test coverage dropped. Summarizing recent commits every morning. Monitoring for deprecated API patterns. Reviewing open pull requests. These tasks repeat, and they're worth automating because the manual effort adds up quickly.

The naive solution is wrapping `claude -p "your prompt"` in a shell script and adding that script to your system crontab. That works, but it's fragile. You have to manage authentication state, output logging, error handling, and context manually. The `/loop` command offers a more managed path from inside Claude Code's own interface.

### The Session Model

One thing to understand upfront: Claude Code operates within sessions. A session has context — files you've mentioned, tools you've used, memory you've loaded. When you close it, that context doesn't automatically persist for the next run unless you've set up memory explicitly.

This matters for `/loop` because recurring tasks that rely on session continuity have to be set up with that constraint in mind.

---

## What the /loop Command Actually Does

The `/loop` command in Claude Code is a session-level scheduler. You give it a prompt and a cadence, and it queues that prompt to repeat at the interval you specify — without you having to reinitiate it manually each time.

### The Core Behavior

When you run `/loop`, you're telling Claude Code to register a recurring task tied to your current session. The command takes two main inputs:

1. **The prompt** — what you want Claude to do on each cycle
2. **The schedule** — how often you want it to run (expressed as a time interval or a cron-style expression, depending on the version)

On each tick, Claude Code fires the prompt as if you had typed it yourself. It executes against the current project context, uses whatever tools you've given it permission to use, and produces output it can act on or log.

### Basic Syntax

```
/loop "check for new TODO comments and report any added in the last commit" --interval 15m
```

Or with a more specific schedule:

```
/loop "run the test suite and summarize failures" --cron "0 9 * * 1-5"
```

The `--interval` flag takes values like `5m`, `1h`, `30s`. The `--cron` flag accepts standard five-field cron expressions for more precise scheduling. Some versions also accept `--times` to cap the number of cycles.

### Output Handling

By default, `/loop` outputs to your terminal session. For unattended operation, redirect using Claude Code's built-in logging options or shell redirection operators.

---

## How to Set Up Your First /loop Task

### Prerequisites

1. Claude Code installed and authenticated
2. In the right working directory
3. Permissions configured for tools needed
4. Session kept alive (tmux/screen for long-running loops)

### Step 1: Start a Claude Code Session

```
cd /path/to/your/project
claude
```

### Step 2: Define Your Task

Good `/loop` candidates:
- Produce consistent, interpretable output each time
- Don't require human decision-making mid-execution
- Are idempotent (running twice doesn't cause problems)
- Have a clear, bounded scope

### Step 3: Run the /loop Command

```
/loop "check the src/ directory for any imports of deprecated-utils.js and print the file paths" --interval 1h
```

### Step 4: Keep the Session Alive

```bash
# Using tmux
tmux new -s claude-loop
claude
# run /loop command
# detach with Ctrl+B, D

# Or screen
screen -S claude-session
claude
# run /loop command
# detach with Ctrl+A, D
```

### Step 5: Cancel a loop

```
/loop --cancel
```

---

## Practical Applications

- **Continuous Code Quality Monitoring**: `/loop "review files changed in the last git commit and flag any functions over 50 lines or missing error handling" --interval 30m`
- **Automated Test Failure Analysis**: `/loop "run npm test and if any tests fail, identify the most likely cause based on recent code changes" --interval 2h`
- **Commit Summary Digests**: `/loop "summarize all commits from the last 24 hours in plain language, grouped by feature area" --cron "0 8 * * 1-5"`
- **Dependency and Security Monitoring**: `/loop "run npm audit and list any high or critical vulnerabilities, with recommended actions" --interval 24h`
- **Documentation Drift Detection**: `/loop "compare the API documentation in /docs with the current function signatures in /src/api and report any mismatches" --interval 1d`
- **File-Based Workflow Monitoring**: `/loop "check the /output directory for files created in the last hour and report if any are missing from the expected list" --interval 1h`

---

## Combining /loop with System-Level Cron

For more robust scheduling, use system cron with `claude -p`:

```bash
#!/bin/bash
# claude-daily-check.sh
cd /path/to/your/project
claude -p "summarize all commits from the last 24 hours by feature area" >> /var/log/claude-daily.log 2>&1
```

Crontab entry:
```
0 8 * * 1-5 HOME=/home/yourusername /path/to/claude-daily-check.sh
```

Log with timestamps:
```bash
echo "=== $(date '+%Y-%m-%d %H:%M:%S') ===" >> /var/log/claude-task.log
claude -p "your prompt" >> /var/log/claude-task.log 2>&1
```

---

## Limitations

### Session Dependency
`/loop` tasks die when the session dies. Process-bound, not system-bound.

### Context Accumulation
Session history grows over cycles, affecting response quality and token costs. Use `/compact` periodically.

### API Costs at Scale
Every cycle consumes tokens. A $0.05/run task at 5-minute intervals = $14.40/day.

### Tool Permissions
If a loop task uses a tool not explicitly permitted, it will stop and ask for confirmation (breaking unattended operation) or fail silently.

### Output Reliability
Responses aren't deterministic. For machine-parseable output: `/loop "output ONLY a JSON array of file paths, no other text" --interval 1h`

### No Native Alerting
No built-in alerting. Must monitor logs externally or pipe to a script that sends Slack/email notifications.

---

## FAQ

**Does /loop persist after closing terminal?** No. Use tmux/screen or system cron with `claude -p`.

**Can I run multiple /loop tasks simultaneously?** Yes, but they run sequentially, not in parallel.

**What happens on error?** Reports in session output and attempts next scheduled cycle. No automatic retry or external alert.

**Is there a minimum interval?** No hard-coded minimum, but very short intervals hit API rate limits quickly.

**Can /loop trigger external actions (Slack, email)?** Not directly. Claude can generate a shell command that calls an external script or uses `curl` to hit a webhook.

**Does /loop affect context availability?** Yes. Use `/compact` periodically for long-running loops.

---

## Key Takeaways

- `/loop` schedules prompts at set intervals — in-session cron without crontab setup
- Process-bound: stops when session ends. Pair with `tmux`/`screen` or use `claude -p` + system cron for persistence
- Best for: code quality, test analysis, commit summaries, dependency checks, documentation drift
- API costs scale with frequency — estimate cost per cycle before setting short intervals
- No native alerting — build external log monitoring for production use
