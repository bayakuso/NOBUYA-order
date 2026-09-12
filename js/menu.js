// ======================================
// メニュー画面の描画・制御 logic
// ======================================

// メニュー取得と初期描画
function renderMenuList() {
  const listContainer = document.getElementById('menu-list');
  if (!listContainer) return;
  listContainer.innerHTML = '';
  const filtered = state.allMenus.filter(m => m.category === state.currentCategory);
  if (filtered.length === 0) {
    listContainer.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">メニューがありません。</p>';
    return;
  }
  listContainer.style.opacity = 0;
  
  filtered.forEach(item => {
    // 品切れフラグの判定（表記揺れ・型揺れを吸収）
    const isSoldOut = Boolean(
      item.is_sold_out || 
      item.is_out_of_stock || 
      item.isSoldOut || 
      item.outOfStock || 
      item.sold_out === true || 
      item.sold_out === 'true'
    );

    const card = document.createElement('div');
    // 品切れの場合は sold-out クラスを追加
    card.className = `menu-card ${isSoldOut ? 'sold-out' : ''}`;

    let imgSrc = (item.image_base64 && item.image_base64.trim() !== "" && item.image_base64 !== "undefined") ? item.image_base64 : 
                 (item.image && item.image.trim() !== "" && item.image !== "undefined") ? item.image : "";
    if (!imgSrc) imgSrc = CONFIG.NO_IMAGE_SVG;

    const qtyId = `qty-${item.menu_id}`;
    const rawOptionValue = item.options || item.option || '';
    let buttonAreaHtml = '';

    if (isSoldOut) {
      // 品切れ時は操作ボタンを非表示化（CSSの ::after で「本日品切れ」が表示されます）
      buttonAreaHtml = `<button class="add-cart-btn" disabled style="visibility:hidden;">品切れ</button>`;
    } else if (rawOptionValue && String(rawOptionValue).trim() !== '') {
      item.options = String(rawOptionValue).trim();
      buttonAreaHtml = `<button class="add-cart-btn has-option" onclick="openOptionModal('${item.menu_id}')">選択</button>`;
    } else {
      buttonAreaHtml = `
        <div class="controls-row">
          <button class="qty-btn" onclick="inlineChangeQty('${qtyId}', -1)">−</button>
          <span class="qty-display" id="${qtyId}">1</span>
          <button class="qty-btn" onclick="inlineChangeQty('${qtyId}', 1)">+</button>
          <button class="add-cart-btn" onclick="addToCart('${item.menu_id}', '${qtyId}')" style="margin-left:4px;">追加</button>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="menu-name">${item.name}</div>
      <div class="menu-body">
        <img src="${imgSrc}" class="menu-img" alt="${item.name}" onerror="this.onerror=null; this.src=CONFIG.NO_IMAGE_SVG;">
        <div class="menu-details">
          <div class="price-block">
            <div class="menu-price">${Number(item.price).toLocaleString()}</div>
          </div>
          <div class="action-block">
            ${buttonAreaHtml}
          </div>
        </div>
      </div>
    `;
    listContainer.appendChild(card);
  });
  setTimeout(() => { listContainer.style.opacity = 1; }, 50);
}

// カテゴリタブの構築
function buildCategoryBar() {
  const bar = document.getElementById('category-bar');
  if (!bar) return;
  bar.innerHTML = '';
  state.categories.forEach(cat => {
    const tab = document.createElement('div');
    tab.className = `category-tab ${state.currentCategory === cat ? 'active' : ''}`;
    tab.innerText = cat;
    tab.onclick = () => switchCategory(cat);
    bar.appendChild(tab);
  });
  scrollToActiveTab();
}

// カテゴリ切り替え
function switchCategory(cat) {
  state.currentCategory = cat;
  document.querySelectorAll('.category-tab').forEach(t => {
    if(t.innerText === cat) t.classList.add('active');
    else t.classList.remove('active');
  });
  scrollToActiveTab();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  renderMenuList();
}

// アクティブタブの位置までスクロール
function scrollToActiveTab() {
  const activeTab = document.querySelector('.category-tab.active');
  if (activeTab) activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
}

// メニューカード一覧の描画
function renderMenuList() {
  const listContainer = document.getElementById('menu-list');
  if (!listContainer) return;
  listContainer.innerHTML = '';
  const filtered = state.allMenus.filter(m => m.category === state.currentCategory);
  if (filtered.length === 0) {
    listContainer.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">メニューがありません。</p>';
    return;
  }
  listContainer.style.opacity = 0;
  
  filtered.forEach(item => {
    // 品切れフラグの判定（表記揺れ・型揺れを吸収）
    const isSoldOut = Boolean(
      item.is_sold_out || 
      item.is_out_of_stock || 
      item.isSoldOut || 
      item.outOfStock || 
      item.sold_out === true || 
      item.sold_out === 'true'
    );

    const card = document.createElement('div');
    // 品切れの場合は sold-out クラスを追加
    card.className = `menu-card ${isSoldOut ? 'sold-out' : ''}`;

    let imgSrc = (item.image_base64 && item.image_base64.trim() !== "" && item.image_base64 !== "undefined") ? item.image_base64 : 
                 (item.image && item.image.trim() !== "" && item.image !== "undefined") ? item.image : "";
    if (!imgSrc) imgSrc = CONFIG.NO_IMAGE_SVG;

    const qtyId = `qty-${item.menu_id}`;
    const rawOptionValue = item.options || item.option || '';
    let buttonAreaHtml = '';

    if (isSoldOut) {
      // 品切れ時は操作ボタンを非表示化（CSSの ::after で「本日品切れ」が表示されます）
      buttonAreaHtml = `<button class="add-cart-btn" disabled style="visibility:hidden;">品切れ</button>`;
    } else if (rawOptionValue && String(rawOptionValue).trim() !== '') {
      item.options = String(rawOptionValue).trim();
      buttonAreaHtml = `<button class="add-cart-btn has-option" onclick="openOptionModal('${item.menu_id}')">選択</button>`;
    } else {
      buttonAreaHtml = `
        <div class="controls-row">
          <button class="qty-btn" onclick="inlineChangeQty('${qtyId}', -1)">−</button>
          <span class="qty-display" id="${qtyId}">1</span>
          <button class="qty-btn" onclick="inlineChangeQty('${qtyId}', 1)">+</button>
          <button class="add-cart-btn" onclick="addToCart('${item.menu_id}', '${qtyId}')" style="margin-left:4px;">追加</button>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="menu-name">${item.name}</div>
      <div class="menu-body">
        <img src="${imgSrc}" class="menu-img" alt="${item.name}" onerror="this.onerror=null; this.src=CONFIG.NO_IMAGE_SVG;">
        <div class="menu-details">
          <div class="price-block">
            <div class="menu-price">${Number(item.price).toLocaleString()}</div>
          </div>
          <div class="action-block">
            ${buttonAreaHtml}
          </div>
        </div>
      </div>
    `;
    listContainer.appendChild(card);
  });
  setTimeout(() => { listContainer.style.opacity = 1; }, 50);
}

// 数量調整（インライン）
function inlineChangeQty(qtyId, amount) {
  const el = document.getElementById(qtyId);
  if (!el) return;
  let current = parseInt(el.innerText, 10) || 1;
  current += amount;
  if (current < 1) current = 1;
  if (current > 10) current = 10;
  el.innerText = current;
}
