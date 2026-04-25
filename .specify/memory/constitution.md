<!--
Sync Impact Report
- Version change: 0.0.0 -> 1.0.0
- Modified principles:
  - N/A (initial ratification)
- Added sections:
  - Repository Scope And Structure
  - Development Workflow And Quality Gates
- Removed sections:
  - None
- Templates requiring updates:
  - .specify/templates/plan-template.md: updated
  - .specify/templates/spec-template.md: updated
  - .specify/templates/tasks-template.md: updated
  - .specify/templates/commands/*.md: pending (directory not present in this repository)
- Runtime guidance updates:
  - README.md: updated
- Follow-up TODOs:
  - None
-->
# AI_devs 4 Learning Repository Constitution

## Core Principles

### I. Curriculum-First Repository Layout
The repository MUST preserve the course-driven layout. Directories `.01`, `.02`, ...
represent week-level materials, while `x_y_*` naming represents `week_day_*` learning
units. This preserves navigability for study and review.
Rationale: a stable learning map is required to keep examples, notes, and exercises
discoverable across all five course weeks.

### II. Naming Is A Contract
Directory names for examples MUST follow `x_y_example_name`. Daily task starter content
MUST live in `x_y_zadanie_template` (or its day-specific derivative if introduced later)
and MUST remain clearly distinguishable from solved tasks. Renames that break this
pattern are not allowed without a constitution amendment.
Rationale: consistent names are required for human orientation and for scriptable
automation across lessons.

### III. Example/Task Separation Is Mandatory
Examples are reference implementations and MUST stay isolated from user solutions.
Task templates MUST stay minimal, reusable, and free of copied solved outputs.
When adding new materials, contributors MUST explicitly choose one category:
example, template, or solved task.
Rationale: mixing categories weakens learning outcomes and makes progression tracking
harder.

### IV. MCP Compatibility By Default
Shared MCP server implementations in `mcp/` MUST be reusable by both examples and task
solutions. Any change in `mcp/` that can affect existing lessons MUST include migration
notes and backward compatibility guidance in docs or commit description.
Rationale: MCP infrastructure is a cross-cutting dependency for the repository and
regressions here block many learning paths.

### V. Runnable And Verifiable Learning Artifacts
Each new example or task workflow MUST provide explicit run instructions (script name
or command), required environment variables, and expected outputs or acceptance checks.
If external services are required, the dependency MUST be stated where the feature is
introduced.
Rationale: learning assets are only useful when reproducible on a fresh local setup.

## Repository Scope And Structure

- Scope: practical learning of agent-building patterns from the AI_devs 4 course.
- Time model: five-week curriculum with per-day lesson granularity.
- Canonical directories:
  - `.01`, `.02`, ... for week-oriented materials and supporting assets.
  - `x_y_example_name` for day-specific examples.
  - `x_y_zadanie_template` for task starter templates.
  - `mcp/` for MCP servers shared across examples and tasks.
- Cross-directory utilities (root scripts/config) MUST avoid hardcoding one lesson path
  when reusable alternatives exist.

## Development Workflow And Quality Gates

- Before merging structural changes, verify naming and placement against Principles I-II.
- Before merging MCP changes, verify at least one consumer workflow still runs and
document compatibility impact.
- New learning unit folders MUST include:
  - concise purpose description,
  - runnable command(s),
  - environment requirements.

## Governance

This constitution overrides conflicting local conventions in lesson subdirectories.
Amendments require: (1) a documented rationale, (2) explicit version bump decision
using semantic versioning for governance text, and (3) synchronization of impacted
templates under `.specify/templates/`.

Compliance review is required in planning and task-generation phases:
- `/speckit-plan` outputs MUST pass Constitution Check gates derived from this file.
- `/speckit-tasks` outputs MUST include tasks that enforce repository structure,
  MCP compatibility, and runnable verification requirements.
- Reviews MUST reject changes that violate naming contracts or collapse
  example/template/solution boundaries.

Versioning policy for this constitution:
- MAJOR: incompatible governance or principle removals/redefinitions.
- MINOR: new principle/section or materially expanded obligations.
- PATCH: clarifications, wording improvements, typo fixes.

**Version**: 1.0.0 | **Ratified**: 2026-04-26 | **Last Amended**: 2026-04-26
