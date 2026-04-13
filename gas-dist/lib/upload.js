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

var UPLOADS_FOLDER_NAME = 'uploads';

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
  var str = String(value == null ? '' : value).trim();
  var match = str.match(/^(\d{4})[\/\-](\d{1,2})/);
  if (match) {
    var mm = match[2];
    while (mm.length < 2) mm = '0' + mm;
    return match[1] + '-' + mm;
  }
  return null;
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

Upload._invalidCell = function (rowNumber, label) {
  throw new Error('アップロードファイル ' + rowNumber + ' 行目の' + label + 'が不正です');
};

Upload._requireTrimmedString = function (value, rowNumber, label) {
  var text = String(value == null ? '' : value).trim();
  if (!text) {
    Upload._invalidCell(rowNumber, label);
  }
  return text;
};

Upload._asFiniteNumber = function (value) {
  if (typeof value === 'number' && isFinite(value)) {
    return value;
  }

  return Number(String(value == null ? '' : value).trim().replace(/,/g, ''));
};

Upload._parseWorkbookDataRow = function (row, rowNumber) {
  var cells = Array.isArray(row) ? row : [];
  var scenario = String(cells[XLSX_COL.SCENARIO] == null ? '' : cells[XLSX_COL.SCENARIO]).trim();
  if (!scenario) {
    return null;
  }

  var yearMonth = Upload._normalizePeriod(cells[XLSX_COL.DATE]);
  if (!yearMonth) {
    Upload._invalidCell(rowNumber, '「年月」');
  }

  var amount = Upload._asFiniteNumber(cells[XLSX_COL.AMOUNT]);
  if (!isFinite(amount)) {
    Upload._invalidCell(rowNumber, '「金額」');
  }

  return [
    scenario,
    yearMonth,
    Upload._requireTrimmedString(cells[XLSX_COL.ACCOUNT_CODE], rowNumber, '「科目コード」'),
    String(cells[XLSX_COL.EXT_ACCOUNT_CODE] == null ? '' : cells[XLSX_COL.EXT_ACCOUNT_CODE]).trim(),
    Upload._requireTrimmedString(cells[XLSX_COL.ACCOUNT], rowNumber, '「科目」'),
    Upload._requireTrimmedString(cells[XLSX_COL.ACCOUNT_TYPE], rowNumber, '「科目タイプ」'),
    Upload._requireTrimmedString(cells[XLSX_COL.DEPT_CODE], rowNumber, '「部署コード」'),
    String(cells[XLSX_COL.EXT_DEPT_CODE] == null ? '' : cells[XLSX_COL.EXT_DEPT_CODE]).trim(),
    Upload._requireTrimmedString(cells[XLSX_COL.DEPT], rowNumber, '「部署」'),
    amount,
  ];
};

Upload._buildSheetRows = function (workbookRows) {
  if (!Array.isArray(workbookRows) || workbookRows.length <= 1) {
    throw new Error('アップロード対象データが見つかりませんでした。');
  }

  var rows = [UPLOAD_SHEET_HEADER.slice()];
  for (var i = 1; i < workbookRows.length; i++) {
    var sheetRow = Upload._parseWorkbookDataRow(workbookRows[i], i + 1);
    if (sheetRow) {
      rows.push(sheetRow);
    }
  }

  if (rows.length === 1) {
    throw new Error('アップロード対象データが見つかりませんでした。');
  }

  return rows;
};

