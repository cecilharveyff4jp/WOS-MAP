// ============================================
// マスター管理用GASスクリプト
// ============================================
// このスクリプトは、マスタースプレッドシートにデプロイしてください
// マスタースプレッドシートURL: [ここに新規作成したマスタースプレッドシートのURLを記載]
//
// 必要なシート:
// - alliances: 同盟情報管理
//   カラム: allianceId, allianceName, serverNumber, spreadsheetId, userId, editPasswordHash, createdAt, updatedAt, isActive
// - users: ユーザー情報管理
//   カラム: userId, googleEmail, displayName, photoURL, createdAt, lastLogin

const MASTER_SPREADSHEET_ID = "1NEh2yL6enlyH_yFIMsvIK6kZQRPJFTNzvASpeeg3_FE"; // マスタースプレッドシートID
const TEMPLATE_SPREADSHEET_ID = "1qaoGvzjyhPE-ZeVjMehXLYV99l_KLlKB0QVmxedZKLU"; // テンプレート用（既存のスプレッドシート）
const MASTER_EMAIL = "cecilharveyff4jp@gmail.com"; // マスターのGoogleアカウント

// マップ設定のデフォルト
const DEFAULT_MAPS = [
  { id: 'object', name: 'メインマップ', sheetName: 'objects', isVisible: true, isBase: true, order: 1 },
  { id: 'map2', name: 'サブマップ2', sheetName: 'objects_map2', isVisible: false, isBase: false, order: 2 },
  { id: 'map3', name: 'サブマップ3', sheetName: 'objects_map3', isVisible: false, isBase: false, order: 3 },
  { id: 'map4', name: 'サブマップ4', sheetName: 'objects_map4', isVisible: false, isBase: false, order: 4 },
  { id: 'map5', name: 'サブマップ5', sheetName: 'objects_map5', isVisible: false, isBase: false, order: 5 }
];

// シンプルなハッシュ関数（本番環境では外部ライブラリの使用を推奨）
function simpleHash(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// UUID生成
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// マスターシートの初期化
function initializeMasterSheet() {
  const ss = SpreadsheetApp.openById(MASTER_SPREADSHEET_ID);
  let allianceSheet = ss.getSheetByName('alliances');
  
  if (!allianceSheet) {
    allianceSheet = ss.insertSheet('alliances');
    allianceSheet.appendRow([
      'allianceId',
      'allianceName',
      'serverNumber',
      'spreadsheetId',
      'userId',
      'editPassword',
      'createdAt',
      'updatedAt',
      'isActive'
    ]);
    
    // ヘッダー行のフォーマット
    const headerRange = allianceSheet.getRange(1, 1, 1, 9);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4285f4');
    headerRange.setFontColor('#ffffff');
  }
  
  return allianceSheet;
}

// 新しい同盟用のスプレッドシートを作成
function createAllianceSpreadsheet(allianceName, creatorEmail) {
  try {
    // テンプレートをコピー
    const templateFile = DriveApp.getFileById(TEMPLATE_SPREADSHEET_ID);
    const newFile = templateFile.makeCopy(`WOS Map - ${allianceName}`);
    const newSpreadsheetId = newFile.getId();
    
    // 新しいスプレッドシートを開いて初期化
    const newSs = SpreadsheetApp.openById(newSpreadsheetId);
    
    // metaシートの初期化
    const metaSheet = newSs.getSheetByName('meta');
    if (metaSheet) {
      const metaData = metaSheet.getDataRange().getValues();
      for (let i = 1; i < metaData.length; i++) {
        if (metaData[i][0] === 'mapName') {
          metaSheet.getRange(i + 1, 2).setValue(`${allianceName} Map`);
          break;
        }
      }
    }
    
    // デフォルト：リンクを知っている人は閲覧のみ
    newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // 作成者に編集権限を付与
    if (creatorEmail) {
      try {
        newFile.addEditor(creatorEmail);
        Logger.log('Added editor: ' + creatorEmail);
      } catch (e) {
        Logger.log('Could not add creator as editor: ' + e.toString());
      }
    }
    
    // マスターに編集権限を付与
    if (MASTER_EMAIL && creatorEmail !== MASTER_EMAIL) {
      try {
        newFile.addEditor(MASTER_EMAIL);
        Logger.log('Added master editor: ' + MASTER_EMAIL);
      } catch (e) {
        Logger.log('Could not add master as editor: ' + e.toString());
      }
    }
    
    return newSpreadsheetId;
  } catch (error) {
    Logger.log('Error creating spreadsheet: ' + error.toString());
    throw new Error('スプレッドシートの作成に失敗しました: ' + error.toString());
  }
}

// 同盟情報を取得
function getAllianceById(allianceId) {
  const ss = SpreadsheetApp.openById(MASTER_SPREADSHEET_ID);
  const allianceSheet = ss.getSheetByName('alliances');
  
  if (!allianceSheet) {
    return null;
  }
  
  const data = allianceSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === allianceId) {
      return {
        allianceId: data[i][0],
        allianceName: data[i][1],
        serverNumber: data[i][2],
        spreadsheetId: data[i][3],
        userId: data[i][4],
        editPassword: data[i][5],
        createdAt: data[i][6],
        updatedAt: data[i][7],
        isActive: data[i][8]
      };
    }
  }
  
  return null;
}

// ===== AllianceCode.gs機能の移植 =====

