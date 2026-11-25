/* 견적 화면 — 고객용(index.html) / 내부용(staff.html) 공용
 * 고객용: 공과잡비·감리비·이윤을 항목 단가에 녹여서 공급가액·부가세·합계만 표시
 * 내부용: 비율 항목을 모두 표시하고 견적별로 % 수정 가능 */
(function () {
  const E = window.Estimator;
  const $ = (s) => document.querySelector(s);
  const config = E.loadConfig();
  const STAFF = document.body.dataset.view === 'staff';
  const FIXED = document.body.dataset.mode || null;   // 전체 공사 페이지(full) / 단품 페이지(single)

  const state = {
    rates: E.clone(config.rates),  // 이 견적에 적용할 비율 (내부용에서 수정 가능)
    docView: STAFF ? 'internal' : 'customer',
    mode: null,                    // 'full' | 'single'
    pyeong: 32,
    qtyOverride: {},               // 추정 수량 수동 수정값
    extras: [],                    // 상담 페이지: 직접 추가한 항목 [{name, spec, qty, unit, price}]
    sels: {                        // 시공 방식별 선택 상태
      full: E.defaultSelection(config, 'full'),
      single: E.defaultSelection(config, 'single')
    },
    get sel() { return this.sels[this.mode || 'full']; },
    set sel(v) { this.sels[this.mode || 'full'] = v; }
  };

  const visible = (item) => E.inMode(item, state.mode);
  const val = (sel) => { const el = $(sel); return el ? el.value.trim() : ''; };

  /* 화면에 보여줄 금액: 고객용은 비율을 녹인 금액, 내부용은 순공사비 기준 금액 */
  const disp = (n) => STAFF ? n : Math.round(n * E.overheadFactor(state.rates) / 10) * 10;

  /* 화면 묶음: 전체 시공 = 공사 분류별 / 단품 = 품목별 카드 (연동 철거는 그 품목 카드 안에) */
  function scopeGroups() {
    const catOf = {};
    config.categories.forEach(c => c.items.forEach(i => { catOf[i.id] = c; }));
    const entry = (i) => ({ cat: catOf[i.id], item: i });
    if (state.mode !== 'single') {
      return config.categories.filter(c => c.items.some(visible))
        .map(c => ({ id: c.id, name: c.name, entries: c.items.filter(visible).map(entry) }));
    }
    const all = E.allItems(config).filter(visible);
    const used = new Set();
    const groups = [];
    all.filter(i => !i.link && catOf[i.id].id !== 'demo').forEach(item => {
      const members = [item].concat(all.filter(i => i.link === item.id));
      members.forEach(i => used.add(i.id));
      groups.push({ id: 'g_' + item.id, name: item.groupName || item.name, entries: members.map(entry) });
    });
    // 간편 견적 카드 순서: 현관부터 집 안으로 들어가는 순서 (config.singleOrder)
    const order = Array.isArray(config.singleOrder) ? config.singleOrder : [];
    const rank = (g) => { const k = order.indexOf(g.id.slice(2)); return k < 0 ? order.length : k; };
    groups.sort((x, y) => rank(x) - rank(y));
    const rest = all.filter(i => !used.has(i.id));
    if (rest.length) groups.push({ id: 'g_rest', name: '철거', entries: rest.map(entry) });
    return groups;
  }

  /* ---------- 시공 방식 ---------- */
  function setMode(mode) {
    state.mode = mode;
    $('#modeSelect').hidden = !!mode;
    $('#app').hidden = !mode;
    if (!mode) return;
    // 전체 공사 / 단품 전용 페이지는 방식 전환·처음으로 버튼을 숨김
    if (FIXED) {
      const bar = document.querySelector('.mode-bar');
      if (bar) bar.style.display = 'none';
    }
    document.querySelectorAll('.mode-toggle [data-mode]').forEach(b =>
      b.classList.toggle('active', b.dataset.mode === mode));
    document.querySelectorAll('[data-only]').forEach(b => { b.hidden = b.dataset.only !== mode; });
    const single = mode === 'single';
    $('#pyeongHint').textContent = single ? '도배·바닥 면적과 욕실 개수 계산에 사용돼요' : '';
    $('#scopeTitle').textContent = single ? '단품 선택' : '공사 범위 선택';
    $('#scopeHint').textContent = single
      ? '필요한 품목만 체크하세요. 주방·욕실·붙박이장·신발장은 철거·폐기물 비용이 자동으로 추가되고(최소 진입비 적용), 샷시를 고르면 철거·양중과 도배가 함께 들어가요. 도배를 하면 조명·콘센트·스위치 탈부착 비용이 붙어요(조명 교체 시 제외). 바닥재는 기존 바닥 철거 여부를 선택할 수 있어요.'
      : '기본 추천 항목이 선택되어 있어요. 원하는 공사와 자재로 바꿔보세요.';
    renderScope();
    update();
    window.scrollTo(0, 0);
  }

  /* ---------- 상단 업체 정보 ---------- */
  function renderBrand() {
    const c = config.company;
    $('#brandName').textContent = c.name || '인테리어 견적';
    $('#brandContact').textContent = [c.phone, c.address].filter(Boolean).join(' · ');
    document.title = STAFF
      ? '내부용 견적' + (c.name ? ' - ' + c.name : '')
      : (c.name ? c.name + ' - ' : '') + (FIXED === 'full' ? '전체 공사 견적' : FIXED === 'single' ? '간편 견적내기' : '인테리어 견적 자동 산출');
  }

  /* ---------- 수량 ---------- */
  function quantities() {
    const base = E.estimateBase(state.pyeong, state.qtyOverride);
    const q = Object.assign({}, base);
    E.QTY_FIELDS.forEach(f => {
      if (state.qtyOverride[f.key] != null) q[f.key] = state.qtyOverride[f.key];
    });
    return { base, q };
  }

  function renderQtyGrid() {
    $('#qtyGrid').innerHTML = E.QTY_FIELDS.map(f => `
      <label class="qty-field" data-key="${f.key}">
        <span class="qty-label">${f.label}</span>
        <span class="qty-box">
          <input type="number" min="0" step="${f.step}" data-qty="${f.key}">
          <span class="u">${f.unit}</span>
        </span>
        <button type="button" class="reset-link" data-reset="${f.key}">자동값</button>
      </label>`).join('');
  }

  /* ---------- 공사 범위 ---------- */
  function renderScope() {
    const single = state.mode === 'single';
    $('#scope').innerHTML = `<div class="${single ? 'single-grid' : ''}">` + scopeGroups().map(g => `
      <div class="cat ${single ? 'single-card' : ''}">
        <div class="cat-head">
          <span class="cat-name">${E.esc(g.name)}</span>
          <span class="cat-sum" data-catsum="${g.id}"></span>
        </div>
        ${g.entries.map(e => itemRow(e.cat, e.item)).join('')}
      </div>`).join('') + '</div>';
  }

  /* 개소·개·짝·식 등 셀 수 있는 단위는 정수만 */
  const INT_UNITS = ['평', '자', '개소', '개', '짝', '식', '칸', '롤', '품', 'EA', '세트'];
  const isIntUnit = (item) => INT_UNITS.includes(E.unitOf(item));

  function itemRow(cat, item) {
    const s = state.sel[item.id];
    // 단품 + 최소 진입비 항목(주방·욕실·붙박이장·신발장 철거): 철거 옵션 대신 진입비만 표시
    const entryOnly = state.mode === "single" && Number(item.minAmountSingle) > 0;
    const opts = item.options.map((o, i) =>
      `<option value="${i}" ${i === s.opt ? 'selected' : ''}>${E.esc(o.name)} (${o.first != null && o.first !== ''
        ? `첫 ${E.esc(E.unitOf(item))} ${E.won(disp(E.customerPrice(cat, { price: o.first })))}원 + 추가 ${E.won(disp(E.customerPrice(cat, o)))}원/${E.esc(E.unitOf(item))}`
        : `${E.won(disp(E.customerPrice(cat, o)))}원/${E.esc(E.unitOf(item, o))}`})</option>`).join('');
    const target = item.link ? E.findItem(config, item.link) : null;
    const notes = [
      item.desc ? E.esc(item.desc) : "",
      target ? `↳ ${E.esc(target.name)} 연동` : '',
      Array.isArray(item.storeyOpts) ? '층수에 따라 자동 선택' : '',
      !entryOnly && E.minFor(cat, item, state.mode)
        ? (state.mode === 'single' && item.minAmountSingle
            ? `철거·폐기물 포함, 최소 진입비 ${E.won(disp(E.minFor(cat, item, state.mode)))}원`
            : `최소 ${E.won(disp(E.minFor(cat, item, state.mode)))}원`)
        : ''
    ].filter(Boolean).join(' · ');
    return `
      <div class="item ${s.on ? 'on' : ''}" data-item="${item.id}">
        <label class="item-check">
          <input type="checkbox" data-on="${item.id}" ${s.on ? 'checked' : ''}>
          <span class="item-name">${E.esc(entryOnly ? (item.entryName || item.name.replace(/\s*철거$/, '') + ' 철거·폐기물') : item.name)}${notes ? `<small class="item-note">${notes}</small>` : ''}<small class="item-lock" data-lock="${item.id}"></small></span>
        </label>
        <select data-opt="${item.id}" ${item.options.length < 2 ? 'class="single"' : ''} ${entryOnly ? 'hidden' : ''}>${opts}</select>
        ${entryOnly ? `<span class="item-fixed">${item.basis === 'baths' ? '개소당 1식' : '1식'} (최소 진입비 ${E.won(disp(E.minFor(cat, item, state.mode)))}원 적용)${item.entryDesc ? '<br>' + E.esc(item.entryDesc) : ''}</span>` : ''}
        <span class="item-qty" ${entryOnly ? 'hidden' : ''}>
          <input type="number" min="0" step="${isIntUnit(item) ? 1 : 0.1}" data-iqty="${item.id}">
          <span class="u">${E.esc(E.unitOf(item, item.options[s.opt]))}</span>
          ${STAFF && !entryOnly ? `<span class="x">×</span><input type="number" min="0" step="1000" class="price-in" data-iprice="${item.id}" title="이 현장 단가 (원가). 비우면 기본 단가"><span class="u">원</span>` : ''}
        </span>
        <span class="item-amt" data-amt="${item.id}"></span>
      </div>`;
  }

  /* 연동으로 바뀐 체크/옵션을 화면에 반영 */
  function syncScopeControls() {
    E.allItems(config).forEach(item => {
      const s = state.sel[item.id];
      const cb = document.querySelector(`[data-on="${item.id}"]`);
      const sl = document.querySelector(`[data-opt="${item.id}"]`);
      if (cb) cb.checked = s.on;
      if (sl) sl.value = String(s.opt);
    });
  }

  /* ---------- 갱신 ---------- */
  function update() {
    if (!state.mode) return;
    const { base, q } = quantities();

    $('#areaInfo').innerHTML =
      `공급면적 <b>${base.supplyM2}㎡</b> · 전용면적(추정) <b>${base.exclusiveM2}㎡</b> (약 ${base.exclusivePyeong}평)`;

    E.QTY_FIELDS.forEach(f => {
      const input = document.querySelector(`[data-qty="${f.key}"]`);
      if (document.activeElement !== input) input.value = q[f.key];
      const overridden = state.qtyOverride[f.key] != null;
      input.closest('.qty-field').classList.toggle('overridden', overridden);
    });

    // 필수 동반 항목 (예: 샷시 → 도배) 강제 선택 + 체크 해제 잠금
    const lockedBy = E.applyRequires(config, state.sel, state.mode);
    Object.keys(lockedBy).forEach(id => E.syncLinked(config, state.sel, id));
    E.applyStoreyOpts(config, state.sel, q);   // 층수 → 사다리차/스카이차
    syncScopeControls();
    document.querySelectorAll('[data-lock]').forEach(el => {
      const id = el.dataset.lock;
      const by = lockedBy[id];
      const item = E.findItem(config, id);
      const ex = item && state.sel[id].on ? E.excludedBy(config, item, state.sel, state.mode) : null;
      el.textContent = by ? `🔒 ${by.join('·')} 시공 시 필수`
        : ex ? `${ex.name} 선택으로 제외 (중복 없음)` : '';
      const cb = document.querySelector(`[data-on="${id}"]`);
      if (cb) cb.disabled = !!by;
    });

    const result = E.calculate(config, state.pyeong, q, state.sel, state.mode, state.rates, STAFF ? state.extras : null);

    const amountById = {};
    result.groups.forEach(g => g.lines.forEach(l => { amountById[l.item.id] = l.amount; }));

    scopeGroups().forEach(g => {
      const cat = { id: g.id };
      let catSum = 0;
      g.entries.map(e => e.item).forEach(item => {
        const s = state.sel[item.id];
        const row = document.querySelector(`[data-item="${item.id}"]`);
        row.classList.toggle('on', s.on);
        const qInput = row.querySelector('[data-iqty]');
        const uEl = row.querySelector('.item-qty .u');
        if (uEl) uEl.textContent = E.unitOf(item, item.options[Math.min(s.opt, item.options.length - 1)]);
        const qty = E.qtyOf(config, item, state.pyeong, q, state.sel);
        if (document.activeElement !== qInput) qInput.value = qty;
        const pInput = row.querySelector('[data-iprice]');
        if (pInput) {
          const cur = item.options[Math.min(s.opt, item.options.length - 1)];
          pInput.placeholder = E.won(E.customerPrice(g.entries.find(x => x.item === item).cat, cur));
          if (document.activeElement !== pInput) pInput.value = s.price != null ? s.price : '';
          pInput.classList.toggle('overridden', s.price != null);
        }
        qInput.classList.toggle('overridden', s.qty != null);
        qInput.title = s.qty != null ? '수정한 수량 (비우면 자동값)' : '자동 계산된 수량';
        const amt = amountById[item.id];
        row.querySelector('[data-amt]').textContent = s.on && amt != null ? E.won(disp(amt)) + '원' : '-';
        if (s.on && amt) catSum += disp(amt);
      });
      document.querySelector(`[data-catsum="${cat.id}"]`).textContent = catSum ? E.manwon(catSum) : '';
    });

    renderSummary(result);
    renderEstimate(result);
  }

  /* 상담 페이지: 직접 추가 항목 */
  function renderExtras() {
    const box = $('#extras');
    if (!box) return;
    box.innerHTML = state.extras.length ? `
      <div class="table-wrap"><table class="extra-table">
        <thead><tr><th>항목</th><th>사양</th><th>수량</th><th>단위</th><th>단가 (원가)</th><th></th></tr></thead>
        <tbody>${state.extras.map((x, i) => `
          <tr data-ex="${i}">
            <td><input type="text" data-exf="name" value="${E.esc(x.name)}" placeholder="예: 아트월 시공"></td>
            <td><input type="text" data-exf="spec" value="${E.esc(x.spec)}" placeholder="사양"></td>
            <td><input type="number" min="0" step="0.1" data-exf="qty" value="${E.esc(x.qty)}"></td>
            <td><input type="text" data-exf="unit" value="${E.esc(x.unit)}"></td>
            <td><input type="number" min="0" step="1000" data-exf="price" value="${E.esc(x.price)}"></td>
            <td><button type="button" class="btn small ghost" data-exdel="${i}">삭제</button></td>
          </tr>`).join('')}</tbody>
      </table></div>` : '<p class="hint">목록에 없는 공사를 직접 넣을 수 있어요. 단가는 원가(비율 제외)로 입력하세요.</p>';
  }

  /* ---------- 견적서 이미지 저장 + 견적 문의하러 가기 (카카오톡 채널) ---------- */
  let lastResult = null;
  // 요약 카드용: 이미지 저장 → 문의하러 가기
  function inquiryButton() {
    if (STAFF) return '';
    return `<button type="button" class="btn ghost block save-img" data-saveimg>🖼️ 견적서 이미지로 저장</button>
      ${config.company.kakao ? `<a class="btn kakao block" href="${E.esc(config.company.kakao)}" target="_blank" rel="noopener">💬 견적 문의하러 가기</a>` : ''}
      <p class="inquiry-hint">견적서 이미지를 저장한 뒤 카카오톡 채널에 이미지를 올려 문의해 주세요.</p>`;
  }
  // 견적서 하단: 안내 문구 + 두 버튼
  function inquiryBox() {
    if (STAFF) return '';
    return `<div class="inquiry-box">
      <div class="inquiry-title">이 견적으로 상담받고 싶으신가요?</div>
      <ol>
        <li><b>견적서 이미지로 저장</b>을 눌러 견적서를 저장해 주세요.</li>
        <li><b>견적 문의하러 가기</b>를 눌러 카카오톡 채널에 저장한 이미지를 올려주세요.</li>
      </ol>
      <div class="inquiry-actions">
        <button type="button" class="btn ghost save-img" data-saveimg>🖼️ 견적서 이미지로 저장</button>
        ${config.company.kakao ? `<a class="btn kakao" href="${E.esc(config.company.kakao)}" target="_blank" rel="noopener">💬 견적 문의하러 가기</a>` : ''}
      </div>
    </div>`;
  }

  // html2canvas는 처음 저장할 때만 불러옴
  function loadHtml2canvas() {
    if (window.html2canvas) return Promise.resolve(window.html2canvas);
    return new Promise((ok, fail) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      s.onload = () => ok(window.html2canvas);
      s.onerror = () => fail(new Error('load'));
      document.head.appendChild(s);
    });
  }
  async function saveImage() {
    const doc = document.querySelector('#estimate .doc');
    if (!doc || !lastResult || !lastResult.groups.length) { alert('먼저 원하는 공사를 선택해주세요.'); return; }
    const btns = document.querySelectorAll('[data-saveimg]');
    btns.forEach(b => { b.disabled = true; b.dataset.label = b.textContent; b.textContent = '이미지 만드는 중…'; });
    try {
      const h2c = await loadHtml2canvas();
      const canvas = await h2c(doc, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const url = canvas.toDataURL('image/png');
      const site = val('#custSite').replace(/[\\/:*?"<>|]/g, '').trim();
      const name = `견적서${site ? '_' + site : ''}_${state.pyeong}평.png`;
      // 1) 바로 다운로드 시도 (일반 홈페이지에서 동작)
      try { const link = document.createElement('a'); link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove(); } catch (e) { /* 막힌 환경 */ }
      // 2) 미리보기 창: 휴대폰은 이미지를 길게 눌러 저장
      showImage(url);
    } catch (e) {
      alert('이미지를 만들지 못했어요. 화면을 캡처해서 보내주셔도 돼요.');
    } finally {
      btns.forEach(b => { b.disabled = false; b.textContent = b.dataset.label; });
    }
  }
  function showImage(url) {
    let m = document.querySelector('#imgModal');
    if (!m) {
      m = document.createElement('div');
      m.id = 'imgModal';
      m.className = 'img-modal';
      m.innerHTML = `<div class="img-modal-box">
        <div class="img-modal-head"><b>견적서 이미지</b><button type="button" class="btn small ghost" data-closeimg>닫기</button></div>
        <p class="img-modal-hint">저장이 안 됐다면 이미지를 <b>길게 눌러(PC는 오른쪽 클릭) 저장</b>해 주세요.</p>
        <img alt="견적서 이미지">
        ${config.company.kakao ? `<a class="btn kakao block" href="${E.esc(config.company.kakao)}" target="_blank" rel="noopener">💬 견적 문의하러 가기</a>` : ''}
      </div>`;
      document.body.appendChild(m);
      m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-closeimg]')) m.hidden = true; });
    }
    m.querySelector('img').src = url;
    m.hidden = false;
  }

  function renderSummary(r) {
    lastResult = r;
    if (STAFF) return renderStaffSummary(r);
    const rt = state.rates;
    const single = state.mode === 'single';
    if (!r.groups.length) {
      $('#summary').innerHTML = `
        <div class="sum-title">${E.MODES[state.mode]} 예상 금액</div>
        <div class="sum-empty">${single ? '왼쪽에서 원하는 단품을 선택해주세요.' : '공사 항목을 선택해주세요.'}</div>`;
      return;
    }
    const perPyeong = state.pyeong ? r.total / state.pyeong : 0;
    const picked = single
      ? r.groups.filter(g => g.category.id !== 'demo').flatMap(g => g.lines).map(l => l.item.name)
      : [];
    $('#summary').innerHTML = `
      <div class="sum-title">${E.MODES[state.mode]} 예상 금액 <small>VAT 포함</small></div>
      <div class="sum-total">${E.manwon(r.total)}</div>
      <div class="sum-per">${single
        ? E.esc(picked.join(' · ') || '단품 시공')
        : `평당 약 ${E.manwon(perPyeong)} · 공급 ${state.pyeong}평`}</div>
      <dl class="sum-list">
        <dt class="strong">공급가액</dt><dd class="strong">${E.won(r.supply)}</dd>
        <dt>부가세 (${rt.vat}%)</dt><dd>${E.won(r.vat)}</dd>
        <dt class="grand">합계</dt><dd class="grand">${E.won(r.total)}원</dd>
      </dl>
      <a class="btn primary block" href="#estimate">견적서 보기</a>
      ${inquiryButton()}`;
  }

  /* 내부용 요약: 비율 입력칸은 한 번만 만들고 숫자만 갱신 (입력 중 포커스 유지) */
  const RATE_ROWS = [['misc', '공과잡비'], ['supervision', '감리비'], ['profit', '기업이윤']];
  function renderStaffSummary(r) {
    if (!$('#sSub')) {
      $('#summary').innerHTML = `
        <div class="sum-title" id="sTitle"></div>
        <div class="sum-total" id="sTotal"></div>
        <div class="sum-per" id="sPer"></div>
        <dl class="sum-list staff">
          <dt>순공사비</dt><dd id="sSub"></dd>
          ${RATE_ROWS.map(([k, label]) => `
            <dt>${label} <span class="rate-in"><input type="number" min="0" step="0.5" data-rate="${k}">%</span></dt>
            <dd id="s_${k}"></dd>`).join('')}
          <dt class="muted">단수 정리</dt><dd class="muted" id="sRound"></dd>
          <dt class="strong">공급가액</dt><dd class="strong" id="sSupply"></dd>
          <dt>부가세 <span class="rate-in"><input type="number" min="0" step="1" data-rate="vat">%</span></dt><dd id="s_vat"></dd>
          <dt class="grand">합계</dt><dd class="grand" id="sGrand"></dd>
        </dl>
        <div class="margin-box">
          <div>비율 수익 (잡비+감리+이윤) <b id="sMargin"></b></div>
          <div>철거 원가 마진 <b id="sDemoMargin"></b></div>
        </div>
        <div class="rate-actions">
          <button type="button" class="btn small ghost" id="btnRateReset">기본 비율로</button>
          <button type="button" class="btn small ghost" id="btnRateSave">이 비율을 기본값으로 저장</button>
        </div>
        <a class="btn primary block" href="#estimate">견적서 보기</a>`;
      $('#summary').addEventListener('input', e => {
        const k = e.target.dataset.rate;
        if (!k) return;
        state.rates[k] = Math.max(0, Number(e.target.value) || 0);
        update();
      });
      $('#btnRateReset').addEventListener('click', () => {
        state.rates = E.clone(config.rates);
        syncRateInputs(true);
        update();
      });
      $('#btnRateSave').addEventListener('click', () => {
        if (!confirm('현재 비율을 기본값으로 저장할까요? 고객용 화면에도 같은 비율이 적용됩니다.')) return;
        config.rates = E.clone(state.rates);
        E.saveConfig(config);
        alert('저장했어요. 다른 PC나 홈페이지에도 반영하려면 관리자 화면에서 단가 파일(data.js)을 내보내 교체해주세요.');
      });
      syncRateInputs(true);
    }
    syncRateInputs(false);
    const single = state.mode === 'single';
    const perPyeong = state.pyeong ? r.total / state.pyeong : 0;
    $('#sTitle').innerHTML = `${E.MODES[state.mode]} · 내부 견적 <small>VAT 포함</small>`;
    $('#sTotal').textContent = E.manwon(r.total);
    $('#sPer').textContent = single ? '단품 시공' : `평당 약 ${E.manwon(perPyeong)} · 공급 ${state.pyeong}평`;
    $('#sSub').textContent = E.won(r.subtotal);
    RATE_ROWS.forEach(([k]) => { $('#s_' + k).textContent = E.won(r[k === 'misc' ? 'misc' : k]); });
    $('#sRound').textContent = E.won(r.rounding);
    $('#sSupply').textContent = E.won(r.supply);
    $('#s_vat').textContent = E.won(r.vat);
    $('#sGrand').textContent = E.won(r.total) + '원';
    $('#sMargin').textContent = E.won(r.misc + r.supervision + r.profit) + '원';
    let demoMargin = 0;
    r.groups.forEach(g => {
      const m = Number(g.category.markup) || 0;
      if (m) demoMargin += g.sum - g.sum / (1 + m / 100);
    });
    $('#sDemoMargin').textContent = E.won(Math.round(demoMargin)) + '원';
  }

  function syncRateInputs(force) {
    document.querySelectorAll('#summary [data-rate]').forEach(inp => {
      if (force || document.activeElement !== inp) inp.value = state.rates[inp.dataset.rate];
      const changed = Number(state.rates[inp.dataset.rate]) !== Number(config.rates[inp.dataset.rate]);
      inp.classList.toggle('overridden', changed);
    });
  }

  function renderEstimate(result) {
    const internal = STAFF && state.docView === 'internal';
    const r = internal ? result : E.toCustomerView(result);
    const c = config.company;
    const today = new Date();
    const dIn = val('#custDate');
    const date = dIn ? dIn.replace(/-/g, '.')
      : `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
    const cust = val('#custName');
    const site = val('#custSite');
    const phone = val('#custPhone');

    if (!r.groups.length) {
      $('#estimate').innerHTML = '<p class="empty">선택된 공사 항목이 없습니다.</p>';
      return;
    }

    let no = 0;   // 견적서 항목 번호
    const rows = r.groups.map(g => `
      <tr class="grp"><td colspan="7">${E.esc(g.category.name)}</td></tr>
      ${g.lines.map(l => `
        <tr>
          <td class="c no">${++no}</td>
          <td>${E.esc(l.item.name)}</td>
          <td>${E.esc(l.option.name)}${l.minApplied ? ' <small>(최소 금액 적용)</small>' : ''}${state.mode === 'single' && l.item.minAmountSingle && !l.entryFee ? ' <small>(폐기물 포함)</small>' : ''}</td>
          <td class="num">${l.qty}</td>
          <td class="c">${E.esc(l.unit)}</td>
          <td class="num">${E.won(l.price)}</td>
          <td class="num">${E.won(l.amount)}</td>
        </tr>`).join('')}
      <tr class="grp-sum"><td colspan="6">소계</td><td class="num">${E.won(g.sum)}</td></tr>`).join('');

    const rt = state.rates;
    const foot = internal ? `
              <tr><td colspan="6">순공사비</td><td class="num">${E.won(r.subtotal)}</td></tr>
              <tr><td colspan="6">공과잡비 (${rt.misc}%)</td><td class="num">${E.won(r.misc)}</td></tr>
              <tr><td colspan="6">감리비 (${rt.supervision}%)</td><td class="num">${E.won(r.supervision)}</td></tr>
              <tr><td colspan="6">기업이윤 (${rt.profit}%)</td><td class="num">${E.won(r.profit)}</td></tr>
              ${r.rounding ? `<tr><td colspan="6">단수 정리</td><td class="num">${E.won(r.rounding)}</td></tr>` : ''}` : `
              ${r.rounding ? `<tr><td colspan="6">항목 합계</td><td class="num">${E.won(r.itemsTotal)}</td></tr>
              <tr><td colspan="6">단수 정리</td><td class="num">${E.won(r.rounding)}</td></tr>` : ''}`;
    $('#estimate').innerHTML = `
      ${internal ? '<div class="doc-badge">내부용 — 고객에게 보여주지 마세요</div>' : ''}
      <div class="doc">
        <div class="doc-head">
          <div>
            <div class="doc-title">견 적 서</div>
            <div class="doc-meta">
              ${cust ? `<div>고객명: <b>${E.esc(cust)}</b> 님</div>` : ''}
              ${phone ? `<div>연락처: ${E.esc(phone)}</div>` : ''}
              ${site ? `<div>${FIXED === 'single' ? '아파트' : '현장'}: ${E.esc(site)}</div>` : ''}
              ${FIXED === 'single' ? '' : `<div>공사 구분: ${E.MODES[state.mode]}</div>`}
              <div>${FIXED === 'single' ? '평수' : '규모'}: 아파트 공급 ${state.pyeong}평</div>
              <div>${STAFF ? '상담일' : '견적일'}: ${date}</div>
            </div>
          </div>
          <div class="doc-company">
            <div class="co-name">${E.esc(c.name)}</div>
            ${c.ceo ? `<div>대표: ${E.esc(c.ceo)}</div>` : ''}
            ${c.bizNo ? `<div>사업자번호: ${E.esc(c.bizNo)}</div>` : ''}
            ${c.phone ? `<div>연락처: ${E.esc(c.phone)}</div>` : ''}
            ${c.address ? `<div>${E.esc(c.address)}</div>` : ''}
          </div>
        </div>
        <div class="table-wrap">
          <table class="doc-table">
            <thead><tr><th class="c">No</th><th>항목</th><th>사양</th><th>수량</th><th>단위</th><th>단가</th><th>금액</th></tr></thead>
            <tbody>${rows}</tbody>
            <tfoot>${foot}
              <tr class="strong"><td colspan="6">공급가액</td><td class="num">${E.won(r.supply)}</td></tr>
              <tr><td colspan="6">부가세 (${rt.vat}%)</td><td class="num">${E.won(r.vat)}</td></tr>
              <tr class="grand"><td colspan="6">합계</td><td class="num">${E.won(r.total)}</td></tr>
            </tfoot>
          </table>
        </div>
        ${c.note ? `<p class="doc-note">※ ${E.esc(c.note)}</p>` : ''}
      </div>
      ${inquiryBox()}`;
  }

  /* ---------- 이벤트 ---------- */
  function setPyeong(v) {
    const n = Math.max(1, Math.min(200, Math.round(Number(v) || 0)));
    state.pyeong = n;
    $('#pyeong').value = n;
    $('#pyeongRange').value = Math.min(80, Math.max(10, n));
    update();
  }

  function bind() {
    document.addEventListener('click', e => { if (e.target.closest('[data-saveimg]')) saveImage(); });
    $('#pyeong').addEventListener('input', e => { if (e.target.value !== '') setPyeong(e.target.value); });
    $('#pyeong').addEventListener('change', e => setPyeong(e.target.value));
    $('#pyeongRange').addEventListener('input', e => setPyeong(e.target.value));

    $('#qtyGrid').addEventListener('input', e => {
      const key = e.target.dataset.qty;
      if (!key) return;
      state.qtyOverride[key] = e.target.value === '' ? null : Math.max(0, Number(e.target.value));
      const fld = E.QTY_FIELDS.find(x => x.key === key);
      if (state.qtyOverride[key] != null && fld && fld.step === 1) state.qtyOverride[key] = Math.round(state.qtyOverride[key]);
      update();
    });
    $('#qtyGrid').addEventListener('click', e => {
      const key = e.target.dataset.reset;
      if (!key) return;
      e.preventDefault();
      state.qtyOverride[key] = null;
      update();
    });

    $('#scope').addEventListener('change', e => {
      const t = e.target;
      const id = t.dataset.on || t.dataset.opt;
      if (t.dataset.on) state.sel[id].on = t.checked;
      if (t.dataset.opt) { state.sel[id].opt = Number(t.value); state.sel[id].optManual = true; }
      if (t.dataset.iqty && t.value === '') state.sel[t.dataset.iqty].qty = null;
      if (id) {
        E.syncLinked(config, state.sel, id);
        syncScopeControls();
      }
      update();
    });
    $('#scope').addEventListener('input', e => {
      const t = e.target;
      if (t.dataset.iprice) {
        state.sel[t.dataset.iprice].price = t.value === '' ? null : Math.max(0, Number(t.value) || 0);
        update();
        return;
      }
      if (!t.dataset.iqty) return;
      const s = state.sel[t.dataset.iqty];
      s.qty = t.value === '' ? null : Math.max(0, Number(t.value));
      if (s.qty != null && isIntUnit(E.findItem(config, t.dataset.iqty))) s.qty = Math.round(s.qty);
      if (!s.on && s.qty) { s.on = true; t.closest('.item').querySelector('[data-on]').checked = true; }
      update();
    });

    document.querySelectorAll('[data-preset]').forEach(btn => btn.addEventListener('click', () => {
      const p = btn.dataset.preset;
      if (p === 'recommend') state.sel = E.defaultSelection(config, state.mode);
      else {
        config.categories.forEach(cat => cat.items.forEach(item => { state.sel[item.id].on = p === 'all'; }));
        E.allItems(config).forEach(item => { if (item.link) E.syncLinked(config, state.sel, item.link); });
      }
      renderScope();
      update();
    }));

    document.querySelectorAll('button[data-mode]').forEach(b =>
      b.addEventListener('click', () => setMode(b.dataset.mode)));
    $('#btnHome').addEventListener('click', () => setMode(null));

    // 내부용: 견적서 보기 전환 (내부용 / 고객용)
    document.querySelectorAll('[data-doc]').forEach(b => b.addEventListener('click', () => {
      state.docView = b.dataset.doc;
      document.querySelectorAll('[data-doc]').forEach(x => x.classList.toggle('active', x === b));
      update();
    }));

    ['#custName', '#custSite', '#custPhone', '#custDate'].forEach(id => { const el = $(id); if (el) el.addEventListener('input', update); });
    const dateEl = $('#custDate');
    if (dateEl && !dateEl.value) {
      const t = new Date();
      dateEl.value = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    }

    // 상담 페이지: 추가 항목
    const exBox = $('#extras');
    if (exBox) {
      renderExtras();
      $('#btnAddExtra').addEventListener('click', () => {
        state.extras.push({ name: '', spec: '', qty: 1, unit: '식', price: '' });
        renderExtras();
        const last = exBox.querySelector('tr:last-child input');
        if (last) last.focus();
      });
      exBox.addEventListener('input', e => {
        const tr = e.target.closest('[data-ex]');
        if (!tr || !e.target.dataset.exf) return;
        state.extras[Number(tr.dataset.ex)][e.target.dataset.exf] = e.target.value;
        update();
      });
      exBox.addEventListener('click', e => {
        const d = e.target.dataset.exdel;
        if (d == null) return;
        state.extras.splice(Number(d), 1);
        renderExtras();
        update();
      });
    }

    // 견적서 인쇄 / PDF 저장 (고객용 견적서로 출력)
    const pb = $('#btnPrint');
    if (pb) pb.addEventListener('click', () => {
      const prev = state.docView;
      state.docView = 'customer';
      update();
      window.print();
      state.docView = prev;
      update();
    });
  }

  renderBrand();
  renderQtyGrid();
  bind();
  // 간편 견적내기: 안내 화면부터 시작 (시작하기 버튼 → 견적 화면)
  setMode(FIXED && !document.body.dataset.intro ? FIXED : null);
})();
