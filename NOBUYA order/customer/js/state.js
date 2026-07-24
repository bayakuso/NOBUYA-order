// ======================================
// アプリの状態管理 (State)
// ======================================

// URLパラメータからの情報取得
const urlParams = new URLSearchParams(window.location.search);
const tableId = urlParams.get('table') || 'A';
const isViewer = urlParams.get('view') === 'true';

// 滞在・会計監視フラグ
let lastCheckoutRowIndex = -1;
let isAppDisabled = false;
let initialOrdersChecked = false;

// アプリ内部ステート（メニュー・カテゴリ・カート情報）
let state = {
  allMenus: [],
  categories: [],
  currentCategory: '',
  cart: []
};

// 操作系ステート
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
let currentModalQty = 1;