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

// ヘッダー情報ステータスバッジ更新
function updateHeaderStatusBadges() {
  const urlParams = new URLSearchParams(window.location.search);
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

// 来店人数入力確定＆画面遷移処理（全画面化＋モーダル即時消去の統一実行）
window.submitModalQty = function() {
  // 1. 人数と時間をURLにセット
  const countEl = document.getElementById('modal-guest-count');
  const guestCount = countEl ? countEl.value : "1";
  const now = new Date(); 
  const timeStr = ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2);
  
  const urlParams = new URLSearchParams(window.location.search);
  urlParams.set('num', guestCount); 
  urlParams.set('time', timeStr);
  window.history.replaceState({}, '', `${window.location.pathname}?${urlParams.toString()}`);
  
  // 2. ヘッダー表示の更新
  updateHeaderStatusBadges();

  // 3. モーダル・オーバーレイを強制非表示（display: none !important 適用）
  const custModal = document.getElementById('customer-modal');
  if (custModal) {
    custModal.setAttribute('style', 'display: none !important;');
    custModal.classList.remove('active', 'show');
  }

  // 全てのモーダル背景（オーバーレイ）要素を巡回して非表示化
  const overlays = document.querySelectorAll('.modal-overlay, .modal-backdrop');
  overlays.forEach(overlay => {
    overlay.setAttribute('style', 'display: none !important;');
    overlay.classList.remove('active', 'show');
  });

  if (typeof closeModal === 'function') {
    try { closeModal('customer-modal'); } catch (e) {}
  }
};

// HTML内の handleStartApp を安全にオーバーライド
window.handleStartApp = function() {
  // 全画面化を試行（失敗しても止めない）
  if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(() => {});
  }
  // 確定処理と画面切り替えを実行
  window.submitModalQty();
};

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

// メニュー取得〜画面描画（最優先実行）
async function loadAndRenderMenu() {
  try {
    let rawData = null;
    if (typeof apiFetchMenus === 'function') {
      rawData = await apiFetchMenus();
    } else if (typeof fetchMenus === 'function') {
      rawData = await fetchMenus();
    }

    let menus = [];
    if (Array.isArray(rawData)) {
      menus = rawData;
    } else if (rawData && Array.isArray(rawData.data)) {
      menus = rawData.data;
    } else if (rawData && Array.isArray(rawData.menus)) {
      menus = rawData.menus;
    }

    if (!menus || menus.length === 0) {
      const listContainer = document.getElementById('menu-list');
      if (listContainer) listContainer.innerHTML = '<p style="text-align:center;padding:40px;">登録されているメニューがありません。</p>';
      return;
    }

    if (typeof state !== 'undefined') {
      state.allMenus = menus.map(m => ({
        ...m,
        category: String(m.category || 'その他').trim()
      }));

      state.categories = [...new Set(state.allMenus.map(m => m.category))];
      if (!state.currentCategory || !state.categories.includes(state.currentCategory)) {
        state.currentCategory = state.categories[0];
      }
    }

    if (typeof buildCategoryBar === 'function') {
      buildCategoryBar();
    }
    if (typeof renderMenuList === 'function') {
      renderMenuList();
    }

  } catch (err) {
    console.error("メニュー描画エラー:", err);
    const listContainer = document.getElementById('menu-list');
    if (listContainer) {
      listContainer.innerHTML = '<p style="text-align:center;color:#d32f2f;padding:40px;">メニューの読み込みに失敗しました。</p>';
    }
  }
}

// ======================================
// 厨房モニター連携・リアルタイム品切れ更新リスナー
// ======================================
function applyInventoryUpdate(menuId, isSoldOut) {
  if (typeof state === 'undefined' || !state.allMenus) return;

  const targetMenu = state.allMenus.find(m => String(m.menu_id ?? m.menuId ?? m.id) === String(menuId));
  if (targetMenu) {
    // 品切れ状態プロパティの更新
    targetMenu.is_sold_out = isSoldOut;
    targetMenu.is_out_of_stock = isSoldOut;
    targetMenu.isSoldOut = isSoldOut;
    targetMenu.sold_out = isSoldOut;

    // 現在選択中のカテゴリであれば画面を即時再描画
    if (typeof renderMenuList === 'function') {
      renderMenuList();
    }
  } else {
    // キャッシュ内に該当IDがない場合はバックグラウンドで全再取得
    loadAndRenderMenu();
  }
}

// 1. BroadcastChannel 通知リスナー
try {
  const kitchenChannel = new BroadcastChannel('kitchen_inventory_channel');
  kitchenChannel.onmessage = (event) => {
    if (event.data && event.data.type === 'INVENTORY_UPDATED') {
      applyInventoryUpdate(event.data.menuId, event.data.isSoldOut);
    }
  };
} catch (e) {
  console.warn("BroadcastChannel 非対応環境です:", e);
}

// 2. localStorage 変更イベントリスナー（フォールバック検知）
window.addEventListener('storage', (event) => {
  if (event.key === 'kitchen_inventory_trigger' && event.newValue) {
    try {
      const data = JSON.parse(event.newValue);
      if (data && data.type === 'INVENTORY_UPDATED') {
        applyInventoryUpdate(data.menuId, data.isSoldOut);
      }
    } catch (e) {
      console.error("StorageEvent解析エラー:", e);
    }
  }
});

// アプリ初期化実行
(async function initApp() {
  // 1. メニューをバックグラウンド・画面裏で描画完了させる
  await loadAndRenderMenu();

  // 2. UI表示・ヘッダー更新・初期判定
  try {
    const tableEl = document.getElementById('display-table-id');
    if (tableEl && typeof tableId !== 'undefined') {
      tableEl.innerText = tableId;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const isViewer = urlParams.get('view') === 'true';
    const hasNum = urlParams.has('num');

    // 既に人数セット済みの場合はモーダルを表示しない
    const custModal = document.getElementById('customer-modal');
    if (custModal) {
      if (isViewer || !hasNum) {
        custModal.style.display = 'flex';
      } else {
        custModal.setAttribute('style', 'display: none !important;');
      }
    }

    updateHeaderStatusBadges();
    if (typeof updateCartBadge === 'function') updateCartBadge();
    setupSwipeEvents();
  } catch (e) {
    console.warn("初期化補助エラー:", e);
  }
})();
