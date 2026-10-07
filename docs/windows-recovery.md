# Windows execution recovery

The last direct checks on 7 October 2026 still failed:
exec_command could not spawn a process; node_repl rejected the configured
file:///mnt/c/... sandbox working-directory URI. The desktop runtime reports
native Windows binaries. A path/environment mismatch is an inference from
these errors, not an independently diagnosed root cause.

## User recovery steps

1. Open File Explorer and paste:
   C:\Users\dhuma\Documents\ChatGPT\Groceries Compare
   Check whether prototype\preview.html exists. If it does not, report that
   before moving, deleting or recreating anything; file visibility must be resolved.
2. In desktop app settings, select Windows native for Agent environment and
   PowerShell for Integrated terminal shell for this Windows-folder project.
   Restart the app after a change. The agent and integrated terminal choices
   are independent; changing only the terminal shell does not change the agent.
3. Open/add this folder as a local project using its C:\ path, rather than
   entering /mnt/c/ as a Windows-native project path. Return to the project
   chat and report that it has been reopened. Keep this existing source folder.
4. The agent will retry execution, run node --test, regenerate the preview and
   check the app in a real browser. A restart/reopen is a recovery attempt,
   not a guaranteed fix for the current host/session failure.

Official reference:
https://learn.chatgpt.com/docs/windows/windows-app

No administrator launch, full-access setting, reinstall, global shell-policy
change, or package installation is requested for this first recovery attempt.

## Optional local diagnostic

From a working PowerShell terminal inside prototype/, run:

    .\scripts\check-environment.ps1

Add -RunTests to execute the canonical Node tests. The script checks only
selected project files and known tool paths; it does not install tools, change
settings or publish anything. If Windows prevents the script from running,
report the error rather than changing machine policy merely for this diagnostic.

## Work already proceeding

The coverage audit and routing boundary are being built and checked in the
isolated V8 environment. These checks do not establish live Münster prices
or replace a canonical filesystem Node test run or real-browser check.
