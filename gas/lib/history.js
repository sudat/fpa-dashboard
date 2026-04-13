// ============================================================
// History — Upload history management
// ============================================================

var History = History || {};

var HISTORY_SHEET = 'UploadHistory';

var HISTORY_HEADER = [
  'uploadId', 'timestamp', 'uploader', 'scenarioKind',
  'targetMonth', 'rangeStartMonth', 'rangeEndMonth', 'forecastStart',
  'generatedLabel', 'scenarioFamily', 'fileName', 'driveFileId', 'rowCount', 'sheetName',
];

History.getSheetName = function () {
  return HISTORY_SHEET;
};

History.getHeader = function () {
  return HISTORY_HEADER.slice();
};

History._normalizeYearMonth = function (value) {
  var normalized = String(value == null ? '' : value).trim();
  var match = normalized.match(/^(\d{4})[\/\-](\d{1,2})/);
  if (!match) return '';

  var month = match[2];
  while (month.length < 2) month = '0' + month;
  return match[1] + '-' + month;
};

History._buildReplacementIdentityKey = function (scenarioFamily, targetMonth, rangeStartMonth, rangeEndMonth, forecastStart) {
  var normalizedTargetMonth = History._normalizeYearMonth(targetMonth);
  var normalizedRangeStart = History._normalizeYearMonth(rangeStartMonth || normalizedTargetMonth);
  var normalizedRangeEnd = History._normalizeYearMonth(rangeEndMonth || normalizedTargetMonth);
  var normalizedForecastStart = forecastStart ? History._normalizeYearMonth(forecastStart) : '';

  return [
    String(scenarioFamily || ''),
    normalizedRangeStart,
    normalizedRangeEnd,
    normalizedForecastStart,
  ].join('::');
};

History.buildReplacementIdentity = function (scenarioInput, generatedLabel) {
  var targetMonth = History._normalizeYearMonth(scenarioInput.targetMonth);
  var rangeStartMonth = History._normalizeYearMonth(scenarioInput.rangeStartMonth || targetMonth);
  var rangeEndMonth = History._normalizeYearMonth(scenarioInput.rangeEndMonth || targetMonth);
  var forecastStart = scenarioInput.forecastStart ? History._normalizeYearMonth(scenarioInput.forecastStart) : '';

  return {
    generatedLabel: String(generatedLabel || ''),
    scenarioFamily: String(scenarioInput.kind || ''),
    rangeStartMonth: rangeStartMonth || undefined,
    rangeEndMonth: rangeEndMonth || undefined,
    forecastStart: forecastStart || undefined,
    identityKey: History._buildReplacementIdentityKey(
      scenarioInput.kind,
      targetMonth,
      rangeStartMonth,
      rangeEndMonth,
      forecastStart
    ),
  };
};

History._readSheetData = function () {
  var sheet = SheetUtils.getSpreadsheet().getSheetByName(HISTORY_SHEET);
  if (!sheet) return [];
  return sheet.getDataRange().getValues();
};

History._buildHeaderIndex = function (headerRow) {
  var index = {};
  for (var i = 0; i < headerRow.length; i++) {
    index[String(headerRow[i] || '')] = i;
  }
  return index;
};

History._readCell = function (row, headerIndex, key) {
  if (!headerIndex.hasOwnProperty(key)) {
    return '';
  }

  return row[headerIndex[key]];
};

History._recordToRow = function (record) {
  return [
    record.uploadId,
    SheetUtils.formatDateTime(record.timestamp),
    record.uploader,
    record.scenarioKind,
    record.targetMonth,
    record.rangeStartMonth,
    record.rangeEndMonth,
    record.forecastStart,
    record.generatedLabel,
    record.scenarioFamily,
    record.fileName,
    record.driveFileId,
    record.rowCount,
    record.sheetName,
  ];
};

History._recordsFromSheet = function () {
  var data = History._readSheetData();
  if (data.length <= 1) return [];

  var headerIndex = History._buildHeaderIndex(data[0]);
  var records = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var uploadId = String(History._readCell(row, headerIndex, 'uploadId') || '').trim();
    if (!uploadId) continue;

    var targetMonth = String(History._readCell(row, headerIndex, 'targetMonth') || '').trim();
    var rangeStartMonth = String(History._readCell(row, headerIndex, 'rangeStartMonth') || targetMonth).trim();
    var rangeEndMonth = String(History._readCell(row, headerIndex, 'rangeEndMonth') || targetMonth).trim();
    var forecastStart = String(History._readCell(row, headerIndex, 'forecastStart') || '').trim();
    var generatedLabel = String(History._readCell(row, headerIndex, 'generatedLabel') || '').trim();
    var scenarioKind = String(History._readCell(row, headerIndex, 'scenarioKind') || '').trim();
    var scenarioFamily = String(History._readCell(row, headerIndex, 'scenarioFamily') || scenarioKind).trim();

    records.push({
      uploadId: uploadId,
      timestamp: History._readCell(row, headerIndex, 'timestamp'),
      uploader: String(History._readCell(row, headerIndex, 'uploader') || '').trim(),
      scenarioKind: scenarioKind,
      targetMonth: targetMonth,
      rangeStartMonth: rangeStartMonth,
      rangeEndMonth: rangeEndMonth,
      forecastStart: forecastStart,
      generatedLabel: generatedLabel,
      scenarioFamily: scenarioFamily,
      fileName: String(History._readCell(row, headerIndex, 'fileName') || '').trim(),
      driveFileId: String(History._readCell(row, headerIndex, 'driveFileId') || '').trim(),
      rowCount: Number(History._readCell(row, headerIndex, 'rowCount') || 0),
      sheetName: String(History._readCell(row, headerIndex, 'sheetName') || '').trim(),
    });
  }

  return records;
};

