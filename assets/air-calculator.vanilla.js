(function () {
  // Utilities (no JSX, no eval)
  var $$ = function (root, sel) { return root.querySelector(sel); };
  var $$$ = function (root, sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); };
  var num = function (v, d) { var n = (v === '' || v == null) ? NaN : Number(v); return isFinite(n) ? n : (d != null ? d : 0); };

  var indoorUnitModels = {
    36000: { "High Wall": "AFEB36HP230V1CH" },
    7000:  { "High Wall": "AFEB07HP230V1CH" },
    9000:  { "High Wall": "AFEB09HP230V1CH", "4-Way Ceiling Cassette": "AFEB09HP230V1CC", "Slim Duct": "AFEB09HP230V1SD", "Floor/Ceiling": "AFEB09HP230V1FL" },
    12000: { "High Wall": "AFEB12HP230V1CH", "4-Way Ceiling Cassette": "AFEB12HP230V1CC", "Slim Duct": "AFEB12HP230V1SD", "Floor/Ceiling": "AFEB12HP230V1FL" },
    18000: { "High Wall": "AFEB18HP230V1CH", "4-Way Ceiling Cassette": "AFEB18HP230V1CC", "Slim Duct": "AFEB18HP230V1SD", "Floor/Ceiling": "AFEB18HP230V1FL" },
    24000: { "High Wall": "AFEB24HP230V1CH", "4-Way Ceiling Cassette": "AFEB24HP230V1CC", "Slim Duct": "AFEB24HP230V1SD", "Floor/Ceiling": "AFEB24HP230V1FL" }
  };

  var outdoorCombinations = {
    South: [
      { model: "ASPR18HPMULO", capacity: 18000, maxRatio: 1.33, ports: 2 },
      { model: "ASPR24HPMULO", capacity: 24000, maxRatio: 1.5,  ports: 3 },
      { model: "ASPR36HPMULO", capacity: 36000, maxRatio: 1.5,  ports: 4 },
      { model: "ASPR42HPMULO", capacity: 42000, maxRatio: 1.42, ports: 5 }
    ],
    North: [
      { model: "ASUM18HPMULO", capacity: 18000, maxRatio: 1.33, ports: 2 },
      { model: "ASUM24HPMULO", capacity: 24000, maxRatio: 1.5,  ports: 3 },
      { model: "ASUM36HPMULO", capacity: 36000, maxRatio: 1.5,  ports: 4 },
      { model: "ASUM42HPMULO", capacity: 42000, maxRatio: 1.42, ports: 5 }
    ]
  };

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
        return Object.assign({}, c, { loadPercent: loadPercent, color: color });
      })
      .sort(function (a, b) { return Math.abs(1 - a.loadPercent) - Math.abs(1 - b.loadPercent); });
  }

  function render(root) {
    var title = root.getAttribute('data-title') || 'Air Handling Calculator';
    var desc  = root.getAttribute('data-description') || '';

    root.innerHTML = [
      title ? '<h2 class="calc-title">'+ title +'</h2>' : '',
      desc  ? '<p class="calc-description">'+ desc +'</p>' : '',
      '<div class="calculator-container">',
        // Disclaimer
        '<div class="disclaimer-box" data-role="disclaimer">',
          '<h3 class="disclaimer-title">🔒 Disclaimer</h3>',
          '<p class="disclaimer-text">This sizing tool is for preliminary estimates only and does not replace a proper Manual J load calculation. Always verify with a licensed HVAC professional.</p>',
          '<button class="disclaimer-button" data-action="accept">Accept and Continue</button>',
        '</div>',

        // Main UI (hidden until disclaimer accepted)
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

          '<div class="results-container" data-role="results" style="display:none;"></div>',
        '</div>',
      '</div>'
    ].join('');
  }

  function roomTemplate(index, mode) {
    var showUnit = (mode === 'Multi');
    return [
      '<div class="room-card" data-room-index="'+ index +'">',
        '<h4 class="room-title">Room '+ (index+1) +'</h4>',
        showUnit ? (
          '<div class="field-group">'+
            '<label class="small-label">Unit Type</label>'+
            '<select class="small-input" data-input="unitType">'+
              '<option value="High Wall">High Wall</option>'+
              '<option value="Slim Duct">Slim Duct</option>'+
              '<option value="Floor/Ceiling">Floor/Ceiling</option>'+
              '<option value="4-Way Ceiling Cassette">4-Way Ceiling Cassette</option>'+
            '</select>'+
          '</div>'
        ) : '',
        '<div class="field-group">',
          '<label class="small-label">Room Name</label>',
          '<input class="small-input" data-input="roomName" placeholder="e.g., Living Room" />',
        '</div>',
        '<div class="field-group">',
          '<label class="small-label">Area (sq ft)</label>',
          '<input class="small-input" data-input="area" type="number" placeholder="e.g., 250" />',
        '</div>',
        '<div class="field-group">',
          '<label class="small-label">Ceiling Height (ft)</label>',
          '<input class="small-input" data-input="ceilingHeight" type="number" placeholder="e.g., 8" />',
        '</div>',
        '<div class="field-group">',
          '<label class="small-label">Number of Windows</label>',
          '<input class="small-input" data-input="windows" type="number" placeholder="e.g., 2" />',
        '</div>',
        '<div class="field-group">',
          '<label class="small-label">Number of Doors</label>',
          '<input class="small-input" data-input="doors" type="number" placeholder="e.g., 1" />',
        '</div>',
        '<div class="field-group">',
          '<label class="small-label">Insulation Level</label>',
          '<select class="small-input" data-input="insulation">',
            '<option value="Good">Good</option>',
            '<option value="Fair">Fair</option>',
            '<option value="Poor">Poor</option>',
          '</select>',
        '</div>',
      '</div>'
    ].join('');
  }

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

  function mountInstance(root) {
    render(root);

    var disclaimer = $$ (root, '[data-role="disclaimer"]');
    var app        = $$ (root, '[data-role="app"]');
    var roomsHost  = $$ (root, '[data-role="rooms"]');
    var resultsBox = $$ (root, '[data-role="results"]');
    var btnAccept  = $$ (root, '[data-action="accept"]');
    var btnCalc    = $$ (root, '[data-action="calculate"]');
    var selMode    = $$ (root, '[data-field="mode"]');
    var zoneSel    = $$ (root, '[data-field="zone"]');
    var roomCountWrap = $$ (root, '[data-role="room-count"]');
    var inpRoomCount  = $$ (root, '[data-field="roomCount"]');

    var state = {
      mode: 'Single',
      roomCount: 1,
      zone: 'South',
      rooms: [createEmptyRoom()]
    };

    function drawRooms() {
      roomsHost.innerHTML = '';
      for (var i = 0; i < state.roomCount; i++) {
        roomsHost.insertAdjacentHTML('beforeend', roomTemplate(i, state.mode));
      }
      // Fill defaults
      $$$ (roomsHost, '[data-room-index]').forEach(function (card, idx) {
        if (!state.rooms[idx]) state.rooms[idx] = createEmptyRoom();
        // hydrate
        var r = state.rooms[idx];
        var v = function (q) { return $$(card, q); };
        if (state.mode === 'Multi') v('[data-input="unitType"]').value = r.unitType;
        v('[data-input="roomName"]').value     = r.roomName;
        v('[data-input="area"]').value         = r.area;
        v('[data-input="ceilingHeight"]').value= r.ceilingHeight;
        v('[data-input="windows"]').value      = r.windows;
        v('[data-input="doors"]').value        = r.doors;
        v('[data-input="insulation"]').value   = r.insulation;
      });
    }

    function syncFromDOM() {
      // Persist current inputs back to state
      $$$ (roomsHost, '[data-room-index]').forEach(function (card, idx) {
        var r = state.rooms[idx] || createEmptyRoom();
        var g = function (q) { var el = $$(card, q); return el ? el.value : ''; };
        if (state.mode === 'Multi') r.unitType = g('[data-input="unitType"]');
        r.roomName      = g('[data-input="roomName"]');
        r.area          = g('[data-input="area"]');
        r.ceilingHeight = g('[data-input="ceilingHeight"]');
        r.windows       = g('[data-input="windows"]');
        r.doors         = g('[data-input="doors"]');
        r.insulation    = g('[data-input="insulation"]');
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

        var roomLoad = area * height * 5;
        var windowLoad = windows * 100;
        var doorLoad = doors * 50;
        var totalLoad = Math.round((roomLoad + windowLoad + doorLoad) * insulationFactor);
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

      // Render results
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
        html.push(
          '<div class="total-load-box"><strong>Total System Load:</strong> <span class="total-load-value">'+ total +' BTU</span></div>'
        );
        var options = getAllValidOutdoorOptions(state.zone, total, state.roomCount);
        if (options.length) {
          html.push('<h4 class="outdoor-title">Recommended Outdoor Units:</h4>');
          options.forEach(function (opt) {
            var colorClass = opt.color === 'green' ? 'outdoor-card-green' : opt.color === 'yellow' ? 'outdoor-card-yellow' : opt.color === 'orange' ? 'outdoor-card-orange' : '';
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

    // Events
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

    // Initialize default UI
    updateModeUI();
  }

  function initAll(context) {
    var scope = context || document;
    $$$ (scope, '[data-air-calculator]').forEach(function (root) {
      // Avoid double-mount
      if (root.__airCalcMounted) return;
      root.__airCalcMounted = true;
      mountInstance(root);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ initAll(); });
  } else { initAll(); }

  // Theme Editor lifecycle
  document.addEventListener('shopify:section:load', function (e) { initAll(e.target); });
})();
// --- simple open/close for the modal shell ---
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

