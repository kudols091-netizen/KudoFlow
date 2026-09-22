/**
 * flow-launcher.js — Nút nổi mở KudoToolAI ngay trên trang Google Flow.
 *
 * Lý do tồn tại: KudoToolAI dùng Side Panel của Chrome, chỉ mở được bằng phím tắt
 * Alt+S hoặc bấm icon extension trên thanh công cụ — người dùng mới gần như không
 * biết. File này chèn một nút nổi vào chính trang Flow để mở panel bằng 1 cú bấm.
 *
 * Thiết kế:
 *   - Shadow DOM: cô lập hoàn toàn khỏi CSS của Flow (Angular), tránh giẫm chân nhau.
 *   - Kéo thả được, nhớ vị trí qua localStorage, tự kẹp lại trong viewport khi resize.
 *   - Phân biệt click và drag bằng ngưỡng di chuyển, để kéo xong không mở nhầm panel.
 *   - Tự gắn lại nếu Angular bỏ node khỏi <body> khi điều hướng SPA.
 *   - Icon là SVG inline, KHÔNG dùng file trong icons/ — nếu dùng file thì phải khai
 *     báo thêm web_accessible_resources, mà trang mới fetch được.
 *
 * Bấm nút → gửi message 'openSidePanelFromTab' → background gọi chrome.sidePanel.open().
 * Background PHẢI gọi open() ngay lập tức, không await gì trước đó, nếu không Chrome
 * coi như mất user gesture và từ chối mở.
 */
