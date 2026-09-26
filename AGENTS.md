# Global PowerShell Instructions

All commands in this workspace must use PowerShell-compatible syntax and cmdlets.

## Guidelines

- Use PowerShell syntax when running terminal commands.
- Prefer PowerShell cmdlets over external Unix commands when available.
- Use PowerShell path conventions with quoted paths when needed.
- Write scripts in PowerShell unless the project explicitly requires another language.
- Use semicolons or PowerShell conditionals to chain commands; do not use `&&`.
- Start servers, dev environments, and other long-running processes in the visible integrated terminal when available so the user and other agents can inspect output.
- When a class has no external dependencies, prefer static methods instead of registering or injecting an instance.

## Soft-deletable entities

- Soft-deletable entities must have a concurrency token.
- When creating an item that references a soft-deletable entity, update that entity's concurrency token in the same transaction. This verifies that it still exists and has not been removed.
- Soft deletion must always update the entity's concurrency token in the same write.

## Testing

- Every command and query handler must have complete automated test coverage for all of its behavior and branches before the work is considered complete.
- Do not run backend builds for validation. Always run the relevant backend tests instead.

## Audit events

- Entity creation must emit one `<entity>_created` audit event with no `oldValue` or `newValue`; do not create per-field audit events for creation. Updates must continue to emit one audit event for each changed field.

## Examples

| Bash | PowerShell |
|------|------------|
| `ls -la` | `Get-ChildItem -Force` |
| `cd ./folder` | `Set-Location .\folder` |
| `cat file.txt` | `Get-Content file.txt` |
| `rm file.txt` | `Remove-Item file.txt` |
| `mkdir new-folder` | `New-Item -ItemType Directory -Name new-folder` |
| `grep pattern file` | `Select-String -Pattern "pattern" -Path file` |
| `export VAR=value` | `$env:VAR = "value"` |
| `echo text` | `Write-Output "text"` |
