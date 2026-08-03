// ======================================
// カート管理 logic
// ======================================

// カートへの追加処理（簡易呼び出し）
function addToCart(menuId, qtyId) {
  const item = state.allMenus.find(m => m.menu_id == menuId);
  const qty = parseInt(document.getElementById(qtyId).innerText, 10) || 1;
  executeAddToCart(item, qty, null);
  document.getElementById(qtyId).innerText = 1;
}

// カート追加実行処理
function executeAddToCart(item, qty, optionText) {
  const finalName = optionText ? `${item.name} [${optionText}]` : item.name;
  const existing = state.cart.find(c => c.name === finalName);
  if (existing) existing.quantity += Number(qty);
  else state.cart.push({ menu_id: item.menu_id, name: finalName, price: Number(item.price), quantity: Number(qty) });
  updateCartBadge();
}

// 下部カートバッジの表示更新
function updateCartBadge() {
  const totalQty = state.cart.reduce((sum, c) => sum + c.quantity, 0);
  const badge = document.getElementById('cart-badge-count');
  if (totalQty > 0) {
    badge.innerText = totalQty;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

// カートモーダルの表示更新
function openCartModal() {
  const container = document.getElementById('cart-list-items');
  container.innerHTML = '';
  if (state.cart.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:#999;padding:20px 0;">カートは空です。</p>';
    document.getElementById('send-order-btn').disabled = true;
  } else {
    document.getElementById('send-order-btn').disabled = false;
    state.cart.forEach((item, idx) => {
      const row = document.createElement('div');
      row.className = 'cart-item-row';
      row.innerHTML = `<div class="cart-item-info"><div class="cart-item-name">${item.name}</div><div class="cart-item-price-label">${item.price.toLocaleString()}円 × ${item.quantity}</div></div><button onclick="removeFromCart(${idx})" style="color:#d32f2f; background:none; border:none; font-weight:bold;">取消</button>`;
      container.appendChild(row);
    });
  }
  document.getElementById('cart-modal').style.display = 'flex';
}

// カートから商品を削除
function removeFromCart(idx) {
  state.cart.splice(idx, 1);
  updateCartBadge();
  openCartModal();
}

// 一括注文送信処理
async function sendBulkOrder() {
  const btn = document.getElementById('send-order-btn');
  btn.disabled = true;
  btn.innerText = "送信中...";
  try {
    const result = await apiSendBulkOrder(tableId, state.cart);
    if (result.status === 'success') {
      showCustomToast(true, 'ご注文を承りました', '厨房へ伝票を送信しました。');
      state.cart = [];
      updateCartBadge();
      closeModal('cart-modal');
    } else {
      showCustomToast(false, '注文エラー', result.message);
      btn.disabled = false;
      btn.innerText = "注文を確定する";
    }
  } catch (err) {
    showCustomToast(false, '通信失敗', 'ネットワーク環境をご確認ください。');
    btn.disabled = false;
    btn.innerText = "注文を確定する";
  }
}