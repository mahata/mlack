---
name: opencode-research
description: Load this skill when researching OpenCode best practices and planning how to apply them to a project
---

# OpenCode Best Practices Research & Planning

Use this skill when you need to research OpenCode features, best practices, and plan how to apply them to a project's configuration.

## Research Process

### Step 1: Fetch Official Documentation

Read these key documentation pages from opencode.ai using the WebFetch tool:

1. **Intro** — `https://opencode.ai/docs/` — Installation, core workflow (Plan mode vs Build mode), key features
2. **Rules** — `https://opencode.ai/docs/rules/` — AGENTS.md (project rules), global rules, `instructions` array in opencode.json, file references
3. **Agents** — `https://opencode.ai/docs/agents/` — Primary agents (Build/Plan), subagents (General/Explore), custom agents via `.opencode/agents/*.md`
4. **Config** — `https://opencode.ai/docs/config/` — Full `opencode.json` schema (tools, models, themes, agents, commands, keybinds, formatters, permissions, compaction, watcher, MCP servers, plugins, instructions)
5. **Commands** — `https://opencode.ai/docs/commands/` — Custom slash commands via `.opencode/commands/*.md`, template placeholders (`$ARGUMENTS`, `$1`-`$N`), shell output injection
6. **Custom Tools** — `https://opencode.ai/docs/custom-tools/` — TypeScript tool definitions in `.opencode/tools/`, `tool()` helper
7. **Permissions** — `https://opencode.ai/docs/permissions/` — `allow`/`ask`/`deny` per tool, bash command patterns with globs, per-agent overrides
8. **Skills** — `https://opencode.ai/docs/skills/` — `.opencode/skills/<name>/SKILL.md` with YAML frontmatter, on-demand loading

### Step 2: Audit Current Project Configuration

Check for the existence and contents of:

- `opencode.json` — Current OpenCode config
- `AGENTS.md` — Project-level rules for coding agents
- `~/.config/opencode/AGENTS.md` — Global rules (if any)
- `.opencode/` directory — Custom agents, commands, tools, skills
- `tui.json` — TUI configuration (themes, keybinds)
- Build tooling configs (`package.json`, `tsconfig.json`, linter configs)
- CI pipeline (`.github/workflows/`)

### Step 3: Identify Gaps

Compare the project's current setup against OpenCode's feature set:

| Feature | Config Location | Purpose |
|---------|----------------|---------|
| Project rules | `AGENTS.md` | Coding standards, project structure, conventions |
| Instructions | `opencode.json` → `instructions` | Additional rule files, remote URLs |
| Formatter | `opencode.json` → `formatter` | Auto-format on save via project's formatter |
| Permissions | `opencode.json` → `permissions` | Safety controls for tool access |
| Custom commands | `.opencode/commands/*.md` | Slash-command shortcuts for common tasks |
| Custom agents | `.opencode/agents/*.md` | Specialized agents (reviewer, tester, etc.) |
| Custom skills | `.opencode/skills/*/SKILL.md` | On-demand domain knowledge |
| Custom tools | `.opencode/tools/*.ts` | Project-specific tool extensions |
| MCP servers | `opencode.json` → `mcp` | External tool integrations |

### Step 4: Create an Implementation Plan

For each gap identified, create a specific plan item with:

1. **What** to create or modify
2. **Why** it adds value
3. **Priority** (high/medium/low)

Organize the plan by priority. Focus on high-value, low-effort items first:

- **High priority**: `opencode.json` enhancements (formatter, permissions, instructions), slash commands for build/test/lint
- **Medium priority**: Custom agents for specialized review tasks, domain skills
- **Low priority**: Custom tools (only if MCP servers don't cover the need), TUI config

### Step 5: Implement

Execute the plan using the TodoWrite tool to track progress. For each item:

1. Create the file(s)
2. Verify the configuration is valid (check JSON syntax, YAML frontmatter)
3. Mark complete

## Key Principles

1. **Don't over-engineer** — Only add what provides clear value. Skip custom tools if MCP servers already cover the use case.
2. **Read-only agents for review** — Security auditors and code reviewers should have `mode: plan` and deny write permissions.
3. **Commands should be thin wrappers** — They run existing package.json scripts, not complex logic.
4. **Skills are reference docs** — They provide domain knowledge, not instructions. Load them on-demand.
5. **Permissions should be conservative** — Default to `ask` for destructive operations, `deny` for secrets.
6. **AGENTS.md is the source of truth** — Keep it concise and authoritative. Don't duplicate its content in skills or agent definitions.
