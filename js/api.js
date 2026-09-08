// ======================================
// バックエンド (GAS) 通信処理 (API)
// ======================================

// 1. メニュー一覧を取得する
async function apiFetchMenus() {
  const response = await fetch(CONFIG.GAS_URL, {
    method: "GET",
    redirect: "follow"
  });
  if (!response.ok) {
    throw new Error(`HTTPエラー: ${response.status}`);
  }
  return await response.json();
}

// 2. 会計済みのインデックスを取得する
async function apiFetchCheckoutIndex(tableId) {
  const res = await fetch(`${CONFIG.GAS_URL}?mode=kitchen&action=history&tableId=${encodeURIComponent(tableId)}`);
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
async function apiSendBulkOrder(tableId, cart) {
  const postUrl = `${CONFIG.GAS_URL}?action=bulk_order&tableId=${encodeURIComponent(tableId)}`;
  
  const response = await fetch(postUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8' // GASのCORSプリフライト(OPTIONS)回避のためtext/plainを推奨
    },
    body: JSON.stringify({ cart: cart })
  });
  
  return await response.json();
}

// 5. お会計要請を送信する
async function apiRequestCheckout(tableId) {
  const postUrl = `${CONFIG.GAS_URL}?action=checkout&tableId=${encodeURIComponent(tableId)}`;
  const response = await fetch(postUrl, { method: 'POST' });
  return await response.json();
}

// 6. 卓の状態を定期チェック監視する
async function apiCheckStatus(tableId) {
  const res = await fetch(`${CONFIG.GAS_URL}?mode=kitchen&action=history&tableId=${encodeURIComponent(tableId)}`);
  return await res.json();
}
