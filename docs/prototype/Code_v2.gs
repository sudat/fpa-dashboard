// ============================================================
// 予実管理 GAS Webアプリ - バックエンド（Loglass CSV対応版）
// ============================================================

// ---------- 定数 ----------

// コンテナバインド型：スプレッドシートに紐づいたApps Scriptなので
// SpreadsheetApp.getActiveSpreadsheet() で取得する
const UPLOAD_FOLDER_ID = 'YOUR_FOLDER_ID'; // CSV原本保存先フォルダのIDに差し替え

const SHEET = {
  FACT:             'ファクト',
  COMMENT:          'コメント',
  MASTER_ACCOUNT:   'マスタ_科目',
  MASTER_DEPT:      'マスタ_事業部',
  MASTER_USER:      'マスタ_ユーザー',
  UPLOAD_HISTORY:   'アップロード履歴',
};

// ---------- ファクトタブのカラム定義 ----------
// ログラスCSVの10列 + 取込日時 = 11列
// A:シナリオ B:年月度 C:科目コード D:外部科目コード E:科目
// F:科目タイプ G:部署コード H:外部部署コード I:部署 J:金額 K:取込日時
const COL_FACT = {
  SCENARIO:         0,  // A: 計画・実績 → シナリオとして保存
  PERIOD:           1,  // B: yyyy/mm/dd → yyyy-MM に正規化して保存
  ACCOUNT_CODE:     2,  // C: ログラス科目コード
  EXT_ACCOUNT_CODE: 3,  // D: 外部システム科目コード
  ACCOUNT:          4,  // E: 科目
  ACCOUNT_TYPE:     5,  // F: 科目タイプ（収益/費用）
  DEPT_CODE:        6,  // G: ログラス部署コード
  EXT_DEPT_CODE:    7,  // H: 外部システム部署コード
  DEPT:             8,  // I: 部署
  AMOUNT:           9,  // J: 金額
  IMPORTED_AT:      10, // K: 取込日時（GASが付与）
};

const COL_COMMENT = {
  PERIOD:     0,
  DEPT:       1,
  BODY:       2,
  STATUS:     3,
  UPDATED_BY: 4,
  UPDATED_AT: 5,
};

const COL_USER = {
  EMAIL: 0,
  ROLE:  1,
  DEPT:  2,
  NAME:  3,
};

const ROLES = { ADMIN: '管理者', DEPT: '事業部', VIEWER: '閲覧' };
const COMMENT_STATUS = { EMPTY: '未入力', ENTERED: '入力済', CONFIRMED: '確認済' };

// ---------- ログラスCSVのカラム位置（0始まり） ----------
const CSV_COL = {
  SCENARIO:         0,  // A: 計画・実績
  DATE:             1,  // B: 年月（yyyy/mm/dd）
  ACCOUNT_CODE:     2,  // C: ログラス科目コード
  EXT_ACCOUNT_CODE: 3,  // D: 外部システム科目コード
  ACCOUNT:          4,  // E: 科目
  ACCOUNT_TYPE:     5,  // F: 科目タイプ
  DEPT_CODE:        6,  // G: ログラス部署コード
  EXT_DEPT_CODE:    7,  // H: 外部システム部署コード
  DEPT:             8,  // I: 部署
  AMOUNT:           9,  // J: 金額
};


// ============================================================
// エントリポイント
// ============================================================

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('予実管理')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


// ============================================================
// ユーザー認証・認可
// ============================================================

function getCurrentUser() {
  const email = Session.getActiveUser().getEmail();
  const users = _getSheetData(SHEET.MASTER_USER);
  const row = users.find(r => r[COL_USER.EMAIL].toString().toLowerCase() === email.toLowerCase());

  if (!row) {
    // マスタ未登録ユーザーは閲覧扱い
    return { email, role: ROLES.VIEWER, dept: '', name: email.split('@')[0] };
  }
  return {
    email,
    role: row[COL_USER.ROLE],
    dept: row[COL_USER.DEPT],
    name: row[COL_USER.NAME] || email.split('@')[0],
  };
}

function _requireRole(allowedRoles) {
  const user = getCurrentUser();
  if (!allowedRoles.includes(user.role)) {
    throw new Error(`権限がありません（${user.role}）`);
  }
  return user;
}


// ============================================================
// 日付ユーティリティ
// ============================================================

/**
 * ログラスの日付形式を年月度文字列に正規化する
 * "2026/02/01" や Date型 → "2026-02"
 */
