// ======================================
// カート管理 logic
// ======================================

// カートへの追加処理（簡易呼び出し）
function addToCart(menuId, qtyId) {
  const item = state.allMenus.find(m => m.menu_id == menuId);
  const qtyEl = document.getElementById(qtyId);
  const qty = parseInt(qtyEl ? qtyEl.innerText : "1", 10) || 1;
  
  if (item) {
    executeAddToCart(item, qty, null);
  }
  if (qtyEl) qtyEl.innerText = 1;
}

// カート追加実行処理
function executeAddToCart(item, qty, optionText) {
  const finalName = optionText ? `${item.name} [${optionText}]` : item.name;
  const existing = state.cart.find(c => c.name === finalName);
  
  if (existing) {
    existing.quantity += Number(qty);
  } else {
    state.cart.push({
      menu_id: item.menu_id,
      name: finalName,
      price: Number(item.price),
      quantity: Number(qty)
    });
  }
  updateCartBadge();
}

// 下部カートバッジの表示更新
function updateCartBadge() {
  const totalQty = state.cart.reduce((sum, c) => sum + c.quantity, 0);
  const badge = document.getElementById('cart-badge-count');
  if (badge) {
    if (totalQty > 0) {
      badge.innerText = totalQty;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }
}

// カートモーダルの表示更新
function openCartModal() {
  const container = document.getElementById('cart-list-items');
  const btn = document.getElementById('send-order-btn');
  
  if (container) container.innerHTML = '';
  
  // ボタン状態の初期化（前回の送信中テキスト等をリセット）
  if (btn) {
    btn.innerText = "注文を確定する";
  }

  if (state.cart.length === 0) {
    if (container) {
      container.innerHTML = '<p style="text-align:center;color:#999;padding:20px 0;">カートは空です。</p>';
    }
    if (btn) btn.disabled = true;
  } else {
    if (btn) btn.disabled = false;
    if (container) {
      state.cart.forEach((item, idx) => {
        const row = document.createElement('div');
        row.className = 'cart-item-row';
        row.innerHTML = `
          <div class="cart-item-info">
            <div class="cart-item-name">${item.name}</div>
            <div class="cart-item-price-label">${item.price.toLocaleString()}円 × ${item.quantity}</div>
          </div>
          <button onclick="removeFromCart(${idx})" style="color:#d32f2f; background:none; border:none; font-weight:bold; cursor:pointer;">取消</button>
        `;
        container.appendChild(row);
      });
    }
  }
  
  const cartModal = document.getElementById('cart-modal');
  if (cartModal) cartModal.style.display = 'flex';
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
  
  if (!state.cart || state.cart.length === 0) {
    if (typeof showCustomToast === 'function') {
      showCustomToast(false, 'カートエラー', 'カートの中に商品がありません。');
    }
    return;
  }

  // 送信中の表示制御
  if (btn) {
    btn.disabled = true;
    btn.innerText = "送信中...";
  }

  try {
    const result = await apiSendBulkOrder(tableId, state.cart);
    
    if (result && result.status === 'success') {
      if (typeof showCustomToast === 'function') {
        showCustomToast(true, 'ご注文を承りました', '厨房へ伝票を送信しました。');
      }
      // 送信成功時にカートを空にする
      state.cart = [];
      updateCartBadge();
      
      if (typeof closeModal === 'function') {
        closeModal('cart-modal');
      }
    } else {
      const errorMsg = (result && result.message) ? result.message : '注文の処理に失敗しました。';
      if (typeof showCustomToast === 'function') {
        showCustomToast(false, '注文エラー', errorMsg);
      }
    }
  } catch (err) {
    console.error("注文送信エラー:", err);
    if (typeof showCustomToast === 'function') {
      showCustomToast(false, '通信失敗', 'ネットワーク環境をご確認ください。');
    }
  } finally {
    // 成功・失敗・例外発生を問わず、必ずボタンの表示と状態を元に戻す
    if (btn) {
      btn.innerText = "注文を確定する";
      btn.disabled = (state.cart.length === 0);
    }
  }
}
