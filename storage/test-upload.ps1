# Test file upload to the storage backend
$filePath = "D:\Projects\project hackathon\storage\Capture.PNG"
$uploadUrl = "http://localhost:8001/upload"

if (-Not (Test-Path $filePath)) {
    Write-Error "File not found: $filePath"
    exit 1
}

try {
    Write-Host "Uploading file: $filePath" -ForegroundColor Cyan
    Write-Host "URL: $uploadUrl" -ForegroundColor Cyan
    
    $fileInfo = Get-Item $filePath
    Write-Host "File size: $($fileInfo.Length) bytes" -ForegroundColor Cyan
    
    # Read file as bytes
    $fileBytes = [System.IO.File]::ReadAllBytes($filePath)
    
    # Create multipart form boundary
    $boundary = [System.Guid]::NewGuid().ToString()
    $contentType = "multipart/form-data; boundary=$boundary"
    
    # Build multipart body
    $bodyBuilder = New-Object System.IO.MemoryStream
    $writer = New-Object System.IO.StreamWriter($bodyBuilder)
    
    # Add file part
    $writer.Write("--$boundary`r`n")
    $writer.Write("Content-Disposition: form-data; name=`"file`"; filename=`"Capture.PNG`"`r`n")
    $writer.Write("Content-Type: image/png`r`n")
    $writer.Write("`r`n")
    $writer.Flush()
    
    $bodyBuilder.Write($fileBytes, 0, $fileBytes.Length)
    $writer.Write("`r`n--$boundary--`r`n")
    $writer.Flush()
    
    $bodyBytes = $bodyBuilder.ToArray()
    $bodyBuilder.Close()
    $writer.Close()
    
    # Send request
    $request = [System.Net.HttpWebRequest]::Create($uploadUrl)
    $request.Method = "POST"
    $request.ContentType = $contentType
    $request.ContentLength = $bodyBytes.Length
    
    $requestStream = $request.GetRequestStream()
    $requestStream.Write($bodyBytes, 0, $bodyBytes.Length)
    $requestStream.Close()
    
    # Get response
    $response = $request.GetResponse()
    $responseStream = $response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($responseStream)
    $responseBody = $reader.ReadToEnd()
    $reader.Close()
    $response.Close()
    
    Write-Host "`n✅ Upload successful!" -ForegroundColor Green
    Write-Host "Response Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response Body:" -ForegroundColor Cyan
    Write-Host ($responseBody | ConvertFrom-Json | ConvertTo-Json -Depth 5)
    
} catch {
    Write-Error "Upload failed: $_"
    exit 1
}
