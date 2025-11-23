# COPILOT AGENT: Gwin Calculator - Production Build (CORRECTED)

## TASK
Obfuscate JavaScript and prepare for Shopify deployment. File naming is critical.

## FILE NAMING (IMPORTANT!)
- `air-calculator.vanilla.js` = SOURCE (never upload to Shopify)
- `air-calculator.js` = PRODUCTION (obfuscated, upload to Shopify)
- Liquid file references: `air-calculator.js`

## EXECUTE IN ORDER

### 1. Install Obfuscator
```bash
npm install -g javascript-obfuscator
```

### 2. Create Obfuscated Version
```bash
javascript-obfuscator assets/air-calculator.vanilla.js \
  --output assets/air-calculator.js \
  --compact true \
  --control-flow-flattening true \
  --control-flow-flattening-threshold 0.75 \
  --dead-code-injection true \
  --dead-code-injection-threshold 0.4 \
  --string-array true \
  --string-array-encoding 'base64' \
  --string-array-threshold 0.75 \
  --transform-object-keys true \
  --rename-globals false
```

### 3. Verify Liquid File
```bash
# Should reference 'air-calculator.js' (NOT .vanilla.js or .min.js)
grep "air-calculator" sections/air-handling-calculator.liquid
```

### 4. Test Locally
```bash
shopify theme dev --theme="Gwin"
```
Test: 500 sqft, 12ft, 4 windows, 3 doors, Good → Result: 22,600 BTU
Check: F12 → air-calculator.js should be unreadable/obfuscated

### 5. Git Commit
```bash
git add assets/air-calculator.js
git commit -m "Production: Obfuscated calculator"
git push origin main
```

### 6. Create Deployment Package
```bash
mkdir -p ~/Desktop/gwin-deployment
cp assets/air-calculator.js ~/Desktop/gwin-deployment/
cp assets/hvac-calculator-config.json ~/Desktop/gwin-deployment/
```

### 7. Create Future Build Script
```bash
cat > build-production.sh << 'EOF'
#!/bin/bash
javascript-obfuscator assets/air-calculator.vanilla.js \
  --output assets/air-calculator.js \
  --compact true --control-flow-flattening true \
  --string-array true --string-array-encoding 'base64'
echo "✅ Build complete"
EOF
chmod +x build-production.sh
```

## SUCCESS CRITERIA
✅ air-calculator.js created (obfuscated)
✅ air-calculator.vanilla.js preserved (source)
✅ Liquid references air-calculator.js
✅ Local test: 22,600 BTU
✅ Code unreadable in DevTools
✅ Git pushed
✅ Deployment package at ~/Desktop/gwin-deployment/

## CRITICAL
❌ NEVER upload air-calculator.vanilla.js to Shopify
❌ NEVER edit air-calculator.js directly (edit .vanilla.js, then rebuild)
✅ ALWAYS keep .vanilla.js as source code

Report: "✅ Obfuscated air-calculator.js ready at ~/Desktop/gwin-deployment/"
