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

  container.innerHTML = '<p style="text-align:center; padding:20px;">GAS通信中...</p>';

  try {
    const gasUrl = (typeof CONFIG !== 'undefined' && CONFIG.GAS_URL) ? CONFIG.GAS_URL : '';
    if (!gasUrl) {
      container.innerHTML = '<p style="color:red; padding:20px;">CONFIG.GAS_URL が未設定です。</p>';
      return;
    }

    const res = await fetch(`${gasUrl}?mode=kitchen&action=history`);
    const textData = await res.text(); // 生のレスポンス文字列を取得

    let parsedJson = null;
    try {
      parsedJson = JSON.parse(textData);
    } catch (e) {
      // JSONでない場合（HTMLエラー画面等）
    }

    // レスポンス内容をそのまま画面に表示
    container.innerHTML = `
      <div style="text-align:left; font-family:monospace; font-size:0.75rem; background:#1e1e1e; color:#00ff00; padding:10px; border-radius:4px; overflow-x:auto; word-break:break-all;">
        <strong>【卓番号】:</strong> ${tableId}<br>
        <strong>【GASレスポンス (Raw Text)】:</strong><br>
        <pre style="white-space:pre-wrap; margin:5px 0; color:#fff;">${textData.substring(0, 1000)}</pre>
      </div>
    `;

  } catch (error) {
    container.innerHTML = `<div style="color:red; padding:10px;">通信エラー: ${error.message}</div>`;
  }
}
