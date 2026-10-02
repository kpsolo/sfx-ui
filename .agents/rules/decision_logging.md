# Rule: Mandatory Architectural Decision Logging

## Purpose
Ensure all key decisions, architectural pivots, shader updates, and critical bug diagnoses are persistently recorded in the project's evolution history.

## Trigger & Scope
Always active for the `sfx-ui` repository. Applies whenever creating or editing core engines (`src/core/`), canvas components (`src/canvas-ui/`), or shaders (`src/shaders/`).

## Policy
1. Before concluding any task that introduces an architectural change, core engine modification, or significant bug resolution, verify that an entry has been added to [`history.md`](file:///c:/work/sfx-ui/history.md).
2. The entry must capture:
   - Date and milestone.
   - The problem statement and context.
   - The architectural options considered and why the chosen path was selected.
   - Modified files and implementation specifics.
   - How the change was tested and verified.
