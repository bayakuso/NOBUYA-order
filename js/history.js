// js/history.js

async function openHistoryModal() {
  const modal = document.getElementById('history-modal');
  if (modal) {
    modal.style.display = 'flex';
  }
  await renderHistory();
}

async function renderHistory() {
  const container = document.getElementById('history-list-items');
  const bannerArea = document.getElementById('history-total-banner-area');
  const totalEl = document.getElementById('history-cumulative-total');
  const checkoutBtn = document.getElementById('checkout-action-btn');

  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const tableId = params.get('table') || (typeof AppState !== 'undefined' ? AppState.getTableId() : '1');

  if (!tableId) {
    container.innerHTML = '<p style="text-align:center; color:#666; padding:20px;">卓番号が設定されていません。</p>';
    return;
  }

  container.innerHTML = '<p style="text-align:center; color:#666; padding:20px;">履歴を読み込み中...</p>';

  try {
    const gasUrl = (typeof CONFIG !== 'undefined' && CONFIG.GAS_URL) ? CONFIG.GAS_URL : '';
    if (!gasUrl) {
      throw new Error('CONFIG.GAS_URL が設定されていません。');
    }

    const res = await fetch(`${gasUrl}?mode=kitchen&action=history`);
    const data = await res.json();
    
    // orders がない場合は空配列として扱う
    const allOrders = data.orders || [];

    // 該当する卓の注文を抽出
    const tableOrders = allOrders.filter(o => {
      const targetTable = o.tableId || o.table || '';
      return String(targetTable).trim().toUpperCase() === String(tableId).trim().toUpperCase();
    });

    // 直近の会計済インデックスを特定
    let lastCheckoutIndex = -1;
    tableOrders.forEach(o => {
      const st = String(o.status || '').trim();
      if (st === '会計済') {
        const idx = parseInt(o.rowIndex || o.id || 0, 10);
        if (idx > lastCheckoutIndex) lastCheckoutIndex = idx;
      }
    });

    // 直近会計より後の有効な注文
    const activeOrders = tableOrders.filter(o => {
      const idx = parseInt(o.rowIndex || o.id || 0, 10);
      return idx > lastCheckoutIndex;
    });

    // キャンセル除外
    const validOrders = activeOrders.filter(o => {
      const st = String(o.status || '').trim();
      return st !== 'キャンセル' && st !== '削除';
    });

    if (validOrders.length === 0) {
      container.innerHTML = '<p style="text-align:center; color:#aaa; padding:30px 0;">ご注文履歴はありません。</p>';
      if (bannerArea) bannerArea.style.display = 'none';
      if (checkoutBtn) checkoutBtn.style.display = 'none';
      return;
    }

    // 未提供（「提供済」「提供」「完了」「会計済」以外のステータス）があるかチェック
    const hasUnfinishedOrders = validOrders.some(o => {
      const st = String(o.status || '').trim();
      return !(st.includes('提供') || st === '完了' || st === '会計済');
    });

    let cumulativeTotal = 0;
    let html = '';

    validOrders.forEach(order => {
      const price = Number(order.price || 0);
      const qty = Number(order.quantity || order.qty || 1);
      const subtotal = price * qty;

      cumulativeTotal += subtotal;

      const rawStatus = String(order.status || '').trim();

      let displayStatus = '調理中';
      let statusColor = '#ff9800'; // オレンジ（調理中）

      if (rawStatus.includes('提供') || rawStatus === '完了') {
        displayStatus = '提供済';
        statusColor = '#4caf50'; // 緑（提供済）
      } else if (rawStatus.includes('会計要請') || rawStatus === '会計済') {
        displayStatus = rawStatus;
        statusColor = '#e91e63';
      }

      const menuName = order.menuName || order.name || 'ご注文商品';

      html += `
        <div style="background:#fff; border:1px solid #eee; border-radius:6px; padding:10px; margin-bottom:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span style="font-weight:bold; font-size:1rem;">${menuName} × ${qty}</span>
            <span style="background:${statusColor}; color:#fff; font-size:0.75rem; padding:2px 6px; border-radius:4px; font-weight:bold;">${displayStatus}</span>
          </div>
          <div style="display:flex; justify-content:space-between; color:#666; font-size:0.85rem;">
            <span>${order.time || ''}</span>
            <span style="font-weight:bold; color:#333;">${subtotal.toLocaleString()} 円</span>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

    if (totalEl) totalEl.textContent = `${cumulativeTotal.toLocaleString()} 円`;
    if (bannerArea) bannerArea.style.display = 'block';

    if (checkoutBtn) {
      checkoutBtn.style.display = 'block';

      if (hasUnfinishedOrders) {
        checkoutBtn.disabled = true;
        checkoutBtn.style.backgroundColor = '#ccc';
        checkoutBtn.style.cursor = 'not-allowed';
        checkoutBtn.innerText = '調理中のお品物があるため会計できません';
      } else {
        checkoutBtn.disabled = false;
        checkoutBtn.style.backgroundColor = '#d32f2f';
        checkoutBtn.style.cursor = 'pointer';
        checkoutBtn.innerText = 'お会計に進む';
      }
    }

  } catch (error) {
    container.innerHTML = `<div style="color:red; padding:10px;">エラー: ${error.message}</div>`;
  }
}

// お会計リクエスト送信処理
async function requestCheckout() {
  if (!confirm("お会計を呼び出しますか？")) {
    return;
  }

  // CONFIG.GAS_URL の取得
  const targetUrl = (typeof CONFIG !== 'undefined' && CONFIG.GAS_URL) ? CONFIG.GAS_URL : '';
  if (!targetUrl) {
    alert("エラー: CONFIG.GAS_URL が設定されていません。");
    return;
  }

  // 卓番号（tableId）の取得
  const params = new URLSearchParams(window.location.search);
  const tableId = params.get('table') || (typeof AppState !== 'undefined' ? AppState.getTableId() : '1');

  try {
    // 注文履歴モーダルを閉じる
    if (typeof closeModal === 'function') {
      closeModal('history-modal');
    }

    // 会計リクエスト送信 (action=checkout)
    const response = await fetch(`${targetUrl}?action=checkout&tableId=${encodeURIComponent(tableId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    });

    const result = await response.json();

    if (result.status === "success") {
      // index.html にあるロック画面を表示
      const lockOverlay = document.getElementById('checkout-lock-overlay');
      if (lockOverlay) {
        lockOverlay.style.display = 'flex';
      } else {
        alert("お会計のリクエストを送信しました。伝票をお持ちの上、レジへお越しください。");
      }
    } else {
      alert("エラーが発生しました: " + (result.message || "送信失敗"));
    }
  } catch (error) {
    console.error("Checkout Error:", error);
    alert("通信エラーが発生しました。");
  }
}
