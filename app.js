(function () {
  var KEY = "hematyuk.v1";
  var CATS = [
    { id: "makan", n: "Makan", c: "var(--c1)", s: "Mk" },
    { id: "transport", n: "Transport", c: "var(--c2)", s: "Tr" },
    { id: "hiburan", n: "Hiburan", c: "var(--c3)", s: "Hb" },
    { id: "belanja", n: "Belanja", c: "var(--c4)", s: "Bl" },
    { id: "sekolah", n: "Sekolah", c: "var(--c5)", s: "Sk" },
    { id: "lainnya", n: "Lainnya", c: "var(--c6)", s: "Ln" }
  ];
  var SPECIAL = {
    masuk: { n: "Uang masuk", c: "var(--accent)", s: "+" },
    tabung: { n: "Tabungan", c: "var(--c3)", s: "Tb" }
  };
  var DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  var state, tab = "beranda", period = "7", saveGoalId = null, resetArmed = false, toastTimer = null;

  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function dkey(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function addDays(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); return x; }
  function todayKey() { return dkey(new Date()); }
  function rp(n) { return "Rp " + Math.round(n).toLocaleString("id-ID"); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function digits(s) { var d = String(s).replace(/\D/g, ""); return d ? parseInt(d, 10) : 0; }
  function fmtK(v) { return String(Math.round(v / 100) / 10).replace(".", ",") + "rb"; }
  function catOf(id) {
    for (var i = 0; i < CATS.length; i++) if (CATS[i].id === id) return CATS[i];
    return SPECIAL[id] || CATS[5];
  }
  function dateLabel(k) {
    if (k === todayKey()) return "Hari ini";
    if (k === dkey(addDays(new Date(), -1))) return "Kemarin";
    var p = k.split("-");
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return DAYS[d.getDay()] + ", " + d.getDate() + " " + MONTHS[d.getMonth()];
  }

  function seed() {
    var t = new Date(), tx = [], id = 1;
    function add(off, type, cat, amount, note) { tx.push({ id: id++, date: dkey(addDays(t, off)), type: type, cat: cat, amount: amount, note: note }); }
    add(0, "out", "makan", 20000, "Makan siang");
    add(0, "out", "transport", 5000, "Ojek");
    add(0, "out", "hiburan", 5000, "Nonton");
    add(-1, "out", "makan", 18000, "Nasi ayam");
    add(-1, "out", "transport", 10000, "Ojek pulang");
    add(-1, "out", "belanja", 12000, "Alat tulis");
    add(-2, "out", "makan", 25000, "Makan dan es teh");
    add(-2, "out", "hiburan", 12000, "Game online");
    add(-3, "out", "makan", 15000, "Bakso");
    add(-3, "out", "transport", 8000, "Angkot");
    add(-4, "out", "makan", 22000, "Makan siang");
    add(-4, "out", "belanja", 30000, "Kaos kaki");
    add(-4, "out", "sekolah", 15000, "Fotokopi");
    add(-5, "in", "masuk", 700000, "Uang saku bulanan");
    add(-5, "out", "makan", 20000, "Makan siang");
    add(-6, "out", "makan", 16000, "Mie ayam");
    add(-6, "out", "transport", 10000, "Ojek");
    return {
      v: 1, sample: true, name: "Riko", saldoAwal: 1250000, limit: 30000, nextId: id,
      goals: [
        { id: 1, name: "Sepeda Baru", target: 2000000, saved: 900000, main: true },
        { id: 2, name: "Dana Darurat", target: 1000000, saved: 100000, main: false },
        { id: 3, name: "Kursus Bahasa", target: 800000, saved: 80000, main: false },
        { id: 4, name: "Ponsel Baru", target: 3000000, saved: 150000, main: false }
      ],
      nextGoal: 5, tx: tx
    };
  }
  function blank(name) {
    return { v: 1, sample: false, name: name || "", saldoAwal: 0, limit: 30000, nextId: 1, goals: [], nextGoal: 1, tx: [] };
  }
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { var s = JSON.parse(raw); if (s && s.v === 1) return s; }
    } catch (e) {}
    return seed();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  function sums(dateKey) {
    var out = 0;
    state.tx.forEach(function (t) { if (t.type === "out" && t.date === dateKey) out += t.amount; });
    return out;
  }
  function balance() {
    var b = state.saldoAwal;
    state.tx.forEach(function (t) { b += t.type === "in" ? t.amount : -t.amount; });
    return b;
  }
  function mainGoal() {
    for (var i = 0; i < state.goals.length; i++) if (state.goals[i].main) return state.goals[i];
    return state.goals[0] || null;
  }
  function monthTotals() {
    var m = todayKey().slice(0, 7), inn = 0, out = 0;
    state.tx.forEach(function (t) {
      if (t.date.slice(0, 7) !== m) return;
      if (t.type === "in") inn += t.amount; else if (t.type === "out") out += t.amount;
    });
    return { inn: inn, out: out };
  }
  function limitState() {
    var spent = sums(todayKey()), lim = state.limit, pct = lim > 0 ? spent / lim : 0;
    return { spent: spent, lim: lim, pct: pct, left: lim - spent, cls: pct > 1 ? "bad" : pct >= 0.8 ? "warn" : "" };
  }
  function alertHtml(ls) {
    if (ls.lim <= 0) return "";
    if (ls.pct > 1) return '<div class="alert bad">Limit hari ini terlewati ' + rp(ls.spent - ls.lim) + ". Tahan dulu pengeluaran sampai besok.</div>";
    if (ls.pct >= 0.8) return '<div class="alert">Hampir mencapai batas! Atur pengeluaranmu agar tetap hemat. Sisa ' + rp(ls.left) + ".</div>";
    return "";
  }

  function gaugeSvg(ls) {
    var len = Math.PI * 50, p = Math.min(ls.pct, 1);
    var col = ls.cls === "bad" ? "var(--bad)" : ls.cls === "warn" ? "var(--c2)" : "var(--accent)";
    return '<svg class="gauge" viewBox="0 0 120 78" role="img" aria-label="Pengeluaran hari ini ' + Math.round(ls.pct * 100) + ' persen dari limit">' +
      '<path d="M10 64 A50 50 0 0 1 110 64" fill="none" stroke="var(--line)" stroke-width="12" stroke-linecap="round"/>' +
      '<path d="M10 64 A50 50 0 0 1 110 64" fill="none" stroke="' + col + '" stroke-width="12" stroke-linecap="round" stroke-dasharray="' + (len * p).toFixed(2) + " " + len.toFixed(2) + '"/>' +
      '<text x="60" y="52" text-anchor="middle" font-size="22">' + Math.round(ls.pct * 100) + '%</text>' +
      '<text class="sm" x="60" y="72" text-anchor="middle" font-size="9">dari limit</text></svg>';
  }

  function limitCard() {
    var ls = limitState();
    return '<section class="card"><h2>Limit hari ini</h2><div class="gauge-wrap">' + gaugeSvg(ls) +
      '<div class="gauge-info"><span class="label">Sisa limit</span><span class="big num">' + rp(Math.max(ls.left, 0)) + '</span>' +
      '<span class="hint num" style="margin:0">Terpakai ' + rp(ls.spent) + " dari " + rp(ls.lim) + "</span></div></div>" +
      '<div class="bar ' + ls.cls + '" style="margin-top:14px"><i style="width:' + Math.min(ls.pct * 100, 100) + '%"></i></div>' +
      alertHtml(ls) + "</section>";
  }

  function goalRow(g, withSave) {
    var p = g.target > 0 ? Math.min(g.saved / g.target, 1) : 0;
    return '<div class="goal"><div><strong>' + esc(g.name) + "</strong>" + (g.main ? '<span class="pill">Utama</span>' : "") +
      '<div class="meta num">' + rp(g.saved) + " dari " + rp(g.target) + "</div></div>" +
      '<div class="row" style="gap:8px"><b class="num">' + Math.round(p * 100) + "%</b>" +
      (withSave ? '<button class="btn ghost small" data-action="save-goal" data-id="' + g.id + '">Setor</button>' : "") + "</div>" +
      '<div class="bar"><i style="width:' + (p * 100) + '%"></i></div></div>';
  }

  function viewBeranda() {
    var m = monthTotals(), mg = mainGoal(), h = "";
    if (state.sample) {
      h += '<div class="note"><span>Ini data contoh. Hapus lalu isi dengan datamu sendiri.</span><button class="btn small" data-action="clear-sample">Mulai dari nol</button></div>';
    }
    h += '<section class="card balance"><span class="label">Saldo saat ini</span><div class="big num">' + rp(balance()) + '</div>' +
      '<div class="sub"><span>Pemasukan bulan ini<b class="num">' + rp(m.inn) + '</b></span><span>Pengeluaran bulan ini<b class="num">' + rp(m.out) + "</b></span></div></section>";
    h += limitCard();
    if (mg) {
      h += '<section class="card"><span class="label">Target utama</span><div style="margin-top:8px">' + goalRow(mg, true).replace('class="goal"', 'class="goal" style="border:0;padding:0"') + "</div></section>";
    }
    var others = state.goals.filter(function (g) { return !mg || g.id !== mg.id; });
    h += '<section class="card"><h2>Target lainnya</h2>';
    if (!state.goals.length) h += '<p class="empty">Belum ada target. Tambahkan di menu Akun.</p>';
    else if (!others.length) h += '<p class="empty">Hanya ada satu target. Tambah target lain di menu Akun.</p>';
    else h += others.map(function (g) { return goalRow(g, true); }).join("");
    h += "</section>";
    return h;
  }

  function txRow(t) {
    var c = catOf(t.cat), isIn = t.type === "in";
    return '<div class="tx"><div class="dot" style="background:' + c.c + '">' + c.s + '</div>' +
      '<div style="min-width:0"><div class="t">' + esc(t.note || c.n) + '</div><div class="s">' + c.n + "</div></div>" +
      '<div class="amt num ' + (isIn ? "in" : "") + '">' + (isIn ? "+" : "-") + rp(t.amount) + "</div>" +
      '<button class="x" data-action="del-tx" data-id="' + t.id + '" aria-label="Hapus transaksi">&times;</button></div>';
  }

  function viewTransaksi() {
    var ls = limitState(), h = "";
    h += '<section class="card"><h2>Set limit harian</h2><div class="field" style="margin-bottom:0"><label for="limit-input">Tentukan limit pengeluaran per hari</label>' +
      '<div class="inline-set"><input type="text" id="limit-input" class="money" inputmode="numeric" value="' + ls.lim.toLocaleString("id-ID") + '"><button class="btn" data-action="apply-limit">Terapkan</button></div></div>' +
      '<div class="row" style="margin-top:14px"><span class="label">Sisa limit hari ini</span><b class="num">' + rp(Math.max(ls.left, 0)) + "</b></div>" +
      '<div class="bar ' + ls.cls + '" style="margin-top:8px"><i style="width:' + Math.min(ls.pct * 100, 100) + '%"></i></div>' + alertHtml(ls) + "</section>";
    var list = state.tx.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id; });
    h += '<section class="card"><h2>Daftar transaksi</h2>';
    if (!list.length) h += '<p class="empty">Belum ada transaksi. Tekan tombol + untuk mencatat.</p>';
    else {
      var last = "", shown = 0;
      list.forEach(function (t) {
        if (shown >= 40) return;
        if (t.date !== last) { h += '<div class="dayhead">' + dateLabel(t.date) + "</div>"; last = t.date; }
        h += txRow(t); shown++;
      });
      if (list.length > 40) h += '<p class="hint">Menampilkan 40 transaksi terbaru.</p>';
    }
    return h + "</section>";
  }

  function periodTx() {
    var today = new Date(), keys = {}, i;
    if (period === "7") { for (i = 0; i < 7; i++) keys[dkey(addDays(today, -i))] = 1; }
    return state.tx.filter(function (t) {
      if (t.type !== "out") return false;
      return period === "7" ? !!keys[t.date] : t.date.slice(0, 7) === todayKey().slice(0, 7);
    });
  }

  function donutHtml() {
    var tx = periodTx(), totals = {}, total = 0;
    tx.forEach(function (t) { totals[t.cat] = (totals[t.cat] || 0) + t.amount; total += t.amount; });
    var rows = CATS.filter(function (c) { return totals[c.id]; }).map(function (c) { return { c: c, v: totals[c.id] }; })
      .sort(function (a, b) { return b.v - a.v; });
    if (!total) return '<p class="empty">Belum ada pengeluaran pada periode ini.</p>';
    var R = 40, C = 2 * Math.PI * R, off = 0, segs = "";
    rows.forEach(function (r) {
      var len = C * r.v / total;
      segs += '<circle cx="60" cy="60" r="' + R + '" fill="none" style="stroke:' + r.c.c + '" stroke-width="18" stroke-dasharray="' + len.toFixed(2) + " " + (C - len).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '" transform="rotate(-90 60 60)"/>';
      off += len;
    });
    var svg = '<svg class="donut" viewBox="0 0 120 120" role="img" aria-label="Pengeluaran per kategori">' + segs +
      '<text x="60" y="58" text-anchor="middle" font-size="12">' + fmtK(total) + '</text>' +
      '<text class="sm" x="60" y="72" text-anchor="middle" font-size="8">total</text></svg>';
    var legend = '<ul class="legend">' + rows.map(function (r) {
      return '<li><i style="background:' + r.c.c + '"></i>' + r.c.n + '<b class="num">' + Math.round(r.v / total * 100) + "%</b></li>";
    }).join("") + "</ul>";
    return '<div class="donut-wrap">' + svg + legend + '</div><div class="hint num">Total ' + rp(total) + "</div>";
  }

  function lastDays() {
    var res = [], t = new Date();
    for (var i = 6; i >= 0; i--) { var d = addDays(t, -i), k = dkey(d); res.push({ k: k, label: DAYS[d.getDay()], v: sums(k) }); }
    return res;
  }

  function barsHtml(days) {
    var W = 320, H = 170, L = 36, T = 10, B = 24, R = 6, pw = W - L - R, ph = H - T - B;
    var raw = Math.max(state.limit, Math.max.apply(null, days.map(function (d) { return d.v; })), 1000) * 1.1;
    var mag = Math.pow(10, Math.floor(Math.log10(raw)));
    var max = Math.ceil(raw / mag) * mag;
    if ((max / 2) % 500 !== 0) max = Math.ceil(max / 1000) * 1000;
    function y(v) { return T + ph * (1 - v / max); }
    var s = '<svg class="chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Pengeluaran per hari, 7 hari terakhir">';
    [0, max / 2, max].forEach(function (v) {
      s += '<line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text x="' + (L - 5) + '" y="' + (y(v) + 3) + '" text-anchor="end">' + (v === 0 ? "0" : fmtK(v)) + "</text>";
    });
    var slot = pw / days.length, bw = slot * 0.56;
    days.forEach(function (d, i) {
      var x = L + slot * i + (slot - bw) / 2, hh = ph * d.v / max;
      s += '<rect x="' + x.toFixed(1) + '" y="' + (T + ph - hh).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(hh, d.v ? 1 : 0).toFixed(1) + '" rx="3" style="fill:' + (d.v > state.limit ? "var(--bad)" : "var(--accent)") + '"/>';
      s += '<text x="' + (L + slot * i + slot / 2).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + d.label + "</text>";
    });
    s += '<line class="lim" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(state.limit) + '" y2="' + y(state.limit) + '"/></svg>';
    return s;
  }

  function evalHtml(days) {
    var withData = days.filter(function (d) { return d.v > 0; });
    if (!withData.length) return '<div class="alert good" style="margin:0">Belum ada data pengeluaran 7 hari terakhir. Catat transaksi pertamamu untuk melihat evaluasi.</div>';
    var over = days.filter(function (d) { return d.v > state.limit; }).length;
    var tx = periodTx(), tot = {};
    var keys = {}; days.forEach(function (d) { keys[d.k] = 1; });
    state.tx.forEach(function (t) { if (t.type === "out" && keys[t.date]) tot[t.cat] = (tot[t.cat] || 0) + t.amount; });
    var top = null;
    Object.keys(tot).forEach(function (k) { if (!top || tot[k] > tot[top]) top = k; });
    var avg = Math.round(days.reduce(function (a, d) { return a + d.v; }, 0) / 7);
    if (over === 0) return '<div class="alert good" style="margin:0"><b>Bagus!</b> Kamu tidak pernah melewati limit dalam 7 hari terakhir. Rata-rata pengeluaranmu ' + rp(avg) + " per hari. Terus pertahankan.</div>";
    return '<div class="alert" style="margin:0">Kamu melewati limit pada ' + over + " dari 7 hari terakhir. Rata-rata pengeluaranmu " + rp(avg) + " per hari. Pengeluaran terbesar ada di kategori " + catOf(top).n + ", mulai kurangi dari situ.</div>";
  }

  function viewLaporan() {
    var days = lastDays();
    return '<section class="card"><div class="row" style="margin-bottom:12px"><h2 style="margin:0">Ringkasan kategori</h2>' +
      '<div class="seg"><button data-period="7" class="' + (period === "7" ? "on" : "") + '">7 hari</button><button data-period="bulan" class="' + (period === "bulan" ? "on" : "") + '">Bulan ini</button></div></div>' +
      donutHtml() + "</section>" +
      '<section class="card"><h2>Pengeluaran per hari</h2>' + barsHtml(days) + '<div class="hint">Garis putus-putus menunjukkan limit harian ' + rp(state.limit) + ". Batang merah melewati limit.</div></section>" +
      '<section class="card"><h2>Evaluasi</h2>' + evalHtml(days) + "</section>";
  }

  function viewAkun() {
    var h = '<section class="card"><h2>Profil</h2>' +
      '<div class="field"><label for="a-name">Nama</label><input type="text" id="a-name" maxlength="24" value="' + esc(state.name) + '"></div>' +
      '<div class="field" style="margin-bottom:0"><label for="a-saldo">Saldo awal (Rp)</label><input type="text" id="a-saldo" class="money" inputmode="numeric" value="' + state.saldoAwal.toLocaleString("id-ID") + '"></div>' +
      '<p class="hint">Saldo saat ini dihitung dari saldo awal ditambah pemasukan dikurangi pengeluaran dan setoran target.</p></section>';
    h += '<section class="card"><h2>Target tabungan</h2>';
    if (!state.goals.length) h += '<p class="empty">Belum ada target.</p>';
    state.goals.forEach(function (g) {
      h += '<div class="goal"><div><strong>' + esc(g.name) + "</strong>" + (g.main ? '<span class="pill">Utama</span>' : "") + '<div class="meta num">' + rp(g.saved) + " dari " + rp(g.target) + "</div></div>" +
        '<div class="row" style="gap:6px">' + (g.main ? "" : '<button class="btn ghost small" data-action="main-goal" data-id="' + g.id + '">Jadikan utama</button>') +
        '<button class="x" data-action="del-goal" data-id="' + g.id + '" aria-label="Hapus target ' + esc(g.name) + '">&times;</button></div></div>';
    });
    h += '<form id="form-goal" autocomplete="off" style="margin-top:14px;border-top:1px solid var(--line);padding-top:14px"><div class="field"><label for="g-name">Target baru</label><input type="text" id="g-name" maxlength="30" placeholder="Contoh: Sepatu olahraga"></div>' +
      '<div class="field"><label for="g-target">Jumlah target (Rp)</label><input type="text" id="g-target" class="money" inputmode="numeric" placeholder="0"></div>' +
      '<div class="alert bad" id="goal-err" hidden style="margin:0 0 12px"></div><button class="btn" type="submit">Tambah target</button></form></section>';
    h += '<section class="card"><h2>Data</h2><p class="hint" style="margin:0 0 12px">Datamu tersimpan di browser ini saja. Menghapus data tidak bisa dibatalkan.</p>' +
      (resetArmed
        ? '<div class="stack"><button class="btn danger" data-action="reset-yes">Ya, hapus semua data</button><button class="btn ghost" data-action="reset-no">Batal</button></div>'
        : '<div class="stack"><button class="btn outline-danger" data-action="reset-ask">Hapus semua data</button><button class="btn ghost" data-action="load-sample">Pakai data contoh</button></div>') +
      "</section>";
    return h;
  }

  function render() {
    var v = document.getElementById("view");
    v.innerHTML = tab === "beranda" ? viewBeranda() : tab === "transaksi" ? viewTransaksi() : tab === "laporan" ? viewLaporan() : viewAkun();
    document.querySelectorAll(".tab").forEach(function (b) {
      if (b.getAttribute("data-tab") === tab) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    document.getElementById("hello").innerHTML = state.name ? "Halo, <b>" + esc(state.name) + "</b>" : "";
  }

  function toast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2600);
  }
  function openSheet(id) { document.getElementById(id).hidden = false; }
  function closeSheets() { document.querySelectorAll(".overlay").forEach(function (o) { o.hidden = true; }); }
  function showErr(id, msg) { var e = document.getElementById(id); e.textContent = msg; e.hidden = !msg; }
  function go(t) { tab = t; resetArmed = false; render(); window.scrollTo(0, 0); }

  function buildCats() {
    document.getElementById("f-cats").innerHTML = CATS.map(function (c, i) {
      return '<label><input type="radio" name="f-cat" value="' + c.id + '"' + (i === 0 ? " checked" : "") + "><span>" + c.n + "</span></label>";
    }).join("");
  }
  function openAdd() {
    buildCats();
    document.getElementById("f-amount").value = "";
    document.getElementById("f-note").value = "";
    document.getElementById("f-date").value = todayKey();
    document.querySelector('input[name="f-type"][value="out"]').checked = true;
    document.getElementById("cat-field").hidden = false;
    showErr("add-err", "");
    openSheet("sheet-add");
    setTimeout(function () { document.getElementById("f-amount").focus(); }, 30);
  }

  function liveMoney(el) {
    var n = digits(el.value);
    el.value = n ? n.toLocaleString("id-ID") : "";
  }

  document.addEventListener("input", function (e) {
    var el = e.target;
    if (el.classList && el.classList.contains("money")) liveMoney(el);
  });
  document.addEventListener("change", function (e) {
    var el = e.target;
    if (el.name === "f-type") document.getElementById("cat-field").hidden = el.value === "in";
    if (el.id === "a-name") { state.name = el.value.trim(); save(); render(); toast("Nama disimpan"); }
    if (el.id === "a-saldo") { state.saldoAwal = digits(el.value); save(); toast("Saldo awal disimpan"); render(); }
  });

  document.addEventListener("click", function (e) {
    var tb = e.target.closest("[data-tab]");
    if (tb) { go(tb.getAttribute("data-tab")); return; }
    var pb = e.target.closest("[data-period]");
    if (pb) { period = pb.getAttribute("data-period"); render(); return; }
    if (e.target.classList && e.target.classList.contains("overlay")) { closeSheets(); return; }
    var a = e.target.closest("[data-action]");
    if (!a) return;
    var act = a.getAttribute("data-action"), id = parseInt(a.getAttribute("data-id"), 10);
    if (act === "open-add") openAdd();
    else if (act === "close") closeSheets();
    else if (act === "clear-sample") { state = blank(state.name); save(); render(); toast("Data contoh dihapus. Isi saldo awal di menu Akun."); go("akun"); }
    else if (act === "load-sample") { state = seed(); resetArmed = false; save(); render(); toast("Data contoh dimuat"); }
    else if (act === "apply-limit") {
      var n = digits(document.getElementById("limit-input").value);
      if (n <= 0) { toast("Isi limit lebih dari nol"); return; }
      state.limit = n; save(); render(); toast("Limit harian " + rp(n) + " diterapkan");
    }
    else if (act === "del-tx") {
      var del = state.tx.filter(function (t) { return t.id === id; })[0];
      if (del && del.type === "save") {
        state.goals.forEach(function (g) { if (g.id === del.goalId) g.saved = Math.max(g.saved - del.amount, 0); });
      }
      state.tx = state.tx.filter(function (t) { return t.id !== id; });
      save(); render(); toast("Transaksi dihapus");
    }
    else if (act === "save-goal") {
      var g = state.goals.filter(function (x) { return x.id === id; })[0];
      if (!g) return;
      saveGoalId = id;
      document.getElementById("save-title").textContent = "Setor ke " + g.name;
      document.getElementById("save-hint").textContent = "Saldo tersedia " + rp(balance()) + ". Sisa target " + rp(Math.max(g.target - g.saved, 0)) + ".";
      document.getElementById("s-amount").value = "";
      showErr("save-err", "");
      openSheet("sheet-save");
      setTimeout(function () { document.getElementById("s-amount").focus(); }, 30);
    }
    else if (act === "main-goal") { state.goals.forEach(function (g) { g.main = g.id === id; }); save(); render(); toast("Target utama diganti"); }
    else if (act === "del-goal") {
      state.goals = state.goals.filter(function (g) { return g.id !== id; });
      if (state.goals.length && !state.goals.some(function (g) { return g.main; })) state.goals[0].main = true;
      save(); render(); toast("Target dihapus");
    }
    else if (act === "reset-ask") { resetArmed = true; render(); }
    else if (act === "reset-no") { resetArmed = false; render(); }
    else if (act === "reset-yes") { state = blank(""); resetArmed = false; save(); render(); toast("Semua data dihapus"); }
  });

  document.addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.target.id;
    if (f === "form-add") {
      var type = document.querySelector('input[name="f-type"]:checked').value;
      var amount = digits(document.getElementById("f-amount").value);
      var date = document.getElementById("f-date").value || todayKey();
      if (amount <= 0) { showErr("add-err", "Isi jumlah lebih dari nol."); return; }
      var catEl = document.querySelector('input[name="f-cat"]:checked');
      var cat = type === "in" ? "masuk" : (catEl ? catEl.value : "lainnya");
      var note = document.getElementById("f-note").value.trim();
      state.tx.push({ id: state.nextId++, date: date, type: type, cat: cat, amount: amount, note: note });
      save(); closeSheets(); render();
      if (type === "out" && date === todayKey()) {
        var ls = limitState();
        if (ls.pct > 1) toast("Limit hari ini terlewati " + rp(ls.spent - ls.lim));
        else if (ls.pct >= 0.8) toast("Hampir mencapai batas! Sisa " + rp(ls.left));
        else toast("Pengeluaran dicatat. Sisa limit " + rp(ls.left));
      } else toast(type === "in" ? "Pemasukan dicatat" : "Pengeluaran dicatat");
    }
    else if (f === "form-save") {
      var g = state.goals.filter(function (x) { return x.id === saveGoalId; })[0];
      var amt = digits(document.getElementById("s-amount").value);
      if (!g) return;
      if (amt <= 0) { showErr("save-err", "Isi jumlah lebih dari nol."); return; }
      if (amt > balance()) { showErr("save-err", "Saldo tidak cukup. Saldo tersedia " + rp(balance()) + "."); return; }
      g.saved += amt;
      state.tx.push({ id: state.nextId++, date: todayKey(), type: "save", cat: "tabung", amount: amt, note: "Setor ke " + g.name, goalId: g.id });
      save(); closeSheets(); render(); toast("Berhasil menyetor " + rp(amt));
    }
    else if (f === "form-goal") {
      var name = document.getElementById("g-name").value.trim();
      var target = digits(document.getElementById("g-target").value);
      if (!name) { showErr("goal-err", "Isi nama target."); return; }
      if (target <= 0) { showErr("goal-err", "Isi jumlah target lebih dari nol."); return; }
      state.goals.push({ id: state.nextGoal++, name: name, target: target, saved: 0, main: state.goals.length === 0 });
      save(); render(); toast("Target ditambahkan");
    }
  });

  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSheets(); });

  state = load();
  render();
})();
