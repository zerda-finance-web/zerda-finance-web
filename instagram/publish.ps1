param([string]$templateType)

$root     = "C:\Users\check\Desktop\Proyecto\Marketing\instagram"
$logFile  = "$root\publish.log"
$today    = Get-Date -Format "yyyyMMdd"
$marker   = "$root\.published_${today}_${templateType}"

function Log($msg) {
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $msg"
    Add-Content -Path $logFile -Value $line -Encoding UTF8
    Write-Host $line
}

if (Test-Path $marker) {
    Log "Ya publicado hoy: $templateType - saltando"
    exit 0
}

Log "Iniciando publicacion: $templateType"

Set-Location $root
$output = & "C:\Program Files\nodejs\node.exe" "$root\generate-and-publish.js" $templateType 2>&1
Add-Content -Path $logFile -Value ($output | Out-String) -Encoding UTF8

if ($LASTEXITCODE -eq 0) {
    New-Item $marker -ItemType File -Force | Out-Null
    Log "Publicado exitosamente: $templateType"
    exit 0
} else {
    Log "ERROR al publicar: $templateType (reintento en 1h hasta las 18:00)"
    exit 1
}