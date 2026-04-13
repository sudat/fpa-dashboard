// ============================================================
// Upload — commit, analysis data
// ============================================================

var Upload = Upload || {};

// ScenarioKind label mapping (mirrors domain scenario-label.ts)
var SCENARIO_KIND_LABEL = {
  actual: '実績',
  budget: '予算',
  forecast: '見込',
};

// Loglass xlsx column positions (0-based) in prototype format
var XLSX_COL = {
  SCENARIO:         0,
  DATE:             1,
  ACCOUNT_CODE:     2,
  EXT_ACCOUNT_CODE: 3,
  ACCOUNT:          4,
  ACCOUNT_TYPE:     5,
  DEPT_CODE:        6,
  EXT_DEPT_CODE:    7,
  DEPT:             8,
  AMOUNT:           9,
};

var UPLOAD_SHEET_HEADER = [
  '計画・実績',
  '年月',
  'ログラス科目コード',
  '外部システム科目コード',
  '科目',
  '科目タイプ',
  'ログラス部署コード',
  '外部システム部署コード',
  '部署',
  '金額',
];

/**
 * Normalize a date value to "yyyy-MM" format.
 * Handles Date objects and string formats like "2026/02/01", "2026-02-01".
 */
Upload._normalizePeriod = function (value) {
  if (value instanceof Date) {
    var y = value.getFullYear();
    var m = String(value.getMonth() + 1);
    while (m.length < 2) m = '0' + m;
    return y + '-' + m;
  }
  var str = String(value).trim();
  var match = str.match(/^(\d{4})[\/\-](\d{1,2})/);
  if (match) {
    var mm = match[2];
    while (mm.length < 2) mm = '0' + mm;
    return match[1] + '-' + mm;
  }
  return str;
};

/**
 * Generate scenario label from scenarioInput.
 * Mirrors domain generateScenarioLabel().
 */
Upload._generateScenarioLabel = function (scenarioInput) {
  var targetMonth = Upload._normalizePeriod(scenarioInput.targetMonth);
  var parts = targetMonth.split('-');
  var year = parts[0];
  var month = parts[1];
  var label = year + '/' + month + '月' + SCENARIO_KIND_LABEL[scenarioInput.kind];

  if (scenarioInput.forecastStart) {
    var fs = Upload._normalizePeriod(scenarioInput.forecastStart);
    var fParts = fs.split('-');
    var fMonth = String(Number(fParts[1]));
    label = label + '(見込:' + fMonth + '月~)';
  }

  return label;
};

Upload._toSheetRow = function (uploadRow, rowNumber) {
  var scenario = String(uploadRow['シナリオ'] || '').trim();
  var yearMonth = Upload._normalizePeriod(uploadRow['年月度']);
  var accountCode = String(uploadRow['科目コード'] || '').trim();
  var externalAccountCode = String(uploadRow['外部科目コード'] || '').trim();
  var account = String(uploadRow['科目'] || '').trim();
  var accountType = String(uploadRow['科目タイプ'] || '').trim();
  var deptCode = String(uploadRow['部署コード'] || '').trim();
  var externalDeptCode = String(uploadRow['外部部署コード'] || '').trim();
  var dept = String(uploadRow['部署'] || '').trim();
  var amount = Number(uploadRow['金額']);

  if (!scenario || !yearMonth || !accountCode || !account || !accountType || !deptCode || !dept || !isFinite(amount)) {
    throw new Error('アップロード対象データ ' + rowNumber + ' 行目の形式が不正です。');
  }

  return [
    scenario,
    yearMonth,
    accountCode,
    externalAccountCode,
    account,
    accountType,
    deptCode,
    externalDeptCode,
    dept,
    amount,
  ];
};

Upload._buildSheetRows = function (uploadRows) {
  if (!Array.isArray(uploadRows) || uploadRows.length === 0) {
    throw new Error('アップロード対象データが空です。');
  }

  var rows = [UPLOAD_SHEET_HEADER.slice()];
  for (var i = 0; i < uploadRows.length; i++) {
    rows.push(Upload._toSheetRow(uploadRows[i], i + 2));
  }

  return rows;
};

/**
 * Commit an upload: persist normalized upload rows to per-upload sheet and record history.
 * @param {Array<Object>} uploadRows - Client-parsed upload rows
 * @param {string} originalFileName - Selected file name from the browser
 * @param {Object} scenarioInput - { kind, targetMonth, forecastStart? }
 * @param {Object|null} confirmedReplacement - Replacement warning object if confirmed
 * @returns {Object} UploadMetadata
 */
