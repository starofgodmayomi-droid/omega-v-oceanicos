$bin = "C:\Users\pc\AppData\Local\OpenAI\Codex\runtimes\cua_node\fb8898c05a62885e\bin"
$env:PATH = "$bin;" + $env:PATH
& "$bin\node.exe" "$bin\node_modules\corepack\dist\pnpm.js" @args
