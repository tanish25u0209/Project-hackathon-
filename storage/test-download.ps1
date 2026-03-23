# Test metadata and download endpoints
$fileId = "1M2LGsWMs97cNgz5BM_e1r1tzCywd1AUn"
$metaUrl = "http://localhost:8001/file/$fileId/meta"
$downloadUrl = "http://localhost:8001/file/$fileId"
$downloadPath = "D:\Projects\project hackathon\storage\Capture-downloaded.PNG"

Write-Host "==================== METADATA TEST ====================" -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri $metaUrl -Method Get -UseBasicParsing
    Write-Host "✅ Metadata retrieved successfully!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    Write-Host ($response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 5)
} catch {
    Write-Error "Metadata request failed: $_"
}

Write-Host "`n==================== DOWNLOAD TEST ====================" -ForegroundColor Cyan

try {
    Write-Host "Downloading file to: $downloadPath" -ForegroundColor Cyan
    Invoke-WebRequest -Uri $downloadUrl -OutFile $downloadPath -UseBasicParsing
    
    if (Test-Path $downloadPath) {
        $downloadedSize = (Get-Item $downloadPath).Length
        Write-Host "✅ Download successful!" -ForegroundColor Green
        Write-Host "Downloaded file size: $downloadedSize bytes" -ForegroundColor Green
        Write-Host "File saved to: $downloadPath" -ForegroundColor Green
    }
} catch {
    Write-Error "Download request failed: $_"
}

Write-Host "`n" -ForegroundColor Cyan
