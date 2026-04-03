# Agent Instructions

> This file is mirrored across CLAUDE.md, AGENTS.md, and GEMINI.md so the same instructions load in any AI environment.

You operate within a 3-layer architecture that separates concerns to maximize reliability. LLMs are probabilistic, whereas most business logic is deterministic and requires consistency. This system fixes that mismatch.

## The 3-Layer Architecture

**Layer 1: Directive (What to do)**
- SOPs written in Markdown, live in `directives/`
- Define the goals, inputs, tools/scripts to use, outputs, and edge cases
- Natural language instructions, like you'd give a mid-level employee

**Layer 2: Orchestration (Decision making)**
- This is you. Your job: intelligent routing.
- Read directives, call execution tools in the right order, handle errors, ask for clarification, update directives with learnings
- You're the glue between intent and execution. Example: you don't try scraping websites yourself—you read `directives/scrape_website.md` and then run `execution/scrape_single_site.py`

**Layer 3: Execution (Doing the work)**
- Deterministic Python scripts in `execution/`
- Environment variables, API tokens stored in `.env`
- Handle API calls, data processing, file operations, database interactions
- Reliable, testable, fast. Use scripts instead of manual work. Comment well.

**Why this works:** If you do everything yourself, errors compound. 90% accuracy per step = 59% success over 5 steps. The solution is push complexity into deterministic code so you focus on decision-making.

## Operating Principles

**1. Check for tools first**
Before writing a script, check `execution/` per your directive. Only create new scripts if none exist.

**2. Self-anneal when things break**
- Read error message and stack trace
- Fix the script and test it again (unless it uses paid tokens/credits—then check with user first)
- Update the directive with what you learned (API limits, timing, edge cases)
- Update `memory.md` with recurring patterns and fixed errors for future sessions
- Example: you hit an API rate limit → investigate API → find a batch endpoint that would fix → rewrite script to accommodate → test → update directive

**3. Update directives as you learn**
Directives are living documents. When you discover API constraints, better approaches, common errors, or timing expectations:
- **For small additions/fixes** (adding an edge case, clarifying a step): Update freely
- **For structural changes** (new directives, major rewrites, changing output format): Ask the user first
- Always document what you changed and why

## Self-Annealing Loop

Errors are learning opportunities. When something breaks:
1. Fix the script
2. Test the script, verify it works
3. Update the directive with the new flow
4. Update `memory.md` with the lesson learned
5. System is now stronger

## Directive Format

Every directive in `directives/` MUST follow this structure:

```markdown
# [Task Name]

## Purpose
[What problem this solves, why it exists]

## Inputs
- Required: [list of mandatory inputs]
- Optional: [list with default values]

## Execution
Script: `execution/[name].py`
Command: `python execution/[name].py --input [value]`

## Expected Outputs
[Where deliverables go—Google Sheets, Slides, or other cloud location]

## Known Edge Cases
- [Problem description] → [Solution approach]
- [API limit] → [Batch approach or workaround]

## Learning History
- [YYYY-MM-DD]: [What was fixed, learned, or improved]