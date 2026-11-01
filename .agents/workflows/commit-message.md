---
description: Check git staged changes and generate Conventional Commits message in English when user prompts /commit-message.
---

# Commit Message Workflow (`/commit-message`)

Trigger this workflow whenever the user runs `/commit-message` or asks to generate a commit message for staged changes.

## Step 1: Check Staged Changes

Run:
```bash
git status -s
git diff --cached --stat
```

### Scenario A: No staged changes
If `git diff --cached --stat` has no output:
1. List untracked and unstaged files from `git status -s`.
2. Inform the user:
   > "No staged changes detected. Please stage files with `git add <file>` first, or specify which files to stage."
3. Stop workflow.

### Scenario B: Staged changes present
Proceed to Step 2.

---

## Step 2: Read Diff & Analyze Changes

Run:
```bash
git diff --cached
```

Analyze:
1. Affected components, files, and architectural layers (e.g. backend, frontend, docker, CI/CD, tests).
2. Primary intent of changes (feature addition, bug fix, refactor, performance tuning, CI change, documentation).
3. If minified or generated files (`package-lock.json`, `dist/`) are staged, focus analysis on the original source code changes.

---

## Step 3: Format Conventional Commit Message (English)

Construct the commit message following the **Conventional Commits** specification:

### Header Format:
```
<type>(<scope>): <imperative subject max 72 chars>
```
- **Type**:
  - `feat`: New feature or user-facing functionality
  - `fix`: Bug fix
  - `refactor`: Code restructuring without logic/behavior change
  - `perf`: Performance improvement
  - `test`: Adding or modifying tests
  - `docs`: Documentation changes
  - `style`: Formatting, whitespace, semicolons
  - `chore`: Tooling, build system, dependencies
  - `ci`: CI/CD pipelines and deployment scripts
- **Scope** (optional): Lowercase module name (e.g. `docker`, `builder`, `auth`, `queue`, `vnc`, `executor`, `api`).
- **Subject**:
  - Written in English.
  - Imperative mood, present tense (e.g. "add", "fix", "update", NOT "added" or "fixing").
  - Lowercase, maximum 72 characters, no ending period.

### Body Format:
Bulleted summary in English detailing what was changed and why:
```
- Bullet point 1 explaining key change and motivation
- Bullet point 2 explaining affected components
```

### Footer (if applicable):
- `BREAKING CHANGE: <explanation>`
- Issue references, e.g., `Closes #123`.

---

## Step 4: Present Output

Output:
1. Summary of staged files analyzed.
2. The formatted commit message block.
3. Ready-to-copy `git commit` command (bash and PowerShell).

