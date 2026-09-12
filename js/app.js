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

// メニュー取得〜画面描画（最優先実行）
async function loadAndRenderMenu() {
  console.log("【開始】メニュー取得処理をスタートします...");
  try {
    let rawData = null;
    if (typeof apiFetchMenus === 'function') {
      rawData = await apiFetchMenus();
    } else if (typeof fetchMenus === 'function') {
      rawData = await fetchMenus();
    }

    console.log("【取得データ受信】:", rawData);

    // 配列データの強力な自動抽出
    let menus = [];
    if (Array.isArray(rawData)) {
      menus = rawData;
    } else if (rawData && Array.isArray(rawData.data)) {
      menus = rawData.data;
    } else if (rawData && Array.isArray(rawData.menus)) {
      menus = rawData.menus;
    }

    if (!menus || menus.length === 0) {
      console.warn("メニューデータが空です。");
      const listContainer = document.getElementById('menu-list');
      if (listContainer) listContainer.innerHTML = '<p style="text-align:center;padding:40px;">登録されているメニューがありません。</p>';
      return;
    }

    // グローバルstateのセット
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

    // 画面レンダリング実行
    if (typeof buildCategoryBar === 'function') {
      buildCategoryBar();
    }
    if (typeof renderMenuList === 'function') {
      renderMenuList();
    }
    console.log("【完了】メニューの描画処理が正常に完了しました。");

  } catch (err) {
    console.error("【エラー】メニュー取得・描画中に例外が発生しました:", err);
    const listContainer = document.getElementById('menu-list');
    if (listContainer) {
      listContainer.innerHTML = '<p style="text-align:center;color:#d32f2f;padding:40px;">メニューの読み込みに失敗しました。</p>';
    }
  }
}

// 即時起動関数（他の初期化に依存せず即座に読み込みを開始）
(async function initApp() {
  // 1. 最優先でメニューを表示
  await loadAndRenderMenu();

  // 2. UI表示・ヘッダー更新
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
    }

    updateHeaderStatusBadges();
    if (typeof updateCartBadge === 'function') updateCartBadge();
    setupSwipeEvents();
  } catch (e) {
    console.warn("補助UIの初期化エラー（画面表示には影響なし）:", e);
  }
})();
