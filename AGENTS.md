# Global PowerShell Instructions

All commands in this workspace must use PowerShell-compatible syntax and cmdlets.

## Guidelines

- Use PowerShell syntax when running terminal commands.
- Prefer PowerShell cmdlets over external Unix commands when available.
- Use PowerShell path conventions with quoted paths when needed.
- Write scripts in PowerShell unless the project explicitly requires another language.
- Use semicolons or PowerShell conditionals to chain commands; do not use `&&`.
- Start servers, dev environments, and other long-running processes in the visible integrated terminal when available so the user and other agents can inspect output.

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
