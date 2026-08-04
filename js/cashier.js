// js/cashier.js

document.addEventListener('DOMContentLoaded', () => {
  initCashier();
});

async function initCashier() {
  const tableSelect = document.getElementById('table-select');
  if (tableSelect) {
    tableSelect.addEventListener('change', (e) => {
      loadTableCheckoutData(e.target.value);
    });
  }
}

async function loadTableCheckoutData(tableId) {
  const container = document.getElementById('checkout-detail');
  const warningEl = document.getElementById('checkout-warning');
  const checkoutBtn = document.getElementById('checkout-btn');

  if (!tableId) {
    if (container) container.innerHTML = '<p class="empty-msg">卓を選択してください。</p>';
    if (checkoutBtn) checkoutBtn.disabled = true;
    return;
  }

  try {
    // APIから対象卓の全注文を取得
    const orders = await API.getOrders(tableId);

    // 1. ステータスごとの分類
    const pendingOrders = orders.filter(o => o.status === '受付' || o.status === '調理中');
    const servedOrders = orders.filter(o => o.status === '提供済');

    // 2. 未提供（調理中・受付）がある場合は会計をブロック
    if (pendingOrders.length > 0) {
      if (warningEl) {
        warningEl.textContent = `※ 未提供の注文が ${pendingOrders.length} 件あります。すべて提供完了後に会計してください。`;
        warningEl.style.display = 'block';
      }
      if (checkoutBtn) checkoutBtn.disabled = true;
    } else {
      if (warningEl) warningEl.style.display = 'none';
      if (checkoutBtn) checkoutBtn.disabled = servedOrders.length === 0;
    }

    // 3. 提供済み商品の合計金額と内訳計算
    if (servedOrders.length === 0) {
      if (container) container.innerHTML = '<p class="empty-msg">会計対象の注文（提供済）はありません。</p>';
      return;
    }

    let totalAmount = 0;
    let itemsMap = {};

    servedOrders.forEach(order => {
      totalAmount += order.totalAmount;
      order.items.forEach(item => {
        if (itemsMap[item.name]) {
          itemsMap[item.name].quantity += item.quantity;
          itemsMap[item.name].totalPrice += (item.price * item.quantity);
        } else {
          itemsMap[item.name] = {
            price: item.price,
            quantity: item.quantity,
            totalPrice: item.price * item.quantity
          };
        }
      });
    });

    // 4. 画面描画
    let html = '<ul class="checkout-item-list">';
    for (const [name, detail] of Object.entries(itemsMap)) {
      html += `
        <li class="checkout-item">
          <span class="item-name">${name}</span>
          <span class="item-qty">x${detail.quantity}</span>
          <span class="item-price">¥${detail.totalPrice.toLocaleString()}</span>
        </li>
      `;
    }
    html += '</ul>';
    html += `<div class="checkout-total">合計: <strong>¥${totalAmount.toLocaleString()}</strong></div>`;

    if (container) container.innerHTML = html;

  } catch (error) {
    console.error('会計データ読み込みエラー:', error);
    if (container) container.innerHTML = '<p class="error-msg">データの取得に失敗しました。</p>';
  }
}
