// ============================================================
// History — Upload history management
// ============================================================

var History = History || {};

var HISTORY_SHEET = 'UploadHistory';

var HISTORY_COLS = {
  UPLOAD_ID:       0,
  TIMESTAMP:       1,
  UPLOADER:        2,
  SCENARIO_KIND:   3,
  TARGET_MONTH:    4,
  FORECAST_START:  5,
  GENERATED_LABEL: 6,
  SCENARIO_FAMILY: 7,
  FILE_NAME:       8,
  DRIVE_FILE_ID:   9,
  ROW_COUNT:      10,
  SHEET_NAME:     11,
};

var HISTORY_HEADER = [
  'uploadId', 'timestamp', 'uploader', 'scenarioKind',
  'targetMonth', 'forecastStart', 'generatedLabel',
  'scenarioFamily', 'fileName', 'driveFileId', 'rowCount', 'sheetName',
];

History.getSheetName = function () {
  return HISTORY_SHEET;
};

History.getHeader = function () {
  return HISTORY_HEADER.slice();
};

/**
 * Read all upload history entries.
 * @returns {Array<Object>} Array of UploadMetadata-like objects
 */
History.getUploadHistory = function () {
  var rows = SheetUtils.readAllRows(HISTORY_SHEET);

  return rows.map(function (row) {
    return {
      uploadId:             String(row[HISTORY_COLS.UPLOAD_ID] || ''),
      timestamp:            SheetUtils.formatDateTime(row[HISTORY_COLS.TIMESTAMP]),
      uploader:             String(row[HISTORY_COLS.UPLOADER] || ''),
      scenarioInput: {
        kind:               String(row[HISTORY_COLS.SCENARIO_KIND] || ''),
        targetMonth:        String(row[HISTORY_COLS.TARGET_MONTH] || ''),
        forecastStart:      row[HISTORY_COLS.FORECAST_START] ? String(row[HISTORY_COLS.FORECAST_START]) : undefined,
      },
      generatedLabel:       String(row[HISTORY_COLS.GENERATED_LABEL] || ''),
      replacementIdentity: {
        generatedLabel:     String(row[HISTORY_COLS.GENERATED_LABEL] || ''),
        scenarioFamily:     String(row[HISTORY_COLS.SCENARIO_FAMILY] || ''),
      },
      fileName:             String(row[HISTORY_COLS.FILE_NAME] || ''),
      sheetName:            String(row[HISTORY_COLS.SHEET_NAME] || ''),
    };
  }).reverse();
};

/**
 * Append a new upload entry to the history sheet.
 * @param {Object} metadata - UploadMetadata fields
 */
History.addUploadEntry = function (metadata) {
  var sheet = SheetUtils.getOrCreateSheet(HISTORY_SHEET);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HISTORY_HEADER);
  }

  var row = [
    metadata.uploadId,
    metadata.timestamp,
    metadata.uploader,
    metadata.scenarioInput.kind,
    metadata.scenarioInput.targetMonth,
    metadata.scenarioInput.forecastStart || '',
    metadata.generatedLabel,
    metadata.replacementIdentity.scenarioFamily,
    metadata.fileName,
    metadata.driveFileId || '',
    metadata.rowCount || 0,
    metadata.sheetName || '',
  ];

  sheet.appendRow(row);
};

/**
 * Check for replacement conflicts by generatedLabel + scenarioFamily.
 * @param {string} generatedLabel
 * @param {string} scenarioFamily
 * @returns {Object|null} Existing upload metadata if conflict found
 */
History.findReplacementConflict = function (generatedLabel, scenarioFamily) {
  var history = History.getUploadHistory();

  for (var i = 0; i < history.length; i++) {
    var entry = history[i];
    if (entry.replacementIdentity.generatedLabel === generatedLabel &&
        entry.replacementIdentity.scenarioFamily === scenarioFamily) {
      return entry;
    }
  }
  return null;
};
