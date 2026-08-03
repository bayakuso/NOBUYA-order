// ======================================
// モーダル・ダイアログ管理 logic
// ======================================

// モーダルを閉じる汎用関数
function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

// モーダルが開いているかの確認
function isModalActive() {
  return ['customer-modal', 'cart-modal', 'history-modal', 'option-modal', 'phone-link-modal', 'wifi-prompt-modal', 'toast-popup', 'checkout-lock-overlay'].some(id => {
    const el = document.getElementById(id);
    return el && el.style.display === 'flex';
  });
}

// オプションモーダルの数量変更
function changeModalQty(amount) {
  currentModalQty += amount;
  if (currentModalQty < 1) currentModalQty = 1;
  if (currentModalQty > 10) currentModalQty = 10;
  document.getElementById('modal-qty-val').innerText = currentModalQty;
}

// オプション選択モーダルを開く
function openOptionModal(menuId) {
  const item = state.allMenus.find(m => m.menu_id == menuId);
  currentModalQty = 1;
  const modal = document.getElementById('option-modal');
  modal.querySelector('.option-title').innerText = `${item.name} の選択`;
  document.getElementById('modal-qty-val').innerText = currentModalQty;
  const container = document.getElementById('option-container-list');
  container.innerHTML = '';
  item.options.split(/[,、\s]+/).forEach((opt, idx) => {
    const trimmed = opt.trim();
    if (!trimmed) return;
    const lbl = document.createElement('label');
    lbl.className = 'option-label';
    lbl.innerHTML = `<input type="radio" name="menu-option-radio" value="${trimmed}" ${idx === 0 ? 'checked' : ''}> ${trimmed}`;
    container.appendChild(lbl);
  });
  document.getElementById('option-confirm-submit-btn').onclick = () => {
    executeAddToCart(item, currentModalQty, document.querySelector('input[name="menu-option-radio"]:checked').value);
    closeModal('option-modal');
  };
  modal.style.display = 'flex';
}

// グローバル スマホ連携QRコード表示
function openGlobalPhoneLinkModal() {
  const modal = document.getElementById('phone-link-modal');
  const canvas = document.getElementById('modal-qr-canvas');
  if (!canvas) return;
  canvas.innerHTML = '';
  const currentUrlParams = new URLSearchParams(window.location.search);
  const targetUrl = `${window.location.origin}${window.location.pathname}?table=${encodeURIComponent(tableId)}&num=${encodeURIComponent(currentUrlParams.get('num')||'1')}&time=${encodeURIComponent(currentUrlParams.get('time')||'')}`;
  try {
    new QRCode(canvas, { text: targetUrl, width: 200, height: 200, colorDark : "#000000", colorLight : "#ffffff", correctLevel : QRCode.CorrectLevel.M });
    const qrImg = canvas.querySelector('img');
    if (qrImg) { qrImg.style.margin = "0 auto"; qrImg.style.display = "block"; qrImg.style.width = "100%"; qrImg.style.height = "auto"; }
    modal.style.display = 'flex';
  } catch(e) {
    canvas.innerHTML = '<p style="text-align:center; color:red; padding:10px;">QRコードの生成に失敗しました。</p>';
  }
}

// Wi-Fi案内モーダルへ移行
function closeAndPromptWifi() {
  closeModal('phone-link-modal');
  document.getElementById('wifi-prompt-modal').style.display = 'flex';
}

// トースト通知を表示する
function showCustomToast(isSuccess, title, message) {
  const overlay = document.getElementById('toast-popup');
  const iconArea = document.getElementById('toast-icon-area');
  document.getElementById('toast-title-area').innerText = title;
  document.getElementById('toast-msg-area').innerText = message;
  if (isSuccess) {
    iconArea.innerHTML = "🍵";
    iconArea.style.color = "#4caf50";
  } else {
    iconArea.innerHTML = "⚠️";
    iconArea.style.color = "#d32f2f";
  }
  overlay.style.display = 'flex';
  setTimeout(() => { overlay.style.display = 'none'; }, 2500);
}