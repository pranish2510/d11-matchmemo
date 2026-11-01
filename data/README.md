# Data directory

This folder is reserved for historical ball-by-ball cricket data, replay fixtures, and deterministic match-state snapshots.

The repository is currently in the foundation phase. Data assets will begin landing in Task 2 and onward, with sources such as Cricsheet archives or deterministic replay JSON used to drive future scoring and analytics workflows.

Important:

- Keep raw input data separate from generated application logic.
- Prefer structured JSON or SQLite-ready exports for future ingestion.
- Do not push large datasets into the repository unless explicitly required for a task.
