// ======================================
// 注文履歴 logic
// ======================================

// 履歴モーダルを表示し、注文データを読み込む
async function openHistoryModal() {
  const container = document.getElementById('history-list-items');
  const bannerArea = document.getElementById('history-total-banner-area');
  const totalDisplay = document.getElementById('history-cumulative-total');
  const checkoutBtn = document.getElementById('checkout-action-btn');

  container.innerHTML = '<p style="text-align:center; color:#888; padding:15px 0;">最新状態を取得中...</p>';
  bannerArea.style.display = 'none';
  checkoutBtn.style.display = 'none';
  document.getElementById('history-modal').style.display = 'flex';

  try {
    const data = await apiFetchHistory(tableId);
    let currentTableOrders = (data.orders || []).filter(o => String(o.tableId).trim() === String(tableId).trim() && parseInt(o.rowIndex, 10) > lastCheckoutRowIndex);
    container.innerHTML = '';
    if (currentTableOrders.length === 0) {
      container.innerHTML = '<p style="text-align:center; color:#888; padding:15px 0;">注文履歴はありません。</p>';
      return;
    }
    let cumulativeTotal = 0;
    checkoutBtn.style.display = 'block';

    currentTableOrders.reverse().forEach((item) => {
      const row = document.createElement('div');
      row.className = 'cart-item-row';
      const cleanName = item.menuName.replace(/<br\s*\/?>/gi, '').replace(/\n/g, '').trim();
      const matchedMenu = state.allMenus.find(m => cleanName.startsWith(m.name.trim()));
      let fallbackUnitPrice = matchedMenu ? Number(matchedMenu.price) : 0;
      let parsedPrice = Number(item.price) || 0;
      const itemQty = Number(item.quantity) || 0;
      const currentStatus = String(item.status).trim();
      let statusLabel = '';

      if (currentStatus.includes('取消') || currentStatus.includes('キャンセル')) {
        statusLabel = '<span style="color: #d32f2f; font-weight: bold; background: #ffebee; padding: 2px 6px; border-radius: 3px; font-size: 0.75rem;">キャンセル</span>';
      } else {
        const unitPrice = (parsedPrice > 0) ? parsedPrice : fallbackUnitPrice;
        cumulativeTotal += (unitPrice * itemQty);
        if (currentStatus.includes('提供')) statusLabel = '<span style="color: #4caf50; font-weight: bold; background: #e8f5e9; padding: 2px 6px; border-radius: 3px; font-size: 0.75rem;">提供済</span>';
        else statusLabel = '<span style="color: #ff9800; font-weight: bold; background: #fff3e0; padding: 2px 6px; border-radius: 3px; font-size: 0.75rem;">調理中</span>';
      }

      const formattedTime = extractHHMM(item.time);

      row.innerHTML = `<div class="cart-item-info"><div class="cart-item-name">${cleanName}</div><div class="cart-item-price-label" style="margin-top:3px;">${statusLabel} <span style="color:#999; margin-left:5px;">${formattedTime}</span></div></div><div style="font-weight: bold; color: #333;">${itemQty} 点</div>`;
      container.appendChild(row);
    });
    totalDisplay.innerText = `${cumulativeTotal.toLocaleString()} 円`;
    bannerArea.style.display = 'block';
  } catch (e) {
    container.innerHTML = '<p style="text-align:center; color:red; padding:15px 0;">履歴取得失敗。</p>';
  }
}

// 会計要請の送信処理
async function requestCheckout() {
  if (!confirm("お会計を要請しますか？\n※これ以上の追加注文はできなくなります。")) return;
  const btn = document.getElementById('checkout-action-btn');
  btn.disabled = true;
  btn.innerText = "処理中...";
  try {
    const result = await apiRequestCheckout(tableId);
    if (result.status === 'success') {
      closeModal('history-modal');
      document.getElementById('checkout-lock-overlay').style.display = 'flex';
    } else {
      alert("会計処理エラー: " + result.message);
    }
  } catch (err) {
    alert("通信に失敗しました。ネットワーク環境をご確認ください。");
  } finally {
    btn.disabled = false;
    btn.innerText = "お会計に進む";
  }
}