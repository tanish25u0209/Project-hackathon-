$ErrorActionPreference = 'Stop'
$port = 8081
Write-Host "Starting static server on http://127.0.0.1:$port/index.html"
python -m http.server $port
