/* =============================================
KINDLE DASHBOARD — app.js
ES5-compatible for Kindle WebKit browser
============================================= */

// –– CONFIG ––
var CONFIG = {
  // Open-Meteo: set your lat/lon (no API key needed)
  // Find your coords: https://www.latlong.net/
  weatherLat: 12.9716,   // Bangalore
  weatherLon: 77.5946,   // Bangalore
  weatherPlace: 'BANGALORE',
  // IANA zone used to ask Open-Meteo for the wall-clock time we display.
  weatherTimeZone: 'Asia/Kolkata',
  // Fallback offset if the server time anchor isn't available yet (IST = UTC+5:30).
  timeZoneOffsetMinutes: 330,
  weatherCacheMinutes: 60,

  // Data file location (relative to index.html)
  dataFile: 'data.json',

  // How many events to show in week cells
  weekMaxEvents: 2
};

// –– STATE ––
var appData = { events: [], tasks: [] };
var taskDoneState = {}; // id -> true/false (from localStorage)
var currentFilter = 'all';
var currentTab = 'today';

// timeOffsetMs: amount to add to Date.now() so that interpreting the result
// as a UTC instant yields Bangalore wall time. Calibrated from Open-Meteo's
// response (which knows real IST regardless of how badly the Kindle's own
// clock has drifted). Persisted in localStorage so a stale device clock
// is corrected immediately on subsequent loads.
var timeOffsetMs = CONFIG.timeZoneOffsetMinutes * 60000;
try {
  var savedOffset = localStorage.getItem('timeOffsetMs_v1');
  if (savedOffset !== null) {
    var n = parseFloat(savedOffset);
    if (!isNaN(n)) timeOffsetMs = n;
  }
} catch(e) {}

// Returns a Date whose local fields (getHours, getMonth, getDate, ...)
// represent Bangalore wall time, regardless of the device's clock or
// timezone. Built by reading IST as UTC ms, then reconstructing as a
// locally-built Date so subsequent local-field arithmetic stays consistent.
function nowLocal() {
  var istAsUtc = new Date(Date.now() + timeOffsetMs);
  return new Date(
    istAsUtc.getUTCFullYear(),
    istAsUtc.getUTCMonth(),
    istAsUtc.getUTCDate(),
    istAsUtc.getUTCHours(),
    istAsUtc.getUTCMinutes(),
    istAsUtc.getUTCSeconds()
  );
}

var currentMonth = nowLocal().getMonth();
var currentYear = nowLocal().getFullYear();

// –– INIT ––
window.onload = function () {
  loadDoneState();
  document.getElementById('weather-place').textContent = CONFIG.weatherPlace;
  updateClock();
  setInterval(updateClock, 30000);
  loadData();
  fetchWeather();
};

// –– CLOCK ––
function updateClock() {
  var now = nowLocal();
  var h = now.getHours();
  var m = now.getMinutes();
  var ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  var timeStr = h + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm;

  var days = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
  var months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  var dateStr = days[now.getDay()] + ', ' + months[now.getMonth()] + ' ' + now.getDate() + ', ' + now.getFullYear();

  document.getElementById('time-display').textContent = timeStr;
  document.getElementById('date-display').textContent = dateStr;
}

// –– DATA LOADING ––
function loadData() {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', CONFIG.dataFile + '?v=' + Date.now(), true);
  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        try {
          appData = JSON.parse(xhr.responseText);
        } catch(e) {
          appData = { events: [], tasks: [] };
        }
      }
      renderAll();
    }
  };
  xhr.send();
}

// –– LOCALSTORAGE (task done state) ––
function loadDoneState() {
  try {
    var raw = localStorage.getItem('taskDoneState');
    if (raw) taskDoneState = JSON.parse(raw);
  } catch(e) { taskDoneState = {}; }
}

function saveDoneState() {
  try {
    localStorage.setItem('taskDoneState', JSON.stringify(taskDoneState));
  } catch(e) {}
}

// –– TAB SWITCHING ––
function switchTab(tab) {
  currentTab = tab;
  var views = document.querySelectorAll('.view');
  for (var i = 0; i < views.length; i++) {
    views[i].classList.remove('active');
  }
  var btns = document.querySelectorAll('.tab-btn');
  for (var j = 0; j < btns.length; j++) {
    btns[j].classList.remove('active');
  }
  document.getElementById('view-' + tab).classList.add('active');
  var allBtns = document.querySelectorAll('.tab-btn');
  var tabMap = { today: 0, week: 1, month: 2, tasks: 3 };
  allBtns[tabMap[tab]].classList.add('active');
}