(function () {
  'use strict';

  const HOST_ID = 'kudotoolai-flow-launcher';
  const POS_KEY = 'kudotoolai_launcher_pos';
  const BTN_SIZE = 46;
  const MARGIN = 16;
  const DRAG_THRESHOLD = 4; // px — dưới ngưỡng này coi là click, không phải kéo

  // Tránh chèn 2 lần khi content script chạy lại (SPA navigate, re-inject thủ công)
  if (window.__kudoFlowLauncherLoaded) return;
  window.__kudoFlowLauncherLoaded = true;

  let hostEl = null;

  function clamp(v, min, max) {
    return Math.min(Math.max(v, min), max);
  }

  function loadPos() {
    try {
      const raw = localStorage.getItem(POS_KEY);
      if (!raw) return null;
      const p = JSON.parse(raw);
      if (typeof p?.x === 'number' && typeof p?.y === 'number') return p;
    } catch (_) { /* localStorage bị chặn hoặc JSON hỏng → dùng vị trí mặc định */ }
    return null;
  }

  function savePos(x, y) {
    try {
      localStorage.setItem(POS_KEY, JSON.stringify({ x, y }));
    } catch (_) { /* không lưu được thì thôi, không ảnh hưởng chức năng */ }
  }

  function defaultPos() {
    // Mặc định: mép phải, hơi cao hơn giữa màn hình — tránh panel tiến độ của
    // extension khác thường nằm ở góc dưới phải.
    return {
      x: window.innerWidth - BTN_SIZE - MARGIN,
      y: Math.round(window.innerHeight * 0.42),
    };
  }

  function applyPos(x, y) {
    const maxX = window.innerWidth - BTN_SIZE - MARGIN;
    const maxY = window.innerHeight - BTN_SIZE - MARGIN;
    const cx = clamp(x, MARGIN, Math.max(MARGIN, maxX));
    const cy = clamp(y, MARGIN, Math.max(MARGIN, maxY));
    hostEl.style.left = cx + 'px';
    hostEl.style.top = cy + 'px';
    return { x: cx, y: cy };
  }

  /**
   * Sau khi reload extension ở trang quản lý tiện ích, mọi content script đã chèn vào
   * các tab đang mở sẽ mất kết nối ("Extension context invalidated"). Chúng không tự
   * hồi phục — bắt buộc phải tải lại trang.
   *
   * Chrome xoá luôn chrome.runtime.id khi context chết, nên đây là cách kiểm tra rẻ
   * và chắc chắn, không cần chờ sendMessage ném lỗi.
   */
  function contextConHieuLuc() {
    try { return !!(chrome && chrome.runtime && chrome.runtime.id); } catch (_) { return false; }
  }

  /**
   * Chuyển nút sang trạng thái "cần tải lại trang": đổi màu hổ phách, đổi tooltip,
   * và từ đó bấm nút sẽ F5 thay vì cố mở side panel (việc chắc chắn thất bại).
   */
  function danhDauCanTaiLai(btn) {
    if (btn.classList.contains('stale')) return;
    btn.classList.add('stale');
    const tip = btn.parentNode?.querySelector?.('.tip');
    if (tip) tip.innerHTML = 'Cần tải lại trang <small>bấm để F5</small>';
    btn.setAttribute('aria-label', 'Tải lại trang để kết nối lại KudoToolAI');
    console.warn('[KudoToolAI] Extension vừa được tải lại — trang này cần F5 để kết nối lại.');
  }

  function openSidePanel(btn) {
    // Nút đang ở trạng thái hỏng → bấm là tải lại trang.
    if (btn.classList.contains('stale')) {
      location.reload();
      return;
    }
    if (!contextConHieuLuc()) {
      danhDauCanTaiLai(btn);
      flash(btn, false);
      return;
    }
    try {
      chrome.runtime.sendMessage({ action: 'openSidePanelFromTab' }, (resp) => {
        // lastError phải đọc để Chrome không log "Unchecked runtime.lastError"
        const err = chrome.runtime.lastError;
        if (err || !resp?.success) {
          const msg = err?.message || resp?.error || '';
          if (/context invalidated|receiving end does not exist/i.test(msg)) {
            danhDauCanTaiLai(btn);
          } else {
            console.warn('[KudoToolAI] Không mở được side panel:', msg);
          }
          flash(btn, false);
        } else {
          flash(btn, true);
        }
      });
    } catch (e) {
      danhDauCanTaiLai(btn);
      flash(btn, false);
    }
  }

  function flash(btn, ok) {
    btn.classList.remove('ok', 'err');
    // reflow để animation chạy lại được khi bấm liên tiếp
    void btn.offsetWidth;
    btn.classList.add(ok ? 'ok' : 'err');
    setTimeout(() => btn.classList.remove('ok', 'err'), 600);
  }

  function build() {
    if (document.getElementById(HOST_ID)) return;

    hostEl = document.createElement('div');
    hostEl.id = HOST_ID;
    // Chỉ style tối thiểu ở host; phần còn lại nằm trong shadow root.
    hostEl.style.cssText = [
      'position:fixed',
      'z-index:2147483646', // dưới overlay của DevTools, trên mọi thứ của Flow
      'width:' + BTN_SIZE + 'px',
      'height:' + BTN_SIZE + 'px',
      'margin:0', 'padding:0', 'border:0',
      'color-scheme:normal',
    ].join(';');

    const root = hostEl.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <style>
        :host, * { box-sizing: border-box; }
        .btn {
          width: ${BTN_SIZE}px;
          height: ${BTN_SIZE}px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.22);
          background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
          box-shadow: 0 4px 14px rgba(0,0,0,0.38), 0 0 0 0 rgba(59,130,246,0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: grab;
          user-select: none;
          -webkit-user-select: none;
          transition: transform .16s ease, box-shadow .16s ease;
          font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        }
        .btn:hover { transform: scale(1.08); box-shadow: 0 6px 20px rgba(0,0,0,0.45); }
        .btn:active { cursor: grabbing; transform: scale(0.96); }
        .btn.dragging { cursor: grabbing; transform: scale(1.04); }
        .btn.ok  { animation: pulse-ok .6s ease; }
        .btn.err { animation: shake .45s ease; }
        /* Extension vừa reload → content script này đã mất kết nối, bấm sẽ F5 */
        .btn.stale { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
        .btn.stale .glyph::after {
          content: '↻';
          position: absolute;
          margin-left: 13px;
          margin-top: -9px;
          font-size: 12px;
        }
        .glyph { position: relative; }
        @keyframes pulse-ok {
          0%   { box-shadow: 0 4px 14px rgba(0,0,0,.38), 0 0 0 0   rgba(74,222,128,.7); }
          100% { box-shadow: 0 4px 14px rgba(0,0,0,.38), 0 0 0 16px rgba(74,222,128,0); }
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .glyph { font-size: 21px; font-weight: 800; color: #fff; letter-spacing: -.5px; line-height: 1; }
        .tip {
          position: absolute;
          right: ${BTN_SIZE + 10}px;
          top: 50%;
          transform: translateY(-50%);
          white-space: nowrap;
          background: rgba(20,20,24,0.95);
          color: #fff;
          font: 500 12px/1 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
          padding: 7px 10px;
          border-radius: 7px;
          border: 1px solid rgba(255,255,255,0.12);
          opacity: 0;
          pointer-events: none;
          transition: opacity .16s ease;
        }
        .tip small { opacity: .6; margin-left: 5px; }
        .btn:hover + .tip { opacity: 1; }
        .btn.dragging + .tip { opacity: 0; }
      </style>
      <div class="btn" role="button" tabindex="0" aria-label="Mở KudoToolAI">
        <span class="glyph">K</span>
      </div>
      <div class="tip">KudoToolAI <small>Alt+S</small></div>
    `;

    (document.body || document.documentElement).appendChild(hostEl);

    const btn = root.querySelector('.btn');
    const saved = loadPos() || defaultPos();
    applyPos(saved.x, saved.y);

    // ─── Kéo thả ───
    let dragging = false;
    let moved = 0;
    let startX = 0, startY = 0, originX = 0, originY = 0;

    function onDown(e) {
      if (e.button !== 0) return; // chỉ chuột trái
      dragging = true;
      moved = 0;
      startX = e.clientX;
      startY = e.clientY;
      originX = parseFloat(hostEl.style.left) || 0;
      originY = parseFloat(hostEl.style.top) || 0;
      btn.classList.add('dragging');
      // pointer capture: giữ được event kể cả khi chuột đi ra ngoài nút
      try { btn.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
    }

    function onMove(e) {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
      applyPos(originX + dx, originY + dy);
    }

    function onUp(e) {
      if (!dragging) return;
      dragging = false;
      btn.classList.remove('dragging');
      try { btn.releasePointerCapture(e.pointerId); } catch (_) {}

      const pos = applyPos(parseFloat(hostEl.style.left), parseFloat(hostEl.style.top));
      if (moved <= DRAG_THRESHOLD) {
        openSidePanel(btn); // coi như click
      } else {
        savePos(pos.x, pos.y);
      }
    }

    btn.addEventListener('pointerdown', onDown);
    btn.addEventListener('pointermove', onMove);
    btn.addEventListener('pointerup', onUp);
    btn.addEventListener('pointercancel', onUp);
    // Bàn phím: Enter/Space mở panel (nút có tabindex nên focus được)
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openSidePanel(btn);
      }
    });

    // Cửa sổ đổi kích thước → kẹp nút lại trong màn hình
    window.addEventListener('resize', () => {
      const p = applyPos(parseFloat(hostEl.style.left), parseFloat(hostEl.style.top));
      savePos(p.x, p.y);
    });

    // Theo dõi tình trạng kết nối tới extension. Trong lúc phát triển, extension bị
    // reload liên tục; nút chuyển màu hổ phách ngay để khỏi phải bấm mới biết là hỏng.
    const theoDoi = setInterval(() => {
      if (!contextConHieuLuc()) {
        danhDauCanTaiLai(btn);
        clearInterval(theoDoi);
      }
    }, 3000);
    if (!contextConHieuLuc()) danhDauCanTaiLai(btn);
  }

  // Flow là SPA (Angular) — khi điều hướng, node có thể bị gỡ khỏi body.
  // Quan sát body và gắn lại nút nếu nó biến mất.
  function watch() {
    const observer = new MutationObserver(() => {
      if (!document.getElementById(HOST_ID)) build();
    });
    observer.observe(document.body, { childList: true });
  }

  function init() {
    build();
    watch();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