History._ensureCurrentHeader = function () {
  var sheet = SheetUtils.getOrCreateSheet(HISTORY_SHEET);
  var data = History._readSheetData();

  if (data.length === 0) {
    sheet.appendRow(HISTORY_HEADER);
    return sheet;
  }

  var currentHeader = data[0].map(function (value) {
    return String(value || '');
  });

  if (currentHeader.join('\n') === HISTORY_HEADER.join('\n')) {
    return sheet;
  }

  var migratedRows = History._recordsFromSheet().map(function (record) {
    return History._recordToRow(record);
  });

  SheetUtils.writeRows(HISTORY_SHEET, [HISTORY_HEADER].concat(migratedRows));
  return SheetUtils.getSpreadsheet().getSheetByName(HISTORY_SHEET);
};

/**
 * Read all upload history entries.
 * @returns {Array<Object>} Array of UploadMetadata-like objects
 */
History.getUploadHistory = function () {
  var rows = History._recordsFromSheet();

  return rows.map(function (row) {
    var scenarioInput = {
      kind: row.scenarioKind,
      targetMonth: row.targetMonth,
      rangeStartMonth: row.rangeStartMonth || row.targetMonth,
      rangeEndMonth: row.rangeEndMonth || row.targetMonth,
      forecastStart: row.forecastStart || undefined,
    };
    var replacementIdentity = History.buildReplacementIdentity(scenarioInput, row.generatedLabel);

    return {
      uploadId: row.uploadId,
      timestamp: SheetUtils.formatDateTime(row.timestamp),
      uploader: row.uploader,
      scenarioInput: scenarioInput,
      generatedLabel: row.generatedLabel,
      replacementIdentity: replacementIdentity,
      fileName: row.fileName,
      driveFileId: row.driveFileId,
      rowCount: row.rowCount,
      sheetName: row.sheetName,
    };
  }).reverse();
};

/**
 * Append a new upload entry to the history sheet.
 * @param {Object} metadata - UploadMetadata fields
 */
History.addUploadEntry = function (metadata) {
  var sheet = History._ensureCurrentHeader();
  var replacementIdentity = metadata.replacementIdentity || History.buildReplacementIdentity(
    metadata.scenarioInput,
    metadata.generatedLabel
  );

  sheet.appendRow(History._recordToRow({
    uploadId: metadata.uploadId,
    timestamp: metadata.timestamp,
    uploader: metadata.uploader,
    scenarioKind: metadata.scenarioInput.kind,
    targetMonth: metadata.scenarioInput.targetMonth,
    rangeStartMonth: metadata.scenarioInput.rangeStartMonth || metadata.scenarioInput.targetMonth,
    rangeEndMonth: metadata.scenarioInput.rangeEndMonth || metadata.scenarioInput.targetMonth,
    forecastStart: metadata.scenarioInput.forecastStart || '',
    generatedLabel: metadata.generatedLabel,
    scenarioFamily: replacementIdentity.scenarioFamily || metadata.scenarioInput.kind,
    fileName: metadata.fileName,
    driveFileId: metadata.driveFileId || '',
    rowCount: metadata.rowCount || 0,
    sheetName: metadata.sheetName || '',
  }));
};

/**
 * Check for replacement conflicts by explicit range metadata.
 * @param {Object} replacementIdentity
 * @returns {Object|null} Existing upload metadata if conflict found
 */
History.findReplacementConflict = function (replacementIdentity) {
  var history = History.getUploadHistory();
  var desiredKey = String(replacementIdentity && replacementIdentity.identityKey || '').trim();
  var desiredFamily = String(replacementIdentity && replacementIdentity.scenarioFamily || '').trim();

  for (var i = 0; i < history.length; i++) {
    var entry = history[i];
    if (entry.replacementIdentity.identityKey === desiredKey &&
        entry.replacementIdentity.scenarioFamily === desiredFamily) {
      return entry;
    }
  }
  return null;
};