function _normalizePeriod(value) {
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }
  // 文字列の場合: "2026/02/01" or "2026-02-01" or "2026/2/1" 等
  const str = String(value).trim();
  const match = str.match(/^(\d{4})[\/\-](\d{1,2})/);
  if (match) {
    return `${match[1]}-${String(match[2]).padStart(2, '0')}`;
  }
  return str; // パースできなければそのまま返す
}

/**
 * 年月度を年単位でシフト "2026-02" → "2025-02"
 */
function _shiftYear(period, yearDelta) {
  const [y, m] = period.split('-').map(Number);
  return `${y + yearDelta}-${String(m).padStart(2, '0')}`;
}


// ============================================================
// ダッシュボード
// ============================================================

/**
 * @param {string} period            対象年月度（例: "2026-02"）
 * @param {string} forecastScenario  比較する見込シナリオ名（例: "26年3月期着地見込0224時点"）
 * @return {Array<{ account, accountType, actual, forecast, forecastDiff, forecastDiffRate, priorYear, priorYearDiff, priorYearDiffRate }>}
 */
function getDashboardData(period, forecastScenario) {
  const facts = _getSheetData(SHEET.FACT);
  const priorPeriod = _shiftYear(period, -1);

  const actual    = _aggregateByAccount(facts, '実績', period);
  const forecast  = _aggregateByAccount(facts, forecastScenario, period);
  const priorYear = _aggregateByAccount(facts, '実績', priorPeriod);

  // 科目マスタから表示順を取得
  const masterAccounts = _getSheetData(SHEET.MASTER_ACCOUNT);
  const accountMeta = {};
  masterAccounts.forEach(r => {
    // マスタ_科目: 科目コード | 科目名 | 表示順 | 集約グループ | 科目タイプ
    accountMeta[r[1]] = { order: Number(r[2]) || 9999, type: r[4] || '' };
  });

  const allAccounts = [...new Set([
    ...Object.keys(actual),
    ...Object.keys(forecast),
    ...Object.keys(priorYear),
  ])].sort((a, b) => (accountMeta[a]?.order || 9999) - (accountMeta[b]?.order || 9999));

  return allAccounts.map(account => {
    const a = actual[account] || 0;
    const f = forecast[account] || 0;
    const p = priorYear[account] || 0;
    return {
      account,
      accountType: accountMeta[account]?.type || '',
      actual: a,
      forecast: f,
      forecastDiff: a - f,
      forecastDiffRate: f !== 0 ? (a - f) / Math.abs(f) : null,
      priorYear: p,
      priorYearDiff: a - p,
      priorYearDiffRate: p !== 0 ? (a - p) / Math.abs(p) : null,
    };
  });
}


// ============================================================
// 比較分析（単月度 / 着地見込 共通）
// ============================================================

/**
 * @param {Object} params
 * @param {string} params.period          対象年月度（正規化済 "2026-02"）
 * @param {string} params.baseScenario    基準シナリオ（例: "実績"）
 * @param {string} params.compareScenario 比較シナリオ（前月見込名）
 * @param {string} params.priorScenario   前年シナリオ（例: "実績"）
 * @param {string} params.priorPeriod     前年年月度（例: "2025-02"）
 * @param {string} [params.deptFilter]    部署フィルタ（省略で全部署）
 */
function getComparisonData(params) {
  const facts = _getSheetData(SHEET.FACT);

  const base    = _filterFacts(facts, params.baseScenario, params.period);
  const compare = _filterFacts(facts, params.compareScenario, params.period);
  const prior   = _filterFacts(facts, params.priorScenario, params.priorPeriod);

  // 科目×部署 で統合
  const merged = {};
  const _key = (account, dept) => `${account}||${dept}`;

  [
    { data: base, field: 'base' },
    { data: compare, field: 'compare' },
    { data: prior, field: 'prior' },
  ].forEach(({ data, field }) => {
    data.forEach(row => {
      const account = row[COL_FACT.ACCOUNT];
      const dept    = row[COL_FACT.DEPT];

      // 部署フィルタ
      if (params.deptFilter && dept !== params.deptFilter) return;

      const k = _key(account, dept);
      if (!merged[k]) {
        merged[k] = {
          account,
          accountCode: row[COL_FACT.ACCOUNT_CODE],
          accountType: row[COL_FACT.ACCOUNT_TYPE],
          dept,
          deptCode: row[COL_FACT.DEPT_CODE],
          base: 0, compare: 0, prior: 0,
        };
      }
      merged[k][field] += Number(row[COL_FACT.AMOUNT]) || 0;
    });
  });

  return Object.values(merged).map(r => ({
    ...r,
    compareDiff: r.base - r.compare,
    compareDiffRate: r.compare !== 0 ? (r.base - r.compare) / Math.abs(r.compare) : null,
    priorDiff: r.base - r.prior,
    priorDiffRate: r.prior !== 0 ? (r.base - r.prior) / Math.abs(r.prior) : null,
  }));
}

