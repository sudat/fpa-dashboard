// ============================================================
// Storage — Google Drive archive utilities
// ============================================================

var Storage = Storage || {};

/**
 * Get the archive folder ID from script properties.
 * Configure via: File > Project Properties > Script Properties
 * Key: UPLOAD_FOLDER_ID
 */
Storage.getFolderId = function () {
  var id = PropertiesService.getScriptProperties().getProperty('UPLOAD_FOLDER_ID');
  return id || '';
};

Storage.resolveArchiveFolder = function () {
  var configuredId = Storage.getFolderId();
  if (configuredId) {
    try {
      return DriveApp.getFolderById(configuredId);
    } catch (error) {
      Logger.log('UPLOAD_FOLDER_ID が不正なため、スプレッドシートと同じフォルダへフォールバックします: ' + error);
    }
  }

  var spreadsheetFile = DriveApp.getFileById(SheetUtils.getSpreadsheet().getId());
  var parents = spreadsheetFile.getParents();
  if (parents.hasNext()) {
    return parents.next();
  }

  return DriveApp.getRootFolder();
};

/**
 * Archive a blob to Google Drive.
 * @param {string} fileName - Name for the archived file
 * @param {Blob}  blob     - File blob to archive
 * @returns {{ fileId: string, driveUrl: string }}
 */
Storage.archiveToDrive = function (fileName, blob) {
  var folder = Storage.resolveArchiveFolder();

  var timestamp = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMdd_HHmmss');
  var archiveName = timestamp + '_' + fileName;

  var file = folder.createFile(blob).setName(archiveName);

  return {
    fileId: file.getId(),
    driveUrl: file.getUrl(),
  };
};

/**
 * Get the Drive URL for a file by ID.
 * @param {string} fileId
 * @returns {string}
 */
Storage.getArchiveUrl = function (fileId) {
  return 'https://drive.google.com/open?id=' + fileId;
};
