/* 공통 계산 엔진: 설정 저장/불러오기, 수량 추정, 견적 계산 */
(function () {
  const STORAGE_KEY = 'interiorEstimate.config.v1';
  const PYEONG_M2 = 3.3058;
  const EXCLUSIVE_RATIO = 0.78;   // 공급면적 대비 전용면적 비율 (아파트 평균)
  const BATH_PYEONG = 1.3;        // 욕실 1개 면적(평) — 바닥재 면적에서 제외

  const BASIS = {
    supply:    { label: '공급평수',       unit: '평' },
    floor:     { label: '바닥 시공면적',  unit: '평' },
    rooms:     { label: '방 개수',        unit: '개' },
    baths:     { label: '욕실 개수',      unit: '개소' },
    doors:     { label: '실내 문 개수',   unit: '짝' },
    balconies: { label: '발코니 개수',    unit: '개소' },
    kitchen:   { label: '주방 길이',      unit: 'm' },
    set:       { label: '1식',            unit: '식' },
    manual:    { label: '직접 입력',      unit: '개' }
  };

  // 사용자가 수정 가능한 추정 수량 항목
  const QTY_FIELDS = [
    { key: 'rooms',     label: '방',            unit: '개',  step: 1 },
    { key: 'baths',     label: '욕실',          unit: '개',  step: 1 },
    { key: 'doors',     label: '실내 문',       unit: '짝',  step: 1 },
    { key: 'balconies', label: '발코니',        unit: '개',  step: 1 },
    { key: 'kitchen',   label: '주방 길이',     unit: 'm',   step: 0.1 },
    { key: 'floor',     label: '바닥 시공면적', unit: '평',  step: 1 },
    { key: 'storey',    label: '층수 (샷시 양중)', unit: '층', step: 1 }
  ];
  const DEFAULT_STOREY = 10;

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const round1 = (n) => Math.round(n * 10) / 10;

  function loadConfig() {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) {
        const c = JSON.parse(s);
        if (c && Array.isArray(c.categories)) return c;
      }
    } catch (e) { /* 저장값 손상 시 기본값 사용 */ }
    return clone(window.DEFAULT_CONFIG);
  }
  function saveConfig(c) { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); }
  function resetConfig() { localStorage.removeItem(STORAGE_KEY); }

  /* 공급평수로 각종 수량 자동 추정 */
  function estimateBase(p, ov) {
    ov = ov || {};
    p = Math.max(1, Number(p) || 0);
    const supplyM2 = p * PYEONG_M2;
    const exclusiveM2 = supplyM2 * EXCLUSIVE_RATIO;
    let rooms, baths;
    if (p < 20)      { rooms = 2; baths = 1; }
    else if (p < 30) { rooms = 3; baths = 1; }
    else if (p < 40) { rooms = 3; baths = 2; }
    else             { rooms = 4; baths = 2; }
    if (ov.rooms != null) rooms = Number(ov.rooms) || 0;
    if (ov.baths != null) baths = Number(ov.baths) || 0;
    const balconies = p < 25 ? 1 : p < 40 ? 2 : 3;
    const doors = rooms + baths + 1; // 방문 + 욕실문 + 다용도실/드레스룸
    const kitchen = 2.5; // 주방 길이 기본값 (m), 화면에서 수정 가능
    const floor = Math.round(Math.max(1, exclusiveM2 / PYEONG_M2 - baths * BATH_PYEONG));
    return {
      supplyM2: round1(supplyM2), exclusiveM2: round1(exclusiveM2),
      exclusivePyeong: round1(exclusiveM2 / PYEONG_M2),
      rooms, baths, doors, balconies, kitchen, floor, storey: DEFAULT_STOREY
    };
  }

  function unitOf(item, opt) {
    if (opt && opt.unit) return opt.unit;
    return item.unit || (BASIS[item.basis] || BASIS.manual).unit;
  }

  /* 옵션별 수량 기준 (예: 장판 = 공급평 × 1.8m). 옵션에 basis/factor가 있으면 항목 값 대신 사용 */
  function withOpt(item, opt) {
    if (!opt || (opt.basis == null && opt.factor == null)) return item;
    return Object.assign({}, item, {
      basis: opt.basis != null ? opt.basis : item.basis,
      factor: opt.factor != null ? opt.factor : item.factor,
      roundUp: opt.roundUp != null ? opt.roundUp : item.roundUp
    });
  }

  /* 자동 수량. factor: 기준 수량에 곱할 계수 (예: 공급평 × 0.625 = 벽지 롤 수), roundUp: 올림 */
  function autoQty(item, pyeong, q) {
    let n;
    switch (item.basis) {
      case 'supply': n = Number(pyeong) || 0; break;
      case 'set': n = 1; break;
      case 'manual': n = Number(item.defaultQty) || 1; break;
      default: n = Number(q[item.basis]) || 0;
    }
    if (item.factor) n *= Number(item.factor);
    if (item.roundUp) n = Math.ceil(n - 1e-9);
    else if (item.factor) n = Math.round(n * 10) / 10;
    return n;
  }

  /* 고객 단가 = 원가 × (1 + 분류 마진%), 100원 단위 반올림 */
  function customerPrice(cat, opt) {
    const base = Number(opt.price) || 0;
    const m = Number(cat && cat.markup) || 0;
    return m ? Math.round(base * (1 + m / 100) / 100) * 100 : base;
  }

  /* 최소 금액(원가 기준, 분류 마진 적용). 단품일 때는 단품 최소 금액(진입비)이 있으면 우선 */
  function minFor(cat, item, mode) {
    const base = (mode === 'single' && Number(item.minAmountSingle)) || Number(item.minAmount) || 0;
    return base ? customerPrice(cat, { price: base }) : 0;
  }

  function allItems(config) {
    const list = [];
    config.categories.forEach(cat => cat.items.forEach(item => list.push(item)));
    return list;
  }
  function findItem(config, id) { return allItems(config).find(i => i.id === id); }

  /* 연동 항목(예: 욕실 철거 ← 욕실 리모델링)을 대상 항목 상태에 맞춤 */
  function syncLinked(config, sel, targetId) {
    allItems(config).forEach(item => {
      if (!item.link || item.link !== targetId || !sel[item.id] || !sel[targetId]) return;
      const t = sel[targetId];
      sel[item.id].on = t.on;
      if (item.linkOpt && item.linkOpt[t.opt] != null) sel[item.id].opt = item.linkOpt[t.opt];
    });
  }

  /* 필수 동반 항목: 선택된 항목의 requires 대상은 강제로 선택.
   * 반환값 { 대상id: [필수로 만든 항목 이름...] } — 화면에서 체크 해제를 막는 데 사용 */
  function applyRequires(config, sel, mode) {
    const lockedBy = {};
    allItems(config).forEach(item => {
      if (!Array.isArray(item.requires) || !sel[item.id] || !sel[item.id].on || !inMode(item, mode)) return;
      item.requires.forEach(id => {
        if (!sel[id]) return;
        sel[id].on = true;
        (lockedBy[id] = lockedBy[id] || []).push(item.name);
      });
    });
    return lockedBy;
  }

  /* 층수에 따라 옵션 자동 선택 (예: 샷시 양중 사다리차/스카이차). 사용자가 직접 고른 경우(optManual)는 유지 */
  function applyStoreyOpts(config, sel, q) {
    const storey = Number(q.storey) || 0;
    allItems(config).forEach(item => {
      const s = sel[item.id];
      if (!Array.isArray(item.storeyOpts) || !s || s.optManual) return;
      const rule = item.storeyOpts.find(r => storey <= Number(r.maxStorey));
      if (rule && item.options[rule.opt]) s.opt = rule.opt;
    });
  }

  /* 중복 방지: excludedBy 항목 중 하나라도 선택돼 있으면 제외 (예: 조명 교체 시 조명 탈부착 진입비 제외) */
  function excludedBy(config, item, sel, mode) {
    if (!Array.isArray(item.excludedBy)) return null;
    const hit = item.excludedBy.map(id => findItem(config, id))
      .find(t => t && sel[t.id] && sel[t.id].on && inMode(t, mode));
    return hit || null;
  }

  /* 실제 적용 수량: 직접 입력값 > 연동 대상의 직접 입력값(같은 수량 기준일 때) > 자동값 */
  function qtyOf(config, item, pyeong, q, sel) {
    const s = sel[item.id];
    if (s && s.qty != null) return s.qty;
    // 옵션에 따른 추가 수량 (예: 디아망 선택 시 도배 시공 +1품)
    const add = item.link && item.qtyAdd && sel[item.link] ? Number(item.qtyAdd[sel[item.link].opt]) || 0 : 0;
    if (item.link && sel[item.link] && sel[item.link].qty != null) {
      const target = findItem(config, item.link);
      if (target && target.basis === item.basis && (target.factor || 1) === (item.factor || 1)) return sel[item.link].qty + add;
    }
    const opt = s && item.options ? item.options[Math.min(s.opt || 0, item.options.length - 1)] : null;
    return autoQty(withOpt(item, opt), pyeong, q) + add;
  }

  /* 시공 방식: full = 전체 시공, single = 단품 시공. item.modes 가 없으면 둘 다 표시 */
  const MODES = { full: '전체 시공', single: '단품 시공' };
  function inMode(item, mode) { return !mode || !Array.isArray(item.modes) || item.modes.includes(mode); }

  function defaultSelection(config, mode) {
    const sel = {};
    allItems(config).forEach(item => {
      // 단품은 아무것도 선택하지 않은 상태로 시작
      const on = mode === 'single' ? false : !!item.defaultOn;
      // 단품 기본 옵션이 따로 있으면 사용 (예: 바닥재 단품 = 장판)
      const opt = mode === 'single' && item.defaultOptSingle != null ? item.defaultOptSingle : (item.defaultOpt || 0);
      sel[item.id] = { on, opt, qty: null };
    });
    allItems(config).forEach(item => { if (sel[item.link]) syncLinked(config, sel, item.link); });
    return sel;
  }

  /* 견적 계산 */
  function calculate(config, pyeong, q, sel, mode, rates, extras) {
    const groups = [];
    let subtotal = 0;
    config.categories.forEach(cat => {
      const lines = [];
      cat.items.forEach(item => {
        const s = sel[item.id];
        if (!s || !s.on || !item.options.length || !inMode(item, mode)) return;
        if (excludedBy(config, item, sel, mode)) return;
        const opt = item.options[Math.min(s.opt, item.options.length - 1)];
        const qty = qtyOf(config, item, pyeong, q, sel);
        // 상담 페이지에서 이 현장만 단가를 직접 고친 경우 (원가, 분류 마진 미적용)
        const priceOverride = s.price != null && s.price !== '';
        let price = priceOverride ? Number(s.price) || 0 : customerPrice(cat, opt);
        let amount;
        if (!priceOverride && opt.first != null && opt.first !== '') {
          // 첫 단위 단가 + 추가 단위 단가 (예: 세라믹코트 첫 칸 25만, 추가 칸 15만)
          const firstP = customerPrice(cat, { price: opt.first });
          amount = qty > 0 ? Math.round(firstP + price * Math.max(0, qty - 1)) : 0;
          price = qty > 0 ? Math.round(amount / qty) : firstP;   // 표에는 평균 단가 표시
        } else {
          amount = Math.round(price * qty);
        }
        const min = minFor(cat, item, mode);
        // 단품 최소 진입비: 철거비 대신 진입비로 표기 (폐기물 포함, 중복 없음)
        const entryFee = mode === 'single' && Number(item.minAmountSingle) > 0 && qty > 0;
        // 욕실처럼 개소 단위 항목은 1개소당 진입비 1식 (2개소 = 2식)
        const perUnit = entryFee && item.basis === 'baths';
        let minApplied;
        if (perUnit) {
          minApplied = price < min;
          price = Math.max(price, min);
          amount = Math.round(price * qty);
        } else {
          minApplied = min > 0 && qty > 0 && amount < min;
          if (minApplied) amount = min;
        }
        if (entryFee) {
          const lq = perUnit ? qty : 1;
          lines.push({ item, option: { name: minApplied ? (item.entryName ? item.entryName + (item.entryDesc ? ' (' + item.entryDesc + ')' : '') : '최소 진입비 (철거·폐기물 포함)') : opt.name + ' · 폐기물 포함' }, qty: lq, unit: '식', price: Math.round(amount / lq), amount, entryFee });
        } else {
          lines.push({ item, option: opt, qty, unit: unitOf(item, opt), price, amount, minApplied });
        }
      });
      if (lines.length) {
        const sum = lines.reduce((a, l) => a + l.amount, 0);
        groups.push({ category: cat, lines, sum });
        subtotal += sum;
      }
    });
    // 상담 페이지에서 직접 추가한 항목 (원가 기준)
    const extraLines = (extras || []).filter(x => x && String(x.name || '').trim() && Number(x.qty) > 0)
      .map((x, i) => {
        const qty = Number(x.qty) || 0, price = Number(x.price) || 0;
        return { item: { id: 'extra_' + i, name: String(x.name).trim() }, option: { name: String(x.spec || '').trim() || '-' },
          qty, unit: String(x.unit || '식').trim() || '식', price, amount: Math.round(price * qty), extra: true };
      });
    if (extraLines.length) {
      const sum = extraLines.reduce((a, l) => a + l.amount, 0);
      groups.push({ category: { id: 'extra', name: '추가 항목' }, lines: extraLines, sum });
      subtotal += sum;
    }
    const r = rates || config.rates;
    const misc = Math.round(subtotal * (Number(r.misc) || 0) / 100);
    const supervision = Math.round(subtotal * (Number(r.supervision) || 0) / 100);
    const profit = Math.round(subtotal * (Number(r.profit) || 0) / 100);
    const rawSupply = subtotal + misc + supervision + profit;
    const supply = Math.floor(rawSupply / 1000) * 1000; // 천원 미만 절사
    const vat = Math.round(supply * (Number(r.vat) || 0) / 100);
    const total = supply + vat;
    return { groups, subtotal, misc, supervision, profit, rounding: supply - rawSupply, supply, vat, total, rates: r };
  }

  /* 공과잡비·감리비·이윤을 항목 단가에 녹이는 배율 (고객용 표시) */
  function overheadFactor(rates) {
    return 1 + ((Number(rates.misc) || 0) + (Number(rates.supervision) || 0) + (Number(rates.profit) || 0)) / 100;
  }
  const round10 = (n) => Math.round(n / 10) * 10;

  /* 내부 계산 결과 → 고객용 견적 (비율 항목 없이 단가·금액에 포함, 공급가·부가세·합계는 동일) */
  function toCustomerView(result) {
    const f = overheadFactor(result.rates);
    let sum = 0;
    const groups = result.groups.map(g => {
      const lines = g.lines.map(l => {
        const amount = round10(l.amount * f);
        sum += amount;
        return Object.assign({}, l, { price: round10(l.price * f), amount });
      });
      return { category: g.category, lines, sum: lines.reduce((a, l) => a + l.amount, 0) };
    });
    return { groups, itemsTotal: sum, rounding: result.supply - sum, supply: result.supply, vat: result.vat, total: result.total, rates: result.rates };
  }

  const won = (n) => Math.round(n).toLocaleString('ko-KR');
  function manwon(n) {
    const m = Math.round(n / 10000);
    if (m >= 10000) {
      const eok = Math.floor(m / 10000), rest = m % 10000;
      return eok + '억' + (rest ? ' ' + rest.toLocaleString('ko-KR') + '만' : '') + '원';
    }
    return m.toLocaleString('ko-KR') + '만원';
  }
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  window.Estimator = {
    BASIS, QTY_FIELDS, loadConfig, saveConfig, resetConfig, estimateBase,
    autoQty, unitOf, defaultSelection, calculate, customerPrice, syncLinked, findItem, allItems, MODES, inMode, qtyOf, applyRequires, applyStoreyOpts, excludedBy, minFor, overheadFactor, toCustomerView, won, manwon, esc, clone
  };
})();