// 同盟スプレッドシートを取得
function getAllianceSpreadsheetById(allianceId) {
  const alliance = getAllianceById(allianceId);
  if (!alliance) {
    throw new Error('Alliance not found: ' + allianceId);
  }
  return SpreadsheetApp.openById(alliance.spreadsheetId);
}

// マップ設定を取得または初期化
function getMapConfigs(ss) {
  let configSheet = ss.getSheetByName('map_config');
  
  // map_configシートが存在しない場合は作成
  if (!configSheet) {
    configSheet = ss.insertSheet('map_config');
    configSheet.appendRow(['id', 'name', 'sheetName', 'isVisible', 'isBase', 'order']);
    
    // デフォルト設定を書き込み
    const rows = DEFAULT_MAPS.map(m => [m.id, m.name, m.sheetName, m.isVisible, m.isBase, m.order]);
    configSheet.getRange(2, 1, rows.length, 6).setValues(rows);
  }
  
  const data = configSheet.getDataRange().getValues();
  const configs = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      configs.push({
        id: data[i][0],
        name: data[i][1],
        sheetName: data[i][2],
        isVisible: data[i][3] === true || data[i][3] === 'TRUE',
        isBase: data[i][4] === true || data[i][4] === 'TRUE',
        order: data[i][5] || i
      });
    }
  }
  
  return configs.sort((a, b) => a.order - b.order);
}

// パスワード検証
function verifyAlliancePassword(allianceId, password) {
  const ss = SpreadsheetApp.openById(MASTER_SPREADSHEET_ID);
  const allianceSheet = ss.getSheetByName('alliances');
  
  if (!allianceSheet) {
    Logger.log('verifyPassword: alliances sheet not found');
    return false;
  }
  
  const data = allianceSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === allianceId) {
      const storedPassword = data[i][5];
      const isActive = data[i][8];
      
      // パスワードを文字列として比較（数値として保存されている場合も対応）
      const storedPasswordStr = String(storedPassword);
      const inputPasswordStr = String(password);
      
      Logger.log('verifyPassword: allianceId=' + allianceId);
      Logger.log('verifyPassword: storedPassword=' + storedPassword + ' (type: ' + typeof storedPassword + ')');
      Logger.log('verifyPassword: inputPassword=' + password + ' (type: ' + typeof password + ')');
      Logger.log('verifyPassword: isActive=' + isActive);
      Logger.log('verifyPassword: match=' + (storedPasswordStr === inputPasswordStr));
      
      return storedPasswordStr === inputPasswordStr && isActive === true; // パスワードが一致 & 有効な同盟
    }
  }
  
  Logger.log('verifyPassword: alliance not found');
  return false;
}

// 全ての有効な同盟を取得
function getAllActiveAlliances() {
  const ss = SpreadsheetApp.openById(MASTER_SPREADSHEET_ID);
  const allianceSheet = ss.getSheetByName('alliances');
  
  if (!allianceSheet) {
    return [];
  }
  
  const data = allianceSheet.getDataRange().getValues();
  const alliances = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][8] === true) { // isActive
      alliances.push({
        allianceId: data[i][0],
        allianceName: data[i][1],
        serverNumber: data[i][2],
        spreadsheetId: data[i][3],
        userId: data[i][4],
        createdAt: data[i][6],
        updatedAt: data[i][7],
        isActive: data[i][8]
      });
    }
  }
  
  return alliances;
}