Upload._sanitizeFileName = function (fileName) {
  var normalized = String(fileName == null ? '' : fileName).trim();
  if (!normalized) {
    return 'upload.xlsx';
  }

  return normalized.replace(/[\\\/:*?"<>|\u0000-\u001F]/g, '_');
};

Upload._buildArchiveFileName = function (uploadId, originalFileName) {
  var archiveTimestamp = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMdd_HHmmss');
  return archiveTimestamp + '_' + uploadId + '_' + Upload._sanitizeFileName(originalFileName);
};

Upload._resolveWorkbookMimeType = function (originalFileName) {
  var lower = Upload._sanitizeFileName(originalFileName).toLowerCase();
  if (lower.slice(-4) === '.xls' && lower.slice(-5) !== '.xlsx') {
    return 'application/vnd.ms-excel';
  }
  return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
};

Upload._createWorkbookBlob = function (workbookBase64, originalFileName) {
  if (!workbookBase64) {
    throw new Error('アップロードファイルが空です。');
  }

  return Utilities.newBlob(
    Utilities.base64Decode(workbookBase64),
    Upload._resolveWorkbookMimeType(originalFileName),
    Upload._sanitizeFileName(originalFileName)
  );
};

Upload._getUploadFolder = function () {
  var properties = PropertiesService.getScriptProperties();
  var configuredFolderId = properties.getProperty('UPLOAD_FOLDER_ID');
  if (configuredFolderId) {
    return DriveApp.getFolderById(configuredFolderId);
  }

  var spreadsheetFile = DriveApp.getFileById(SheetUtils.getSpreadsheet().getId());
  var parents = spreadsheetFile.getParents();
  if (parents.hasNext()) {
    var parentFolder = parents.next();
    var siblingFolders = parentFolder.getFoldersByName(UPLOADS_FOLDER_NAME);
    if (siblingFolders.hasNext()) {
      return siblingFolders.next();
    }
    return parentFolder.createFolder(UPLOADS_FOLDER_NAME);
  }

  var rootFolders = DriveApp.getFoldersByName(UPLOADS_FOLDER_NAME);
  if (rootFolders.hasNext()) {
    return rootFolders.next();
  }

  return DriveApp.createFolder(UPLOADS_FOLDER_NAME);
};

Upload._readWorkbookRowsFromFileId = function (fileId) {
  var workbook = SpreadsheetApp.openById(fileId);
  var sheets = workbook.getSheets();
  var firstSheet = sheets && sheets.length > 0 ? sheets[0] : null;
  if (!firstSheet) {
    return [];
  }
  return firstSheet.getDataRange().getValues();
};

Upload._readWorkbookRowsFromBlob = function (workbookBlob, parentFolderId, uploadId) {
  var convertedResource = {
    title: 'tmp_upload_' + uploadId,
    mimeType: MimeType.GOOGLE_SHEETS,
  };
  if (parentFolderId) {
    convertedResource.parents = [{ id: parentFolderId }];
  }

  var convertedFile = Drive.Files.insert(convertedResource, workbookBlob, {
    supportsAllDrives: true,
  });
  try {
    return Upload._readWorkbookRowsFromFileId(convertedFile.id);
  } finally {
    DriveApp.getFileById(convertedFile.id).setTrashed(true);
  }
};

Upload._persistWorkbook = function (workbookBase64, originalFileName, uploadId) {
  var workbookBlob = Upload._createWorkbookBlob(workbookBase64, originalFileName);
  var uploadFolder = Upload._getUploadFolder();
  var archiveFile = uploadFolder.createFile(
    workbookBlob.copyBlob().setName(Upload._buildArchiveFileName(uploadId, originalFileName))
  );

  try {
    return {
      driveFileId: archiveFile.getId(),
      sheetRows: Upload._buildSheetRows(Upload._readWorkbookRowsFromBlob(workbookBlob, uploadFolder.getId(), uploadId)),
    };
  } catch (error) {
    archiveFile.setTrashed(true);
    throw error;
  }
};

/**
 * Commit an upload: archive the workbook, persist normalized upload rows to a per-upload sheet, and record history.
 * @param {string} workbookBase64 - Original workbook payload encoded as base64
 * @param {string} originalFileName - Selected file name from the browser
 * @param {Object} scenarioInput - { kind, targetMonth, forecastStart? }
 * @param {Object|null} confirmedReplacement - Replacement warning object if confirmed
 * @returns {Object} UploadMetadata
 */
Upload.commitUpload = function (workbookBase64, originalFileName, scenarioInput, confirmedReplacement) {
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
  var persistedUpload = Upload._persistWorkbook(workbookBase64, originalFileName, uploadId);
  var sheetRows = persistedUpload.sheetRows;

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
    driveFileId: persistedUpload.driveFileId,
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
