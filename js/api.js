// ======================================
// バックエンド (GAS) 通信処理 (API)
// ======================================

// 1. メニュー一覧を取得する（安全抽出版）
async function apiFetchMenus() {
  const requestUrl = `${CONFIG.GAS_URL}?action=get_menus&_t=${Date.now()}`;
  const response = await fetch(requestUrl, {
    method: "GET",
    redirect: "follow"
  });
  if (!response.ok) {
    throw new Error(`HTTPエラー: ${response.status}`);
  }
  const result = await response.json();
  
  // デバッグ用ログ
  console.log("★apiFetchMenusの取得結果:", result);

  // 配列構造の分解処理（最も一般的な data -> menus -> 配列の優先順で抽出）
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.data)) return result.data;
  if (result && Array.isArray(result.menus)) return result.menus;
  if (result && Array.isArray(result.result)) return result.result;
  if (result && result.data && Array.isArray(result.data.menus)) return result.data.menus;
  
  return [];
}

// 2. 会計済みのインデックスを取得する
async function apiFetchCheckoutIndex(tableId) {
  const res = await fetch(`${CONFIG.GAS_URL}?mode=kitchen&action=history&tableId=${encodeURIComponent(tableId)}`, {
    method: "GET",
    redirect: "follow"
  });
  if (!res.ok) {
    throw new Error(`HTTPエラー: ${res.status}`);
  }
  return await res.json();
}

// 3. 注文履歴を取得する
async function apiFetchHistory(tableId) {
  const requestUrl = `${CONFIG.GAS_URL}?mode=kitchen&action=history&tableId=${encodeURIComponent(tableId)}&_t=${new Date().getTime()}`;
  const res = await fetch(requestUrl, {
    method: 'GET',
    redirect: 'follow'
  });
  if (!res.ok) throw new Error("HTTPエラー: " + res.status);
  return await res.json();
}

// 4. カートの一括注文を送信する
async function apiSendBulkOrder(tableId, cart, people) {
  const postUrl = `${CONFIG.GAS_URL}?action=bulk_order&tableId=${encodeURIComponent(tableId)}`;
  
  const response = await fetch(postUrl, {
    method: 'POST',
    mode: 'cors',                  // ★ 明示的に cors を指定
    redirect: 'follow',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8' // ★ application/json にするとタブレットで弾かれます
    },
    body: JSON.stringify({ 
      cart: cart,
      people: people
    })
  });
  
  if (!response.ok) {
    throw new Error(`注文送信失敗: HTTP ${response.status}`);
  }
  return await response.json();
}

// 5. お会計要請を送信する
async function apiRequestCheckout(tableId) {
  const postUrl = `${CONFIG.GAS_URL}?action=checkout&tableId=${encodeURIComponent(tableId)}`;
  const response = await fetch(postUrl, { 
    method: 'POST',
    redirect: 'follow'
  });
  if (!response.ok) {
    throw new Error(`HTTPエラー: ${response.status}`);
  }
  return await response.json();
}

// 6. 卓の状態を定期チェック監視する
async function apiCheckStatus(tableId) {
  const res = await fetch(`${CONFIG.GAS_URL}?mode=kitchen&action=history&tableId=${encodeURIComponent(tableId)}`, {
    method: "GET",
    redirect: "follow"
  });
  if (!res.ok) {
    throw new Error(`HTTPエラー: ${res.status}`);
  }
  return await res.json();
}
