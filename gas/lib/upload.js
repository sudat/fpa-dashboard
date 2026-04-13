// ============================================================
// Upload — preview, commit, analysis data
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

/**
 * Parse base64-encoded xlsx workbook using GAS Spreadsheet service.
 * Reads rows for preview/metadata and can optionally persist the converted sheet.
 * @param {string} workbookDataBase64 - Base64 encoded xlsx
 * @param {Object=} options - { sheetName?: string }
 * @returns {Array<Array<?>>|{ rows: Array<Array<?>>, sheetName: string }}
 */
Upload._parseXlsx = function (workbookDataBase64, options) {
  var decoded = Utilities.base64Decode(workbookDataBase64);
  var blob = Utilities.newBlob(decoded, MimeType.GOOGLE_SHEETS, 'temp_upload.xlsx');

  var tempFile = DriveApp.createFile(blob);
  var tempId = tempFile.getId();
  var shouldKeepSheet = !!(options && options.sheetName);

  var tempSs = SpreadsheetApp.openById(tempId);
  var sourceSheet = tempSs.getSheets()[0];
  var data = sourceSheet.getDataRange().getValues();

  var rows = [];
  if (data.length > 1) {
    rows = data.slice(1).filter(function (row) {
      return row.length >= 10 && String(row[XLSX_COL.SCENARIO]).trim() !== '';
    });
  }

  if (!shouldKeepSheet) {
    DriveApp.getFileById(tempId).setTrashed(true);
    return rows;
  }

  var targetSheet = sourceSheet.copyTo(SheetUtils.getSpreadsheet());
  targetSheet.setName(options.sheetName);

  return {
    rows: rows,
    sheetName: options.sheetName,
  };
};

/**
 * Preview an upload: parse xlsx, check for replacement conflicts.
 * @param {string} workbookDataBase64 - Base64 encoded xlsx
 * @param {Object} scenarioInput - { kind, targetMonth, forecastStart? }
 * @returns {{ preview: { rawRowCount, departments, accounts, detectedScenarios }, replacementWarning: Object|null }}
 */
Upload.previewUpload = function (workbookDataBase64, scenarioInput) {
  var dataRows = Upload._parseXlsx(workbookDataBase64);

  var departments = {};
  var accounts = {};
  for (var i = 0; i < dataRows.length; i++) {
    var row = dataRows[i];
    var dept = String(row[XLSX_COL.DEPT]).trim();
    var acct = String(row[XLSX_COL.ACCOUNT]).trim();
    departments[dept] = true;
    accounts[acct] = true;
  }

  var detectedScenarios = Detect.detectScenarioInputs(dataRows);

  var generatedLabel = Upload._generateScenarioLabel(scenarioInput);
  var conflict = History.findReplacementConflict(generatedLabel, scenarioInput.kind);

  var replacementWarning = null;
  if (conflict) {
    replacementWarning = {
      existingUploadId: conflict.uploadId,
      generatedLabel: generatedLabel,
      scenarioFamily: scenarioInput.kind,
      message: '同じシナリオ種別・ラベルのアップロードが既に存在します。上書き確認が必要です。',
    };
  }

  return {
    preview: {
      rawRowCount: dataRows.length,
      departments: Object.keys(departments),
      accounts: Object.keys(accounts),
      detectedScenarios: detectedScenarios,
    },
    replacementWarning: replacementWarning,
  };
};

/**
 * Commit an upload: archive to Drive, persist to per-upload sheet, record history.
 * @param {string} workbookDataBase64 - Base64 encoded xlsx
 * @param {Object} scenarioInput - { kind, targetMonth, forecastStart? }
 * @param {Object|null} confirmedReplacement - Replacement warning object if confirmed
 * @returns {Object} UploadMetadata
 */
Upload.commitUpload = function (workbookDataBase64, scenarioInput, confirmedReplacement) {
  var generatedLabel = Upload._generateScenarioLabel(scenarioInput);
  var conflict = History.findReplacementConflict(generatedLabel, scenarioInput.kind);

  if (conflict && !confirmedReplacement) {
    throw new Error('上書き確認が必要です。replacementWarning を確認してください。');
  }

  if (conflict && confirmedReplacement) {
    if (confirmedReplacement.existingUploadId !== conflict.uploadId) {
      throw new Error('上書き対象が変更されています。再度プレビューしてください。');
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

  var decoded = Utilities.base64Decode(workbookDataBase64);
  var blob = Utilities.newBlob(decoded, MimeType.MICROSOFT_EXCEL, 'upload.xlsx');

  var fileName = scenarioInput.kind + '_' + scenarioInput.targetMonth + '_' + SheetUtils.now() + '.xlsx';
  var archive = Storage.archiveToDrive(fileName, blob);

  var parsed = Upload._parseXlsx(workbookDataBase64, { sheetName: sheetName });
  var dataRows = parsed.rows;

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
    fileName: fileName,
    driveFileId: archive.fileId,
    rowCount: dataRows.length,
    sheetName: parsed.sheetName,
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
