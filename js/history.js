// js/history.js

async function renderHistory() {
  const container = document.getElementById('history-list');
  if (!container) return;

  const tableId = AppState.getTableId();
  if (!tableId) {
    container.innerHTML = '<p class="empty-msg">卓番号が設定されていません。</p>';
    return;
  }

  container.innerHTML = '<p class="loading-msg">履歴を読み込み中...</p>';

  try {
    const orders = await API.getOrders(tableId);
    
    // キャンセル以外の注文を表示対象とする
    const activeOrders = orders.filter(order => order.status !== 'キャンセル');

    if (activeOrders.length === 0) {
      container.innerHTML = '<p class="empty-msg">注文履歴はありません。</p>';
      return;
    }

    let html = '';
    activeOrders.forEach(order => {
      const statusClass = getStatusClass(order.status);
      html += `
        <div class="history-card">
          <div class="history-header">
            <span class="order-time">${order.timestamp || ''}</span>
            <span class="status-badge ${statusClass}">${order.status}</span>
          </div>
          <div class="history-items">
            ${order.items.map(item => `
              <div class="history-item">
                <span class="item-name">${item.name}</span>
                <span class="item-qty">x${item.quantity}</span>
                <span class="item-price">¥${(item.price * item.quantity).toLocaleString()}</span>
              </div>
            `).join('')}
          </div>
          <div class="history-total">
            小計: <strong>¥${order.totalAmount.toLocaleString()}</strong>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  } catch (error) {
    console.error('履歴取得エラー:', error);
    container.innerHTML = '<p class="error-msg">履歴の取得に失敗しました。</p>';
  }
}

function getStatusClass(status) {
  switch (status) {
    case '受付': return 'status-received';
    case '調理中': return 'status-cooking';
    case '提供済': return 'status-served';
    case '会計済': return 'status-paid';
    default: return '';
  }
}