Upload.commitUpload = function (uploadRows, originalFileName, scenarioInput, confirmedReplacement) {
  var sheetRows = Upload._buildSheetRows(uploadRows);
  var generatedLabel = Upload._generateScenarioLabel(scenarioInput);
  var conflict = History.findReplacementConflict(generatedLabel, scenarioInput.kind);

  if (conflict && !confirmedReplacement) {
    throw new Error('上書き確認が必要です。replacementWarning を確認してください。');
  }

  if (conflict && confirmedReplacement) {
    if (confirmedReplacement.existingUploadId !== conflict.uploadId) {
      throw new Error('上書き対象が変更されています。再度アップロード実行してください。');
    }
  }

  var uploader = Session.getActiveUser().getEmail();
  var timestamp = SheetUtils.now();
  var uploadId = SheetUtils.generateId();
  var sheetName = 'upload_' + uploadId;

  if (conflict && confirmedReplacement) {
    var oldSheetName = conflict.sheetName || ('upload_' + conflict.uploadId);
    var oldSheet = SheetUtils.getSpreadsheet().getSheetByName(oldSheetName);
    if (oldSheet) {
      SheetUtils.getSpreadsheet().deleteSheet(oldSheet);
    }
  }

  SheetUtils.writeRows(sheetName, sheetRows);

  var normalizedFileName = String(originalFileName || '').trim() || (scenarioInput.kind + '_' + scenarioInput.targetMonth + '.xlsx');

  var metadata = {
    uploadId: uploadId,
    timestamp: timestamp,
    uploader: uploader,
    scenarioInput: {
      kind: scenarioInput.kind,
      targetMonth: scenarioInput.targetMonth,
      forecastStart: scenarioInput.forecastStart || undefined,
    },
    generatedLabel: generatedLabel,
    replacementIdentity: {
      generatedLabel: generatedLabel,
      scenarioFamily: scenarioInput.kind,
    },
    fileName: normalizedFileName,
    rowCount: sheetRows.length - 1,
    sheetName: sheetName,
  };

  History.addUploadEntry(metadata);

  return {
    uploadId: metadata.uploadId,
    timestamp: metadata.timestamp,
    uploader: metadata.uploader,
    scenarioInput: metadata.scenarioInput,
    generatedLabel: metadata.generatedLabel,
    replacementIdentity: metadata.replacementIdentity,
    fileName: metadata.fileName,
  };
};

/**
 * Get analysis-ready data for a scenario family and target month.
 * @param {string} scenarioFamily - "actual" | "budget" | "forecast"
 * @param {string} targetMonth - "YYYY-MM" format
 * @returns {{ importData: Array<Object>, accountMaster: Array<Object>, departmentMaster: Array<Object> }}
 */
Upload.getAnalysisData = function (scenarioFamily, targetMonth) {
  var normalizedTargetMonth = Upload._normalizePeriod(targetMonth);
  var history = History.getUploadHistory();
  var rows = [];

  for (var i = 0; i < history.length; i++) {
    var entry = history[i];
    if (entry.replacementIdentity.scenarioFamily !== scenarioFamily) {
      continue;
    }

    var sheetName = entry.sheetName || ('upload_' + entry.uploadId);
    var sheetRows = SheetUtils.readAllRows(sheetName);
    if (sheetRows.length === 0) {
      continue;
    }

    rows = rows.concat(sheetRows);
  }

  var filtered = rows.filter(function (row) {
    var scenario = String(row[0]).trim();
    var ym = Upload._normalizePeriod(row[1]);
    if (ym !== normalizedTargetMonth) {
      return false;
    }
    if (scenarioFamily === 'actual') {
      return scenario === '実績';
    }
    if (scenarioFamily === 'budget') {
      return scenario.indexOf('予算') >= 0 || scenario.indexOf('計画') >= 0;
    }
    return scenario !== '実績' && scenario.indexOf('予算') < 0 && scenario.indexOf('計画') < 0;
  });

  var importData = filtered.map(function (row) {
    return {
      scenarioKey:    String(row[0]),
      yearMonth:      Upload._normalizePeriod(row[1]),
      accountCode:    String(row[2]),
      extAccountCode: String(row[3]),
      accountName:    String(row[4]),
      accountType:    String(row[5]),
      deptCode:       String(row[6]),
      extDeptCode:    String(row[7]),
      deptName:       String(row[8]),
      amount:         Number(row[9]) || 0,
    };
  });

  var accountMaster = Master.getAccountMaster();
  var departmentMaster = Master.getDepartmentMaster();

  return {
    importData: importData,
    accountMaster: accountMaster,
    departmentMaster: departmentMaster,
  };
};
