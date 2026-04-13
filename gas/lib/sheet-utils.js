// ============================================================
// SheetUtils — Google Sheet helper utilities
// ============================================================

var SheetUtils = SheetUtils || {};

/**
 * Get the spreadsheet ID from script properties.
 * Configure via: File > Project Properties > Script Properties
 * Key: SPREADSHEET_ID
 */
SheetUtils.getSpreadsheetId = function () {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  return id || 'YOUR_SPREADSHEET_ID';
};

SheetUtils.getSpreadsheet = function () {
  var id = SheetUtils.getSpreadsheetId();
  return SpreadsheetApp.openById(id);
};

/**
 * Get or create a sheet tab by name.
 * @param {string} spreadsheetId
 * @param {string} sheetName
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
SheetUtils.getOrCreateSheet = function (spreadsheetId, sheetName) {
  var ss = SpreadsheetApp.openById(spreadsheetId);
  var sheet = ss.getSheetByName(sheetName);
  if (sheet) return sheet;

  sheet = ss.insertSheet(sheetName);
  return sheet;
};

/**
 * Read all rows (excluding header) as array of arrays.
 * @param {string} spreadsheetId
 * @param {string} sheetName
 * @returns {Array<Array<?>>}
 */
SheetUtils.readAllRows = function (spreadsheetId, sheetName) {
  var ss = SpreadsheetApp.openById(spreadsheetId);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  return data.length > 1 ? data.slice(1) : [];
};

/**
 * Write rows to sheet (clear + write). Includes header row.
 * @param {string} spreadsheetId
 * @param {string} sheetName
 * @param {Array<Array<?>>} rows - Full rows including header at index 0
 */
SheetUtils.writeRows = function (spreadsheetId, sheetName, rows) {
  if (!rows || rows.length === 0) return;

  var ss = SpreadsheetApp.openById(spreadsheetId);
  var sheet = SheetUtils.getOrCreateSheet(spreadsheetId, sheetName);

  sheet.clearContents();
  sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
};

/**
 * Append rows to sheet (after existing data).
 * @param {string} spreadsheetId
 * @param {string} sheetName
 * @param {Array<Array<?>>} rows - Rows to append (no header)
 */
SheetUtils.appendRows = function (spreadsheetId, sheetName, rows) {
  if (!rows || rows.length === 0) return;

  var ss = SpreadsheetApp.openById(spreadsheetId);
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