// –– RENDER ALL ––
function renderAll() {
  renderToday();
  renderWeek();
  renderMonth();
  renderAllTasks();
}

// –– HELPERS ––
function todayStr() {
  return dateToStr(nowLocal());
}

function dateToStr(d) {
  var y = d.getFullYear();
  var m = d.getMonth() + 1;
  var day = d.getDate();
  return y + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
}

function getEventsForDate(dateStr) {
  return (appData.events || []).filter(function(e) { return e.date === dateStr; });
}

function getTasksForDate(dateStr) {
  return (appData.tasks || []).filter(function(t) { return t.date === dateStr; });
}

function isTaskDone(task) {
  if (taskDoneState.hasOwnProperty(task.id)) return taskDoneState[task.id];
  return task.done || false;
}

function formatTime(t) {
  if (!t) return '';
  var parts = t.split(':');
  var h = parseInt(parts[0]);
  var m = parts[1] || '00';
  var ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return h + ':' + m + ampm;
}

// –– RENDER TODAY ––
function renderToday() {
  var today = todayStr();
  var events = getEventsForDate(today);
  var tasks = getTasksForDate(today);

  var evEl = document.getElementById('today-events');
  evEl.innerHTML = '';
  if (events.length === 0) {
    evEl.innerHTML = '<div class="empty-msg">NO EVENTS</div>';
  } else {
    events.sort(function(a,b){ return (a.time||'').localeCompare(b.time||''); });
    for (var i = 0; i < events.length; i++) {
      evEl.appendChild(makeEventEl(events[i]));
    }
  }

  var tkEl = document.getElementById('today-tasks');
  tkEl.innerHTML = '';
  if (tasks.length === 0) {
    tkEl.innerHTML = '<div class="empty-msg">NO TASKS</div>';
  } else {
    for (var j = 0; j < tasks.length; j++) {
      tkEl.appendChild(makeTaskEl(tasks[j], renderAll));
    }
  }
}

function makeEventEl(ev) {
  var div = document.createElement('div');
  div.className = 'event-item';
  var timeSpan = document.createElement('span');
  timeSpan.className = 'event-time';
  timeSpan.textContent = formatTime(ev.time) || '—';
  var titleSpan = document.createElement('span');
  titleSpan.className = 'event-title';
  titleSpan.textContent = ev.title;
  div.appendChild(timeSpan);
  div.appendChild(titleSpan);
  if (ev.tag) {
    var tagSpan = document.createElement('span');
    tagSpan.className = 'event-tag';
    tagSpan.textContent = ev.tag.toUpperCase();
    div.appendChild(tagSpan);
  }
  return div;
}

function makeTaskEl(task, callback) {
  var div = document.createElement('div');
  var done = isTaskDone(task);
  div.className = 'task-item' + (done ? ' done' : '');
  div.onclick = function() {
    taskDoneState[task.id] = !isTaskDone(task);
    saveDoneState();
    if (callback) callback();
  };
  var check = document.createElement('div');
  check.className = 'task-check';
  check.textContent = done ? '✓' : '';
  var title = document.createElement('span');
  title.className = 'task-title';
  title.textContent = task.title;
  div.appendChild(check);
  div.appendChild(title);
  return div;
}

// –– RENDER WEEK ––
function renderWeek() {
  var today = nowLocal();
  today.setHours(0,0,0,0);

  // Start from Monday of current week
  var dayOfWeek = today.getDay(); // 0=Sun
  var monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

  var container = document.getElementById('week-grid');
  container.innerHTML = '';

  var dayNames = ['MON','TUE','WED','THU','FRI','SAT','SUN'];

  for (var i = 0; i < 7; i++) {
    var day = new Date(monday);
    day.setDate(monday.getDate() + i);
    var ds = dateToStr(day);
    var isToday = ds === dateToStr(today);

    var events = getEventsForDate(ds);
    var tasks = getTasksForDate(ds);
    var pendingCount = tasks.filter(function(t){ return !isTaskDone(t); }).length;
    var doneCount = tasks.length - pendingCount;

    var row = document.createElement('div');
    row.className = 'week-day-row' + (isToday ? ' today-row' : '');
    (function(dateStr){ row.onclick = function(){ jumpToDate(dateStr); }; })(ds);

    var label = document.createElement('div');
    label.className = 'week-day-label';
    label.innerHTML = '<div class="week-dayname">' + dayNames[i] + '</div>' +
                      '<div class="week-daynum">' + day.getDate() + '</div>';

    var content = document.createElement('div');
    content.className = 'week-day-content';

    var shown = events.slice(0, CONFIG.weekMaxEvents);
    for (var j = 0; j < shown.length; j++) {
      var pill = document.createElement('div');
      pill.className = 'week-event-pill';
      pill.textContent = (shown[j].time ? formatTime(shown[j].time) + ' ' : '') + shown[j].title;
      content.appendChild(pill);
    }
    if (events.length > CONFIG.weekMaxEvents) {
      var more = document.createElement('div');
      more.className = 'week-task-count';
      more.textContent = '+' + (events.length - CONFIG.weekMaxEvents) + ' more events';
      content.appendChild(more);
    }
    if (tasks.length > 0) {
      var tc = document.createElement('div');
      tc.className = 'week-task-count';
      tc.textContent = pendingCount + ' task' + (pendingCount !== 1 ? 's' : '') +
                       (doneCount > 0 ? ' · ' + doneCount + ' done' : '');
      content.appendChild(tc);
    }
    if (events.length === 0 && tasks.length === 0) {
      var free = document.createElement('div');
      free.className = 'week-task-count';
      free.textContent = '— free —';
      content.appendChild(free);
    }

    row.appendChild(label);
    row.appendChild(content);
    container.appendChild(row);
  }
}

