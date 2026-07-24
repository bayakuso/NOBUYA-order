// ======================================
// アプリ全体の定数・設定値
// ======================================
const CONFIG = {
  // バックエンド (GAS) のエンドポイントURL
  GAS_URL: "https://script.google.com/macros/s/AKfycbzvd7how1B-d5vKnCtPKSxqSpwyx-pZsHwOv6tm1YFHOt-HTuhXnaMrnoTJ6Wrx75nv9w/exec",
  
  // ポーリング（自動更新）の間隔（ミリ秒）
  REFRESH_INTERVAL: 5000,

  // 画像がない場合の代替ダミーSVGデータ
  NO_IMAGE_SVG: "data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22300%22 viewBox=%220 0 400 300%22><rect width=%22400%22 height=%22300%22 fill=%22%23e0e0e0%22/><text x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23888888%22 font-family=%22sans-serif%22 font-size=%2224%22 font-weight=%22bold%22>No Image</text></svg>"
};