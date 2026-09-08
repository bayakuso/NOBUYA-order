// ======================================
// アプリ初期化・全体イベント制御 (Main App Entry)
// ======================================

// タッチ座標保持用変数
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

// 時間文字列から HH:mm を抽出
function extractHHMM(timeStr) {
  if (!timeStr) return '';
  const match = String(timeStr).match(/([0-1]?[0-9]|2[0-3]):[0-5][0-9]/);
  if (match) {
    const parts = match[0].split(':');
    return `${String(parts[0]).padStart(2, '0')}:${String(parts[1]).padStart(2, '0')}`;
  }
  return String(timeStr);
}

// 時間文字列を分数値へ変換
function parseTimeToMinutes(timeStr) {
  const hhmm = extractHHMM(timeStr);
  if (!hhmm) return 0;
  const parts = hhmm.split(':');
  if (parts.length < 2) return 0;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

// アプリ起動時の決済初期インデックス同期
async function initCheckoutIndex() {
  try {
    const data = await apiFetchCheckoutIndex(tableId);
    const orders = data.orders || [];
    
    const urlTimeStr = urlParams.get('time') ? decodeURIComponent(urlParams.get('time')) : "";
    const urlTimeMinutes = parseTimeToMinutes(urlTimeStr);

    orders.forEach(o => {
      if (String(o.tableId).trim() === String(tableId).trim() && o.status === "会計済") {
        const idx = parseInt(o.rowIndex, 10);
        if (idx > lastCheckoutRowIndex) {
          lastCheckoutRowIndex = idx;
        }
        
        if (!isViewer && urlTimeMinutes > 0) {
          const checkedTimeMinutes = parseTimeToMinutes(o.time);
          if (checkedTimeMinutes >= urlTimeMinutes) {
            isAppDisabled = true; 
          }
        }
      }
    });
    initialOrdersChecked = true;
  } catch(e) {
    console.error("決済初期位置の同期に失敗しました:", e);
    initialOrdersChecked = true;
  }
}

// 退店済み（会計完了）子端末のロック処理
function forceLockExpiredSubDevice() {
  const lockOverlay = document.getElementById('checkout-lock-overlay');
  if (lockOverlay) {
    lockOverlay.style.display = 'flex';
    document.getElementById('lock-icon').innerText = "🛑";
    document.getElementById('lock-title').innerText = "ご利用ありがとうございました";
    document.getElementById('lock-title').style.color = "#d32f2f";
    document.getElementById('lock-body').innerHTML = "お会計が完了したため、このQRコードは無効化されました。<br>再度ご注文される場合は、卓上端末の新しいQRコードをもう一度読み取ってください。";
    document.getElementById('lock-spinner').style.display = "none";
  }
}

// ヘッダー情報ステータスバッジ更新
function updateHeaderStatusBadges() {
  const num = urlParams.get('num');
  const time = urlParams.get('time');
  if (num) {
    document.getElementById('display-guest-count').innerText = num;
    document.getElementById('display-guest-badge').style.display = 'inline-block';
  } else {
    document.getElementById('display-guest-badge').style.display = 'none';
  }
  if (time) { 
    document.getElementById('display-start-time').innerText = extractHHMM(decodeURIComponent(time)); 
    document.getElementById('display-time-badge').style.display = 'inline-block'; 
  } else { 
    document.getElementById('display-time-badge').style.display = 'none'; 
  }
}

// モバイル向けスワイプジェスチャー設定
function setupSwipeEvents() {
  const menuList = document.getElementById('menu-list');
  if (!menuList) return;

  document.addEventListener('touchstart', (e) => {
    if (typeof isModalActive === 'function' && isModalActive()) return;
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });
  
  document.addEventListener('touchmove', (e) => {
    if (typeof isModalActive === 'function' && isModalActive()) return;
    let moveX = e.changedTouches[0].screenX - touchStartX;
    let moveY = e.changedTouches[0].screenY - touchStartY;
    if (Math.abs(moveX) > Math.abs(moveY) && Math.abs(moveX) < 80) {
      menuList.style.transform = `translateX(${moveX}px)`;
      menuList.style.opacity = `${1 - Math.abs(moveX)/150}`;
    }
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (typeof isModalActive === 'function' && isModalActive()) return;
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    menuList.style.transform = '';
    menuList.style.opacity = '';
    handleSwipeGesture();
  }, { passive: true });
}

function handleSwipeGesture() {
  const deltaX = touchEndX - touchStartX;
  const deltaY = touchEndY - touchStartY;
  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 60) {
    const currentIndex = state.categories.indexOf(state.currentCategory);
    if (deltaX < 0 && currentIndex < state.categories.length - 1) switchCategory(state.categories[currentIndex + 1]);
    else if (deltaX > 0 && currentIndex > 0) switchCategory(state.categories[currentIndex - 1]);
  }
}