// –– RENDER MONTH ––
function renderMonth() {
  var months = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE',
                'JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  document.getElementById('month-header').textContent = months[currentMonth] + ' ' + currentYear;

  // Day labels
  var labelsEl = document.getElementById('month-day-labels');
  labelsEl.innerHTML = '';
  var dayLabels = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
  for (var d = 0; d < 7; d++) {
    var lc = document.createElement('div');
    lc.className = 'month-day-label-cell';
    lc.textContent = dayLabels[d];
    labelsEl.appendChild(lc);
  }

  var grid = document.getElementById('month-grid');
  grid.innerHTML = '';

  var firstDay = new Date(currentYear, currentMonth, 1);
  var startDow = (firstDay.getDay() + 6) % 7; // Monday=0
  var daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  var todayStr_ = todayStr();

  // Blank cells before first day
  for (var b = 0; b < startDow; b++) {
    var blank = document.createElement('div');
    blank.className = 'month-cell empty';
    grid.appendChild(blank);
  }

  for (var day = 1; day <= daysInMonth; day++) {
    var ds = currentYear + '-' + ((currentMonth+1)<10?'0':'') + (currentMonth+1) + '-' + (day<10?'0':'') + day;
    var events = getEventsForDate(ds);
    var tasks = getTasksForDate(ds);
    var pendingTasks = tasks.filter(function(t){ return !isTaskDone(t); });

    var cell = document.createElement('div');
    cell.className = 'month-cell' + (ds === todayStr_ ? ' today-cell' : '');
    (function(dateStr){ cell.onclick = function(){ jumpToDate(dateStr); }; })(ds);

    var numEl = document.createElement('div');
    numEl.className = 'month-cell-num';
    numEl.textContent = day;
    cell.appendChild(numEl);

    if (events.length > 0) {
      var dots = document.createElement('div');
      dots.className = 'month-dots';
      var dotCount = Math.min(events.length, 4);
      for (var dd = 0; dd < dotCount; dd++) {
        var dot = document.createElement('div');
        dot.className = 'month-dot';
        dots.appendChild(dot);
      }
      cell.appendChild(dots);
    }

    if (pendingTasks.length > 0) {
      var tb = document.createElement('div');
      tb.className = 'month-task-bar';
      tb.textContent = pendingTasks.length + 't';
      cell.appendChild(tb);
    }

    grid.appendChild(cell);
  }
}

function changeMonth(delta) {
  currentMonth += delta;
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  renderMonth();
}

function jumpToDate(dateStr) {
  // Set today context and jump to today tab
  // For now: just switch to Today view; future: filter by tapped date
  switchTab('today');
  // Could extend: render that specific day instead of always 'today'
}

