# GWIN HVAC Calculator - Complete Documentation

**Version:** 2.0  
**Last Updated:** December 2, 2025  
**Product:** Shopify Theme Integration for GWIN HVAC Systems

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Features & Capabilities](#features--capabilities)
4. [Business Rules & Logic](#business-rules--logic)
5. [User Interface Components](#user-interface-components)
6. [API Integration](#api-integration)
7. [Configuration Requirements](#configuration-requirements)
8. [Installation & Setup](#installation--setup)
9. [Usage Workflows](#usage-workflows)
10. [Technical Specifications](#technical-specifications)

---

## Overview

### Purpose
The GWIN HVAC Calculator is an interactive web-based tool that helps customers size and configure HVAC systems (Heating, Ventilation, and Air Conditioning) for residential or commercial spaces. It calculates BTU (British Thermal Unit) requirements based on room characteristics and recommends appropriate GWIN products.

### Key Objectives
- **Accurate Sizing**: Calculate heating/cooling loads using industry-standard formulas
- **Product Recommendation**: Match calculated loads to specific GWIN SKUs
- **Seamless E-commerce**: Integrate with Shopify for product display and cart functionality
- **User-Friendly**: Guide customers through complex HVAC selection with simple inputs

### Supported System Types
1. **Single Zone**: One outdoor condenser + one indoor air handler for a single space
2. **Multi Zone**: One outdoor condenser + multiple indoor units (2-5 rooms) for different areas

---

## System Architecture

### File Structure
```
/assets/
  ├── gwin-calculator-nov13.js      # Main calculator logic (905 lines)
  ├── air-calculator.css             # Comprehensive styling (720+ lines)
  └── hvac-calculator-config.json    # Product catalog configuration

/sections/
  └── [calculator-section].liquid    # Shopify theme section (optional)

/snippets/
  └── [calculator-snippet].liquid    # Reusable calculator snippet (optional)
```

### Technology Stack
- **Frontend**: Vanilla JavaScript (ES5 compatible for broad browser support)
- **Styling**: CSS3 with custom properties (CSS variables)
- **Integration**: Shopify Cart API, custom Product API
- **Data Format**: JSON for configuration and API responses

### Design Patterns
- **Module Pattern**: IIFE (Immediately Invoked Function Expression) for encapsulation
- **State Management**: Centralized state object within calculator instance
- **Event-Driven**: DOM event listeners for user interactions
- **Async/Await**: Modern JavaScript for API calls with fallback handling

---

## Features & Capabilities

### Core Features

#### 1. BTU Load Calculation
**Formula Components:**
```javascript
Base BTU/sqft = 25
Height Adjustment = (ceiling_height - 8) × 1.6 BTU/sqft (if > 8ft)
Insulation Adjustment:
  - Good: +0 BTU/sqft
  - Fair: +3 BTU/sqft
  - Poor: +7 BTU/sqft

Area Load = area × (base + height_adj + insulation_adj)
Window Load = window_count × 1500 BTU
Door Load = door_count × 300 BTU

Total Load = Area Load + Window Load + Door Load
```

#### 2. Dynamic Room Management
- **Single Zone**: Fixed 1 room
- **Multi Zone**: 2-5 rooms (dynamic add/remove)
- **Room Validation**: 
  - Minimum 2 rooms in Multi mode
  - Maximum 5 rooms total
  - Confirmation dialogs prevent accidental deletion

#### 3. Product Integration
**Capabilities:**
- Fetch product details by SKU from API
- Display product images, titles, prices, stock status
- Handle variant selection and pricing
- Generate product page links with variant parameters
- Add multiple products to cart simultaneously

#### 4. Line Set Selection
**Available Lengths:**
- 15 ft, 25 ft, 35 ft, 50 ft, 65 ft, 75 ft, 85 ft, 100 ft

**Pricing:**
- Dynamic pricing loaded from API
- Fallback to $0.00 if API unavailable
- Different pricing for Single vs Multi zone
- BTU-range specific line sets for Multi zone (7k-12k, 18k, 24k-36k)

#### 5. Order Summary
**Components:**
- Indoor Unit(s) total
- Outdoor Unit total
- Line Set(s) total
- Grand Total
- "Add All to Cart" button with dynamic pricing

#### 6. Climate Zone Selection
- **South**: Higher cooling requirements
- **North**: Different load calculations (prepared for future implementation)

### Advanced Features

#### 7. Real-Time Validation
- Input sanitization (numeric fields, max values)
- Area: 0-100,000 sq ft
- Ceiling Height: 0-99 ft (2 digits max)
- Windows/Doors: 0-99 (2 digits max)

#### 8. Auto-Reset Behavior
- Form clears when switching between Single ↔ Multi mode
- Results hidden when any input changes
- Must recalculate after changes

#### 9. Modal Integration
- Full-screen overlay with backdrop blur
- Close button with auto-reset
- Click-outside-to-close (optional)
- Accessible keyboard navigation

#### 10. Responsive Design
- Mobile-optimized layout (560px breakpoint)
- Touch-friendly controls
- Compact grid for room inputs
- Scrollable modals on small screens

---

## Business Rules & Logic

### Single Zone System Rules

#### Indoor Unit Selection
1. Calculate total BTU load for the room
2. Find closest available BTU size from catalog
3. Select SEER 25 air handler (GWIN standard)
4. If load > capacity × 110%, recommend multiple systems

**Available Single Zone Indoor Units:**
- 7,000 BTU
- 9,000 BTU
- 12,000 BTU
- 18,000 BTU
- 24,000 BTU
- 36,000 BTU

#### Outdoor Unit (Condenser) Selection
- Match BTU capacity of indoor unit
- SEER 25 rating
- Paired automatically with indoor unit

**Example:**
```
Room: 300 sqft, 8ft ceiling, Good insulation, 2 windows, 1 door
Calculation: (300 × 25) + (2 × 1500) + (1 × 300) = 10,800 BTU
Recommended: 12,000 BTU air handler + matching condenser
```

### Multi Zone System Rules

#### Indoor Unit Selection
1. Calculate BTU load for each room independently
2. Select closest BTU size per room
3. Choose unit type (High Wall, Slim Duct, Floor/Ceiling, 4-Way Cassette)
4. Sum total BTU load across all rooms

#### Outdoor Unit Selection Algorithm
**Explicit Rules (NOT config-based):**

```javascript
Available Outdoor Units:
- GASUM18HPMULO: 18k BTU capacity, max 24k BTU (18k + 6k), 2 ports
- GASUM24HPMULO: 24k BTU capacity, max 30k BTU (24k + 6k), 3 ports
- GASUM36HPMULO: 36k BTU capacity, max 42k BTU (36k + 6k), 4 ports
- GASUM42HPMULO: 42k BTU capacity, max 48k BTU (42k + 6k), 5 ports

Selection Logic:
1. Total Indoor BTU ≤ Unit Max BTU (capacity + 6,000)
2. Number of Rooms ≤ Unit Ports
3. Select SMALLEST unit that satisfies BOTH conditions
```

**Load Percentage Color Coding:**
- **Green**: ≤100% of capacity (optimal)
- **Yellow**: 100-110% of capacity (acceptable)
- **Orange**: >110% of capacity (near limit)

**System Limits:**
- Maximum 48,000 BTU total
- Maximum 5 indoor units
- If exceeded: "Recommend multiple GWIN systems or contact professional"

#### Line Set Selection (Multi Zone)
**BTU Range-Specific Products:**
- **7k-12k BTU**: Smaller diameter line sets
- **18k BTU**: Medium diameter
- **24k-36k BTU**: Larger diameter

Line sets matched to indoor unit BTU size, not total system load.

### Configuration File Structure

**File:** `hvac-calculator-config.json`

```json
{
  "productCatalog": {
    "singleZone": {
      "airHandlers": [
        {
          "btu": 12000,
          "seer": 25,
          "sku": "GWIN-12K-SZ-AH",
          "name": "12,000 BTU Single Zone Air Handler"
        }
      ],
      "outdoorUnits": [
        {
          "btu": 12000,
          "seer": 25,
          "sku": "GWIN-12K-SZ-COND"
        }
      ]
    },
    "multiZone": {
      "indoorUnits": {
        "12000": [
          {
            "type": "High Wall",
            "sku": "GWIN-12K-MZ-HW",
            "btu": 12000
          },
          {
            "type": "Slim Duct",
            "sku": "GWIN-12K-MZ-SD",
            "btu": 12000
          }
        ]
      }
    }
  },
  "outdoorCombinations": {
    "South": [],
    "North": []
  }
}
```

---

## User Interface Components

### Main Components

#### 1. Disclaimer Screen
**Purpose:** Legal protection and user acknowledgment  
**Fields:**
- Title: "🔒 Disclaimer"
- Text: "This sizing tool is for preliminary estimates only..."
- Button: "Accept and Continue"

**Behavior:**
- Shown on initial load
- Must accept to access calculator
- Hidden after acceptance

#### 2. System Type Selector
**Options:**
- Single Zone
- Multi Zone

**Behavior:**
- Auto-resets form when changed
- Shows/hides room management controls
- Updates available line sets

#### 3. Climate Zone Selector
**Options:**
- South
- North

**Behavior:**
- Affects outdoor unit selection
- Future: May adjust load calculations

#### 4. Room Cards

**Compact Grid Layout (6 columns):**
1. **Room Name** (2.2fr): Text input with autocomplete
2. **Area** (1.1fr): Number input, default 500 sqft
3. **Height** (0.8fr): Number input, default 8 ft
4. **Windows** (0.8fr): Number input, default 0
5. **Doors** (0.9fr): Number input, default 1
6. **Insulation** (1.1fr): Select (Good/Fair/Poor)

**Additional Fields:**
- **Line Set Length**: Dropdown below grid (required)
- **Unit Type** (Multi only): Dropdown (High Wall/Slim Duct/Floor-Ceiling/4-Way Cassette)
- **Delete Button** (Multi only): Red "×" button in top-right corner

**Room Name Autocomplete:**
- Living Room, Bedroom, Dining Room, Kitchen
- Bathroom, Office, Garage, Basement

#### 5. Add Room Button (Multi Zone)
**Display:**
- Text: "+ Add Another Room (X/5)"
- Disabled at 5 rooms: "Maximum Rooms Reached (5)"

**Behavior:**
- Only visible in Multi mode
- Adds new room card below existing
- Smooth scroll to new room
- Hides results

#### 6. Calculate Button
**Text:** "View System"  
**Behavior:**
- Validates all inputs
- Runs BTU calculations
- Fetches product data
- Displays results
- Scrolls to results

#### 7. Results Display

**Structure:**
```
Results
├── Room 1
│   ├── BTU Load
│   ├── Indoor Unit (with product card)
│   ├── Condenser (Single only, with product card)
│   └── Line Set (description + price)
├── Room 2 (Multi only)
│   └── ...
├── Total System Load (Multi only)
├── Outdoor Unit (Multi only, with product card)
├── Order Summary
│   ├── Indoor Unit Total
│   ├── Outdoor Unit Total
│   ├── Line Set Total
│   └── Grand Total
└── Add All to Cart Button
```

#### 8. Product Cards

**Layout:**
```
┌─────────────────────────────────────────┐
│ [Image]  View Details        Price      │
│                                          │
│ Product Title                            │
└─────────────────────────────────────────┘
```

**Components:**
- Product image (100×100px, 80×80px mobile)
- "View Full Details" link (opens product page with variant)
- Price (large, right-aligned)
- Product title (bottom, full width)
- Stock status (if unavailable)

**Stock Status Messages:**
- "Low Stock - Contact Us" (available but low)
- "Currently Unavailable" (not available for sale)

#### 9. Order Summary

**Display:**
```
Order Summary
─────────────────────────────
Indoor Unit (SKU):        $XXX.XX
Outdoor Unit (SKU):       $XXX.XX
Line Set (15 ft):         $XXX.XX
─────────────────────────────
Total:                    $XXX.XX
═════════════════════════════
```

**Features:**
- Real-time price calculation
- Loading states for async product fetches
- SKU/description display
- Purple theme color accents

#### 10. Add All to Cart Button

**States:**
1. **Loading:** "Loading..." (disabled)
2. **Ready:** "Add to Cart - $XXX.XX" (enabled if all available)
3. **Adding:** "Adding to Cart..." (disabled)
4. **Success:** "✓ Added to Cart!" (green, 2 seconds)
5. **Unavailable:** "Some Items Unavailable" (disabled)
6. **Error:** "Error - Try Again" (red)

**Behavior:**
- Adds all products (indoor + outdoor + line sets) to cart
- Shows success toast notification
- Resets to ready state after 2 seconds

---

## API Integration

### Product Lookup API

**Endpoint:** `https://gwin-product-api.vercel.app/api/product-lookup`

**Request:**
```javascript
GET /api/product-lookup?sku=GASUM24HPMULO
```

**Expected Response:**
```json
{
  "success": true,
  "product": {
    "productId": "gid://shopify/Product/123456",
    "variantId": "gid://shopify/ProductVariant/789012",
    "title": "GWIN 24K BTU Multi-Zone Outdoor Unit",
    "price": "2499.99",
    "compareAtPrice": null,
    "availableForSale": true,
    "inStock": true,
    "image": {
      "url": "https://cdn.shopify.com/...",
      "alt": "Product image"
    },
    "productUrl": "https://store.com/products/gwin-24k-outdoor"
  }
}
```

**Error Handling:**
- HTTP errors: Log and return null
- Product not found: Display "Product details unavailable"
- Network errors: Graceful fallback, no calculator breakage

### Line Set Pricing API

**Endpoint:** `https://gwin-product-api.vercel.app/api/line-set-pricing`

**Request:**
```javascript
GET /api/line-set-pricing
```

**Expected Response:**
```json
{
  "singleZone": {
    "variants": [
      {
        "value": "15 feet (default) - $0.00",
        "variantId": "gid://shopify/ProductVariant/123"
      },
      {
        "value": "25 feet - $145.00",
        "variantId": "gid://shopify/ProductVariant/124"
      }
    ]
  },
  "multiZone": {
    "byBtuRange": {
      "7k-12k": {
        "15": {
          "variantId": "gid://shopify/ProductVariant/200",
          "displayText": "15 feet - $135.00"
        }
      }
    }
  }
}
```

**Fallback Behavior:**
- API unavailable: Use $0.00 for all line sets
- Console warning: "Using fallback prices (all $0) - API endpoint not available yet"
- Calculator remains functional

### Multi-Zone Line Sets API

**Endpoint:** `https://gwin-product-api.vercel.app/api/multi-zone-linesets`

**Response Structure:**
```json
{
  "success": true,
  "multiZone": {
    "dropdownOptions": [
      {
        "title": "15 feet",
        "displayText": "15 feet - $135.00",
        "price": "135.00",
        "variantId": "gid://shopify/ProductVariant/300"
      }
    ],
    "products": [
      {
        "btuRange": "7k-12k BTU",
        "productTitle": "Line Set 1/4 x 3/8",
        "productId": "gid://shopify/Product/400",
        "variants": [...]
      }
    ]
  }
}
```

### Shopify Cart API

**Add to Cart:**
```javascript
POST /cart/add.js
Content-Type: application/json

{
  "items": [
    {
      "id": 789012,  // Numeric variant ID
      "quantity": 1
    }
  ]
}
```

**Response:**
```json
{
  "id": 789012,
  "quantity": 1,
  "variant_id": 789012,
  "product_title": "GWIN Product",
  "price": 249999,  // Price in cents
  ...
}
```

**Error Handling:**
- HTTP 422: Invalid variant or out of stock
- Display: "Unable to add to cart" alert
- Fallback: Manual product page navigation

---

## Configuration Requirements

### Required Files

#### 1. JavaScript File
**Path:** `/assets/gwin-calculator-nov13.js`  
**Size:** ~905 lines  
**Dependencies:** None (vanilla JS)

#### 2. CSS File
**Path:** `/assets/air-calculator.css`  
**Size:** ~720 lines  
**Dependencies:** None

#### 3. Configuration File
**Path:** `/assets/hvac-calculator-config.json`  
**Format:** JSON  
**Required Keys:**
- `productCatalog.singleZone.airHandlers`
- `productCatalog.singleZone.outdoorUnits`
- `productCatalog.multiZone.indoorUnits`
- `outdoorCombinations` (optional for multi-zone)

### Optional Configuration

**Custom API URLs:**
```javascript
// Set before loading calculator script
window.HVAC_CONFIG_URL = '/custom/path/to/config.json';
window.LINE_SET_PRICING_API_URL = 'https://custom-api.com/line-sets';
```

**Theme Color Customization:**
```css
:root {
  --ahc-purple: #9B3AA0;        /* Primary brand color */
  --ahc-purple-hover: #7E2D87;  /* Hover state */
  --ahc-purple-deep: #6B2475;   /* Deep accent */
  --ahc-lavender-50: #F5F3FF;   /* Light backgrounds */
  --ahc-lavender-100: #EDE9FE;  /* Borders */
  --ahc-lavender-200: #E9D5FF;  /* Highlighted areas */
  --ahc-text-deep: #4B006E;     /* Dark text */
}
```

---

## Installation & Setup

### Step 1: Upload Files

**Via Shopify Admin:**
1. Navigate to Online Store > Themes > Actions > Edit Code
2. Upload `gwin-calculator-nov13.js` to `/assets/`
3. Upload `air-calculator.css` to `/assets/`
4. Upload `hvac-calculator-config.json` to `/assets/`

**Via Shopify CLI:**
```bash
shopify theme push --only assets/gwin-calculator-nov13.js
shopify theme push --only assets/air-calculator.css
shopify theme push --only assets/hvac-calculator-config.json
```

### Step 2: Create Section (Option A) or Snippet (Option B)

**Option A: Section File**

Create `/sections/hvac-calculator.liquid`:

```liquid
{% comment %}
  GWIN HVAC Calculator Section
  Displays the interactive calculator in a modal
{% endcomment %}

<div class="air-calculator-wrapper">
  <div class="ahc-shell">
    <button 
      class="ahc-launch" 
      data-ahc-open="calc-1"
      aria-label="Open HVAC Calculator">
      Calculate Your System
    </button>
  </div>
</div>

<div class="ahc-modal" id="ahc-modal-calc-1" hidden>
  <div class="ahc-backdrop" data-ahc-close></div>
  <div class="ahc-dialog">
    <div class="ahc-hdr">
      <h2 class="ahc-title">{{ section.settings.calculator_title | default: 'HVAC System Calculator' }}</h2>
      <button class="ahc-x" data-ahc-close aria-label="Close">&times;</button>
    </div>
    <div class="ahc-body">
      <div 
        data-air-calculator 
        data-title="{{ section.settings.calculator_title }}"
        data-description="{{ section.settings.calculator_description }}">
      </div>
    </div>
  </div>
</div>

{{ 'air-calculator.css' | asset_url | stylesheet_tag }}
<script src="{{ 'gwin-calculator-nov13.js' | asset_url }}" defer></script>

{% schema %}
{
  "name": "HVAC Calculator",
  "settings": [
    {
      "type": "text",
      "id": "calculator_title",
      "label": "Calculator Title",
      "default": "HVAC System Calculator"
    },
    {
      "type": "textarea",
      "id": "calculator_description",
      "label": "Description",
      "default": "Size your perfect HVAC system"
    }
  ],
  "presets": [
    {
      "name": "HVAC Calculator"
    }
  ]
}
{% endschema %}
```

**Option B: Snippet File**

Create `/snippets/hvac-calculator.liquid`:

```liquid
<div class="air-calculator-wrapper">
  <div 
    data-air-calculator 
    data-title="HVAC System Calculator"
    data-description="Calculate the perfect system for your space">
  </div>
</div>

{{ 'air-calculator.css' | asset_url | stylesheet_tag }}
<script src="{{ 'gwin-calculator-nov13.js' | asset_url }}" defer></script>
```

Then include in any template:
```liquid
{% render 'hvac-calculator' %}
```

### Step 3: Configure Product Catalog

Edit `hvac-calculator-config.json` with your actual GWIN product SKUs and specifications.

### Step 4: Test API Endpoints

**Browser Console Test:**
```javascript
// Test product lookup
fetch('https://gwin-product-api.vercel.app/api/product-lookup?sku=GASUM24HPMULO')
  .then(r => r.json())
  .then(console.log);

// Test line set pricing
fetch('https://gwin-product-api.vercel.app/api/line-set-pricing')
  .then(r => r.json())
  .then(console.log);
```

### Step 5: Verify Cart Integration

1. Open calculator
2. Complete a calculation
3. Click "Add All to Cart"
4. Verify products appear in Shopify cart
5. Check pricing matches

---

## Usage Workflows

### Single Zone Configuration Workflow

```
User Journey:
1. Click "Calculate Your System" button
2. Read and accept disclaimer
3. System Type already set to "Single Zone"
4. Select Climate Zone (South/North)
5. Fill in room details:
   - Room name (optional)
   - Area (default 500 sqft)
   - Ceiling height (default 8 ft)
   - Windows count (default 0)
   - Doors count (default 1)
   - Insulation quality (default Good)
6. Select Line Set Length (15-100 ft)
7. Click "View System"
8. Review results:
   - BTU load calculation
   - Recommended indoor unit (with product card)
   - Recommended outdoor condenser (with product card)
   - Selected line set (with price)
   - Order summary with total
9. Click "Add to Cart - $X,XXX.XX"
10. Products added to Shopify cart
11. Success toast appears
12. Proceed to checkout
```

### Multi Zone Configuration Workflow

```
User Journey:
1. Click "Calculate Your System" button
2. Accept disclaimer
3. Change System Type to "Multi Zone"
4. Form auto-resets to 2 empty rooms
5. Select Climate Zone
6. Configure Room 1:
   - Fill in all room details
   - Select Line Set Length
   - Select Unit Type (High Wall/Slim Duct/etc)
7. Configure Room 2 (same as Room 1)
8. [Optional] Click "+ Add Another Room" (up to 5 total)
9. [Optional] Delete rooms with "×" button (min 2 rooms)
10. Click "View System"
11. Review results:
    - BTU load per room
    - Indoor unit per room (with product cards)
    - Line set per room (with prices)
    - Total system load
    - ONE recommended outdoor unit (with product card)
    - Order summary with totals
12. Verify outdoor unit meets both rules:
    - Total BTU ≤ unit max capacity
    - Room count ≤ unit ports
13. Click "Add All to Cart - $X,XXX.XX"
14. All products (multiple indoor units + outdoor + line sets) added
15. Success notification
16. Proceed to checkout
```

### Error Recovery Workflows

**Scenario 1: Product API Unavailable**
```
1. Calculator loads normally
2. Console warning: "Failed to load product details"
3. Results show: "Product details unavailable"
4. Order summary shows: "Loading..." (never resolves)
5. Add to Cart button disabled
6. User can still see BTU calculations and SKUs
7. User can manually search for SKUs on site
```

**Scenario 2: Line Set API Unavailable**
```
1. Calculator loads with $0.00 line set prices
2. Console warning: "Using fallback prices"
3. Dropdowns show lengths without prices
4. Calculation completes normally
5. Order summary shows $0.00 for line sets
6. Add to Cart works for indoor/outdoor units only
```

**Scenario 3: Out of Stock Product**
```
1. Calculation completes
2. Product card shows: "Currently Unavailable"
3. Order summary updates without that product
4. Add to Cart button shows: "Some Items Unavailable"
5. Button disabled
6. User can view product details and check availability
```

**Scenario 4: Over-Capacity System (Multi Zone)**
```
1. User configures 5 rooms totaling 55,000 BTU
2. Click "View System"
3. Results show: "⚠️ System requirements exceed limits..."
4. Message: "Maximum supported: 48,000 BTU total and 5 indoor units"
5. Recommendation: "Consider multiple GWIN systems..."
6. No outdoor unit shown
7. No Add to Cart button
8. User must reduce BTU load or split into multiple systems
```

---

## Technical Specifications

### Browser Compatibility
- **Modern Browsers:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **ES5 Compatibility:** IE11 support via transpilation (if needed)
- **Mobile:** iOS Safari 14+, Chrome Mobile 90+

### Performance Metrics
- **Initial Load:** < 100ms (cached)
- **API Response Time:** 200-500ms (dependent on external API)
- **Calculation Time:** < 50ms (client-side)
- **DOM Render:** < 100ms (results display)

### Data Validation

**Input Constraints:**
| Field | Type | Min | Max | Default |
|-------|------|-----|-----|---------|
| Area | Number | 0 | 100,000 | 500 |
| Ceiling Height | Number | 0 | 99 | 8 |
| Windows | Integer | 0 | 99 | 0 |
| Doors | Integer | 0 | 99 | 1 |
| Room Name | Text | - | 40 chars | "" |

**Validation Rules:**
- Numeric inputs sanitized with `clampInt()`
- Text inputs limited to 40 characters
- Invalid values reset to defaults
- Empty fields treated as 0 or default value

### Security Considerations

**XSS Prevention:**
- All user inputs sanitized before DOM insertion
- Product data from API escaped in HTML
- No `eval()` or `innerHTML` with user content

**CORS:**
- Product API must allow requests from Shopify domain
- Cart API restricted to same-origin

**Data Privacy:**
- No personal data collected
- No cookies or tracking
- Calculation state not persisted

### Accessibility (WCAG 2.1 AA)

**Keyboard Navigation:**
- Tab order: Logical form flow
- Enter key: Submit/calculate
- Escape key: Close modal (if implemented)

**Screen Readers:**
- Semantic HTML structure
- ARIA labels on buttons
- Form labels properly associated
- Status announcements for async updates

**Color Contrast:**
- Text: 4.5:1 minimum contrast
- Large text: 3:1 minimum
- Focus indicators visible

**Visual Indicators:**
- Error states with color + text
- Loading states with spinner + text
- Success/failure with color + icon + text

### Responsive Breakpoints

```css
/* Mobile First */
Default: 320px - 560px
  - Single column layout
  - Stacked product cards
  - Full-width buttons

/* Tablet: 560px+ */
  - Compact grid: 6 columns
  - Side-by-side product info
  - Wider modal (92vw)

/* Desktop: 700px+ */
  - Maximum modal width: 740px
  - Optimal column widths
  - Hover effects enabled
```

### State Management

**Calculator State Object:**
```javascript
{
  mode: 'Single' | 'Multi',
  roomCount: 1-5,
  zone: 'South' | 'North',
  rooms: [
    {
      roomName: string,
      area: string,
      ceilingHeight: string,
      windows: string,
      doors: string,
      insulation: 'Good' | 'Fair' | 'Poor',
      unitType: 'High Wall' | 'Slim Duct' | 'Floor/Ceiling' | '4-Way Ceiling Cassette',
      lineSet: '15' | '25' | '35' | '50' | '65' | '75' | '85' | '100'
    }
  ]
}
```

**State Persistence:**
- In-memory only (no localStorage)
- Reset on mode change
- Reset on modal close
- Reset on page reload

---

## CSS Architecture

### Color Scheme (Purple Theme)
```css
Primary Purple:    #9B3AA0
Hover Purple:      #7E2D87
Deep Purple:       #6B2475
Lavender Light:    #F5F3FF
Lavender Medium:   #EDE9FE
Lavender Dark:     #E9D5FF
Text Deep:         #4B006E
```

### Button Hierarchy

**Primary (Calculate, Accept, Add to Cart):**
- Background: `--ahc-purple` (#9B3AA0)
- Hover: `--ahc-purple-hover` (#7E2D87)
- Color: White
- Border: None
- Shadow: 0 2px 4px rgba(155, 58, 160, 0.2)

**Secondary (Reset, Cancel):**
- Background: White
- Hover: `--ahc-purple`
- Color: `--ahc-purple` → White on hover
- Border: 2px solid `--ahc-purple`

**Tertiary (Add Room):**
- Background: #28a745 (green)
- Hover: #218838
- Disabled: #6c757d (gray)

**Delete Button:**
- Background: White
- Border: 1px solid #dc3545 (red)
- Color: #dc3545
- Hover: Red background, white text

### Card Components

**Room Card:**
```css
Border: 2px solid #e5e7eb
Padding: 20px
Margin: 0 0 20px
Border Radius: 8px
Background: #f9fafb
Position: relative (for delete button)
```

**Product Card:**
```css
Display: flex column
Gap: 10px
Padding: 15px
Background: #ffffff
Border: 1px solid #e5e7eb
Border Radius: 8px
Box Shadow: 0 1px 3px rgba(0,0,0,0.1)
Hover Shadow: 0 4px 6px rgba(0,0,0,0.1)
```

**Result Item:**
```css
Margin: 0 0 20px
Padding: 0 0 20px
Border Bottom: 1px solid lavender (if not last)
```

### Modal Styling

**Backdrop:**
```css
Position: fixed
Inset: 0
Background: rgba(75, 0, 110, 0.6)
Backdrop Filter: blur(4px)
Z-Index: 9999
```

**Dialog:**
```css
Width: clamp(340px, 92vw, 740px)
Max Height: 90vh
Background: white
Border Radius: 12px
Overflow: auto
Box Shadow: 0 8px 28px rgba(0,0,0,0.25)
Animation: modalFadeIn 0.25s ease-out
```

### Grid System

**Compact Room Row:**
```css
Display: grid
Grid Template Columns: 2.2fr 1.1fr 0.8fr 0.8fr 0.9fr 1.1fr
Gap: 8px
Align Items: end

/* Mobile (≤560px) */
Grid Template Columns: 1.6fr 1fr 0.7fr 0.7fr 0.8fr 1fr
Gap: 6px
```

### Animation & Transitions

**Button Hover:**
```css
Transition: background-color 0.25s ease, transform 0.1s ease
Transform: translateY(-1px)
```

**Product Card Fade In:**
```css
Animation: fadeInUp 0.4s ease
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
```

**Toast Notification:**
```css
Transform: translateX(400px)
Transition: transform 0.3s ease
.show { transform: translateX(0); }
```

### Typography

**Headings:**
```css
.calc-title: center-aligned
.results-title: margin-top 0, color deep purple
.outdoor-title: margin-top 20px
```

**Body Text:**
```css
Font Family: Arial, sans-serif
Font Size: 16px (base)
Line Height: 1.5
Color: #374151 (default)
```

**Labels:**
```css
Font Weight: 600-700
Font Size: 12-14px
Margin Bottom: 4-8px
Color: #374151
```

**Prices:**
```css
Font Size: 1.3em
Font Weight: 700
Color: var(--ahc-purple)
```

---

## Troubleshooting Guide

### Common Issues

#### Issue: Calculator doesn't appear
**Causes:**
- JavaScript file not loaded
- CSS file missing
- `[data-air-calculator]` attribute missing

**Solutions:**
1. Check browser console for 404 errors
2. Verify file paths in Liquid template
3. Ensure `defer` attribute on script tag
4. Check element has `data-air-calculator` attribute

#### Issue: Products not loading
**Causes:**
- Product API unreachable
- Invalid SKU in config
- CORS errors

**Solutions:**
1. Check console for API errors
2. Verify API URL in code
3. Test API endpoint directly
4. Verify SKUs match Shopify product variants

#### Issue: Add to Cart fails
**Causes:**
- Invalid variant IDs
- Product out of stock
- Cart API errors

**Solutions:**
1. Check variant ID format (numeric, not GID)
2. Verify product availability in Shopify
3. Test `/cart/add.js` directly
4. Check for Shopify Plus cart limitations

#### Issue: Prices show $0.00
**Causes:**
- Line Set API unavailable
- Pricing not configured
- API response format changed

**Solutions:**
1. Check console for "fallback prices" warning
2. Verify line set API endpoint
3. Check API response format
4. Update API integration code if format changed

#### Issue: Outdoor unit shows error
**Causes:**
- Total BTU exceeds 48,000
- More than 5 rooms
- Calculation error

**Solutions:**
1. Reduce total BTU load
2. Split into multiple systems
3. Remove rooms (reduce count)
4. Check calculation logic

---

## Maintenance & Updates

### Regular Maintenance Tasks

**Monthly:**
- Verify API endpoints still responding
- Check for Shopify API changes
- Review error logs in browser console
- Test on latest browser versions

**Quarterly:**
- Update product catalog (config.json)
- Review and update BTU calculation formula
- Audit accessibility compliance
- Performance testing

**Annually:**
- Update copyright notices
- Review and optimize code
- Update documentation
- Security audit

### Version History

**Version 2.0 (December 2025)**
- Added Line Set selection and pricing
- Implemented Order Summary
- Added "Add All to Cart" functionality
- Multi-zone line set BTU-range matching
- Product card improvements
- Auto-reset on mode change

**Version 1.5 (November 2025)**
- Added Product API integration
- Product cards with images
- Shopify Cart integration
- Dynamic product fetching
- Real-time price display

**Version 1.0 (Initial Release)**
- BTU calculation engine
- Single/Multi zone support
- Room management
- Basic UI/UX
- Configuration system

---

## Support & Contact

### Developer Resources
- **GitHub Issues:** [Repository URL]
- **Documentation:** This file
- **API Documentation:** Separate API docs

### Business Contact
- **Sales:** GWIN HVAC Sales Team
- **Technical Support:** Shopify Partner Support
- **Product Questions:** GWIN Product Specialists

---

## License & Copyright

**Copyright © 2025 GWIN HVAC**  
**All Rights Reserved**

This calculator is proprietary software developed for GWIN HVAC product sales. Unauthorized reproduction, modification, or distribution is prohibited.

**Shopify Integration:**  
Complies with Shopify Partner Program guidelines and Shopify API Terms of Service.

---

## Appendix

### A. Complete SKU Reference

**Single Zone Air Handlers (SEER 25):**
- GWIN-07K-SZ-AH: 7,000 BTU
- GWIN-09K-SZ-AH: 9,000 BTU
- GWIN-12K-SZ-AH: 12,000 BTU
- GWIN-18K-SZ-AH: 18,000 BTU
- GWIN-24K-SZ-AH: 24,000 BTU
- GWIN-36K-SZ-AH: 36,000 BTU

**Multi Zone Outdoor Units:**
- GASUM18HPMULO: 18,000 BTU, 2 ports
- GASUM24HPMULO: 24,000 BTU, 3 ports
- GASUM36HPMULO: 36,000 BTU, 4 ports
- GASUM42HPMULO: 42,000 BTU, 5 ports

### B. BTU Calculation Examples

**Example 1: Small Bedroom**
```
Area: 150 sqft
Height: 8 ft
Windows: 1
Doors: 1
Insulation: Good

Calculation:
Base: 150 × 25 = 3,750
Height: 0 (8ft = standard)
Insulation: 0 (Good)
Windows: 1 × 1,500 = 1,500
Doors: 1 × 300 = 300

Total: 3,750 + 1,500 + 300 = 5,550 BTU
Recommended: 7,000 BTU unit
```

**Example 2: Large Living Room**
```
Area: 500 sqft
Height: 10 ft
Windows: 3
Doors: 2
Insulation: Fair

Calculation:
Base: 500 × 25 = 12,500
Height: (10 - 8) × 1.6 × 500 = 1,600
Insulation: 3 × 500 = 1,500
Windows: 3 × 1,500 = 4,500
Doors: 2 × 300 = 600

Total: 12,500 + 1,600 + 1,500 + 4,500 + 600 = 20,700 BTU
Recommended: 24,000 BTU unit
```

**Example 3: Multi-Zone (3 Rooms)**
```
Room 1: 8,000 BTU (12K unit)
Room 2: 6,500 BTU (9K unit)
Room 3: 11,000 BTU (12K unit)

Total: 25,500 BTU
Rooms: 3

Outdoor Unit Selection:
- GASUM18HPMULO: 18K capacity, max 24K → TOO SMALL
- GASUM24HPMULO: 24K capacity, max 30K → ✓ BTU OK, 3 ports → ✓ PORTS OK
- Selected: GASUM24HPMULO

Load Percentage: 25,500 / 24,000 = 106.25% (Yellow)
```

### C. API Endpoint Summary

| Endpoint | Method | Purpose | Required |
|----------|--------|---------|----------|
| `/api/product-lookup` | GET | Fetch product by SKU | Yes |
| `/api/line-set-pricing` | GET | Get line set prices | Optional |
| `/api/multi-zone-linesets` | GET | Multi-zone line sets | Optional |
| `/cart/add.js` | POST | Add to Shopify cart | Yes |

### D. Glossary

- **BTU**: British Thermal Unit - measure of cooling/heating capacity
- **SEER**: Seasonal Energy Efficiency Ratio - efficiency rating
- **SKU**: Stock Keeping Unit - product identifier
- **GID**: Global Identifier - Shopify's unique ID format
- **Line Set**: Refrigerant piping connecting indoor and outdoor units
- **Multi-Zone**: System with one outdoor unit serving multiple indoor units
- **Single Zone**: System with one outdoor unit serving one indoor unit
- **Load Calculation**: Process of determining BTU requirements
- **Condenser**: Outdoor unit that releases heat
- **Air Handler**: Indoor unit that distributes conditioned air
- **Manual J**: ACCA standard for residential load calculations

---

**END OF DOCUMENTATION**

*For updates to this documentation, please contact the development team.*