/**
 * ドリルスルー：特定科目の部署別明細
 */
function getDrilldownData(params) {
  // params に account を含める
  const all = getComparisonData(params);
  return all.filter(r => r.account === params.account);
}

/**
 * 逆ドリルスルー：特定部署の科目別明細
 * 事業部トップページ用
 */
function getDeptDetailData(params) {
  const paramsWithDept = { ...params, deptFilter: params.dept };
  return getComparisonData(paramsWithDept);
}


// ============================================================
// コメント管理（事業部×月度）
// ============================================================

function getComments(period) {
  const data = _getSheetData(SHEET.COMMENT);
  const depts = _getSheetData(SHEET.MASTER_DEPT).map(r => r[0]);

  const commentMap = {};
  data
    .filter(r => r[COL_COMMENT.PERIOD] === period)
    .forEach(r => {
      commentMap[r[COL_COMMENT.DEPT]] = {
        period:    r[COL_COMMENT.PERIOD],
        dept:      r[COL_COMMENT.DEPT],
        body:      r[COL_COMMENT.BODY] || '',
        status:    r[COL_COMMENT.STATUS] || COMMENT_STATUS.EMPTY,
        updatedBy: r[COL_COMMENT.UPDATED_BY] || '',
        updatedAt: _formatDateTime(r[COL_COMMENT.UPDATED_AT]),
      };
    });

  return depts.map(dept => commentMap[dept] || {
    period,
    dept,
    body: '',
    status: COMMENT_STATUS.EMPTY,
    updatedBy: '',
    updatedAt: '',
  });
}

/**
 * コメント保存（UPSERT）
 * 改行込みの長文OK
 */
function saveComment(period, dept, body) {
  const user = getCurrentUser();

  if (user.role === ROLES.VIEWER) {
    throw new Error('閲覧専用ユーザーはコメントを編集できません');
  }
  if (user.role === ROLES.DEPT && user.dept !== dept) {
    throw new Error('他事業部のコメントは編集できません');
  }

  const sheet = _getSheet(SHEET.COMMENT);
  const data = sheet.getDataRange().getValues();
  const now = _now();

  let targetRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][COL_COMMENT.PERIOD] === period && data[i][COL_COMMENT.DEPT] === dept) {
      targetRow = i + 1;
      break;
    }
  }

  const status = body.trim() === '' ? COMMENT_STATUS.EMPTY : COMMENT_STATUS.ENTERED;
  const rowValues = [period, dept, body, status, user.email, now];

  if (targetRow > 0) {
    sheet.getRange(targetRow, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }

  return { success: true, message: '保存しました' };
}

/**
 * コメントステータスを「確認済」に変更（管理者のみ）
 */
function confirmComment(period, dept) {
  _requireRole([ROLES.ADMIN]);

  const sheet = _getSheet(SHEET.COMMENT);
  const data = sheet.getDataRange().getValues();
  const now = _now();

  for (let i = 1; i < data.length; i++) {
    if (data[i][COL_COMMENT.PERIOD] === period && data[i][COL_COMMENT.DEPT] === dept) {
      const row = i + 1;
      sheet.getRange(row, COL_COMMENT.STATUS + 1).setValue(COMMENT_STATUS.CONFIRMED);
      sheet.getRange(row, COL_COMMENT.UPDATED_AT + 1).setValue(now);
      return { success: true };
    }
  }
  throw new Error('該当コメントが見つかりません');
}


// ============================================================
// データアップロード（管理者のみ）
// ============================================================

/**
 * CSVプレビュー
 * ログラスCSVをパースして内容を確認する
 */
function previewUpload(csvContent) {
  _requireRole([ROLES.ADMIN]);

  const rows = Utilities.parseCsv(csvContent);
  const headers = rows[0];
  const dataRows = rows.slice(1).filter(r => r.length >= 10 && r[0].trim() !== '');

  // シナリオと年月度を抽出
  const scenarios = [...new Set(dataRows.map(r => r[CSV_COL.SCENARIO].trim()))];
  const periods   = [...new Set(dataRows.map(r => _normalizePeriod(r[CSV_COL.DATE])))];
  const depts     = [...new Set(dataRows.map(r => r[CSV_COL.DEPT].trim()))];

  return {
    headers,
    rowCount: dataRows.length,
    preview: dataRows.slice(0, 20),
    scenarios,
    periods,
    depts,
  };
}