// 来店人数入力確定モーダル処理
function submitModalQty() {
  const guestCount = document.getElementById('modal-guest-count').value;
  const now = new Date(); 
  const timeStr = ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2);
  
  urlParams.set('num', guestCount); 
  // URLSearchParams は自動でエンコードするため、そのまま渡す（二重エンコード防止）
  urlParams.set('time', timeStr);
  
  window.history.replaceState({}, '', `${window.location.pathname}?${urlParams.toString()}`);
  updateHeaderStatusBadges();
  
  // ユーザーのボタンタップ直後なので安全に全画面化可能
  triggerMobileFullscreen();
  closeModal('customer-modal');
}

// フルスクリーン化・アドレスバー非表示要求（安全化）
function triggerMobileFullscreen() {
  if (document.fullscreenElement) return; // 既に全画面の場合は何もしない

  const docEl = document.documentElement;
  try {
    if (docEl.requestFullscreen) {
      docEl.requestFullscreen().catch(() => {});
    } else if (docEl.webkitRequestFullscreen) {
      docEl.webkitRequestFullscreen();
    } else if (docEl.mozRequestFullScreen) {
      docEl.mozRequestFullScreen();
    }
  } catch (err) {
    // ユーザー操作外の呼び出しによるエラーを黙って無視する
  }
  
  setTimeout(() => { window.scrollTo(0, 1); }, 100);
}

// 全体初期化エントリーポイント
window.onload = async () => {
  document.getElementById('display-table-id').innerText = tableId;
  
  if (isViewer) {
    document.getElementById('header-link-area').style.display = 'block';
    document.getElementById('customer-modal').style.display = 'flex'; 
  } else {
    document.getElementById('header-link-area').style.display = 'none';
  }
  
  updateHeaderStatusBadges();
  
  await initCheckoutIndex();

  if (!isViewer && initialOrdersChecked && isAppDisabled) {
    forceLockExpiredSubDevice();
    return; 
  }

  fetchMenus();
  updateCartBadge();
  setupSwipeEvents();

  // 画面の初回タップ/クリック時に安全に全画面化を試みる
  const enableFirstFullscreen = () => {
    triggerMobileFullscreen();
    window.removeEventListener('click', enableFirstFullscreen);
    window.removeEventListener('touchstart', enableFirstFullscreen);
  };
  window.addEventListener('click', enableFirstFullscreen, { once: true });
  window.addEventListener('touchstart', enableFirstFullscreen, { once: true });
};

// 卓のお会計要請・状態監視ループ
setInterval(async function() {
  if (!initialOrdersChecked || isAppDisabled) return;
  try {
    const data = await apiCheckStatus(tableId);
    const orders = data.orders || [];
    const thisTableOrders = orders.filter(o => String(o.tableId).trim() === String(tableId).trim());
    const currentOrders = thisTableOrders.filter(o => parseInt(o.rowIndex, 10) > lastCheckoutRowIndex);
    const hasCheckoutRequested = currentOrders.some(o => o.status === "会計要請");
    const hasCheckoutSettled = thisTableOrders.some(o => o.status === "会計済");
    const lockOverlay = document.getElementById('checkout-lock-overlay');
    const isCurrentlyLocked = (lockOverlay && lockOverlay.style.display === 'flex');
    
    if (hasCheckoutRequested) {
      if (!isCurrentlyLocked && lockOverlay) {
        ['cart-modal', 'history-modal', 'option-modal'].forEach(id => closeModal(id));
        lockOverlay.style.display = 'flex';
      }
      return;
    }
    if (isCurrentlyLocked && (!hasCheckoutRequested || hasCheckoutSettled)) {
      state.cart = [];
      updateCartBadge();
      if (isViewer) {
        if (lockOverlay) lockOverlay.style.display = 'none';
        window.location.href = window.location.origin + window.location.pathname + `?table=${encodeURIComponent(tableId)}&view=true`;
      } else {
        isAppDisabled = true;
        forceLockExpiredSubDevice();
      }
    }
  } catch (e) {
    console.error("決済連携監視システムエラー:", e);
  }
}, CONFIG.REFRESH_INTERVAL);
  } catch (e) {
    console.error("決済連携監視システムエラー:", e);
  }
}, CONFIG.REFRESH_INTERVAL);
