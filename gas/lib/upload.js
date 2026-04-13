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

Upload._buildChunkSheetRows = function (uploadRows, rowOffset) {
  if (!Array.isArray(uploadRows) || uploadRows.length === 0) {
    throw new Error('アップロード対象データが空です。');
  }

  var rows = [];
  for (var i = 0; i < uploadRows.length; i++) {
    rows.push(Upload._toSheetRow(uploadRows[i], rowOffset + i));
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

Upload._sessionCacheKey = function (uploadId) {
  return 'upload-session:' + uploadId;
};

Upload._saveUploadSession = function (session) {
  CacheService.getScriptCache().put(
    Upload._sessionCacheKey(session.uploadId),
    JSON.stringify(session),
    21600
  );
};

Upload._loadUploadSession = function (uploadId) {
  var cached = CacheService.getScriptCache().get(Upload._sessionCacheKey(uploadId));
  if (!cached) {
    return null;
  }
  return JSON.parse(cached);
};

Upload._clearUploadSession = function (uploadId) {
  CacheService.getScriptCache().remove(Upload._sessionCacheKey(uploadId));
};

Upload._deleteSheetIfExists = function (sheetName) {
  var sheet = SheetUtils.getSpreadsheet().getSheetByName(sheetName);
  if (sheet) {
    SheetUtils.getSpreadsheet().deleteSheet(sheet);
  }
};

Upload._trashFileIfExists = function (fileId) {
  if (!fileId) {
    return;
  }
  DriveApp.getFileById(fileId).setTrashed(true);
};

Upload._isDomainPolicyDisabledError = function (error) {
  var message = error && error.message ? String(error.message) : String(error || '');
  return message.indexOf('ドメイン管理者') >= 0 || message.indexOf('domain administrator') >= 0;
};

Upload.startUploadSession = function (workbookBase64, originalFileName, scenarioInput, confirmedReplacement) {
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
  var normalizedFileName = String(originalFileName || '').trim() || (scenarioInput.kind + '_' + scenarioInput.targetMonth + '.xlsx');
  var workbookBlob = Upload._createWorkbookBlob(workbookBase64, originalFileName);
  var archiveFile = null;
  var sheetInitialized = false;
  var session = {
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
    driveFileId: '',
    rowCount: 0,
    sheetName: sheetName,
    replacementUploadId: confirmedReplacement ? confirmedReplacement.existingUploadId : '',
  };

  try {
    try {
      var uploadFolder = Upload._getUploadFolder();
      archiveFile = uploadFolder.createFile(
        workbookBlob.copyBlob().setName(Upload._buildArchiveFileName(uploadId, originalFileName))
      );
      session.driveFileId = archiveFile.getId();
    } catch (archiveError) {
      if (!Upload._isDomainPolicyDisabledError(archiveError)) {
        throw archiveError;
      }
    }

    SheetUtils.writeRows(sheetName, [UPLOAD_SHEET_HEADER.slice()]);
    sheetInitialized = true;
    Upload._saveUploadSession(session);
    return { uploadId: uploadId };
  } catch (error) {
    if (sheetInitialized) {
      Upload._deleteSheetIfExists(sheetName);
    }
    if (archiveFile) {
      archiveFile.setTrashed(true);
    }
    throw error;
  }
};

Upload.appendUploadRows = function (uploadId, uploadRows) {
  var session = Upload._loadUploadSession(uploadId);
  if (!session) {
    throw new Error('アップロードセッションが見つかりません。再度アップロード実行してください。');
  }

  var sheetRows = Upload._buildChunkSheetRows(uploadRows, session.rowCount + 2);
  SheetUtils.appendRows(session.sheetName, sheetRows);
  session.rowCount += sheetRows.length;
  Upload._saveUploadSession(session);
};

Upload.abortUploadSession = function (uploadId) {
  var session = Upload._loadUploadSession(uploadId);
  if (!session) {
    return false;
  }

  Upload._deleteSheetIfExists(session.sheetName);
  Upload._trashFileIfExists(session.driveFileId);
  Upload._clearUploadSession(uploadId);
  return true;
};

Upload.finalizeUploadSession = function (uploadId) {
  var session = Upload._loadUploadSession(uploadId);
  if (!session) {
    throw new Error('アップロードセッションが見つかりません。再度アップロード実行してください。');
  }

  if (session.rowCount <= 0) {
    Upload.abortUploadSession(uploadId);
    throw new Error('アップロード対象データが見つかりませんでした。');
  }

  var conflict = History.findReplacementConflict(
    session.generatedLabel,
    session.replacementIdentity.scenarioFamily
  );

  if (conflict && !session.replacementUploadId) {
    Upload.abortUploadSession(uploadId);
    throw new Error('上書き確認が必要です。replacementWarning を確認してください。');
  }

  if (conflict && session.replacementUploadId && session.replacementUploadId !== conflict.uploadId) {
    Upload.abortUploadSession(uploadId);
    throw new Error('上書き対象が変更されています。再度アップロード実行してください。');
  }

  if (conflict && session.replacementUploadId) {
    Upload._deleteSheetIfExists(conflict.sheetName || ('upload_' + conflict.uploadId));
  }

  History.addUploadEntry({
    uploadId: session.uploadId,
    timestamp: session.timestamp,
    uploader: session.uploader,
    scenarioInput: session.scenarioInput,
    generatedLabel: session.generatedLabel,
    replacementIdentity: session.replacementIdentity,
    fileName: session.fileName,
    driveFileId: session.driveFileId,
    rowCount: session.rowCount,
    sheetName: session.sheetName,
  });
  Upload._clearUploadSession(uploadId);

  return {
    uploadId: session.uploadId,
    timestamp: session.timestamp,
    uploader: session.uploader,
    scenarioInput: session.scenarioInput,
    generatedLabel: session.generatedLabel,
    replacementIdentity: session.replacementIdentity,
    fileName: session.fileName,
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
