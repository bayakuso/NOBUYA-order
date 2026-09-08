// ======================================
// アプリ初期化・全体イベント制御 (Main App Entry)
// ======================================

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
    const iconEl = document.getElementById('lock-icon');
    const titleEl = document.getElementById('lock-title');
    const bodyEl = document.getElementById('lock-body');
    const spinnerEl = document.getElementById('lock-spinner');
    
    if (iconEl) iconEl.innerText = "🛑";
    if (titleEl) {
      titleEl.innerText = "ご利用ありがとうございました";
      titleEl.style.color = "#d32f2f";
    }
    if (bodyEl) {
      bodyEl.innerHTML = "お会計が完了したため、このQRコードは無効化されました。<br>再度ご注文される場合は、卓上端末の新しいQRコードをもう一度読み取ってください。";
    }
    if (spinnerEl) spinnerEl.style.display = "none";
  }
}

// ヘッダー情報ステータスバッジ更新（安全化版）
function updateHeaderStatusBadges() {
  if (typeof urlParams === 'undefined') return;

  const num = urlParams.get('num');
  const time = urlParams.get('time');

  const guestBadge = document.getElementById('display-guest-badge');
  const guestCountEl = document.getElementById('display-guest-count');
  if (num && guestBadge && guestCountEl) {
    guestCountEl.innerText = num;
    guestBadge.style.display = 'inline-block';
  } else if (guestBadge) {
    guestBadge.style.display = 'none';
  }

  const timeBadge = document.getElementById('display-time-badge');
  const startTimeEl = document.getElementById('display-start-time');
  if (time && timeBadge && startTimeEl) { 
    startTimeEl.innerText = extractHHMM(decodeURIComponent(time)); 
    timeBadge.style.display = 'inline-block'; 
  } else if (timeBadge) { 
    timeBadge.style.display = 'none'; 
  }
}

// モバイル向けスワイプジェスチャー設定
function setupSwipeEvents() {
  const menuList = document.getElementById('menu-list');
  if (!menuList) return;

  document.addEventListener('touchstart', (e) => {
    if (typeof isModalActive === 'function' && isModalActive()) return;
    window.touchStartX = e.changedTouches[0].screenX;
    window.touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });
  
  document.addEventListener('touchmove', (e) => {
    if (typeof isModalActive === 'function' && isModalActive()) return;
    let moveX = e.changedTouches[0].screenX - (window.touchStartX || 0);
    let moveY = e.changedTouches[0].screenY - (window.touchStartY || 0);
    if (Math.abs(moveX) > Math.abs(moveY) && Math.abs(moveX) < 80) {
      menuList.style.transform = `translateX(${moveX}px)`;
      menuList.style.opacity = `${1 - Math.abs(moveX)/150}`;
    }
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (typeof isModalActive === 'function' && isModalActive()) return;
    window.touchEndX = e.changedTouches[0].screenX;
    window.touchEndY = e.changedTouches[0].screenY;
    menuList.style.transform = '';
    menuList.style.opacity = '';
    handleSwipeGesture();
  }, { passive: true });
}

function handleSwipeGesture() {
  const deltaX = (window.touchEndX || 0) - (window.touchStartX || 0);
  const deltaY = (window.touchEndY || 0) - (window.touchStartY || 0);
  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 60) {
    if (typeof state !== 'undefined' && state.categories) {
      const currentIndex = state.categories.indexOf(state.currentCategory);
      if (deltaX < 0 && currentIndex < state.categories.length - 1) switchCategory(state.categories[currentIndex + 1]);
      else if (deltaX > 0 && currentIndex > 0) switchCategory(state.categories[currentIndex - 1]);
    }
  }
}

// 来店人数入力確定モーダル処理
function submitModalQty() {
  const countEl = document.getElementById('modal-guest-count');
  const guestCount = countEl ? countEl.value : "1";
  const now = new Date(); 
  const timeStr = ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2);
  
  if (typeof urlParams !== 'undefined') {
    urlParams.set('num', guestCount); 
    urlParams.set('time', timeStr);
    window.history.replaceState({}, '', `${window.location.pathname}?${urlParams.toString()}`);
  }
  
  updateHeaderStatusBadges();
  if (typeof closeModal === 'function') closeModal('customer-modal');
}

// フルスクリーン化・アドレスバー非表示要求（ボタン押下等の操作時のみ呼び出し）
function triggerMobileFullscreen() {
  if (document.fullscreenElement) return;

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
    // 画面操作外でのエラーを無視
  }
  
  setTimeout(() => { window.scrollTo(0, 1); }, 100);
}

// 全体初期化エントリーポイント
window.onload = async () => {
  // エラー発生有無に関わらず確実にメニューを取得する
  try {
    if (typeof apiFetchMenus === 'function') {
      const menus = await apiFetchMenus();
      if (menus && menus.length > 0) {
        // もし UI 描画用の関数 (例: renderMenuList や renderCategory) がある場合はここで呼ぶ
        if (typeof renderMenuList === 'function') {
          renderMenuList(menus);
        } else if (typeof renderCategory === 'function') {
          renderCategory(menus);
        } else if (typeof state !== 'undefined') {
          state.menus = menus;
          if (typeof renderMenu === 'function') renderMenu();
        }
      } else {
        console.warn("取得したメニューデータが空です");
      }
    } else if (typeof fetchMenus === 'function') {
      fetchMenus();
    } else {
      console.error("apiFetchMenus または fetchMenus 関数が見つかりません。");
    }
  } catch (menuErr) {
    console.error("メニュー取得処理中にエラーが発生しました:", menuErr);
  }

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
        ['cart-modal', 'history-modal', 'option-modal'].forEach(id => {
          if (typeof closeModal === 'function') closeModal(id);
        });
        lockOverlay.style.display = 'flex';
      }
      return;
    }
    if (isCurrentlyLocked && (!hasCheckoutRequested || hasCheckoutSettled)) {
      if (typeof state !== 'undefined') state.cart = [];
      if (typeof updateCartBadge === 'function') updateCartBadge();
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
