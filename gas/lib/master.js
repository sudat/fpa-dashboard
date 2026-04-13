// ============================================================
// Master — Account/Department master read/write
// ============================================================

var Master = Master || {};

var ACCOUNT_SHEET = 'AccountMaster';
var DEPARTMENT_SHEET = 'DepartmentMaster';

var ACCOUNT_HEADER = [
  'detailAccountName', 'aggregateAccountName', 'sortOrder',
  'isGmv', 'bucketStatus',
];

var DEPARTMENT_HEADER = [
  'detailDepartmentName', 'businessUnitName', 'sortOrder', 'bucketStatus',
];

var ACCOUNT_COLS = {
  DETAIL_ACCOUNT:    0,
  AGGREGATE_ACCOUNT: 1,
  SORT_ORDER:        2,
  IS_GMV:            3,
  BUCKET_STATUS:     4,
};

var DEPARTMENT_COLS = {
  DETAIL_DEPT:  0,
  BUSINESS_UNIT: 1,
  SORT_ORDER:   2,
  BUCKET_STATUS: 3,
};

Master.getAccountSheetName = function () {
  return ACCOUNT_SHEET;
};

Master.getDepartmentSheetName = function () {
  return DEPARTMENT_SHEET;
};

/**
 * Read account master entries from Sheet.
 * @returns {Array<Object>}
 */
Master.getAccountMaster = function () {
  var ssId = SheetUtils.getSpreadsheetId();
  var rows = SheetUtils.readAllRows(ssId, ACCOUNT_SHEET);

  return rows.map(function (row) {
    return {
      detailAccountName:    String(row[ACCOUNT_COLS.DETAIL_ACCOUNT] || ''),
      aggregateAccountName: String(row[ACCOUNT_COLS.AGGREGATE_ACCOUNT] || ''),
      sortOrder:            Number(row[ACCOUNT_COLS.SORT_ORDER]) || 0,
      isGmv:                row[ACCOUNT_COLS.IS_GMV] === true || row[ACCOUNT_COLS.IS_GMV] === 'TRUE' || row[ACCOUNT_COLS.IS_GMV] === 'true',
      bucketStatus:         String(row[ACCOUNT_COLS.BUCKET_STATUS] || 'normal'),
    };
  });
};

/**
 * Write account master entries to Sheet (full replace).
 * @param {Array<Object>} entries
 */
Master.saveAccountMaster = function (entries) {
  var ssId = SheetUtils.getSpreadsheetId();
  var rows = [ACCOUNT_HEADER];

  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    rows.push([
      e.detailAccountName,
      e.aggregateAccountName,
      e.sortOrder,
      e.isGmv,
      e.bucketStatus,
    ]);
  }

  SheetUtils.writeRows(ssId, ACCOUNT_SHEET, rows);
};

/**
 * Read department master entries from Sheet.
 * @returns {Array<Object>}
 */
Master.getDepartmentMaster = function () {
  var ssId = SheetUtils.getSpreadsheetId();
  var rows = SheetUtils.readAllRows(ssId, DEPARTMENT_SHEET);

  return rows.map(function (row) {
    return {
      detailDepartmentName: String(row[DEPARTMENT_COLS.DETAIL_DEPT] || ''),
      businessUnitName:     String(row[DEPARTMENT_COLS.BUSINESS_UNIT] || ''),
      sortOrder:            Number(row[DEPARTMENT_COLS.SORT_ORDER]) || 0,
      bucketStatus:         String(row[DEPARTMENT_COLS.BUCKET_STATUS] || 'normal'),
    };
  });
};

/**
 * Write department master entries to Sheet (full replace).
 * @param {Array<Object>} entries
 */
Master.saveDepartmentMaster = function (entries) {
  var ssId = SheetUtils.getSpreadsheetId();
  var rows = [DEPARTMENT_HEADER];

  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    rows.push([
      e.detailDepartmentName,
      e.businessUnitName,
      e.sortOrder,
      e.bucketStatus,
    ]);
  }

  SheetUtils.writeRows(ssId, DEPARTMENT_SHEET, rows);
};
