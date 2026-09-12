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
    if (typeof apiFetchCheckoutIndex !== 'function' || typeof tableId === 'undefined') return;
    const data = await apiFetchCheckoutIndex(tableId);
    const orders = data.orders || [];
    
    const urlTimeStr = (typeof urlParams !== 'undefined' && urlParams.get('time')) ? decodeURIComponent(urlParams.get('time')) : "";
    const urlTimeMinutes = parseTimeToMinutes(urlTimeStr);

    orders.forEach(o => {
      if (String(o.tableId).trim() === String(tableId).trim() && o.status === "会計済") {
        const idx = parseInt(o.rowIndex, 10);
        if (typeof lastCheckoutRowIndex !== 'undefined' && idx > lastCheckoutRowIndex) {
          lastCheckoutRowIndex = idx;
        }
        
        if (typeof isViewer !== 'undefined' && !isViewer && urlTimeMinutes > 0) {
          const checkedTimeMinutes = parseTimeToMinutes(o.time);
          if (checkedTimeMinutes >= urlTimeMinutes) {
            if (typeof isAppDisabled !== 'undefined') isAppDisabled = true; 
          }
        }
      }
    });
    if (typeof initialOrdersChecked !== 'undefined') initialOrdersChecked = true;
  } catch(e) {
    console.error("決済初期位置の同期に失敗しました:", e);
    if (typeof initialOrdersChecked !== 'undefined') initialOrdersChecked = true;
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

// ヘッダー情報ステータスバッジ更新
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
      if (deltaX < 0 && currentIndex < state.categories.length - 1 && typeof switchCategory === 'function') switchCategory(state.categories[currentIndex + 1]);
      else if (deltaX > 0 && currentIndex > 0 && typeof switchCategory === 'function') switchCategory(state.categories[currentIndex - 1]);
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

// メニュー取得〜描画を一括実行する強力な統合関数
async function loadAndRenderMenu() {
  try {
    let rawData = null;
    if (typeof apiFetchMenus === 'function') {
      rawData = await apiFetchMenus();
    } else if (typeof fetchMenus === 'function') {
      rawData = await fetchMenus();
    }

    console.log("【通信成功】取得元データ:", rawData);

    // ネストされたオブジェクト構造を完全に抽出・分解
    let menus = [];
    if (Array.isArray(rawData)) {
      menus = rawData;
    } else if (rawData && Array.isArray(rawData.menus)) {
      menus = rawData.menus;
    } else if (rawData && Array.isArray(rawData.data)) {
      menus = rawData.data;
    } else if (rawData && rawData.data && Array.isArray(rawData.data.menus)) {
      menus = rawData.data.menus;
    }

    if (!menus || menus.length === 0) {
      console.warn("メニュー配列が空です。");
      return;
    }

    // 全メニュー保持配列へ格納
    state.allMenus = menus.map(m => ({
      ...m,
      category: String(m.category || 'その他').trim()
    }));

    // カテゴリの抽出と割り当て
    state.categories = [...new Set(state.allMenus.map(m => m.category))];
    if (!state.currentCategory || !state.categories.includes(state.currentCategory)) {
      state.currentCategory = state.categories[0];
    }

    console.log(`【描画準備完了】全${state.allMenus.length}件のメニュー, カテゴリ:`, state.categories);

    // カテゴリバーとメニューリストの画面レンダリング実行
    if (typeof buildCategoryBar === 'function') {
      buildCategoryBar();
    }
    if (typeof renderMenuList === 'function') {
      renderMenuList();
    }

  } catch (err) {
    console.error("メニュー取得・描画エラー:", err);
    const listContainer = document.getElementById('menu-list');
    if (listContainer) {
      listContainer.innerHTML = '<p style="text-align:center;color:#d32f2f;padding:40px;">データの読み込みに失敗しました。</p>';
    }
  }
}

// 全体初期化エントリーポイント
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const tableEl = document.getElementById('display-table-id');
    if (tableEl && typeof tableId !== 'undefined') {
      tableEl.innerText = tableId;
    }
    
    if (typeof isViewer !== 'undefined' && isViewer) {
      const linkArea = document.getElementById('header-link-area');
      const custModal = document.getElementById('customer-modal');
      if (linkArea) linkArea.style.display = 'block';
      if (custModal) custModal.style.display = 'flex'; 
    } else {
      const linkArea = document.getElementById('header-link-area');
      if (linkArea) linkArea.style.display = 'none';
    }
    
    updateHeaderStatusBadges();
    await initCheckoutIndex();

    if (typeof isViewer !== 'undefined' && !isViewer && typeof initialOrdersChecked !== 'undefined' && initialOrdersChecked && typeof isAppDisabled !== 'undefined' && isAppDisabled) {
      forceLockExpiredSubDevice();
      return; 
    }
  } catch (err) {
    console.error("初期化処理で例外が発生しましたが、メニュー読み込みを続行します:", err);
  }

  // メニュー読み込み・描画処理を実行
  await loadAndRenderMenu();

  if (typeof updateCartBadge === 'function') updateCartBadge();
  setupSwipeEvents();
});

// 卓のお会計要請・状態監視ループ
if (typeof CONFIG !== 'undefined' && CONFIG.REFRESH_INTERVAL) {
  setInterval(async function() {
    if (typeof initialOrdersChecked === 'undefined' || !initialOrdersChecked || (typeof isAppDisabled !== 'undefined' && isAppDisabled)) return;
    try {
      if (typeof apiCheckStatus !== 'function' || typeof tableId === 'undefined') return;
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
        if (typeof isViewer !== 'undefined' && isViewer) {
          if (lockOverlay) lockOverlay.style.display = 'none';
          window.location.href = window.location.origin + window.location.pathname + `?table=${encodeURIComponent(tableId)}&view=true`;
        } else {
          if (typeof isAppDisabled !== 'undefined') isAppDisabled = true;
          forceLockExpiredSubDevice();
        }
      }
    } catch (e) {
      console.error("決済連携監視システムエラー:", e);
    }
  }, CONFIG.REFRESH_INTERVAL);
}
