(function () {
  // ---------- Helpers ----------
  var $$  = function (root, sel) { return (root || document).querySelector(sel); };
  var $$$ = function (root, sel) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var num = function (v, d) { var n = (v === '' || v == null) ? NaN : Number(v); return isFinite(n) ? n : (d != null ? d : 0); };
  function clampInt(v, min, max) {
    var n = parseInt(v, 10);
    if (isNaN(n)) n = 0;
    if (min != null && n < min) n = min;
    if (max != null && n > max) n = max;
    return n;
  }

  // ========== LINE SET CONSTANTS & API INTEGRATION ==========

  // PLACEHOLDER PRICES - Will be updated from API when available
  var SINGLE_ZONE_LINE_SETS = {
    "15": { length: 15, display: "15 ft", price: 0 },
    "25": { length: 25, display: "25 ft", price: 0 },
    "35": { length: 35, display: "35 ft", price: 0 },
    "50": { length: 50, display: "50 ft", price: 0 },
    "65": { length: 65, display: "65 ft", price: 0 },
    "75": { length: 75, display: "75 ft", price: 0 },
    "85": { length: 85, display: "85 ft", price: 0 },
    "100": { length: 100, display: "100 ft", price: 0 }
  };

  // PLACEHOLDER PRICES - Will be updated from API when available
  var MULTI_ZONE_LINE_SETS = {
    "15": { length: 15, display: "15 ft", price: 0 },
    "25": { length: 25, display: "25 ft", price: 0 },
    "35": { length: 35, display: "35 ft", price: 0 },
    "50": { length: 50, display: "50 ft", price: 0 },
    "65": { length: 65, display: "65 ft", price: 0 },
    "75": { length: 75, display: "75 ft", price: 0 },
    "85": { length: 85, display: "85 ft", price: 0 },
    "100": { length: 100, display: "100 ft", price: 0 }
  };

  var lineSetPricesLoaded = false;

  // Fetch line set prices from product API (optional - graceful fallback to $0)
function loadLineSetPrices(callback) {
  if (lineSetPricesLoaded) {
    if (callback) callback();
    return;
  }
  
  // Use configured API URL or default
  var apiUrl = window.LINE_SET_PRICING_API_URL || 'https://gwin-product-api.vercel.app/api/line-set-pricing';
  
  fetch(apiUrl)
    .then(function(response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    })
    .then(function(data) {
      // Expected format:
      // {
      //   "singleZone": { "15": "15 feet - $125.00", "25": "25 feet - $145.00", ... },
      //   "multiZone": { "15": "15 feet - $135.00", "25": "25 feet - $155.00", ... }
      // }
      
      if (data.singleZone) {
        Object.keys(data.singleZone).forEach(function(key) {
          if (SINGLE_ZONE_LINE_SETS[key] && data.singleZone[key]) {
            // Update display with full variant title from Shopify
            SINGLE_ZONE_LINE_SETS[key].display = data.singleZone[key];
            
            // Also parse price from title for calculations (optional)
            var priceMatch = data.singleZone[key].match(/\$([0-9.]+)/);
            if (priceMatch) {
              SINGLE_ZONE_LINE_SETS[key].price = parseFloat(priceMatch[1]);
            }
          }
        });
      }
      
      if (data.multiZone) {
        Object.keys(data.multiZone).forEach(function(key) {
          if (MULTI_ZONE_LINE_SETS[key] && data.multiZone[key]) {
            // Update display with full variant title from Shopify
            MULTI_ZONE_LINE_SETS[key].display = data.multiZone[key];
            
            // Also parse price from title for calculations (optional)
            var priceMatch = data.multiZone[key].match(/\$([0-9.]+)/);
            if (priceMatch) {
              MULTI_ZONE_LINE_SETS[key].price = parseFloat(priceMatch[1]);
            }
          }
        });
      }
      
      lineSetPricesLoaded = true;
      console.log('Line Set prices loaded from API successfully');
      if (callback) callback();
    })
    .catch(function(error) {
      console.error('Failed to load Line Set prices from API:', error);
      console.warn('Using fallback display values - API endpoint not available yet');
      lineSetPricesLoaded = true;
      if (callback) callback();
    });
}

  function getLineSetData(mode) {
    return mode === 'Single' ? SINGLE_ZONE_LINE_SETS : MULTI_ZONE_LINE_SETS;
  }

  function getLineSetPrice(mode, length) {
    var lineSets = getLineSetData(mode);
    var lineSet = lineSets[length];
    return lineSet ? lineSet.price : 0;
  }

  function populateLineSetDropdowns(mode, roomsHost) {
    var lineSets = getLineSetData(mode);
    var selects = $$$ (roomsHost, '[data-input="lineSet"]');
    
    selects.forEach(function(select) {
      var currentValue = select.value;
      select.innerHTML = '<option value="">-- Select Length --</option>';
      
      Object.keys(lineSets).forEach(function(key) {
        var lineSet = lineSets[key];
        var opt = document.createElement('option');
        opt.value = key;
        opt.textContent = lineSet.display;
        select.appendChild(opt);
      });
      
      if (currentValue && lineSets[currentValue]) {
        select.value = currentValue;
      }
    });
  }

  function updateAddRoomButton() {
    var btnAddRoom = document.querySelector('[data-action="add-room"]');
    if (!btnAddRoom) return;
    
    var modeSelect = document.querySelector('[data-field="mode"]');
    var currentMode = modeSelect ? modeSelect.value : 'Single';
    
    if (currentMode === 'Multi') {
      btnAddRoom.style.display = '';
      var rooms = document.querySelectorAll('[data-room-index]');
      btnAddRoom.disabled = rooms.length >= 5;
      
      if (rooms.length >= 5) {
        btnAddRoom.textContent = 'Maximum Rooms Reached (5)';
      } else {
        btnAddRoom.textContent = '+ Add Another Room (' + rooms.length + '/5)';
      }
    } else {
      btnAddRoom.style.display = 'none';
    }
  }
  // ========== END LINE SET CONSTANTS & API INTEGRATION ==========

  // ========== PRODUCT API CONFIGURATION ==========
  // UPDATE THIS to your deployed Vercel URL
  var PRODUCT_API_URL = 'https://gwin-product-api.vercel.app/api/product-lookup';
  
  // ========== PRODUCT FETCHING ==========
  
  /**
   * Fetch product details from your API by SKU
   */
  async function fetchProductBySKU(sku) {
    try {
      var response = await fetch(
        PRODUCT_API_URL + '?sku=' + encodeURIComponent(sku)
      );
      
      if (!response.ok) {
        console.error('Product API error:', response.status);
        return null;
      }
      
      var data = await response.json();
      
      if (data.success && data.product) {
        return data.product;
      } else {
        console.warn('Product not found:', sku);
        return null;
      }
      
    } catch (error) {
      console.error('Error fetching product:', error);
      return null;
    }
  }
  
  /**
   * Display product card in a container
   */
  async function displayProductCard(sku, containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    
    // Show loading state
    container.innerHTML = '<div class="product-loading">Loading product details...</div>';
    
    // Fetch product data
    var product = await fetchProductBySKU(sku);
    
    if (!product) {
      container.innerHTML = '<div class="product-error">Product details unavailable</div>';
      return;
    }
    
    // Build HTML for product card
    var html = [];
    
    html.push('<div class="product-card">');
    
    // Product image
    if (product.image && product.image.url) {
      html.push(
        '<div class="product-image-container">',
          '<img src="' + product.image.url + '" ',
               'alt="' + product.image.alt + '" ',
               'class="product-image" />',
        '</div>'
      );
    }
    
    // Product info
    html.push('<div class="product-info">');
    html.push('<h4 class="product-title">' + product.title + '</h4>');
    html.push('<p class="product-price">$' + product.price + '</p>');
    
    // Add to cart or out of stock
    if (product.availableForSale && product.inStock) {
      html.push(
        '<button class="add-to-cart-btn" ',
                'onclick="addToCartGlobal(\'' + product.variantId + '\')">',
          'Add to Cart',
        '</button>'
      );
    } else if (product.availableForSale && !product.inStock) {
      html.push('<p class="low-stock">Low Stock - Contact Us</p>');
    } else {
      html.push('<p class="out-of-stock">Currently Unavailable</p>');
    }
    
    // View details link with variant ID (FIX FOR CORRECT PRICING)
    if (product.productUrl) {
      // Extract numeric variant ID from GID
      var numericVariantId = product.variantId.split('/').pop();
      var variantUrl = product.productUrl + '?variant=' + numericVariantId;
      
      html.push(
        '<a href="' + variantUrl + '" ',
           'target="_blank" ',
           'class="view-product-link">',
          'View Full Details ',
        '</a>'
      );
    }
    
    html.push('</div>'); // Close product-info
    html.push('</div>'); // Close product-card
    
    container.innerHTML = html.join('');
  }
  
  /**
   * Add product to Shopify cart
   */
  async function addToCartGlobal(variantId) {
    try {
      // Extract numeric ID from Shopify GID
      // gid://shopify/ProductVariant/123456 -> 123456
      var numericId = variantId.split('/').pop();
      
      // Call Shopify Cart API
      var response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: numericId,
          quantity: 1
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to add to cart');
      }
      
      var data = await response.json();
      
      // Success feedback
      alert('Product added to cart successfully!');
      
      // Optional: Trigger cart drawer or redirect
      if (window.Shopify && window.Shopify.theme && window.Shopify.theme.cartDrawer) {
        window.Shopify.theme.cartDrawer.open();
      } else {
        // Fallback: reload page to show cart
        window.location.reload();
      }
      
      return true;
      
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Failed to add product to cart. Please try again.');
      return false;
    }
  }

  // ========== CONFIGURATION SYSTEM ==========
  var hvacConfig = null;
  var configReady = false;
  
  function loadHvacConfig(callback) {
    if (configReady) { callback(); return; }
    
    fetch(window.HVAC_CONFIG_URL || '/assets/hvac-calculator-config.json')
      .then(function(response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then(function(configData) {
        hvacConfig = configData;
        configReady = true;
        console.log('HVAC config loaded successfully');
        callback();
      })
      .catch(function(error) {
        console.error('Failed to load HVAC config:', error);
        alert('Calculator configuration failed to load. Please refresh the page.');
        configReady = true; // Prevent infinite retry
        callback(); // Continue anyway with fallback
      });
  }
  
  // Helper to find single zone air handler by BTU and SEER from config
  function getSingleZoneModel(btu, seer) {
    if (!hvacConfig || !hvacConfig.productCatalog || !hvacConfig.productCatalog.singleZone) {
      return "N/A";
    }
    
    var handlers = hvacConfig.productCatalog.singleZone.airHandlers || [];
    var match = null;
    
    for (var i = 0; i < handlers.length; i++) {
      if (handlers[i].btu === btu && handlers[i].seer === seer) {
        match = handlers[i];
        break;
      }
    }
    
    if (match) {
      return match.sku || match.name || "N/A";
    }
    
    return "N/A";
  }
  // ========== END CONFIGURATION SYSTEM ==========

  // Helper to find closest BTU size from config
  function getClosestBTU(value, mode) {
    var options = [];
    
    if (hvacConfig && hvacConfig.productCatalog) {
      if (mode === 'Single' && hvacConfig.productCatalog.singleZone && hvacConfig.productCatalog.singleZone.airHandlers) {
        // Get BTU options from single zone air handlers
        options = hvacConfig.productCatalog.singleZone.airHandlers.map(function(h) { return h.btu; });
      } else if (hvacConfig.productCatalog.multiZone && hvacConfig.productCatalog.multiZone.indoorUnits) {
        // Get BTU options from multi zone indoor units
        options = Object.keys(hvacConfig.productCatalog.multiZone.indoorUnits).map(Number);
      }
    }
    
    // Fallback if no config data
    if (options.length === 0) {
      options = [7000, 9000, 12000, 18000, 24000, 36000];
    }
    
    return options.reduce(function (prev, curr) {
      return Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev;
    });
  }


  function getAllValidOutdoorOptions(zone, totalBTU, roomCount) {
    if (!hvacConfig || !hvacConfig.outdoorCombinations) return [];
    
    var combos = hvacConfig.outdoorCombinations[zone] || [];
    return combos
      .filter(function (c) { return roomCount <= c.ports && totalBTU <= c.capacity * c.maxRatio; })
      .map(function (c) {
        var loadPercent = totalBTU / c.capacity;
        var color = "green";
        if (loadPercent > 1.1 && loadPercent <= 1.2) color = "yellow";
        else if (loadPercent > 1.2) color = "orange";
        return { sku: c.sku, capacity: c.capacity, ports: c.ports, loadPercent: loadPercent, color: color };
      })
      .sort(function (a, b) { return Math.abs(1 - a.loadPercent) - Math.abs(1 - b.loadPercent); });
  }

  // ---------- UI builders ----------
  function render(root) {
    var title = root.getAttribute('data-title') || 'Air Handling Calculator';
    var desc  = root.getAttribute('data-description') || '';

    root.innerHTML = [
      title ? '<h2 class="calc-title">'+ title +'</h2>' : '',
      desc  ? '<p class="calc-description">'+ desc +'</p>' : '',
      '<div class="calculator-container">',

        // Disclaimer gate
        '<div class="disclaimer-box" data-role="disclaimer">',
          '<h3 class="disclaimer-title">🔒 Disclaimer</h3>',
          '<p class="disclaimer-text">This sizing tool is for preliminary estimates only and does not replace a proper Manual J load calculation. Always verify with a licensed HVAC professional.</p>',
          '<button class="disclaimer-button" data-action="accept">Accept and Continue</button>',
        '</div>',

        // App body (hidden until disclaimer accepted)
        '<div data-role="app" style="display:none;">',

          '<div class="form-group">',
            '<label class="form-label">System Type</label>',
            '<select class="form-select" data-field="mode">',
              '<option value="Single">Single Zone</option>',
              '<option value="Multi">Multi Zone</option>',
            '</select>',
          '</div>',

          '<div class="form-group">',
            '<label class="form-label">Climate Zone</label>',
            '<select class="form-select" data-field="zone">',
              '<option value="South">South</option>',
              '<option value="North">North</option>',
            '</select>',
          '</div>',

          '<div data-role="rooms"></div>',

          '<button class="add-room-button" data-action="add-room" type="button" style="display:none;">+ Add Another Room</button>',

          '<button class="calculate-button" data-action="calculate">View System</button>',

          '<div class="results-container" data-role="results" style="display:none;"></div>',
        '</div>',

      '</div>'
    ].join('');
  }

  // Compact room row template (Name | Area | H | Win | Door | Insul) + Unit Type (Multi only)
  function roomTemplate(index, mode) {
    var showUnit = (mode === 'Multi');
    return [
      '<div class="room-card" data-room-index="'+ index +'">',
        (showUnit ? 
          '<button type="button" class="room-delete-btn" data-action="delete-room" data-room-index="'+ index +'" title="Delete Room">×</button>'
        : ''),
        '<div class="ahc-row compact">',

          '<div>',
            '<label class="ahc-mini-label">Room</label>',
            '<input class="ahc-mini-inp" list="ahc-roomnames" data-input="roomName" placeholder="Living Room" maxlength="40" />',
          '</div>',

          '<div>',
            '<label class="ahc-mini-label">Area (ft²)</label>',
            '<input class="ahc-mini-inp" data-input="area" type="number" inputmode="numeric" min="0" max="100000" step="1" value="500" />',
          '</div>',

          '<div>',
            '<label class="ahc-mini-label">H (ft)</label>',
            '<input class="ahc-mini-inp" data-input="ceilingHeight" type="text" inputmode="numeric" maxlength="2" placeholder="8" />',
          '</div>',

          '<div>',
            '<label class="ahc-mini-label">Win</label>',
            '<input class="ahc-mini-inp" data-input="windows" type="text" inputmode="numeric" maxlength="2" placeholder="0" />',
          '</div>',

          '<div>',
            '<label class="ahc-mini-label">Door</label>',
            '<input class="ahc-mini-inp" data-input="doors" type="text" inputmode="numeric" maxlength="2" value="1" />',
          '</div>',

          '<div>',
            '<label class="ahc-mini-label">Insul</label>',
            '<select class="ahc-mini-sel" data-input="insulation">',
              '<option value="Good">Good</option>',
              '<option value="Fair">Fair</option>',
              '<option value="Poor">Poor</option>',
            '</select>',
          '</div>',

        '</div>',

        // LINE SET DROPDOWN
        '<div class="form-group" style="margin-top:8px;">',
          '<label class="ahc-mini-label">Line Set Length</label>',
          '<select class="ahc-mini-sel" data-input="lineSet">',
            '<option value="">-- Select Length --</option>',
          '</select>',
        '</div>',

        (showUnit ? (
          '<div style="margin-top:6px;">' +
            '<span class="ahc-mini-label">Unit Type</span>' +
            '<select class="ahc-mini-sel" data-input="unitType">' +
              '<option>High Wall</option><option>Slim Duct</option><option>Floor/Ceiling</option><option>4-Way Ceiling Cassette</option>' +
            '</select>' +
          '</div>'
        ) : ''),
      '</div>'
    ].join('');
  }

  // Autocomplete datalist
  var datalistHTML = [
    '<datalist id="ahc-roomnames">',
      '<option>Living Room</option><option>Bedroom</option><option>Dining Room</option><option>Kitchen</option>',
      '<option>Bathroom</option><option>Office</option><option>Garage</option><option>Basement</option>',
    '</datalist>'
  ].join('');

  function createEmptyRoom() {
    return {
      roomName: '',
      area: '500',
      ceilingHeight: '8',
      windows: '0',
      doors: '1',
      insulation: 'Good',
      unitType: 'High Wall'
    };
  }

  // ----- Mount single instance -----
  function mountInstance(root) {
    render(root);

    // Add autocomplete datalist to the page
    if (!document.getElementById('ahc-roomnames')) {
      root.insertAdjacentHTML('beforeend', datalistHTML);
    }

    var disclaimer = $$(root, '[data-role="disclaimer"]');
    var app        = $$(root, '[data-role="app"]');
    var selMode    = $$(root, '[data-field="mode"]');
    var zoneSel    = $$(root, '[data-field="zone"]');
    var roomsBox   = $$(root, '[data-role="rooms"]');
    var btnCalc    = $$(root, '[data-action="calculate"]');
    var resultsBox = $$(root, '[data-role="results"]');
    var btnAccept  = $$(root, '[data-action="accept"]');

    // State
    var state = {
      mode: 'Single',
      roomCount: 1,
      zone: 'South',
      rooms: [createEmptyRoom()]
    };

    function updateModeUI() {
      if (state.mode === 'Multi') {
        // Multi Zone: ensure at least 2 rooms
        if (state.roomCount < 2) state.roomCount = 2;
      } else {
        // Single Zone: always 1 room
        state.roomCount = 1;
      }
      drawRooms();
      updateAddRoomButton();
      resultsBox.style.display = 'none';
    }

    function drawRooms() {
      while (state.rooms.length < state.roomCount) state.rooms.push(createEmptyRoom());
      if (state.rooms.length > state.roomCount) state.rooms.length = state.roomCount;

      var html = [];
      for (var i = 0; i < state.roomCount; i++) {
        html.push(roomTemplate(i, state.mode));
      }
      roomsBox.innerHTML = html.join('');
      syncToDOM();
      
      // POPULATE LINE SET DROPDOWNS
      populateLineSetDropdowns(state.mode, roomsBox);
      
      // UPDATE ADD ROOM BUTTON
      updateAddRoomButton();
    }

    function syncToDOM() {
      state.rooms.forEach(function (form, i) {
        var card = roomsBox.querySelector('[data-room-index="'+ i +'"]');
        if (!card) return;
        var roomNameEl = card.querySelector('[data-input="roomName"]');
        var areaEl = card.querySelector('[data-input="area"]');
        var heightEl = card.querySelector('[data-input="ceilingHeight"]');
        var windowsEl = card.querySelector('[data-input="windows"]');
        var doorsEl = card.querySelector('[data-input="doors"]');
        var insulEl = card.querySelector('[data-input="insulation"]');
        var unitTypeEl = card.querySelector('[data-input="unitType"]');

        if (roomNameEl) roomNameEl.value = form.roomName || '';
        if (areaEl) areaEl.value = form.area || '';
        if (heightEl) heightEl.value = form.ceilingHeight || '8';
        if (windowsEl) windowsEl.value = form.windows || '0';
        if (doorsEl) doorsEl.value = form.doors || '0';
        if (insulEl) insulEl.value = form.insulation || 'Good';
        if (unitTypeEl) unitTypeEl.value = form.unitType || 'High Wall';
      });
    }

    function syncFromDOM() {
      state.rooms.forEach(function (form, i) {
        var card = roomsBox.querySelector('[data-room-index="'+ i +'"]');
        if (!card) return;
        form.roomName = (card.querySelector('[data-input="roomName"]') || {}).value || '';
        form.area = (card.querySelector('[data-input="area"]') || {}).value || '';
        form.ceilingHeight = (card.querySelector('[data-input="ceilingHeight"]') || {}).value || '8';
        form.windows = (card.querySelector('[data-input="windows"]') || {}).value || '0';
        form.doors = (card.querySelector('[data-input="doors"]') || {}).value || '0';
        form.insulation = (card.querySelector('[data-input="insulation"]') || {}).value || 'Good';
        form.unitType = (card.querySelector('[data-input="unitType"]') || {}).value || 'High Wall';
      });
    }

    function calculate() {
      syncFromDOM();

      var total = 0;
      var results = state.rooms.map(function (form) {
        var area    = num(form.area);
        var height  = num(form.ceilingHeight);
        var windows = num(form.windows);
        var doors   = num(form.doors);

        // CORRECTED FORMULA per GWIN HVAC specifications
        // Base: 25 BTU/sqft + 1.6 BTU per foot over 8ft ceiling + insulation adjustment
        var btuPerSqFt = 25; // Base BTU per square foot
        
        // Height adjustment: Only for ceilings OVER 8 feet
        if (height > 8) {
          btuPerSqFt += (height - 8) * 1.6;
        }
        
        // Insulation adjustment (per square foot, NOT multiplier)
        if (form.insulation === "Fair") btuPerSqFt += 3;
        else if (form.insulation === "Poor") btuPerSqFt += 7;
        // Good = +0 (no adjustment)
        
        // Calculate total load
        var areaLoad   = area * btuPerSqFt;
        var windowLoad = windows * 1500;  // 1500 BTU per window (not 100!)
        var doorLoad   = doors * 300;      // 300 BTU per door (not 50!)
        var totalLoad  = Math.round(areaLoad + windowLoad + doorLoad);
        if (!isFinite(totalLoad)) totalLoad = 0;
        total += totalLoad;

        if (state.mode === "Single") {
          var closestBTU = getClosestBTU(totalLoad, 'Single');
          
          // GWIN only sells SEER 25 - look up from config
          var model = getSingleZoneModel(closestBTU, 25);
          
          if (totalLoad > closestBTU * 1.1) {
            model = "⚠️ Load exceeds capacity. Recommend multiple systems or contact professional.";
          }
          
          if (model === "N/A") {
            model = "Model not available for this capacity";
          }
          
          return { btu: totalLoad, roomName: form.roomName, model: model, sku: model };
        } else {
          // Multi-zone: look up indoor unit from config
          var closest = getClosestBTU(totalLoad, 'Multi');
          var model = "Model not available";
          
          if (hvacConfig && hvacConfig.productCatalog && hvacConfig.productCatalog.multiZone) {
            var indoorUnits = hvacConfig.productCatalog.multiZone.indoorUnits;
            var unitsForBTU = indoorUnits[String(closest)];
            
            if (unitsForBTU) {
              for (var i = 0; i < unitsForBTU.length; i++) {
                if (unitsForBTU[i].type === form.unitType) {
                  model = unitsForBTU[i].sku;
                  break;
                }
              }
            }
          }
          
          return { btu: totalLoad, roomName: form.roomName, model: model, sku: model };
        }
      });

      var html = ['<h3 class="results-title">Results</h3>'];
      results.forEach(function (r, i) {
        html.push(
          '<div class="result-item '+ (i < results.length - 1 ? 'result-item-bordered' : '') +'">',
            '<span class="result-name">'+ (r.roomName || ('Room ' + (i+1))) +':</span> ',
            '<span class="result-btu">'+ r.btu +' BTU</span>',
            '<div class="model-info"><strong>Recommended System:</strong> '+ r.model +'</div>',
            '<div id="product-details-'+ i +'" class="product-details-container"></div>',
          '</div>'
        );
      });

      if (state.mode === 'Multi') {
        html.push('<div class="total-load-box"><strong>Total System Load:</strong> <span class="total-load-value">'+ total +' BTU</span></div>');
        var options = getAllValidOutdoorOptions(state.zone, total, state.roomCount);
        if (options.length) {
          html.push('<h4 class="outdoor-title">Recommended Outdoor Units:</h4>');
          options.forEach(function (opt) {
            var colorClass = opt.color === 'green' ? 'outdoor-card-green'
                           : opt.color === 'yellow' ? 'outdoor-card-yellow'
                           : opt.color === 'orange' ? 'outdoor-card-orange' : '';
            html.push(
              '<div class="outdoor-card '+ colorClass +'">',
                '<div class="outdoor-model">'+ opt.sku +'</div>',
                '<div class="outdoor-specs">'+ opt.capacity +' BTU Capacity | '+ opt.ports +' Port'+ (opt.ports>1?'s':'') +'</div>',
                '<div class="outdoor-load">System Load: '+ (opt.loadPercent*100).toFixed(1) +'%</div>',
              '</div>'
            );
          });
        } else {
          html.push('<div class="error-card">⚠️ No suitable outdoor unit found. Recommend multiple GWIN systems or contact a professional for a custom solution.</div>');
        }
      }

      resultsBox.innerHTML = html.join('');
      resultsBox.style.display = '';
      
      // Fetch and display products for each result
      results.forEach(function(r, i) {
        if (r.sku && r.sku !== 'N/A' && !r.sku.includes('⚠️')) {
          displayProductCard(r.sku, 'product-details-' + i);
        }
      });
    }

    // ----- Reset / Clear -----
    function resetAll() {
      // Reset state
      state.mode = 'Single';
      state.roomCount = 1;
      state.zone = 'South';
      state.rooms = [createEmptyRoom()];

      // Reset UI controls
      selMode.value = 'Single';
      zoneSel.value = 'South';

      // Clear results & redraw
      resultsBox.innerHTML = '';
      resultsBox.style.display = 'none';
      drawRooms();

      // Return to disclaimer gate
      app.style.display = 'none';
      disclaimer.style.display = '';
    }

    // Store reset function on root element so modal close can access it
    root.__calculatorReset = resetAll;

    // ----- Event listeners -----
    btnAccept.addEventListener('click', function () {
      disclaimer.style.display = 'none';
      app.style.display = '';
      updateModeUI();
    });

    selMode.addEventListener('change', function () {
      // AUTO-RESET on mode change
      resultsBox.style.display = 'none';
      resultsBox.innerHTML = '';
      
      state.mode = selMode.value;
      
      // Reset to appropriate number of rooms
      if (state.mode === 'Multi') {
        state.roomCount = 2;
      } else {
        state.roomCount = 1;
      }
      
      // Reset rooms to empty
      state.rooms = [];
      for (var i = 0; i < state.roomCount; i++) {
        state.rooms.push(createEmptyRoom());
      }
      
      drawRooms();
      updateAddRoomButton();
    });

    zoneSel.addEventListener('change', function () {
      state.zone = zoneSel.value;
      resultsBox.style.display = 'none';
    });

    btnCalc.addEventListener('click', calculate);

    // DELETE ROOM functionality
    roomsBox.addEventListener('click', function(e) {
      var deleteBtn = e.target.closest('[data-action="delete-room"]');
      if (!deleteBtn) return;
      
      var roomIndex = parseInt(deleteBtn.getAttribute('data-room-index'), 10);
      
      // Don't allow deleting if only 1 room left
      if (state.roomCount <= 1) {
        alert('You must have at least one room');
        return;
      }
      
      // For Multi mode, don't go below 2 rooms
      if (state.mode === 'Multi' && state.roomCount <= 2) {
        alert('Multi-zone systems require at least 2 rooms');
        return;
      }
      
      // Remove room from state
      state.rooms.splice(roomIndex, 1);
      state.roomCount = state.rooms.length;
      
      // Hide results
      resultsBox.style.display = 'none';
      resultsBox.innerHTML = '';
      
      // Re-render
      drawRooms();
      updateAddRoomButton();
    });

    // ADD ROOM functionality
    var btnAddRoom = $$ (root, '[data-action="add-room"]');

    if (btnAddRoom) {
      btnAddRoom.addEventListener('click', function() {
        // Maximum 5 rooms
        if (state.roomCount >= 5) {
          alert('Maximum 5 rooms allowed');
          return;
        }
        
        // Add new empty room
        state.rooms.push(createEmptyRoom());
        state.roomCount = state.rooms.length;
        
        // Hide results
        resultsBox.style.display = 'none';
        resultsBox.innerHTML = '';
        
        // Re-render
        drawRooms();
        updateAddRoomButton();
        
        // Scroll to new room
        setTimeout(function() {
          var newRoomCard = $$$ (roomsBox, '[data-room-index]')[state.roomCount - 1];
          if (newRoomCard) {
            newRoomCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 100);
      });
    }

    // Initialize defaults
    updateModeUI();
  }

  // Mount all instances in a context
  function initAll(context) {
    $$$ (context || document, '[data-air-calculator]').forEach(function (root) {
      if (root.__airCalcMounted) return;
      root.__airCalcMounted = true;
      mountInstance(root);
    });
  }

  // DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){
      loadHvacConfig(function() {
        loadLineSetPrices(function() {
          initAll();
        });
      });
    });
  } else { 
    loadHvacConfig(function() {
      loadLineSetPrices(function() {
        initAll();
      });
    });
  }  // Theme editor lifecycle
  document.addEventListener('shopify:section:load', function (e) { initAll(e.target); });
})();

// ---------- Modal open/close ----------
document.addEventListener('click', function (e) {
  var openBtn = e.target.closest('[data-ahc-open]');
  if (openBtn) {
    var sid = openBtn.getAttribute('data-ahc-open');
    var modal = document.getElementById('ahc-modal-' + sid);
    if (modal) modal.hidden = false;
  }
  if (e.target.closest('[data-ahc-close]')) {
    var modalEl = e.target.closest('.ahc-modal');
    if (modalEl) {
      modalEl.hidden = true;
      
      // FIX: Reset calculator when modal closes
      var calculator = modalEl.querySelector('[data-air-calculator]');
      if (calculator && calculator.__calculatorReset) {
        calculator.__calculatorReset();
      }
    }
  }
});