/**
 * CSV確定取り込み（洗い替え方式）
 *
 * ログラスCSVの列構成:
 *   A:計画・実績  B:年月  C:科目コード  D:外部科目コード
 *   E:科目  F:科目タイプ  G:部署コード  H:外部部署コード  I:部署  J:金額
 *
 * → ファクトタブの列構成:
 *   A:シナリオ  B:年月度  C:科目コード  D:外部科目コード
 *   E:科目  F:科目タイプ  G:部署コード  H:外部部署コード  I:部署  J:金額  K:取込日時
 */
function commitUpload(csvContent, fileName) {
  const user = _requireRole([ROLES.ADMIN]);

  const rows = Utilities.parseCsv(csvContent);
  const dataRows = rows.slice(1).filter(r => r.length >= 10 && r[0].trim() !== '');
  const now = _now();

  // CSVからファクトタブ用の行を生成
  const newRows = dataRows.map(r => [
    r[CSV_COL.SCENARIO].trim(),            // A: シナリオ
    _normalizePeriod(r[CSV_COL.DATE]),      // B: 年月度（正規化）
    r[CSV_COL.ACCOUNT_CODE].trim(),         // C: 科目コード
    r[CSV_COL.EXT_ACCOUNT_CODE].trim(),     // D: 外部科目コード
    r[CSV_COL.ACCOUNT].trim(),              // E: 科目
    r[CSV_COL.ACCOUNT_TYPE].trim(),         // F: 科目タイプ
    r[CSV_COL.DEPT_CODE].trim(),            // G: 部署コード
    r[CSV_COL.EXT_DEPT_CODE].trim(),        // H: 外部部署コード
    r[CSV_COL.DEPT].trim(),                 // I: 部署
    Number(r[CSV_COL.AMOUNT]) || 0,         // J: 金額
    now,                                     // K: 取込日時
  ]);

  // 洗い替え対象のシナリオ×年月度を特定
  const keys = new Set(newRows.map(r => `${r[0]}||${r[1]}`));

  // ファクトタブの既存データを一括読み込み → 対象外だけ残す → 全書き戻し
  // （deleteRow ループより高速）
  const factSheet = _getSheet(SHEET.FACT);
  const existing = factSheet.getDataRange().getValues();
  const header = existing[0];

  const surviving = existing.slice(1).filter(row => {
    const k = `${row[COL_FACT.SCENARIO]}||${row[COL_FACT.PERIOD]}`;
    return !keys.has(k);
  });

  const deleted = existing.length - 1 - surviving.length;

  // シート全体をクリアして書き戻し
  factSheet.clearContents();
  const allRows = [header, ...surviving, ...newRows];
  factSheet.getRange(1, 1, allRows.length, allRows[0].length).setValues(allRows);

  // CSV原本をDriveに保存
  _archiveCSV(csvContent, fileName);

  // アップロード履歴を記録
  _getSheet(SHEET.UPLOAD_HISTORY).appendRow([
    fileName,
    [...keys].map(k => k.split('||')[0]).join(', '),
    [...keys].map(k => k.split('||')[1]).join(', '),
    now,
    user.email,
    dataRows.length,
    deleted,
  ]);

  // 取り込みデータからマスタを自動更新
  _syncMasters(newRows);

  return { success: true, imported: dataRows.length, deleted };
}

/**
 * マスタ自動同期
 * アップロードデータに含まれる科目・部署をマスタに追加（既存は上書きしない）
 */
