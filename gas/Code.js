// ============================================================
// FPA Dashboard - GAS Entry Point
// Serves the Vite-built React SPA via GAS HTML Service
// ============================================================

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('FPA Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
