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

  // ---------- Data (Phase 1 hard-coded) ----------
  var indoorUnitModels = {
    36000: { "High Wall": "AFEB36HP230V1CH" },
    7000:  { "High Wall": "AFEB07HP230V1CH" },
    9000:  { "High Wall": "AFEB09HP230V1CH", "4-Way Ceiling Cassette":"AFEB09HP230V1CC", "Slim Duct":"AFEB09HP230V1SD", "Floor/Ceiling":"AFEB09HP230V1FL" },
    12000: { "High Wall": "AFEB12HP230V1CH", "4-Way Ceiling Cassette":"AFEB12HP230V1CC", "Slim Duct":"AFEB12HP230V1SD", "Floor/Ceiling":"AFEB12HP230V1FL" },
    18000: { "High Wall": "AFEB18HP230V1CH", "4-Way Ceiling Cassette":"AFEB18HP230V1CC", "Slim Duct":"AFEB18HP230V1SD", "Floor/Ceiling":"AFEB18HP230V1FL" },
    24000: { "High Wall": "AFEB24HP230V1CH", "4-Way Ceiling Cassette":"AFEB24HP230V1CC", "Slim Duct":"AFEB24HP230V1SD", "Floor/Ceiling":"AFEB24HP230V1FL" }
  };

  var outdoorCombinations = {
    South: [
      { model:"ASPR18HPMULO", capacity:18000, maxRatio:1.33, ports:2 },
      { model:"ASPR24HPMULO", capacity:24000, maxRatio:1.5,  ports:3 },
      { model:"ASPR36HPMULO", capacity:36000, maxRatio:1.5,  ports:4 },
      { model:"ASPR42HPMULO", capacity:42000, maxRatio:1.42, ports:5 }
    ],
    North: [
      { model:"ASUM18HPMULO", capacity:18000, maxRatio:1.33, ports:2 },
      { model:"ASUM24HPMULO", capacity:24000, maxRatio:1.5,  ports:3 },
      { model:"ASUM36HPMULO", capacity:36000, maxRatio:1.5,  ports:4 },
      { model:"ASUM42HPMULO", capacity:42000, maxRatio:1.42, ports:5 }
    ]
  };

  // ---------- Core calc helpers ----------
  function getClosestBTU(value) {
    var options = Object.keys(indoorUnitModels).map(function (k) { return Number(k); });
    return options.reduce(function (prev, curr) {
      return Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev;
    });
  }

  function getAllValidOutdoorOptions(zone, totalBTU, roomCount) {
    var combos = outdoorCombinations[zone] || [];
    return combos
      .filter(function (c) { return roomCount <= c.ports && totalBTU <= c.capacity * c.maxRatio; })
      .map(function (c) {
        var loadPercent = totalBTU / c.capacity;
        var color = "green";
        if (loadPercent > 1.1 && loadPercent <= 1.2) color = "yellow";
        else if (loadPercent > 1.2) color = "orange";
        return { model: c.model, capacity: c.capacity, ports: c.ports, loadPercent: loadPercent, color: color };
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

        var insulationFactor = 1.0;
        if (form.insulation === "Fair") insulationFactor = 1.1;
        else if (form.insulation === "Poor") insulationFactor = 1.2;

        var roomLoad   = area * height * 5;
        var windowLoad = windows * 100;
        var doorLoad   = doors * 50;
        var totalLoad  = Math.round((roomLoad + windowLoad + doorLoad) * insulationFactor);
        if (!isFinite(totalLoad)) totalLoad = 0;
        total += totalLoad;

        if (state.mode === "Single") {
          var closestBTU = getClosestBTU(totalLoad);
          var model20 = "N/A", model22 = "N/A", model25 = "N/A";
          if (closestBTU === 9000)  { model20 = "AJAN09HP115V1C / AJAN09HP230V1C"; model22 = "AFEB09HP115V1C / AFEB09HP230V1C"; model25 = "AMAR09HP115V1C / AMAR09HP230V1C"; }
          else if (closestBTU === 12000) { model20 = "AJAN12HP115V1C / AJAN12HP230V1C"; model22 = "AFEB12HP115V1C / AFEB12HP230V1C"; model25 = "AMAR12HP115V1C / AMAR12HP230V1C"; }
          else if (closestBTU === 18000) { model20 = "AJAN18HP230V1C"; model22 = "AFEB18HP230V2C"; model25 = "AMAR18HP230V1C"; }
          else if (closestBTU === 24000) { model20 = "AJAN24HP230V1C"; model22 = "AFEB24HP230V1C"; model25 = "AMAR24HP230V1C"; }
          else if (closestBTU === 36000) { model20 = "AJAN36HP230V1C"; model22 = "N/A"; model25 = "N/A"; }
          if (totalLoad > closestBTU * 1.1) {
            var warn = "⚠️ No suitable outdoor unit found. Recommend multiple AUX systems.";
            model20 = warn; model22 = warn; model25 = warn;
          }
          return { btu: totalLoad, roomName: form.roomName, model20: model20, model22: model22, model25: model25 };
        } else {
          var closest = getClosestBTU(totalLoad);
          var model = (indoorUnitModels[closest] && indoorUnitModels[closest][form.unitType]) || "Model not available";
          return { btu: totalLoad, roomName: form.roomName, model: model };
        }
      });

      var html = ['<h3 class="results-title">Results</h3>'];
      results.forEach(function (r, i) {
        html.push(
          '<div class="result-item '+ (i < results.length - 1 ? 'result-item-bordered' : '') +'">',
            '<span class="result-name">'+ (r.roomName || ('Room ' + (i+1))) +':</span> ',
            '<span class="result-btu">'+ r.btu +' BTU</span>',
            (state.mode === 'Single'
              ? '<div class="model-info">'
                  + '<p class="model-line"><strong>SEER 20:</strong> '+ r.model20 +'</p>'
                  + '<p class="model-line"><strong>SEER 22:</strong> '+ r.model22 +'</p>'
                  + '<p class="model-line"><strong>SEER 25:</strong> '+ r.model25 +'</p>'
                + '</div>'
              : '<div class="model-info"><strong>Model:</strong> '+ r.model +'</div>'
            ),
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
                '<div class="outdoor-model">'+ opt.model +'</div>',
                '<div class="outdoor-specs">'+ opt.capacity +' BTU Capacity | '+ opt.ports +' Port'+ (opt.ports>1?'s':'') +'</div>',
                '<div class="outdoor-load">System Load: '+ (opt.loadPercent*100).toFixed(1) +'%</div>',
              '</div>'
            );
          });
        } else {
          html.push('<div class="error-card">⚠️ No suitable outdoor unit found. Recommend multiple AUX systems or contact a professional for a custom solution.</div>');
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
    document.addEventListener('DOMContentLoaded', function(){ initAll(); });
  } else { initAll(); }

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
