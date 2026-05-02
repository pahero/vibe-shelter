---
name: global-powershell-instructions
description: Global instructions for the vibe-shelter workspace requiring all commands to use PowerShell equivalents
---

# Global PowerShell Instructions

All commands in this workspace must be executed using PowerShell (pwsh) equivalents, not bash.

## Key Guidelines

- **Terminal Environment**: Always use PowerShell syntax and cmdlets when running terminal commands
- **Command Conversion**: Convert bash commands to their PowerShell equivalents (e.g., use `Get-ChildItem` instead of `ls`, `Remove-Item` instead of `rm`)
- **File Paths**: Use PowerShell path conventions with backslashes or forward slashes appropriately
- **Scripting**: Write any scripts using PowerShell, not bash

## Examples

| Bash | PowerShell |
|------|-----------|
| `ls -la` | `Get-ChildItem -Force` |
| `cd ./folder` | `cd .\folder` or `Set-Location .\folder` |
| `cat file.txt` | `Get-Content file.txt` |
| `rm file.txt` | `Remove-Item file.txt` |
| `mkdir new-folder` | `New-Item -ItemType Directory -Name new-folder` |
| `grep pattern file` | `Select-String -Pattern "pattern" -Path file` |
| `export VAR=value` | `$env:VAR = "value"` |
| `echo text` | `Write-Output "text"` or `Write-Host "text"` |

## When Running Commands

1. Always specify `mode='async'` or `mode='sync'` appropriately in terminal commands
2. Use semicolons (`;`) to chain commands in PowerShell, not ampersands (`&&`)
3. Prefer PowerShell cmdlets over external commands when available
4. Remember that PowerShell is the current terminal environment in this workspace
5. **Always start applications in the integrated terminal** — never run them internally. This allows the user and other agents to see the output and interact with running processes.

## Terminal Visibility

- Start servers, dev environments, and long-running processes using `run_in_terminal` with `mode='async'`
- Use `get_terminal_output` to check status and retrieve results
- Never suppress terminal output or run processes silently in the background without user visibility
