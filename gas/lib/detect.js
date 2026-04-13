// ============================================================
// Detect — scenario auto-detection from parsed XLSX rows
// ============================================================

var Detect = Detect || {};

Detect._kindOrder = {
  actual: 0,
  budget: 1,
  forecast: 2,
};

/**
 * Classify a scenario name into a kind: "actual", "budget", or "forecast".
 * Mirrors src/lib/loglass/schema.ts deriveMetricTypeFromScenario().
 */
Detect.classifyScenario = function (scenarioKey) {
  var trimmed = String(scenarioKey).trim();
  if (trimmed === '実績') return 'actual';
  if (trimmed.indexOf('予算') >= 0 || trimmed.indexOf('計画') >= 0) return 'budget';
  return 'forecast';
};

/**
 * Scan XLSX data rows and extract unique (scenarioKey, yearMonth) combinations.
 * Returns array of { scenarioKey, yearMonth, kind, rowCount }.
 */
Detect.scanScenarios = function (dataRows) {
  var grouped = {};

  for (var i = 0; i < dataRows.length; i++) {
    var row = dataRows[i] || [];
    var scenarioKey = String(row[XLSX_COL.SCENARIO]).trim();
    if (!scenarioKey) continue;

    var yearMonth = Upload._normalizePeriod(row[XLSX_COL.DATE]);
    if (!yearMonth) continue;

    var key = scenarioKey + '\n' + yearMonth;
    if (!grouped[key]) {
      grouped[key] = {
        scenarioKey: scenarioKey,
        yearMonth: yearMonth,
        kind: Detect.classifyScenario(scenarioKey),
        rowCount: 0,
      };
    }

    grouped[key].rowCount += 1;
  }

  return Object.keys(grouped)
    .map(function (key) {
      return grouped[key];
    })
    .sort(function (a, b) {
      var kindDiff = Detect._kindOrder[a.kind] - Detect._kindOrder[b.kind];
      if (kindDiff !== 0) return kindDiff;
      if (a.scenarioKey !== b.scenarioKey) return a.scenarioKey < b.scenarioKey ? -1 : 1;
      if (a.yearMonth === b.yearMonth) return 0;
      return a.yearMonth < b.yearMonth ? -1 : 1;
    });
};

/**
 * Detect scenario inputs from XLSX data.
 * Returns array of { kind, targetMonth, scenarioKey, monthCount, rowCount, forecastStart? }.
 */
Detect.detectScenarioInputs = function (dataRows) {
  var scanned = Detect.scanScenarios(dataRows || []);
  if (scanned.length === 0) return [];

  var groupedByScenario = {};
  var latestActualMonth = null;

  for (var i = 0; i < scanned.length; i++) {
    var item = scanned[i];
    var scenarioKey = item.scenarioKey;

    if (!groupedByScenario[scenarioKey]) {
      groupedByScenario[scenarioKey] = {
        kind: item.kind,
        scenarioKey: scenarioKey,
        months: [],
        monthMap: {},
        rowCount: 0,
      };
    }

    var summary = groupedByScenario[scenarioKey];
    if (!summary.monthMap[item.yearMonth]) {
      summary.monthMap[item.yearMonth] = true;
      summary.months.push(item.yearMonth);
    }
    summary.rowCount += item.rowCount;

    if (item.kind === 'actual' && (!latestActualMonth || item.yearMonth > latestActualMonth)) {
      latestActualMonth = item.yearMonth;
    }
  }

  return Object.keys(groupedByScenario)
    .map(function (scenarioKey) {
      var summary = groupedByScenario[scenarioKey];
      summary.months.sort();

      var firstMonth = summary.months[0] || null;
      var latestScenarioMonth = summary.months[summary.months.length - 1] || null;
      var targetMonth = latestScenarioMonth;
      var detected = {
        kind: summary.kind,
        targetMonth: targetMonth,
        scenarioKey: summary.scenarioKey,
        monthCount: summary.months.length,
        rowCount: summary.rowCount,
      };

      if (summary.kind === 'actual') {
        detected.targetMonth = latestScenarioMonth;
      } else if (summary.kind === 'forecast') {
        detected.targetMonth = latestActualMonth || latestScenarioMonth;

        if (latestActualMonth) {
          for (var i = 0; i < summary.months.length; i++) {
            if (summary.months[i] > latestActualMonth) {
              detected.forecastStart = summary.months[i];
              break;
            }
          }
        }

        if (!detected.forecastStart) {
          detected.forecastStart = firstMonth;
        }
      }

      return detected;
    })
    .sort(function (a, b) {
      var kindDiff = Detect._kindOrder[a.kind] - Detect._kindOrder[b.kind];
      if (kindDiff !== 0) return kindDiff;
      if (a.scenarioKey !== b.scenarioKey) return a.scenarioKey < b.scenarioKey ? -1 : 1;
      if (a.targetMonth === b.targetMonth) return 0;
      return a.targetMonth < b.targetMonth ? -1 : 1;
    });
};
