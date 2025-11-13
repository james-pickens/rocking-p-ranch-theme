# Gwin Calculator - Production Build Script
# This script obfuscates the source JavaScript for production deployment

Write-Host "🔨 Building production version..." -ForegroundColor Cyan

# Obfuscate JavaScript
javascript-obfuscator assets/gwin-calculator-nov13.js `
  --output assets/air-calculator.js `
  --compact true `
  --control-flow-flattening true `
  --control-flow-flattening-threshold 0.75 `
  --dead-code-injection true `
  --dead-code-injection-threshold 0.4 `
  --string-array true `
  --string-array-encoding base64 `
  --string-array-threshold 0.75 `
  --transform-object-keys true `
  --rename-globals false

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build complete: air-calculator.js created" -ForegroundColor Green
    Write-Host "📦 Deployment package ready at: $env:USERPROFILE\Desktop\gwin-deployment\" -ForegroundColor Green
    
    # Copy to deployment folder
    Copy-Item assets/air-calculator.js "$env:USERPROFILE\Desktop\gwin-deployment\" -Force
    Copy-Item assets/hvac-calculator-config-gwin.json "$env:USERPROFILE\Desktop\gwin-deployment\" -Force
    
    Write-Host "`n⚠️  REMEMBER:" -ForegroundColor Yellow
    Write-Host "  - NEVER upload gwin-calculator-nov13.js to Shopify (source code)" -ForegroundColor Yellow
    Write-Host "  - ONLY upload air-calculator.js (obfuscated version)" -ForegroundColor Yellow
    Write-Host "  - Edit source file, then run this script to rebuild" -ForegroundColor Yellow
} else {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}
