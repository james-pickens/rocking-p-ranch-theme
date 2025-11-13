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

          '<div class="form-group" data-role="room-count" style="display:none;">',
            '<label class="form-label">Number of Rooms (2–5)</label>',
            '<input class="form-input" type="number" min="2" max="5" value="2" data-field="roomCount" />',
          '</div>',

          '<div class="form-group">',
            '<label class="form-label">Climate Zone</label>',
            '<select class="form-select" data-field="zone">',
              '<option value="South">South</option>',
              '<option value="North">North</option>',
            '</select>',
          '</div>',

          '<div data-role="rooms"></div>',

          '<button class="calculate-button" data-action="calculate">Calculate System Requirements</button>',
          '<button class="reset-button" type="button" data-action="reset">Clear Form</button>',


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
        '<div class="ahc-row compact">',

          '<div>',
            '<label class="ahc-mini-label">Room</label>',
            '<input class="ahc-mini-inp" list="ahc-roomnames" data-input="roomName" placeholder="Living Room" maxlength="40" />',
          '</div>',

          '<div>',
            '<label class="ahc-mini-label">Area (ft²)</label>',
            '<input class="ahc-mini-inp" data-input="area" type="number" inputmode="numeric" min="0" max="100000" step="1" placeholder="0" />',
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
            '<input class="ahc-mini-inp" data-input="doors" type="text" inputmode="numeric" maxlength="2" placeholder="0" />',
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

  // Datalist for quick room names (once)
  function ensureRoomNameDatalist() {
    if (document.getElementById('ahc-roomnames')) return;
    var dl = document.createElement('datalist');
    dl.id = 'ahc-roomnames';
    dl.innerHTML = [
      'Living Room','Dining Room','Kitchen','Master Bedroom','Bedroom','Office',
      'Family Room','Den','Basement','Garage','Sunroom','Bonus Room'
    ].map(function(n){ return '<option value="'+n+'"></option>'; }).join('');
    document.body.appendChild(dl);
  }

  // ---------- Instance mounting ----------
  function mountInstance(root) {
    render(root);

    var disclaimer    = $$ (root, '[data-role="disclaimer"]');
    var app           = $$ (root, '[data-role="app"]');
    var roomsHost     = $$ (root, '[data-role="rooms"]');
    var resultsBox    = $$ (root, '[data-role="results"]');
    var btnAccept     = $$ (root, '[data-action="accept"]');
    var btnCalc       = $$ (root, '[data-action="calculate"]');
    var selMode       = $$ (root, '[data-field="mode"]');
    var zoneSel       = $$ (root, '[data-field="zone"]');
    var roomCountWrap = $$ (root, '[data-role="room-count"]');
    var inpRoomCount  = $$ (root, '[data-field="roomCount"]');
    var btnReset      = $$ (root, '[data-action="reset"]'); // Clear button

    var state = {
      mode: 'Single',
      roomCount: 1,
      zone: 'South',
      rooms: [createEmptyRoom()]
    };

    function createEmptyRoom() {
      return {
        unitType: "High Wall",
        roomName: "",
        area: "",
        ceilingHeight: "",
        windows: "",
        doors: "",
        orientation: "N",
        insulation: "Good"
      };
    }

    // Enforce compact input limits (Area 0..100000; H/Win/Door 0..99 and 2 chars)
    function attachRoomInputLimits() {
      $$$ (roomsHost, '[data-room-index]').forEach(function (card) {
        var area = $$ (card, '[data-input="area"]');
        var h    = $$ (card, '[data-input="ceilingHeight"]');
        var win  = $$ (card, '[data-input="windows"]');
        var dor  = $$ (card, '[data-input="doors"]');

        if (area) {
          area.addEventListener('input', function(){
            var v = clampInt(area.value, 0, 100000);
            area.value = String(v).replace(/[^\d]/g,'');
          });
        }
        [h, win, dor].forEach(function(inp){
          if (!inp) return;
          inp.addEventListener('input', function(){
            var s = (inp.value||'').replace(/[^\d]/g,'').slice(0,2);
            var v = clampInt(s, 0, 99);
            inp.value = String(v);
          });
        });
      });
    }

    function drawRooms() {
      roomsHost.innerHTML = '';
      for (var i = 0; i < state.roomCount; i++) {
        roomsHost.insertAdjacentHTML('beforeend', roomTemplate(i, state.mode));
      }
      // hydrate existing state
      $$$ (roomsHost, '[data-room-index]').forEach(function (card, idx) {
        if (!state.rooms[idx]) state.rooms[idx] = createEmptyRoom();
        var r = state.rooms[idx];
        var set = function (q, val) { var el = $$ (card, q); if (el != null) el.value = val; };
        if (state.mode === 'Multi') set('[data-input="unitType"]', r.unitType);
        set('[data-input="roomName"]',      r.roomName);
        set('[data-input="area"]',          r.area);
        set('[data-input="ceilingHeight"]', r.ceilingHeight);
        set('[data-input="windows"]',       r.windows);
        set('[data-input="doors"]',         r.doors);
        set('[data-input="insulation"]',    r.insulation);
      });

      ensureRoomNameDatalist();
      attachRoomInputLimits();
    }

    function syncFromDOM() {
      $$$ (roomsHost, '[data-room-index]').forEach(function (card, idx) {
        var r = state.rooms[idx] || createEmptyRoom();
        var get = function (q) { var el = $$ (card, q); return el ? el.value : ''; };
        if (state.mode === 'Multi') r.unitType = get('[data-input="unitType"]');
        r.roomName      = get('[data-input="roomName"]');
        r.area          = get('[data-input="area"]');
        r.ceilingHeight = get('[data-input="ceilingHeight"]');
        r.windows       = get('[data-input="windows"]');
        r.doors         = get('[data-input="doors"]');
        r.insulation    = get('[data-input="insulation"]');
        state.rooms[idx] = r;
      });
    }

    function updateModeUI() {
      roomCountWrap.style.display = (state.mode === 'Multi') ? '' : 'none';
      if (state.mode === 'Single') {
        state.roomCount = 1;
        state.rooms = [state.rooms[0] || createEmptyRoom()];
      } else {
        if (state.roomCount < 2) state.roomCount = 2;
        if (state.roomCount > 5) state.roomCount = 5;
      }
      drawRooms();
      resultsBox.style.display = 'none';
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
          
          return { btu: totalLoad, roomName: form.roomName, model: model };
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
          
          return { btu: totalLoad, roomName: form.roomName, model: model };
        }
      });

      var html = ['<h3 class="results-title">Results</h3>'];
      results.forEach(function (r, i) {
        html.push(
          '<div class="result-item '+ (i < results.length - 1 ? 'result-item-bordered' : '') +'">',
            '<span class="result-name">'+ (r.roomName || ('Room ' + (i+1))) +':</span> ',
            '<span class="result-btu">'+ r.btu +' BTU</span>',
            '<div class="model-info"><strong>Recommended System:</strong> '+ r.model +'</div>',
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
      inpRoomCount.value = 2; // default when switching to Multi later

      // Clear results & redraw
      resultsBox.innerHTML = '';
      resultsBox.style.display = 'none';
      drawRooms();

      // Return to disclaimer gate
      app.style.display = 'none';
      disclaimer.style.display = '';
    }

    // ----- Event listeners -----
    btnAccept.addEventListener('click', function () {
      disclaimer.style.display = 'none';
      app.style.display = '';
      updateModeUI();
    });

    selMode.addEventListener('change', function () {
      state.mode = selMode.value;
      updateModeUI();
    });

    inpRoomCount.addEventListener('input', function () {
      var v = Math.max(2, Math.min(5, num(inpRoomCount.value, 2)));
      inpRoomCount.value = v;
      state.roomCount = v;
      drawRooms();
      resultsBox.style.display = 'none';
    });

    zoneSel.addEventListener('change', function () {
      state.zone = zoneSel.value;
      resultsBox.style.display = 'none';
    });

    btnCalc.addEventListener('click', calculate);

    if (btnReset) {
      btnReset.addEventListener('click', resetAll);
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
      initAll();
    });
  });
  } else { 
    loadHvacConfig(function() {
      initAll();
    });
  }

  // Theme editor lifecycle
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
    if (modalEl) modalEl.hidden = true;
  }
});
