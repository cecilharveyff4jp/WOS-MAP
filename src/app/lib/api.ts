// ============================================
// API通信ユーティリティ
// ============================================
// マスターAPI（同盟管理）とAllianceAPI（マップデータ）への通信を管理

import type {
  Alliance,
  CreateAllianceRequest,
  CreateAllianceResponse,
  VerifyPasswordRequest,
  VerifyPasswordResponse,
  GetAllianceResponse,
} from '../types';

// 環境変数から取得（.env.localまたはnext.configで設定）
const MASTER_API_URL = process.env.NEXT_PUBLIC_MASTER_API_URL || '';

// マスターAPI: 新規同盟作成
export async function createAlliance(
  request: CreateAllianceRequest
): Promise<CreateAllianceResponse> {
  // 環境変数チェック
  if (!MASTER_API_URL) {
    console.error('NEXT_PUBLIC_MASTER_API_URL is not set');
    return {
      ok: false,
      error: 'API URLが設定されていません。開発サーバーを再起動してください。',
    };
  }

  console.log('Creating alliance with URL:', MASTER_API_URL);
  console.log('Request data:', request);

  try {
    // GASのCORS制限を回避するため、GETリクエストでデータを送信
    const params = new URLSearchParams({
      action: 'createAlliance',
      allianceName: request.allianceName,
      serverNumber: request.serverNumber,
      editPassword: request.editPassword,
      userId: request.userId,
    });

    const url = `${MASTER_API_URL}?${params.toString()}`;
    console.log('Request URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      console.error('HTTP error:', response.status, response.statusText);
      
      const responseText = await response.text();
      console.error('Response body:', responseText);
      
      return {
        ok: false,
        error: `サーバーエラー: ${response.status} ${response.statusText}`,
      };
    }

    const responseText = await response.text();
    console.log('Response text:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
      console.log('Alliance created:', data);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Response was not valid JSON:', responseText.substring(0, 500));
      return {
        ok: false,
        error: 'サーバーから無効なレスポンスが返されました。GASのデプロイURLを確認してください。',
      };
    }

    return data;
  } catch (error) {
    console.error('Error creating alliance:', error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        ok: false,
        error: 'ネットワークエラー: APIに接続できません。インターネット接続を確認してください。',
      };
    }
    return {
      ok: false,
      error: `同盟の作成に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
    };
  }
}

// マスターAPI: 同盟情報取得
export async function getAlliance(
  allianceId: string
): Promise<GetAllianceResponse> {
  try {
    const response = await fetch(
      `${MASTER_API_URL}?action=getAlliance&allianceId=${encodeURIComponent(allianceId)}`
    );

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching alliance:', error);
    return {
      ok: false,
      error: 'ネットワークエラーが発生しました',
    };
  }
}

// マスターAPI: パスワード検証
export async function verifyPassword(
  allianceId: string,
  password: string
): Promise<VerifyPasswordResponse> {
  try {
    const params = new URLSearchParams({
      action: 'verifyPassword',
      allianceId,
      password,
    });

    const response = await fetch(`${MASTER_API_URL}?${params.toString()}`);

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error verifying password:', error);
    return {
      ok: false,
      isValid: false,
      error: 'ネットワークエラーが発生しました',
    };
  }
}

// マスターAPI: 同盟情報の更新
export async function updateAlliance(
  allianceId: string,
  password: string,
  updates: {
    allianceName?: string;
    serverNumber?: string;
    newPassword?: string;
  }
): Promise<{ ok: boolean; error?: string }> {
  try {
    const params = new URLSearchParams({
      action: 'updateAlliance',
      allianceId,
      password,
      ...(updates.allianceName && { allianceName: updates.allianceName }),
      ...(updates.serverNumber && { serverNumber: updates.serverNumber }),
      ...(updates.newPassword && { newPassword: updates.newPassword }),
    });

    const response = await fetch(`${MASTER_API_URL}?${params.toString()}`);

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error updating alliance:', error);
    return {
      ok: false,
      error: 'ネットワークエラーが発生しました',
    };
  }
}

// マスターAPI: 同盟削除（論理削除）
export async function deleteAlliance(
  allianceId: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const params = new URLSearchParams({
      action: 'deleteAlliance',
      allianceId,
      password,
    });

    const response = await fetch(`${MASTER_API_URL}?${params.toString()}`);

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error deleting alliance:', error);
    return {
      ok: false,
      error: 'ネットワークエラーが発生しました',
    };
  }
}

// マスターAPI: 全ての有効な同盟を取得
export async function getAllAlliances(): Promise<{ ok: boolean; alliances?: Alliance[]; error?: string }> {
  try {
    const response = await fetch(
      `${MASTER_API_URL}?action=getAlliances`
    );

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching all alliances:', error);
    return {
      ok: false,
      error: 'ネットワークエラーが発生しました',
    };
  }
}

// マスターAPI: ユーザーの同盟一覧を取得
export async function getUserAlliances(userId: string): Promise<Alliance[]> {
  try {
    console.log('getUserAlliances: userId=', userId);
    console.log('getUserAlliances: MASTER_API_URL=', MASTER_API_URL);
    
    const url = `${MASTER_API_URL}?action=getUserAlliances&userId=${encodeURIComponent(userId)}`;
    console.log('getUserAlliances: URL=', url);
    
    const response = await fetch(url);
    console.log('getUserAlliances: response status=', response.status);
    
    const data = await response.json();
    console.log('getUserAlliances: response data=', data);
    
    if (data.ok && data.alliances) {
      return data.alliances;
    } else {
      throw new Error(data.error || 'Failed to fetch alliances');
    }
  } catch (error) {
    console.error('Error fetching user alliances:', error);
    throw error;
  }
}

// AllianceAPI: マップデータ取得（マスターAPI経由）
export async function getMapData(allianceId: string, mapId: string = 'object') {
  try {
    const response = await fetch(
      `${MASTER_API_URL}?action=getMap&allianceId=${encodeURIComponent(allianceId)}&mapId=${encodeURIComponent(mapId)}`
    );

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching map data:', error);
    return {
      ok: false,
      error: 'マップデータの取得に失敗しました',
    };
  }
}

// AllianceAPI: マップデータ保存（マスターAPI経由）
export async function saveMapData(
  allianceId: string,
  mapId: string,
  objects: any[],
  meta?: any,
  actor?: string
) {
  try {
    const response = await fetch(
      `${MASTER_API_URL}?action=saveMap&allianceId=${encodeURIComponent(allianceId)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mapId,
          objects,
          meta,
          actor,
        }),
      }
    );

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error saving map data:', error);
    return {
      ok: false,
      error: 'マップデータの保存に失敗しました',
    };
  }
}

// AllianceAPI: マップ一覧取得（マスターAPI経由）
export async function getMaps(allianceId: string) {
  try {
    const response = await fetch(
      `${MASTER_API_URL}?action=getMaps&allianceId=${encodeURIComponent(allianceId)}`
    );

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching maps:', error);
    return {
      ok: false,
      error: 'マップ一覧の取得に失敗しました',
    };
  }
}

// AllianceAPI: リンク取得（マスターAPI経由）
export async function getLinks(allianceId: string) {
  try {
    const response = await fetch(
      `${MASTER_API_URL}?action=getLinks&allianceId=${encodeURIComponent(allianceId)}`
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching links:', error);
    return {
      ok: false,
      links: [],
      error: 'リンクの取得に失敗しました',
    };
  }
}
