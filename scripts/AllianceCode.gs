// ============================================
// 同盟マップ管理用GASスクリプト (マルチテナント対応版)
// ============================================
// このスクリプトは、テンプレートスクリプトとして使用されます
// 各同盟専用のスプレッドシートにコピーされて使用されます
//
// 注意: パスワード認証はマスタースプレッドシート側で行います
// このスクリプトは認証済みのリクエストのみを処理します

// マップ設定のデフォルト
const DEFAULT_MAPS = [
  { id: 'object', name: 'メインマップ', sheetName: 'objects', isVisible: true, isBase: true, order: 1 },
  { id: 'map2', name: 'サブマップ2', sheetName: 'objects_map2', isVisible: false, isBase: false, order: 2 },
  { id: 'map3', name: 'サブマップ3', sheetName: 'objects_map3', isVisible: false, isBase: false, order: 3 },
  { id: 'map4', name: 'サブマップ4', sheetName: 'objects_map4', isVisible: false, isBase: false, order: 4 },
  { id: 'map5', name: 'サブマップ5', sheetName: 'objects_map5', isVisible: false, isBase: false, order: 5 }
];

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

function doGet(e) {
  const action = e.parameter.action;
  
  try {
    // このスプレッドシート自身を使用
    const ss = SpreadsheetApp.getActiveSpreadsheet();
  
    // マップ一覧を取得
    if (action === 'getMaps') {
      const configs = getMapConfigs(ss);
      return ContentService.createTextOutput(JSON.stringify({ 
        ok: true, 
        maps: configs 
      }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'getMap') {
      const mapId = e.parameter.mapId || 'object';
      const metaSheet = ss.getSheetByName('meta');
      
      // マップ設定を取得
      const configs = getMapConfigs(ss);
      const mapConfig = configs.find(m => m.id === mapId);
      
      if (!mapConfig) {
        return ContentService.createTextOutput(JSON.stringify({ 
          ok: false, 
          error: 'Map not found' 
        }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      const objectsSheet = ss.getSheetByName(mapConfig.sheetName);
      
      if (!objectsSheet) {
        return ContentService.createTextOutput(JSON.stringify({ 
          ok: false, 
          error: 'Sheet not found' 
        }))
          .setMimeType(ContentService.MimeType.JSON);
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
            // アニメーション関連は後で削除予定だが、互換性のため残す
            obj.Animation = objectsData[i][12] || '';
            obj.Fire = objectsData[i][13] || '';
          }
          
          output.objects.push(obj);
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify(output))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'getLinks') {
      const linkSheet = ss.getSheetByName('LINK');
      
      if (!linkSheet) {
        return ContentService.createTextOutput(JSON.stringify({ 
          ok: true, 
          links: [] 
        }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      const linkData = linkSheet.getDataRange().getValues();
      const links = [];
      
      // ヘッダー行をスキップして、全てのリンクを取得（表示/非表示含む）
      for (let i = 1; i < linkData.length; i++) {
        if (linkData[i][0]) {  // 名前が存在する行のみ
          const displayFlag = linkData[i][3]; // D列（表示FLG）
          links.push({
            name: linkData[i][0],    // A列（非表示名）
            url: linkData[i][1],     // B列（URL）
            order: linkData[i][2],   // C列（表示順）
            display: displayFlag === true || displayFlag === 'TRUE'  // 表示フラグ
          });
        }
      }
      
      // 表示順でソート
      links.sort((a, b) => (a.order || 0) - (b.order || 0));
      
      return ContentService.createTextOutput(JSON.stringify({ 
        ok: true, 
        links: links 
      }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ 
      ok: false,
      error: 'Invalid action' 
    }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('Error in doGet: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  const action = e.parameter.action;
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const data = JSON.parse(e.postData.contents);
    
    // マップ設定を更新
    if (action === 'updateMapConfig') {
      const configSheet = ss.getSheetByName('map_config');
      
      if (!configSheet) {
        return ContentService.createTextOutput(JSON.stringify({ 
          ok: false, 
          error: 'Config sheet not found' 
        }))
          .setMimeType(ContentService.MimeType.JSON);
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
          
          return ContentService.createTextOutput(JSON.stringify({ 
            ok: true
          }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({ 
        ok: false, 
        error: 'Map not found' 
      }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // すべてのマップ設定を一括更新（並び替え用）
    if (action === 'updateAllMapConfigs') {
      const configSheet = ss.getSheetByName('map_config');
      
      if (!configSheet) {
        return ContentService.createTextOutput(JSON.stringify({ 
          ok: false, 
          error: 'Config sheet not found' 
        }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      const configs = data.configs;
      if (!configs || !Array.isArray(configs)) {
        return ContentService.createTextOutput(JSON.stringify({ 
          ok: false, 
          error: 'Invalid configs data' 
        }))
          .setMimeType(ContentService.MimeType.JSON);
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
      
      return ContentService.createTextOutput(JSON.stringify({ 
        ok: true
      }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // マップをコピー
    if (action === 'copyMap') {
      const sourceSheet = ss.getSheetByName('objects');  // ベースマップ
      const configs = getMapConfigs(ss);
      const targetConfig = configs.find(m => m.id === data.targetMapId);
      
      if (!targetConfig || targetConfig.isBase) {
        return ContentService.createTextOutput(JSON.stringify({ 
          ok: false, 
          error: 'Invalid target map' 
        }))
          .setMimeType(ContentService.MimeType.JSON);
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
      
      return ContentService.createTextOutput(JSON.stringify({ 
        ok: true,
        copied: rows.length
      }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'saveMap') {
      const mapId = data.mapId || 'object';
      const metaSheet = ss.getSheetByName('meta');
      
      // マップ設定を取得
      const configs = getMapConfigs(ss);
      const mapConfig = configs.find(m => m.id === mapId);
      
      if (!mapConfig) {
        return ContentService.createTextOutput(JSON.stringify({ 
          ok: false, 
          error: 'Map not found' 
        }))
          .setMimeType(ContentService.MimeType.JSON);
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
        // metaシートの形式: A列=key, B列=value
        // 既存のメタデータを取得して行番号をマップ化
        const metaData = metaSheet.getDataRange().getValues();
        const metaMap = new Map();
        for (let i = 1; i < metaData.length; i++) {
          if (metaData[i][0]) {
            metaMap.set(metaData[i][0], i + 1); // 行番号を保存（1-indexed）
          }
        }
        
        // 更新するメタ情報
        const metaUpdates = {
          'cols': data.meta.cols,
          'rows': data.meta.rows,
          'cellSize': data.meta.cellSize,
          'mapName': data.meta.mapName,
          'bgImage': data.meta.bgImage,
          'bgCenterX': data.meta.bgCenterX,
          'bgCenterY': data.meta.bgCenterY,
          'bgScale': data.meta.bgScale,
          'bgOpacity': data.meta.bgOpacity
        };
        
        // 各キーに対して更新または追加
        for (const key in metaUpdates) {
          const value = metaUpdates[key];
          if (value !== undefined) {
            const rowIndex = metaMap.get(key);
            if (rowIndex) {
              // 既存の行を更新
              metaSheet.getRange(rowIndex, 2).setValue(value);
            } else {
              // 新しい行を追加
              metaSheet.appendRow([key, value]);
            }
          }
        }
      }
      
      // 既存データをクリア（2行目以降、ヘッダーは残す）
      const lastRow = objectsSheet.getLastRow();
      const columnCount = mapConfig.isBase ? 14 : 7;
      if (lastRow >= 2) {
        objectsSheet.getRange(2, 1, lastRow - 1, columnCount).clearContent();
      }
      
      // 新しいデータを書き込み
      if (data.objects && data.objects.length > 0) {
        const timestamp = new Date().toISOString();
        const actor = data.actor || 'anonymous';
        
        let rows;
        if (mapConfig.isBase) {
          rows = data.objects.map(obj => [
            obj.id, 
            obj.type, 
            obj.label, 
            obj.x, 
            obj.y, 
            obj.w, 
            obj.h, 
            obj.birthday || '',
            obj.note || '',
            timestamp,
            actor,
            obj.isFavorite || false,
            obj.Animation || '',
            obj.Fire || ''
          ]);
        } else {
          rows = data.objects.map(obj => [
            obj.id, 
            obj.type, 
            obj.label, 
            obj.x, 
            obj.y, 
            obj.w, 
            obj.h
          ]);
        }
        
        objectsSheet.getRange(2, 1, rows.length, columnCount).setValues(rows);
      }
      
      return ContentService.createTextOutput(JSON.stringify({ 
        ok: true,
        updated: data.objects ? data.objects.length : 0
      }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'saveLinks') {
      let linkSheet = ss.getSheetByName('LINK');
      
      // LINKシートが存在しない場合は作成
      if (!linkSheet) {
        linkSheet = ss.insertSheet('LINK');
        linkSheet.appendRow(['非表示名', 'URL', '表示順', '表示FLG']);
      }
      
      // 既存データをクリア（2行目以降、ヘッダーは残す）
      const lastRow = linkSheet.getLastRow();
      if (lastRow >= 2) {
        linkSheet.getRange(2, 1, lastRow - 1, 4).clearContent();
      }
      
      // 新しいデータを書き込み
      if (data.links && data.links.length > 0) {
        const rows = data.links.map(link => [
          link.name,
          link.url,
          link.order,
          link.display !== false  // displayフラグ（デフォルトtrue）
        ]);
        linkSheet.getRange(2, 1, rows.length, 4).setValues(rows);
      }
      
      return ContentService.createTextOutput(JSON.stringify({ 
        ok: true,
        updated: data.links ? data.links.length : 0
      }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ 
      ok: false,
      error: 'Invalid action' 
    }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
