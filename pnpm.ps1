$bin = "C:\Users\pc\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
$env:PATH = "$bin;" + $env:PATH
& "$bin\node.exe" "C:\Users\pc\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\pnpm\bin\pnpm.cjs" @args
