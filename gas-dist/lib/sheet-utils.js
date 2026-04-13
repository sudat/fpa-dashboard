// ============================================================
// SheetUtils — Google Sheet helper utilities
// ============================================================

var SheetUtils = SheetUtils || {};

/**
 * Get the active spreadsheet (container-bound).
 */
SheetUtils.getSpreadsheet = function () {
  return SpreadsheetApp.getActiveSpreadsheet();
};

/**
 * Get or create a sheet tab by name.
 * @param {string} sheetName
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
SheetUtils.getOrCreateSheet = function (sheetName) {
  var ss = SheetUtils.getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (sheet) return sheet;

  sheet = ss.insertSheet(sheetName);
  return sheet;
};

/**
 * Read all rows (excluding header) as array of arrays.
 * @param {string} sheetName
 * @returns {Array<Array<?>>}
 */
SheetUtils.readAllRows = function (sheetName) {
  var ss = SheetUtils.getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  return data.length > 1 ? data.slice(1) : [];
};

/**
 * Write rows to sheet (clear + write). Includes header row.
 * @param {string} sheetName
 * @param {Array<Array<?>>} rows - Full rows including header at index 0
 */
SheetUtils.writeRows = function (sheetName, rows) {
  if (!rows || rows.length === 0) return;

  var sheet = SheetUtils.getOrCreateSheet(sheetName);

  sheet.clearContents();
  sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
};

/**
 * Append rows to sheet (after existing data).
 * @param {string} sheetName
 * @param {Array<Array<?>>} rows - Rows to append (no header)
 */
SheetUtils.appendRows = function (sheetName, rows) {
  if (!rows || rows.length === 0) return;

  var ss = SheetUtils.getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  var startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
};

/**
 * Format a Date or string as ISO datetime with timezone offset.
 * @param {Date|string} value
 * @returns {string}
 */
SheetUtils.formatDateTime = function (value) {
  if (!value) return '';
  if (value instanceof Date) {
    return Utilities.formatDate(value, 'Asia/Tokyo', "yyyy-MM-dd'T'HH:mm:ssXXX");
  }
  return String(value);
};

/** Current datetime as ISO string with timezone offset. */
SheetUtils.now = function () {
  return Utilities.formatDate(new Date(), 'Asia/Tokyo', "yyyy-MM-dd'T'HH:mm:ssXXX");
};

/** Generate a unique upload ID. */
SheetUtils.generateId = function () {
  return Utilities.getUuid();
};
