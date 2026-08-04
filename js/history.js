// js/history.js

// 注文履歴モーダルを開く関数
async function openHistoryModal() {
  const modal = document.getElementById('history-modal');
  if (modal) {
    modal.style.display = 'flex';
  }
  await renderHistory();
}

// 注文履歴の描画処理
async function renderHistory() {
  const container = document.getElementById('history-list-items');
  const bannerArea = document.getElementById('history-total-banner-area');
  const totalEl = document.getElementById('history-cumulative-total');
  const checkoutBtn = document.getElementById('checkout-action-btn');

  if (!container) return;

  const tableId = typeof AppState !== 'undefined' ? AppState.getTableId() : (new URLSearchParams(window.location.search)).get('table');
  if (!tableId) {
    container.innerHTML = '<p style="text-align:center; color:#666; padding:20px;">卓番号が設定されていません。</p>';
    return;
  }

  container.innerHTML = '<p style="text-align:center; color:#666; padding:20px;">履歴を読み込み中...</p>';

  try {
    // API経由で注文履歴を取得
    const orders = await API.getOrders(tableId);

    // キャンセル以外の注文を対象にする
    const validOrders = orders.filter(o => o.status !== 'キャンセル');

    if (validOrders.length === 0) {
      container.innerHTML = '<p style="text-align:center; color:#aaa; padding:30px 0;">ご注文履歴はありません。</p>';
      if (bannerArea) bannerArea.style.display = 'none';
      if (checkoutBtn) checkoutBtn.style.display = 'none';
      return;
    }

    let cumulativeTotal = 0;
    let html = '';

    validOrders.forEach(order => {
      const price = Number(order.price) || 0;
      const qty = Number(order.quantity) || 1;
      const subtotal = price * qty;

      // 提供済み、または受付中・調理中のものを合計に反映
      if (order.status !== '会計要請') {
        cumulativeTotal += subtotal;
      }

      let statusColor = '#ff9800'; // 調理中/受付
      if (order.status === '提供済') statusColor = '#4caf50';
      if (order.status === '会計済') statusColor = '#9e9e9e';

      html += `
        <div style="background:#fff; border:1px solid #eee; border-radius:6px; padding:10px; margin-bottom:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span style="font-weight:bold; font-size:1rem;">${order.menuName || order.name} × ${qty}</span>
            <span style="background:${statusColor}; color:#fff; font-size:0.75rem; padding:2px 6px; border-radius:4px; font-weight:bold;">${order.status}</span>
          </div>
          <div style="display:flex; justify-content:space-between; color:#666; font-size:0.85rem;">
            <span>${order.time || ''}</span>
            <span style="font-weight:bold; color:#333;">${subtotal.toLocaleString()} 円</span>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

    // 合計金額表示と会計ボタンの制御
    if (totalEl) totalEl.textContent = `${cumulativeTotal.toLocaleString()} 円`;
    if (bannerArea) bannerArea.style.display = 'block';
    if (checkoutBtn) checkoutBtn.style.display = 'block';

  } catch (error) {
    console.error('履歴取得エラー:', error);
    container.innerHTML = '<p style="text-align:center; color:#d32f2f; padding:20px;">履歴の取得に失敗しました。</p>';
  }
}
