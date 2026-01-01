# Deploy goxprint-remote frontend to VPS
$VPS = "root@103.82.193.18"
$PASS = "2wgqsmEecBHYyQbP"
$DIST_PATH = ".\dist"
$REMOTE_PATH = "/opt/goxprint/goxprint-remote/dist"

Write-Host "📤 Deploying frontend to VPS..." -ForegroundColor Cyan
Write-Host ""

# Check if dist folder exists
if (!(Test-Path $DIST_PATH)) {
    Write-Host "❌ dist folder not found! Run 'npm run build' first" -ForegroundColor Red
    exit 1
}

Write-Host "[1/3] Cleaning remote directory..." -ForegroundColor Green
$cleanCmd = "echo $PASS | ssh $VPS 'rm -rf $REMOTE_PATH/* && mkdir -p $REMOTE_PATH && mkdir -p $REMOTE_PATH/assets'"
Invoke-Expression $cleanCmd

Write-Host "[2/3] Uploading files..." -ForegroundColor Green

# Upload index.html
Write-Host "  - index.html"
scp "$DIST_PATH\index.html" "${VPS}:${REMOTE_PATH}/"

# Upload assets folder
if (Test-Path "$DIST_PATH\assets") {
    Write-Host "  - assets folder"
    scp -r "$DIST_PATH\assets\*" "${VPS}:${REMOTE_PATH}/assets/"
}

Write-Host ""
Write-Host "[3/3] Verifying deployment..." -ForegroundColor Green
$verifyCmd = "echo $PASS | ssh $VPS 'ls -lh $REMOTE_PATH'"
Invoke-Expression $verifyCmd

Write-Host ""
Write-Host "✅ Frontend deployed!" -ForegroundColor Green
Write-Host "   Visit: https://goxprint.com" -ForegroundColor Gray
Write-Host ""