// GETリクエスト処理
function doGet(e) {
  try {
    return handleGetRequest(e);
  } catch (error) {
    Logger.log('Fatal error in doGet: ' + error.toString());
    Logger.log('Stack trace: ' + error.stack);
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error: 'Internal server error: ' + error.toString()
    }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleGetRequest(e) {
  const action = e.parameter.action;
  
  Logger.log('doGet called with action: ' + action);
  Logger.log('Parameters: ' + JSON.stringify(e.parameter));
  
  // JSONレスポンスを作成するヘルパー関数
  function createResponse(jsonData) {
    return ContentService.createTextOutput(JSON.stringify(jsonData))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  try {
    // ユーザーの同盟一覧を取得
    if (action === 'getUserAlliances') {
      const userId = e.parameter.userId;
      
      if (!userId) {
        return createResponse({
          ok: false,
          error: 'userId is required'
        });
      }
      
      const ss = SpreadsheetApp.openById(MASTER_SPREADSHEET_ID);
      const allianceSheet = ss.getSheetByName('alliances');
      
      if (!allianceSheet) {
        return createResponse({
          ok: true,
          alliances: []
        });
      }
      
      const data = allianceSheet.getDataRange().getValues();
      const userAlliances = [];
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][4] === userId) {  // userId列
          userAlliances.push({
            allianceId: data[i][0],
            allianceName: data[i][1],
            serverNumber: data[i][2],
            spreadsheetId: data[i][3],
            userId: data[i][4],
            createdAt: data[i][6],
            updatedAt: data[i][7],
            isActive: data[i][8]
          });
        }
      }
      
      return createResponse({
        ok: true,
        alliances: userAlliances
      });
    }
    
    // 同盟情報取得
    if (action === 'getAlliance') {
      const allianceId = e.parameter.allianceId;
      
      if (!allianceId) {
        return createResponse({
          ok: false,
          error: 'allianceId is required'
        });
      }
      
      const alliance = getAllianceById(allianceId);
      
      if (!alliance) {
        return createResponse({
          ok: false,
          error: 'Alliance not found'
        });
      }
      
      return createResponse({
        ok: true,
        alliance: alliance
      });
    }
    
    // 全ての有効な同盟を取得
    if (action === 'getAlliances') {
      const alliances = getAllActiveAlliances();
      
      return createResponse({
        ok: true,
        alliances: alliances
      });
    }
    
    // 新規同盟作成（GETリクエストで処理）
    if (action === 'createAlliance') {
      const allianceName = e.parameter.allianceName;
      const serverNumber = e.parameter.serverNumber;
      const userId = e.parameter.userId;
      const editPassword = e.parameter.editPassword;
      
      // バリデーション
      if (!allianceName || !serverNumber || !userId || !editPassword) {
        return createResponse({
          ok: false,
          error: 'All fields are required (allianceName, serverNumber, userId, editPassword)'
        });
      }
      
      // パスワードのバリデーション（最低4文字）
      if (editPassword.length < 4) {
        return createResponse({
          ok: false,
          error: 'Password must be at least 4 characters'
        });
      }
      
      // ユーザーの同盟数をチェック（最大5個）
      const ss = SpreadsheetApp.openById(MASTER_SPREADSHEET_ID);
      const allianceSheet = ss.getSheetByName('alliances');
      
      if (allianceSheet) {
        const allianceData = allianceSheet.getDataRange().getValues();
        let userAllianceCount = 0;
        
        for (let i = 1; i < allianceData.length; i++) {
          if (allianceData[i][4] === userId && allianceData[i][8] === true) {
            userAllianceCount++;
          }
        }
        
        if (userAllianceCount >= 5) {
          return createResponse({
            ok: false,
            error: 'Maximum 5 alliances per user. Please delete an existing alliance first.'
          });
        }
      }
      
      const masterSheet = initializeMasterSheet();
      const allianceId = generateUUID();
      const timestamp = new Date().toISOString();
      
      // ユーザーのメールアドレスを取得
      let creatorEmail = null;
      const usersSheet = ss.getSheetByName('users');
      if (usersSheet) {
        const usersData = usersSheet.getDataRange().getValues();
        for (let i = 1; i < usersData.length; i++) {
          if (usersData[i][0] === userId) {
            creatorEmail = usersData[i][1]; // googleEmail列
            break;
          }
        }
      }
      
      // 新しいスプレッドシートを作成
      const spreadsheetId = createAllianceSpreadsheet(allianceName, creatorEmail);
      
      // マスターシートに同盟情報を追加
      masterSheet.appendRow([
        allianceId,
        allianceName,
        serverNumber,
        spreadsheetId,
        userId,
        '',  // パスワード（後で設定）
        timestamp,
        timestamp,
        true
      ]);
      
      // パスワード列をテキスト形式に設定してから値を設定
      const lastRow = masterSheet.getLastRow();
      const passwordCell = masterSheet.getRange(lastRow, 6);
      passwordCell.setNumberFormat('@');  // テキスト形式に設定
      passwordCell.setValue(String(editPassword));
      
      return createResponse({
        ok: true,
        allianceId: allianceId,
        spreadsheetId: spreadsheetId
      });
    }
    
    // ユーザー情報の登録/更新（GETリクエストで処理）
    if (action === 'upsertUser') {
      const userId = e.parameter.userId;
      const googleEmail = e.parameter.googleEmail;
      const displayName = e.parameter.displayName;
      const photoURL = e.parameter.photoURL;
      
      if (!userId || !googleEmail) {
        return createResponse({
          ok: false,
          error: 'userId and googleEmail are required'
        });
      }
      
      // usersシートを取得または作成
      const ss = SpreadsheetApp.openById(MASTER_SPREADSHEET_ID);
      let usersSheet = ss.getSheetByName('users');
      
      if (!usersSheet) {
        usersSheet = ss.insertSheet('users');
        usersSheet.appendRow([
          'userId',
          'googleEmail',
          'displayName',
          'photoURL',
          'createdAt',
          'lastLogin'
        ]);
        
        const headerRange = usersSheet.getRange(1, 1, 1, 6);
        headerRange.setFontWeight('bold');
        headerRange.setBackground('#4285f4');
        headerRange.setFontColor('#ffffff');
      }
      
      // 既存ユーザーを検索
      const usersData = usersSheet.getDataRange().getValues();
      let userRow = -1;
      
      for (let i = 1; i < usersData.length; i++) {
        if (usersData[i][0] === userId) {
          userRow = i + 1;
          break;
        }
      }
      
      const now = new Date().toISOString();
      
      if (userRow > 0) {
        // 既存ユーザーを更新
        usersSheet.getRange(userRow, 2).setValue(googleEmail);
        usersSheet.getRange(userRow, 3).setValue(displayName || '');
        usersSheet.getRange(userRow, 4).setValue(photoURL || '');
        usersSheet.getRange(userRow, 6).setValue(now);
      } else {
        // 新規ユーザーを追加
        usersSheet.appendRow([
          userId,
          googleEmail,
          displayName || '',
          photoURL || '',
          now,
          now
        ]);
      }
      
      return createResponse({
        ok: true,
        message: 'User upserted successfully'
      });
    }
    
    // パスワード検証（GETリクエストで処理）
    if (action === 'verifyPassword') {
      const allianceId = e.parameter.allianceId;
      const password = e.parameter.password;
      
      if (!allianceId || !password) {
        return createResponse({
          ok: false,
          error: 'allianceId and password are required'
        });
      }
      
      const isValid = verifyAlliancePassword(allianceId, password);
      
      return createResponse({
        ok: true,
        isValid: isValid
      });
    }
    
    // 同盟情報の更新（GETリクエストで処理）
    if (action === 'updateAlliance') {
      const allianceId = e.parameter.allianceId;
      const password = e.parameter.password;
      const allianceName = e.parameter.allianceName;
      const serverNumber = e.parameter.serverNumber;
      const newPassword = e.parameter.newPassword;
      
      if (!allianceId) {
        return createResponse({
          ok: false,
          error: 'allianceId is required'
        });
      }
      
      // パスワードが空でない場合のみ検証
      if (password && !verifyAlliancePassword(allianceId, password)) {
        return createResponse({
          ok: false,
          error: 'Invalid password'
        });
      }
      
      const ss = SpreadsheetApp.openById(MASTER_SPREADSHEET_ID);
      const allianceSheet = ss.getSheetByName('alliances');
      const sheetData = allianceSheet.getDataRange().getValues();
      
      for (let i = 1; i < sheetData.length; i++) {
        if (sheetData[i][0] === allianceId) {
          // 更新可能なフィールド
          if (allianceName) {
            allianceSheet.getRange(i + 1, 2).setValue(allianceName);
          }
          if (serverNumber) {
            allianceSheet.getRange(i + 1, 3).setValue(serverNumber);
          }
          if (newPassword && newPassword.length >= 4) {
            const passwordCell = allianceSheet.getRange(i + 1, 6);
            passwordCell.setNumberFormat('@');  // テキスト形式に設定
            passwordCell.setValue(String(newPassword));
          }
          
          // 更新日時を更新
          allianceSheet.getRange(i + 1, 8).setValue(new Date().toISOString());
          
          return createResponse({
            ok: true
          });
        }
      }
      
      return createResponse({
        ok: false,
        error: 'Alliance not found'
      });
    }
    
    // 同盟削除（論理削除 - GETリクエストで処理）
    if (action === 'deleteAlliance') {
      const allianceId = e.parameter.allianceId;
      const password = e.parameter.password;
      
      Logger.log('deleteAlliance: allianceId=' + allianceId);
      Logger.log('deleteAlliance: password=' + password);
      
      if (!allianceId || !password) {
        return createResponse({
          ok: false,
          error: 'allianceId and password are required'
        });
      }
      
      // 'google-auth'の場合はパスワード検証をスキップ、それ以外は検証
      let verified = false;
      if (password === 'google-auth') {
        verified = true;
        Logger.log('deleteAlliance: google-auth bypass');
      } else {
        verified = verifyAlliancePassword(allianceId, password);
        Logger.log('deleteAlliance: verified=' + verified);
      }
      
      if (!verified) {
        return createResponse({
          ok: false,
          error: 'Invalid password'
        });
      }
      
      const ss = SpreadsheetApp.openById(MASTER_SPREADSHEET_ID);
      const allianceSheet = ss.getSheetByName('alliances');
      const sheetData = allianceSheet.getDataRange().getValues();
      
      for (let i = 1; i < sheetData.length; i++) {
        if (sheetData[i][0] === allianceId) {
          // isActiveをfalseに設定（論理削除）
          allianceSheet.getRange(i + 1, 9).setValue(false);
          // 更新日時を更新
          allianceSheet.getRange(i + 1, 8).setValue(new Date().toISOString());
          
          return createResponse({
            ok: true
          });
        }
      }
      
      return createResponse({
        ok: false,
        error: 'Alliance not found'
      });
    }
    
    // ===== マップ管理機能（AllianceCode.gsから移植） =====
    
    // マップ一覧を取得
    if (action === 'getMaps') {
      const allianceId = e.parameter.allianceId;
      
      if (!allianceId) {
        return createResponse({
          ok: false,
          error: 'allianceId is required'
        });
      }
      
      try {
        const ss = getAllianceSpreadsheetById(allianceId);
        const configs = getMapConfigs(ss);
        return createResponse({ 
          ok: true, 
          maps: configs 
        });
      } catch (err) {
        return createResponse({
          ok: false,
          error: err.message
        });
      }
    }
    
    // マップデータを取得
    if (action === 'getMap') {
      const allianceId = e.parameter.allianceId;
      const mapId = e.parameter.mapId || 'object';
      
      if (!allianceId) {
        return createResponse({
          ok: false,
          error: 'allianceId is required'
        });
      }
      
      try {
        const ss = getAllianceSpreadsheetById(allianceId);
        const metaSheet = ss.getSheetByName('meta');
        
        // マップ設定を取得
        const configs = getMapConfigs(ss);
        const mapConfig = configs.find(m => m.id === mapId);
        
        if (!mapConfig) {
          return createResponse({ 
            ok: false, 
            error: 'Map not found' 
          });
        }
        
        const objectsSheet = ss.getSheetByName(mapConfig.sheetName);
        
        if (!objectsSheet) {
          return createResponse({ 
            ok: false, 
            error: 'Sheet not found' 
          });
        }
        
        // メタデータを取得（key-value形式）
        const metaData = metaSheet.getDataRange().getValues();
        const meta = {};
        
        // key-value形式で読み込み（A列=key, B列=value）
        for (let i = 1; i < metaData.length; i++) {
          if (metaData[i][0]) {
            meta[metaData[i][0]] = metaData[i][1];
          }
        }
        
        const output = {
          ok: true,
          mapId: mapId,
          mapName: mapConfig.name,
          isBase: mapConfig.isBase,
          meta: {
            cols: Number(meta.cols) || 60,
            rows: Number(meta.rows) || 40,
            cellSize: Number(meta.cellSize) || 24,
            mapName: meta.mapName || "SNW Map",
            bgImage: meta.bgImage || "map-bg.jpg",
            bgCenterX: Number(meta.bgCenterX) || 50,
            bgCenterY: Number(meta.bgCenterY) || 50,
            bgScale: Number(meta.bgScale) || 1.0,
            bgOpacity: Number(meta.bgOpacity) || 1.0
          },
          objects: []
        };
        
        // オブジェクトデータを取得（ヘッダー行をスキップ）
        const objectsData = objectsSheet.getDataRange().getValues();
        for (let i = 1; i < objectsData.length; i++) {
          if (objectsData[i][0]) {
            const obj = {
              id: objectsData[i][0],
              type: objectsData[i][1],
              label: objectsData[i][2],
              x: objectsData[i][3],
              y: objectsData[i][4],
              w: objectsData[i][5],
              h: objectsData[i][6]
            };
            
            // ベースマップの場合のみ追加フィールド
            if (mapConfig.isBase) {
              obj.birthday = objectsData[i][7] || '';
              obj.note = objectsData[i][8] || '';
              obj.isFavorite = objectsData[i][11] || false;
              obj.Animation = objectsData[i][12] || '';
              obj.Fire = objectsData[i][13] || '';
            }
            
            output.objects.push(obj);
          }
        }
        
        return createResponse(output);
      } catch (err) {
        return createResponse({
          ok: false,
          error: err.message
        });
      }
    }
    
    // リンク一覧を取得
    if (action === 'getLinks') {
      const allianceId = e.parameter.allianceId;
      
      if (!allianceId) {
        return createResponse({
          ok: false,
          error: 'allianceId is required'
        });
      }
      
      try {
        const ss = getAllianceSpreadsheetById(allianceId);
        const linkSheet = ss.getSheetByName('LINK');
        
        if (!linkSheet) {
          return createResponse({ 
            ok: true, 
            links: [] 
          });
        }
        
        const linkData = linkSheet.getDataRange().getValues();
        const links = [];
        
        // ヘッダー行をスキップして、全てのリンクを取得
        for (let i = 1; i < linkData.length; i++) {
          if (linkData[i][0]) {
            const displayFlag = linkData[i][3];
            links.push({
              name: linkData[i][0],
              url: linkData[i][1],
              order: linkData[i][2],
              display: displayFlag === true || displayFlag === 'TRUE'
            });
          }
        }
        
        // 表示順でソート
        links.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        return createResponse({ 
          ok: true, 
          links: links 
        });
      } catch (err) {
        return createResponse({
          ok: false,
          error: err.message
        });
      }
    }
    
    return createResponse({
      ok: false,
      error: 'Invalid action'
    });
    
  } catch (error) {
    Logger.log('Error in doGet: ' + error.toString());
    return createResponse({
      ok: false,
      error: error.toString()
    });
  }
}