function _syncMasters(factRows) {
  // --- 科目マスタ ---
  const accountSheet = _getSheet(SHEET.MASTER_ACCOUNT);
  const accountData = accountSheet.getDataRange().getValues();
  const existingAccounts = new Set(accountData.slice(1).map(r => String(r[0])));

  const newAccounts = {};
  factRows.forEach(r => {
    const code = r[COL_FACT.ACCOUNT_CODE];
    if (!existingAccounts.has(String(code)) && !newAccounts[code]) {
      // 科目コード | 科目名 | 表示順 | 集約グループ | 科目タイプ
      newAccounts[code] = [code, r[COL_FACT.ACCOUNT], '', '', r[COL_FACT.ACCOUNT_TYPE]];
    }
  });
  const accountRows = Object.values(newAccounts);
  if (accountRows.length > 0) {
    accountSheet.getRange(
      accountSheet.getLastRow() + 1, 1, accountRows.length, accountRows[0].length
    ).setValues(accountRows);
  }

  // --- 部署マスタ ---
  const deptSheet = _getSheet(SHEET.MASTER_DEPT);
  const deptData = deptSheet.getDataRange().getValues();
  const existingDepts = new Set(deptData.slice(1).map(r => String(r[0])));

  const newDepts = {};
  factRows.forEach(r => {
    const name = r[COL_FACT.DEPT];
    if (!existingDepts.has(String(name)) && !newDepts[name]) {
      // 部署名 | 部署コード | 外部部署コード
      newDepts[name] = [name, r[COL_FACT.DEPT_CODE], r[COL_FACT.EXT_DEPT_CODE]];
    }
  });
  const deptRows = Object.values(newDepts);
  if (deptRows.length > 0) {
    deptSheet.getRange(
      deptSheet.getLastRow() + 1, 1, deptRows.length, deptRows[0].length
    ).setValues(deptRows);
  }
}

/**
 * アップロード履歴
 */
function getUploadHistory() {
  const data = _getSheetData(SHEET.UPLOAD_HISTORY);
  return data.map(r => ({
    fileName:   r[0],
    scenarios:  r[1],
    periods:    r[2],
    importedAt: _formatDateTime(r[3]),
    importedBy: r[4],
    rowCount:   r[5],
    deleted:    r[6],
  })).reverse();
}


// ============================================================
// マスタ・メタ取得
// ============================================================

function getMasterData(type) {
  const map = {
    account: SHEET.MASTER_ACCOUNT,
    dept:    SHEET.MASTER_DEPT,
    user:    SHEET.MASTER_USER,
  };
  if (!map[type]) throw new Error(`不明なマスタ種別: ${type}`);

  const sheet = _getSheet(map[type]);
  const [headers, ...rows] = sheet.getDataRange().getValues();

  return rows.map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

/**
 * ファクトタブに存在するシナリオ一覧を返す
 */
function getScenarios() {
  const data = _getSheetData(SHEET.FACT);
  return [...new Set(data.map(r => r[COL_FACT.SCENARIO]))].sort();
}

/**
 * ファクトタブに存在する年月度一覧を返す
 */
function getPeriods() {
  const data = _getSheetData(SHEET.FACT);
  return [...new Set(data.map(r => r[COL_FACT.PERIOD]))].sort();
}

/**
 * ファクトタブに存在する部署一覧を返す
 */
function getDepts() {
  const data = _getSheetData(SHEET.FACT);
  return [...new Set(data.map(r => r[COL_FACT.DEPT]))].sort();
}


// ============================================================
// 内部ヘルパー
// ============================================================

function _getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function _getSheet(name) {
  const sheet = _getSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error(`シート「${name}」が見つかりません`);
  return sheet;
}

/** ヘッダー行を除外した2次元配列を返す */
function _getSheetData(name) {
  const sheet = _getSheet(name);
  const data = sheet.getDataRange().getValues();
  return data.length > 1 ? data.slice(1) : [];
}

/** ファクトをシナリオ×年月度でフィルタ */
function _filterFacts(facts, scenario, period) {
  return facts.filter(
    r => r[COL_FACT.SCENARIO] === scenario && r[COL_FACT.PERIOD] === period
  );
}

/** 科目単位で金額を集約 → { 科目名: 合計金額 } */
function _aggregateByAccount(facts, scenario, period) {
  const filtered = _filterFacts(facts, scenario, period);
  const result = {};
  filtered.forEach(r => {
    const account = r[COL_FACT.ACCOUNT];
    result[account] = (result[account] || 0) + (Number(r[COL_FACT.AMOUNT]) || 0);
  });
  return result;
}

/** 現在日時を文字列で返す */
function _now() {
  return Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');
}

/** Date型や文字列の日時をフォーマット */
function _formatDateTime(value) {
  if (!value) return '';
  if (value instanceof Date) {
    return Utilities.formatDate(value, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');
  }
  return String(value);
}

/** CSV原本をDriveに保存 */
function _archiveCSV(csvContent, originalFileName) {
  try {
    const folder = DriveApp.getFolderById(UPLOAD_FOLDER_ID);
    const timestamp = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMdd_HHmmss');
    const archiveName = `${timestamp}_${originalFileName}`;
    folder.createFile(archiveName, csvContent, MimeType.CSV);
  } catch (e) {
    console.error('CSV原本の保存に失敗:', e.message);
  }
}
