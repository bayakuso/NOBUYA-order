// js/history.js

async function openHistoryModal() {
  const modal = document.getElementById('history-modal');
  if (modal) {
    modal.style.display = 'flex';
  }
  await renderHistory();
}

async function renderHistory() {
  const container = document.getElementById('history-list-items');
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const tableId = params.get('table') || (typeof AppState !== 'undefined' ? AppState.getTableId() : '1');

  container.innerHTML = '<p style="text-align:center; padding:20px;">データ解析中...</p>';

  try {
    const gasUrl = (typeof CONFIG !== 'undefined' && CONFIG.GAS_URL) ? CONFIG.GAS_URL : '';
    const res = await fetch(`${gasUrl}?mode=kitchen&action=history`);
    const data = await res.json();

    // 受信した生のデータをそのまま画面にテキスト出力
    container.innerHTML = `
      <div style="text-align:left; font-family:monospace; font-size:0.75rem; background:#f5f5f5; padding:10px; border-radius:4px; overflow-x:auto; word-break:break-all;">
        <strong>【現在認識している卓番号】:</strong> ${tableId}<br><br>
        <strong>【GASから返ってきた生データ (先頭3件)】:</strong><br>
        <pre style="white-space:pre-wrap; margin:5px 0;">${JSON.stringify(data.orders ? data.orders.slice(0, 3) : data, null, 2)}</pre>
      </div>
    `;

  } catch (error) {
    container.innerHTML = `<div style="color:red; padding:10px;">エラー: ${error.message}</div>`;
  }
}