// OPTIONSリクエスト処理（CORSプリフライト対応）
function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.JSON);
}

// POSTリクエスト処理
function doPost(e) {
  try {
    return handlePostRequest(e);
  } catch (error) {
    Logger.log('Fatal error in doPost: ' + error.toString());
    Logger.log('Stack trace: ' + error.stack);
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error: 'Internal server error: ' + error.toString()
    }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handlePostRequest(e) {
  const action = e.parameter.action;
  
  Logger.log('doPost called with action: ' + action);
  
  // JSONレスポンスを作成するヘルパー関数
  function createResponse(jsonData) {
    return ContentService.createTextOutput(JSON.stringify(jsonData))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  try {
    // ユーザー情報の登録/更新
    if (action === 'upsertUser') {
      const data = JSON.parse(e.postData.contents);
      
      // usersシートを取得または作成
      const ss = SpreadsheetApp.openById(MASTER_SPREADSHEET_ID);
      let usersSheet = ss.getSheetByName('users');
      
      if (!usersSheet) {
        usersSheet = ss.insertSheet('users');
        usersSheet.appendRow([
          'userId',
          'googleEmail',
          'displayName',
          'photoURL',
          'createdAt',
          'lastLogin'
        ]);
        
        const headerRange = usersSheet.getRange(1, 1, 1, 6);
        headerRange.setFontWeight('bold');
        headerRange.setBackground('#4285f4');
        headerRange.setFontColor('#ffffff');
      }
      
      // 既存ユーザーを検索
      const usersData = usersSheet.getDataRange().getValues();
      let userRow = -1;
      
      for (let i = 1; i < usersData.length; i++) {
        if (usersData[i][0] === data.userId) {
          userRow = i + 1;
          break;
        }
      }
      
      const now = new Date().toISOString();
      
      if (userRow > 0) {
        // 既存ユーザーを更新
        usersSheet.getRange(userRow, 2).setValue(data.googleEmail);
        usersSheet.getRange(userRow, 3).setValue(data.displayName);
        usersSheet.getRange(userRow, 4).setValue(data.photoURL);
        usersSheet.getRange(userRow, 6).setValue(now);
      } else {
        // 新規ユーザーを追加
        usersSheet.appendRow([
          data.userId,
          data.googleEmail,
          data.displayName,
          data.photoURL,
          now,
          now
        ]);
      }
      
      return createResponse({
        ok: true,
        message: 'User upserted successfully'
      });
    }
    
    // 新規同盟作成
    if (action === 'createAlliance') {
      const data = JSON.parse(e.postData.contents);
      
      // バリデーション
      if (!data.allianceName || !data.serverNumber || !data.userId || !data.editPassword) {
        return createResponse({
          ok: false,
          error: 'All fields are required (allianceName, serverNumber, userId, editPassword)'
        });
      }
      
      // パスワードのバリデーション（最低4文字）
      if (data.editPassword.length < 4) {
        return createResponse({
          ok: false,
          error: 'Password must be at least 4 characters'
        });
      }
      
      // ユーザーの同盟数をチェック（最大5個）
      const ss = SpreadsheetApp.openById(MASTER_SPREADSHEET_ID);
      const allianceSheet = ss.getSheetByName('alliances');
      
      if (allianceSheet) {
        const allianceData = allianceSheet.getDataRange().getValues();
        let userAllianceCount = 0;
        
        for (let i = 1; i < allianceData.length; i++) {
          if (allianceData[i][4] === data.userId && allianceData[i][8] === true) {  // userId列とisActive列
            userAllianceCount++;
          }
        }
        
        if (userAllianceCount >= 5) {
          return createResponse({
            ok: false,
            error: 'Maximum 5 alliances per user. Please delete an existing alliance first.'
          });
        }
      }
      
      const masterSheet = initializeMasterSheet();
      const allianceId = generateUUID();
      const timestamp = new Date().toISOString();
      
      // ユーザーのメールアドレスを取得
      let creatorEmail = null;
      const usersSheet = ss.getSheetByName('users');
      if (usersSheet) {
        const usersData = usersSheet.getDataRange().getValues();
        for (let i = 1; i < usersData.length; i++) {
          if (usersData[i][0] === data.userId) {
            creatorEmail = usersData[i][1]; // googleEmail列
            break;
          }
        }
      }
      
      // 新しいスプレッドシートを作成
      const spreadsheetId = createAllianceSpreadsheet(data.allianceName, creatorEmail);
      
      // マスターシートに同盟情報を追加
      masterSheet.appendRow([
        allianceId,
        data.allianceName,
        data.serverNumber,
        spreadsheetId,
        data.userId,  // ownerEmailからuserIdに変更
        '',  // パスワード（後で設定）
        timestamp,
        timestamp,
        true  // isActive
      ]);
      
      // パスワード列をテキスト形式に設定してから値を設定
      const lastRow = masterSheet.getLastRow();
      const passwordCell = masterSheet.getRange(lastRow, 6);
      passwordCell.setNumberFormat('@');  // テキスト形式に設定
      passwordCell.setValue(String(data.editPassword));
      
      return createResponse({
        ok: true,
        allianceId: allianceId,
        spreadsheetId: spreadsheetId
      });
    }
    
    // パスワード検証
    if (action === 'verifyPassword') {
      const data = JSON.parse(e.postData.contents);
      
      if (!data.allianceId || !data.password) {
        return createResponse({
          ok: false,
          error: 'allianceId and password are required'
        });
      }
      
      const isValid = verifyAlliancePassword(data.allianceId, data.password);
      
      return createResponse({
        ok: true,
        isValid: isValid
      });
    }
    
    // 同盟情報の更新
    if (action === 'updateAlliance') {
      const data = JSON.parse(e.postData.contents);
      
      if (!data.allianceId) {
        return createResponse({
          ok: false,
          error: 'allianceId is required'
        });
      }
      
      // パスワードが空でない場合のみ検証
      if (data.password && !verifyAlliancePassword(data.allianceId, data.password)) {
        return createResponse({
          ok: false,
          error: 'Invalid password'
        });
      }
      
      const ss = SpreadsheetApp.openById(MASTER_SPREADSHEET_ID);
      const allianceSheet = ss.getSheetByName('alliances');
      const sheetData = allianceSheet.getDataRange().getValues();
      
      for (let i = 1; i < sheetData.length; i++) {
        if (sheetData[i][0] === data.allianceId) {
          // 更新可能なフィールド
          if (data.updates.allianceName) {
            allianceSheet.getRange(i + 1, 2).setValue(data.updates.allianceName);
          }
          if (data.updates.serverNumber) {
            allianceSheet.getRange(i + 1, 3).setValue(data.updates.serverNumber);
          }
          if (data.updates.newPassword) {
            const passwordCell = allianceSheet.getRange(i + 1, 6);
            passwordCell.setNumberFormat('@');  // テキスト形式に設定
            passwordCell.setValue(String(data.updates.newPassword));
          }
          
          // 更新日時を更新
          allianceSheet.getRange(i + 1, 8).setValue(new Date().toISOString());
          
          return createResponse({
            ok: true
          });
        }
      }
      
      return createResponse({
        ok: false,
        error: 'Alliance not found'
      });
    }
    
    // ===== マップ操作機能（AllianceCode.gsから移植） =====
    
    // マップ設定を更新
    if (action === 'updateMapConfig') {
      const allianceId = e.parameter.allianceId;
      const data = JSON.parse(e.postData.contents);
      
      if (!allianceId) {
        return createResponse({
          ok: false,
          error: 'allianceId is required'
        });
      }
      
      try {
        const ss = getAllianceSpreadsheetById(allianceId);
        const configSheet = ss.getSheetByName('map_config');
        
        if (!configSheet) {
          return createResponse({ 
            ok: false, 
            error: 'Config sheet not found' 
          });
        }
        
        const configData = configSheet.getDataRange().getValues();
        
        // 該当するマップを見つけて更新
        for (let i = 1; i < configData.length; i++) {
          if (configData[i][0] === data.mapId) {
            if (data.name !== undefined) {
              configSheet.getRange(i + 1, 2).setValue(data.name);
            }
            if (data.isVisible !== undefined && !configData[i][4]) {  // ベースマップでない場合のみ
              configSheet.getRange(i + 1, 4).setValue(data.isVisible);
            }
            
            return createResponse({ 
              ok: true
            });
          }
        }
        
        return createResponse({ 
          ok: false, 
          error: 'Map not found' 
        });
      } catch (err) {
        return createResponse({
          ok: false,
          error: err.message
        });
      }
    }
    
    // すべてのマップ設定を一括更新（並び替え用）
    if (action === 'updateAllMapConfigs') {
      const allianceId = e.parameter.allianceId;
      const data = JSON.parse(e.postData.contents);
      
      if (!allianceId) {
        return createResponse({
          ok: false,
          error: 'allianceId is required'
        });
      }
      
      try {
        const ss = getAllianceSpreadsheetById(allianceId);
        const configSheet = ss.getSheetByName('map_config');
        
        if (!configSheet) {
          return createResponse({ 
            ok: false, 
            error: 'Config sheet not found' 
          });
        }
        
        const configs = data.configs;
        if (!configs || !Array.isArray(configs)) {
          return createResponse({ 
            ok: false, 
            error: 'Invalid configs data' 
          });
        }
        
        const configData = configSheet.getDataRange().getValues();
        
        // 各マップのorderを更新
        for (let i = 1; i < configData.length; i++) {
          const mapId = configData[i][0];
          const newConfig = configs.find(c => c.id === mapId);
          
          if (newConfig && newConfig.order !== undefined) {
            configSheet.getRange(i + 1, 6).setValue(newConfig.order);
          }
        }
        
        return createResponse({ 
          ok: true
        });
      } catch (err) {
        return createResponse({
          ok: false,
          error: err.message
        });
      }
    }
    
    // マップをコピー
    if (action === 'copyMap') {
      const allianceId = e.parameter.allianceId;
      const data = JSON.parse(e.postData.contents);
      
      if (!allianceId) {
        return createResponse({
          ok: false,
          error: 'allianceId is required'
        });
      }
      
      try {
        const ss = getAllianceSpreadsheetById(allianceId);
        const sourceSheet = ss.getSheetByName('objects');  // ベースマップ
        const configs = getMapConfigs(ss);
        const targetConfig = configs.find(m => m.id === data.targetMapId);
        
        if (!targetConfig || targetConfig.isBase) {
          return createResponse({ 
            ok: false, 
            error: 'Invalid target map' 
          });
        }
        
        let targetSheet = ss.getSheetByName(targetConfig.sheetName);
        
        // ターゲットシートが存在しない場合は作成
        if (!targetSheet) {
          targetSheet = ss.insertSheet(targetConfig.sheetName);
          targetSheet.appendRow(['id', 'type', 'label', 'x', 'y', 'w', 'h']);
        }
        
        // データをコピー（基本フィールドのみ）
        const sourceData = sourceSheet.getDataRange().getValues();
        const lastRow = targetSheet.getLastRow();
        if (lastRow >= 2) {
          targetSheet.getRange(2, 1, lastRow - 1, 7).clearContent();
        }
        
        const rows = [];
        for (let i = 1; i < sourceData.length; i++) {
          if (sourceData[i][0]) {
            rows.push([
              sourceData[i][0],  // id
              sourceData[i][1],  // type
              sourceData[i][2],  // label
              sourceData[i][3],  // x
              sourceData[i][4],  // y
              sourceData[i][5],  // w
              sourceData[i][6]   // h
            ]);
          }
        }
        
        if (rows.length > 0) {
          targetSheet.getRange(2, 1, rows.length, 7).setValues(rows);
        }
        
        return createResponse({ 
          ok: true,
          copied: rows.length
        });
      } catch (err) {
        return createResponse({
          ok: false,
          error: err.message
        });
      }
    }
    
    // マップを保存
    if (action === 'saveMap') {
      const allianceId = e.parameter.allianceId;
      const data = JSON.parse(e.postData.contents);
      const mapId = data.mapId || 'object';
      
      if (!allianceId) {
        return createResponse({
          ok: false,
          error: 'allianceId is required'
        });
      }
      
      try {
        const ss = getAllianceSpreadsheetById(allianceId);
        const metaSheet = ss.getSheetByName('meta');
        
        // マップ設定を取得
        const configs = getMapConfigs(ss);
        const mapConfig = configs.find(m => m.id === mapId);
        
        if (!mapConfig) {
          return createResponse({ 
            ok: false, 
            error: 'Map not found' 
          });
        }
        
        let objectsSheet = ss.getSheetByName(mapConfig.sheetName);
        
        // シートが存在しない場合は作成
        if (!objectsSheet) {
          objectsSheet = ss.insertSheet(mapConfig.sheetName);
          if (mapConfig.isBase) {
            objectsSheet.appendRow(['id', 'type', 'label', 'x', 'y', 'w', 'h', 'birthday', 'note', 'updatedAt', 'updatedBy', 'isFavorite', 'Animation', 'Fire']);
          } else {
            objectsSheet.appendRow(['id', 'type', 'label', 'x', 'y', 'w', 'h']);
          }
        }
        
        // メタ情報を更新（もし送られてきた場合）
        if (data.meta) {
          const metaData = metaSheet.getDataRange().getValues();
          const metaMap = new Map();
          for (let i = 1; i < metaData.length; i++) {
            if (metaData[i][0]) {
              metaMap.set(metaData[i][0], i + 1);
            }
          }
          
          // 更新するメタ情報
          const metaUpdates = {
            cols: data.meta.cols,
            rows: data.meta.rows,
            cellSize: data.meta.cellSize,
            mapName: data.meta.mapName
          };
          
          for (const [key, value] of Object.entries(metaUpdates)) {
            if (value !== undefined) {
              const row = metaMap.get(key);
              if (row) {
                metaSheet.getRange(row, 2).setValue(value);
              }
            }
          }
        }
        
        // オブジェクトデータを更新
        if (data.objects) {
          const existingData = objectsSheet.getDataRange().getValues();
          const lastRow = objectsSheet.getLastRow();
          
          // 既存データをクリア（ヘッダーは残す）
          if (lastRow > 1) {
            objectsSheet.getRange(2, 1, lastRow - 1, objectsSheet.getLastColumn()).clearContent();
          }
          
          // 新しいデータを書き込み
          const rows = [];
          for (const obj of data.objects) {
            if (mapConfig.isBase) {
              // ベースマップは全フィールド
              rows.push([
                obj.id || '',
                obj.type || '',
                obj.label || '',
                obj.x || 0,
                obj.y || 0,
                obj.w || 1,
                obj.h || 1,
                obj.birthday || '',
                obj.note || '',
                data.updatedAt || new Date().toISOString(),
                data.actor || 'unknown',
                obj.isFavorite || false,
                obj.Animation || '',
                obj.Fire || ''
              ]);
            } else {
              // サブマップは基本フィールドのみ
              rows.push([
                obj.id || '',
                obj.type || '',
                obj.label || '',
                obj.x || 0,
                obj.y || 0,
                obj.w || 1,
                obj.h || 1
              ]);
            }
          }
          
          if (rows.length > 0) {
            objectsSheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
          }
        }
        
        return createResponse({ 
          ok: true
        });
      } catch (err) {
        return createResponse({
          ok: false,
          error: err.message
        });
      }
    }
    
    // リンク集を保存
    if (action === 'saveLinks') {
      const allianceId = e.parameter.allianceId;
      const data = JSON.parse(e.postData.contents);
      
      if (!allianceId) {
        return createResponse({
          ok: false,
          error: 'allianceId is required'
        });
      }
      
      if (!data.links || !Array.isArray(data.links)) {
        return createResponse({
          ok: false,
          error: 'links array is required'
        });
      }
      
      try {
        const ss = getAllianceSpreadsheetById(allianceId);
        let linkSheet = ss.getSheetByName('LINK');
        
        // LINKシートが存在しない場合は作成
        if (!linkSheet) {
          linkSheet = ss.insertSheet('LINK');
          linkSheet.appendRow(['name', 'url', 'order', 'display']);
          
          // ヘッダー行のフォーマット
          const headerRange = linkSheet.getRange(1, 1, 1, 4);
          headerRange.setFontWeight('bold');
          headerRange.setBackground('#4285f4');
          headerRange.setFontColor('#ffffff');
        }
        
        // 既存データをクリア（ヘッダーは残す）
        const lastRow = linkSheet.getLastRow();
        if (lastRow > 1) {
          linkSheet.getRange(2, 1, lastRow - 1, 4).clearContent();
        }
        
        // 新しいデータを書き込み
        const rows = [];
        for (let i = 0; i < data.links.length; i++) {
          const link = data.links[i];
          rows.push([
            link.name || '',
            link.url || '',
            link.order || (i + 1),
            link.display === true || link.display === 'TRUE'
          ]);
        }
        
        if (rows.length > 0) {
          linkSheet.getRange(2, 1, rows.length, 4).setValues(rows);
        }
        
        return createResponse({ 
          ok: true
        });
      } catch (err) {
        return createResponse({
          ok: false,
          error: err.message
        });
      }
    }
    
    return createResponse({
      ok: false,
      error: 'Invalid action'
    });
    
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    return createResponse({
      ok: false,
      error: error.toString()
    });
  }
}

// テスト用関数
function testCreateAlliance() {
  const testData = {
    allianceName: "テスト同盟",
    serverNumber: "123",
    ownerEmail: "test@example.com",
    editPassword: "test1234"
  };
  
  const result = doPost({
    parameter: { action: 'createAlliance' },
    postData: { contents: JSON.stringify(testData) }
  });
  
  Logger.log(result.getContent());
}

function testGetAlliance() {
  const result = doGet({
    parameter: {
      action: 'getAlliance',
      allianceId: 'YOUR_ALLIANCE_ID_HERE'
    }
  });
  
  Logger.log(result.getContent());
}
