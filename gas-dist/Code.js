// ============================================================
// FPA Dashboard - GAS Entry Point
// Serves the Vite-built React SPA via GAS HTML Service
// Exposes backend functions via google.script.run
// ============================================================

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('FPA Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getCurrentUser() {
  var email = Session.getActiveUser().getEmail();
  var name = email.split('@')[0];
  return { email: email, name: name };
}

function previewUpload(workbookDataBase64, scenarioInput) {
  return Upload.previewUpload(workbookDataBase64, scenarioInput);
}

function commitUpload(workbookDataBase64, scenarioInput, confirmedReplacement) {
  return Upload.commitUpload(workbookDataBase64, scenarioInput, confirmedReplacement);
}

function getUploadHistory() {
  return History.getUploadHistory();
}

function getAccountMaster() {
  return Master.getAccountMaster();
}

function saveAccountMaster(entries) {
  return Master.saveAccountMaster(entries);
}

function getDepartmentMaster() {
  return Master.getDepartmentMaster();
}

function saveDepartmentMaster(entries) {
  return Master.saveDepartmentMaster(entries);
}

function getAnalysisData(scenarioFamily, targetMonth) {
  return Upload.getAnalysisData(scenarioFamily, targetMonth);
}