// –– RENDER ALL TASKS ––
function renderAllTasks() {
  var container = document.getElementById('all-tasks-list');
  container.innerHTML = '';

  var allTasks = (appData.tasks || []).slice();
  // Sort by date, then done status
  allTasks.sort(function(a,b){
    return (a.date||'').localeCompare(b.date||'');
  });

  var filtered = allTasks.filter(function(t) {
    if (currentFilter === 'pending') return !isTaskDone(t);
    if (currentFilter === 'done') return isTaskDone(t);
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-msg">NO TASKS</div>';
    return;
  }

  var todayS = todayStr();
  for (var i = 0; i < filtered.length; i++) {
    var task = filtered[i];
    var el = makeTaskEl(task, renderAll);
    // Add date badge
    if (task.date) {
      var badge = document.createElement('span');
      badge.className = 'task-date-badge';
      badge.textContent = task.date === todayS ? 'TODAY' : task.date;
      el.appendChild(badge);
    }
    container.appendChild(el);
  }
}

function setFilter(f) {
  currentFilter = f;
  var btns = document.querySelectorAll('.filter-btn');
  var map = { all: 0, pending: 1, done: 2 };
  for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
  btns[map[f]].classList.add('active');
  renderAllTasks();
}

function clearDoneTasks() {
  // Remove done state for all tasks that are marked done
  var allTasks = appData.tasks || [];
  for (var i = 0; i < allTasks.length; i++) {
    if (isTaskDone(allTasks[i])) {
      taskDoneState[allTasks[i].id] = false;
    }
  }
  saveDoneState();
  renderAll();
}

// –– WEATHER (Open-Meteo, no API key) ––
// Kindle WebKit doesn't render emoji glyphs, so use short ASCII labels.
var WMO_CODES = {
  0:  { icon: 'SUN',  desc: 'Clear' },
  1:  { icon: 'SUN',  desc: 'Mostly Clear' },
  2:  { icon: 'P/C',  desc: 'Partly Cloudy' },
  3:  { icon: 'CLD',  desc: 'Overcast' },
  45: { icon: 'FOG',  desc: 'Foggy' },
  48: { icon: 'FOG',  desc: 'Icy Fog' },
  51: { icon: 'DRZ',  desc: 'Light Drizzle' },
  61: { icon: 'RAIN', desc: 'Light Rain' },
  63: { icon: 'RAIN', desc: 'Rain' },
  65: { icon: 'RAIN', desc: 'Heavy Rain' },
  71: { icon: 'SNOW', desc: 'Light Snow' },
  73: { icon: 'SNOW', desc: 'Snow' },
  80: { icon: 'SHWR', desc: 'Showers' },
  95: { icon: 'STRM', desc: 'Thunderstorm' },
  99: { icon: 'STRM', desc: 'Heavy Storm' }
};

function fetchWeather() {
  // Check cache
  try {
    var cached = localStorage.getItem('weatherCache_v2');
    if (cached) {
      var cObj = JSON.parse(cached);
      var age = (Date.now() - cObj.ts) / 60000;
      if (age < CONFIG.weatherCacheMinutes) {
        displayWeather(cObj.data);
        return;
      }
    }
  } catch(e) {}

  var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + CONFIG.weatherLat +
            '&longitude=' + CONFIG.weatherLon +
            '&current_weather=true&temperature_unit=celsius' +
            '&timezone=' + encodeURIComponent(CONFIG.weatherTimeZone);

  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4 && xhr.status === 200) {
      try {
        var data = JSON.parse(xhr.responseText);
        var w = data.current_weather;
        if (w && w.time) calibrateClock(w.time);
        var info = WMO_CODES[w.weathercode] || { icon: 'N/A', desc: 'Unknown' };
        var result = { temp: Math.round(w.temperature), icon: info.icon, desc: info.desc };
        try {
          localStorage.setItem('weatherCache_v2', JSON.stringify({ data: result, ts: Date.now() }));
        } catch(e) {}
        displayWeather(result);
      } catch(e) {}
    }
  };
  xhr.send();
}

// Open-Meteo returns current_weather.time as "YYYY-MM-DDTHH:MM" already in
// the requested timezone (Asia/Kolkata). Read those digits as if they were
// UTC, and set timeOffsetMs so nowLocal() produces that wall time on every
// subsequent tick. Refresh the clock immediately so the user sees real IST.
function calibrateClock(serverTimeStr) {
  var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(serverTimeStr);
  if (!m) return;
  var serverMs = Date.UTC(
    parseInt(m[1], 10),
    parseInt(m[2], 10) - 1,
    parseInt(m[3], 10),
    parseInt(m[4], 10),
    parseInt(m[5], 10),
    0
  );
  timeOffsetMs = serverMs - Date.now();
  try { localStorage.setItem('timeOffsetMs_v1', String(timeOffsetMs)); } catch(e) {}
  updateClock();
  renderAll();
}

function displayWeather(w) {
  document.getElementById('weather-icon').textContent = w.icon;
  document.getElementById('weather-temp').textContent = w.temp + '°C';
  document.getElementById('weather-desc').textContent = w.desc;
}
