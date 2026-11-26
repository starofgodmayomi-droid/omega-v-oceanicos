$ErrorActionPreference = "Stop"
if (Test-Path "$env:APPDATA\npm\pnpm.cmd") {
  & "$env:APPDATA\npm\pnpm.cmd" @args
} elseif (Test-Path "$env:LOCALAPPDATA\pnpm\pnpm.cmd") {
  & "$env:LOCALAPPDATA\pnpm\pnpm.cmd" @args
} elseif (Test-Path "$env:ProgramFiles\nodejs\pnpm.cmd") {
  & "$env:ProgramFiles\nodejs\pnpm.cmd" @args
} else {
  & pnpm @args
}
