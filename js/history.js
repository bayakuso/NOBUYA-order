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
    const allOrders = data.orders || [];

    // 該当する卓の注文のみ抽出（大文字小文字・空白を許容）
    const tableOrders = allOrders.filter(o => {
      const targetTable = o.tableId || o.table || o.tableName || '';
      return String(targetTable).trim().toUpperCase() === String(tableId).trim().toUpperCase();
    });

    // 直近の「会計済」がある場合、それより後の注文のみを表示
    let lastCheckoutIndex = -1;
    tableOrders.forEach(o => {
      const st = String(o.status || o.state || '').trim();
      if (st === '会計済' || st === '会計完了') {
        const idx = parseInt(o.rowIndex || o.id || 0, 10);
        if (idx > lastCheckoutIndex) lastCheckoutIndex = idx;
      }
    });

    const activeOrders = tableOrders.filter(o => {
      const idx = parseInt(o.rowIndex || o.id || 0, 10);
      return idx > lastCheckoutIndex;
    });

    // キャンセルされた注文のみ除外（ステータスが何であれ全件表示）
    const validOrders = activeOrders.filter(o => {
      const st = String(o.status || o.state || '').trim();
      return st !== 'キャンセル' && st !== '削除';
    });

    if (validOrders.length === 0) {
      container.innerHTML = '<p style="text-align:center; color:#aaa; padding:30px 0;">ご注文履歴はありません。</p>';
      if (bannerArea) bannerArea.style.display = 'none';
      if (checkoutBtn) checkoutBtn.style.display = 'none';
      return;
    }

    // 調理未完了（調理中 / 受付 / 準備中 など）の注文が存在するか判定
    const hasUnfinishedOrders = validOrders.some(o => {
      const st = String(o.status || o.state || '').trim();
      return st === '調理中' || st === '受付' || st === '未提供' || st === '準備中' || st === '';
    });

    let cumulativeTotal = 0;
    let html = '';

    validOrders.forEach(order => {
      const price = Number(order.price || order.unitPrice || 0);
      const qty = Number(order.quantity || order.qty || order.count || 1);
      const subtotal = price * qty;

      cumulativeTotal += subtotal;

      const rawStatus = String(order.status || order.state || '受付').trim();

      // ステータスごとの表示色
      let statusColor = '#ff9800'; // 受付 / 調理中 (オレンジ)
      if (rawStatus.includes('提供') || rawStatus === '完了' || rawStatus === '済') {
        statusColor = '#4caf50'; // 提供済 (緑)
      } else if (rawStatus.includes('会計要請')) {
        statusColor = '#e91e63'; // 会計要請 (ピンク)
      } else if (rawStatus.includes('会計済')) {
        statusColor = '#9e9e9e'; // 会計済 (グレー)
      }

      const menuName = order.menuName || order.name || order.itemName || order.title || 'ご注文商品';

      html += `
        <div style="background:#fff; border:1px solid #eee; border-radius:6px; padding:10px; margin-bottom:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span style="font-weight:bold; font-size:1rem;">${menuName} × ${qty}</span>
            <span style="background:${statusColor}; color:#fff; font-size:0.75rem; padding:2px 6px; border-radius:4px; font-weight:bold;">${rawStatus}</span>
          </div>
          <div style="display:flex; justify-content:space-between; color:#666; font-size:0.85rem;">
            <span>${order.time || order.timestamp || ''}</span>
            <span style="font-weight:bold; color:#333;">${subtotal.toLocaleString()} 円</span>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

    // 合計金額の更新
    if (totalEl) totalEl.textContent = `${cumulativeTotal.toLocaleString()} 円`;
    if (bannerArea) bannerArea.style.display = 'block';

    // 会計ボタンの制御
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
    console.error('履歴取得エラー:', error);
    container.innerHTML = `
      <div style="text-align:left; color:#d32f2f; padding:15px; background:#ffebee; border-radius:6px; font-size:0.85rem; word-break:break-all;">
        <strong>【取得エラー詳細】</strong><br>
        ${error.message || error}
      </div>
    `;
  }
}
