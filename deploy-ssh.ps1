# Simple frontend deployment via SSH
$VPS_IP = "103.82.193.18"
$VPS_USER = "root"
$VPS_PASS = "2wgqsmEecBHYyQbP"

Write-Host "📦 Deploying frontend..." -ForegroundColor Cyan

# Create temp script to upload and extract
$deployScript = @"
cd /tmp
rm -rf goxprint-frontend-upload
mkdir -p goxprint-frontend-upload
cd goxprint-frontend-upload

# Receive base64 encoded tar.gz
cat > dist.tar.gz.b64

# Decode and extract
base64 -d dist.tar.gz.b64 > dist.tar.gz
tar -xzf dist.tar.gz

# Deploy to production
rm -rf /opt/goxprint/goxprint-remote/dist/*
cp -r dist/* /opt/goxprint/goxprint-remote/dist/

# Cleanup
cd /tmp
rm -rf goxprint-frontend-upload

echo "Deployment complete"
ls -lh /opt/goxprint/goxprint-remote/dist/
"@

# Encode archive to base64
$tarFile = "dist.tar.gz"
if (Test-Path $tarFile) {
    Write-Host "✅ Archive created" -ForegroundColor Green
    
    # Convert to base64
    $bytes = [System.IO.File]::ReadAllBytes($tarFile)
    $base64 = [Convert]::ToBase64String($bytes)
    
    Write-Host "📤 Uploading via SSH..." -ForegroundColor Green
    
    # Send via SSH
    $base64 | ssh "${VPS_USER}@${VPS_IP}" $deployScript
    
    Write-Host ""
    Write-Host "✅ Deployment complete!" -ForegroundColor Green
    Write-Host "   Visit: https://goxprint.com" -ForegroundColor Gray
    
    # Cleanup
    Remove-Item $tarFile
}
else {
    Write-Host "❌ dist.tar.gz not found! Creating it..." -ForegroundColor Red
    tar -czf dist.tar.gz dist
    Write-Host "Please run script again" -ForegroundColor Yellow
}
