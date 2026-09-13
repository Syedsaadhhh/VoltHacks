# CutHush local development launcher (Windows PowerShell)
$ErrorActionPreference = "Stop"

Write-Host "CutHush - browser hardware-in-the-loop test cell" -ForegroundColor Cyan
$LanIP = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } |
    Sort-Object InterfaceMetric |
    Select-Object -First 1 -ExpandProperty IPAddress
if ($LanIP) {
    Write-Host "Phone pairing origin: http://${LanIP}:5173" -ForegroundColor Yellow
} else {
    Write-Host "Phone pairing origin: enter this laptop's LAN IPv4 address in the app" -ForegroundColor Yellow
}

$BackendJob = Start-Job -ScriptBlock {
    Set-Location $using:PSScriptRoot/..
    python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
}
Start-Sleep -Seconds 2
Set-Location "$PSScriptRoot/../frontend"
npm run dev
Stop-Job $BackendJob -ErrorAction SilentlyContinue
Remove-Job $BackendJob -ErrorAction SilentlyContinue
