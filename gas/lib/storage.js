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
  return id || 'YOUR_FOLDER_ID';
};

/**
 * Archive a blob to Google Drive.
 * @param {string} fileName - Name for the archived file
 * @param {Blob}  blob     - File blob to archive
 * @returns {{ fileId: string, driveUrl: string }}
 */
Storage.archiveToDrive = function (fileName, blob) {
  var folderId = Storage.getFolderId();
  var folder = DriveApp.getFolderById(folderId);

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
