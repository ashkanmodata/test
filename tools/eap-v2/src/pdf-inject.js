
/* ---------- report downloads: one-pager and full detailed report, each in English and Arabic ---------- */
var V2LANGS = [["en", "English"], ["ar", "\u0627\u0644\u0639\u0631\u0628\u064a\u0629"]];
function V2Downloads(x) {
  return y("div", { className: "v2-dlgrid print:hidden", "data-v2-downloads": x.reportId, children: [["form", "Assessment Report"], ["detailed", "Detailed Assessment Report"]].map(function (k) {
    return y("div", { className: "v2-dlgrid__row", children: [d("span", { className: "v2-dlgrid__name", children: k[1] }),
      V2LANGS.map(function (l) { return d(V2Dl, { reportId: x.reportId, filename: x.filename, kind: k[0], lang: l[0], label: l[1] }, l[0]); })] }, k[0]);
  }) });
}
function V2fileName(name, kind, lang) {
  var label = kind === "form" ? "Assessment Report" : kind === "detailed" ? "Detailed Assessment Report" : "Performance Assessment";
  if (kind === "form" || kind === "detailed") label += lang === "en" ? " - English" : " - Arabic";
  return String(name).replace("Performance Assessment", label);
}
function V2Dl({ reportId: e, filename: t, kind: K, lang: LG, label: LB }) {
  var _a = (0, v.useState)(!1), busy = _a[0], setBusy = _a[1], _b = (0, v.useState)(""), err = _b[0], setErr = _b[1];
  LG = LG === "en" ? "en" : "ar";
  async function go() {
    setBusy(!0); setErr("");
    try {
      var r = await fetch("/api/reports/" + e + "/pdf?kind=" + K + "&lang=" + LG, { cache: "no-store" });
      if (!r.ok) { var j = await r.json().catch(function () { return {}; }); throw new Error(j.error || "Could not download the PDF."); }
      var url = URL.createObjectURL(await r.blob()), a = document.createElement("a");
      a.href = url; a.download = V2fileName(t, K, LG); document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 6e4);
    } catch (x) { setErr(x instanceof Error ? x.message : "Could not download the PDF."); } finally { setBusy(!1); }
  }
  return y("div", { children: [
    y(ne, { type: "button", size: "touch", variant: "outline", disabled: busy, onClick: go, "data-v2-dl": K, "data-v2-lang": LG, children: [d(Cv, { className: "size-4", "aria-hidden": !0 }), " ", busy ? "Preparing\u2026" : LB] }),
    err && d("p", { role: "alert", className: "mt-2 max-w-sm text-sm text-red-700", children: err }),
  ] });
}
V2Dl.__eapClient = !0;
async function V2Pdf(report, kind, lang) { return kind === "form" || kind === "detailed" ? V2ReportPdf(report, kind, lang === "en" ? "en" : "ar") : V2ScorecardPdf(report); }

/* ---------- shared report figures ---------- */
var V2RATINGS = ["Does not meet", "Partially meets", "Meets expectations", "Exceeds expectations", "Exceptional"];
var V2SHORT = { ownership_accountability: "Ownership", people_leadership_development: "People leadership", communication_stakeholder: "Communication",
  decision_making_problem_solving: "Decision-making", strategic_thinking_business_awareness: "Strategic thinking", critical_thinking_innovation: "Critical thinking" };
var V2TITLE = { ownership_accountability: "Ownership & accountability", people_leadership_development: "People leadership & development", communication_stakeholder: "Communication & stakeholder management",
  decision_making_problem_solving: "Decision-making & problem solving", strategic_thinking_business_awareness: "Strategic thinking & business awareness", critical_thinking_innovation: "Critical thinking & innovation" };
var V2SAMPLE = { 1: 0.97, 2: 0.95, 3: 0.98, 4: 0.96 };
function V2fmtDate(s) { var p = s.split("-"); return p[2] + " " + V2MONTHS[Number(p[1]) - 1] + " " + p[0]; }
function V2figures(rep) {
  var sn = rep.snapshot, k = sn.responsibilities.kpi, id = sn.identity.employeeId;
  var required = Math.round(sn.discipline.totalMinutes / 60), rate = V2SAMPLE[id] || 0.96, done = Math.round(required * rate);
  var overall = rep.overallRanking || [], me = overall.find(function (r) { return r.self; }), rank = sn.ranking ? sn.ranking.aggregateRank : (me ? me.position : null);
  var tied = me ? overall.filter(function (r) { return r.position === me.position; }).length : 0;
  var months = Math.round((new Date(sn.meta.periodEnd) - new Date(sn.meta.periodStart)) / 2629746000);
  var comps = sn.competencies.items, maxTotal = Math.max(1, ...comps.map(function (c) { return c.strengths + c.development; }));
  var ratingIdx = Math.max(0, V2RATINGS.indexOf(rep.rating && rep.rating.rating));
  return { sn: sn, id: id, name: sn.identity.displayName, first: V2first(sn.identity.displayName), title: sn.identity.jobTitle,
    period: V2fmtDate(sn.meta.periodStart) + " - " + V2fmtDate(sn.meta.periodEnd), months: months,
    required: required, done: done, pct: required ? Math.round(done / required * 100) : 0,
    completed: k.completedCount, scope: sn.responsibilities.items.length, orig: k.originalOnTimeCount, revised: k.effectiveOnTimeCount - k.originalOnTimeCount, late: k.completedCount - k.effectiveOnTimeCount,
    effPct: k.effectiveOnTimePercent == null ? null : Math.round(k.effectiveOnTimePercent),
    committees: sn.leadership.points.committeeCount, delegations: sn.leadership.points.delegationCount, points: sn.leadership.points.total,
    rank: rank, tied: tied, of: overall.length, self: sn.ranking ? sn.ranking.selfPosition : null, own: rep.ownRanking || [], overall: overall,
    comps: comps, maxTotal: maxTotal, ratingIdx: ratingIdx, notes: sn.notes.submittedCount, observations: sn.notes.entries.length, narrative: rep.narrative || {} };
}
function V2firstSentence(s) {
  s = String(s || "").trim(); var m = s.match(/^.*?[.!?](\s|$)/); s = (m ? m[0] : s).trim();
  if (s.length > 80) { var cut = Math.max(s.lastIndexOf(", ", 80), s.lastIndexOf(" and ", 80)); if (cut > 30) s = s.slice(0, cut).replace(/[,;:]$/, "") + "."; }
  return s;
}
function V2lc(s) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
function V2pick(c, cat) {
  var list = c.entries.filter(function (e) { return e.category === cat; }).map(function (e) { return e.text.trim(); });
  if (!list.length) return null;
  list.sort(function (a, b) { return a.length - b.length; });
  return list[0];
}

/* ---------- the Visual Scorecard (two A4 pages, drawn as vectors on the reference's coordinates) ---------- */
function V2doc(orientation) {
  var J = window.jspdf.jsPDF, A = window.__eapV2Assets, doc = new J({ unit: "pt", format: "a4", orientation: orientation || "portrait", compress: true });
  doc.addFileToVFS("PlexSans.ttf", A.sans); doc.addFont("PlexSans.ttf", "PlexSans", "normal");
  doc.addFileToVFS("PlexBold.ttf", A.bold); doc.addFont("PlexBold.ttf", "PlexBold", "normal");
  doc.addFileToVFS("PlexSerif.ttf", A.serif); doc.addFont("PlexSerif.ttf", "PlexSerif", "normal");
  return doc;
}
var V2C = { ink: "#201F1A", line: "#E5DECE", green: "#365C53", gold: "#94713E", card: "#F7F6F2", terra: "#B76C51", cream: "#F4EFE4", muted: "#69665E", white: "#FFFFFF" };
function V2ScorecardPdf(rep) {
  var F = V2figures(rep), doc = V2doc(), A = window.__eapV2Assets;
  function font(f, size, color) { doc.setFont(f, "normal"); doc.setFontSize(size); doc.setTextColor(color || V2C.ink); }
  function t(s, x, yy, f, size, color, opt) { font(f, size, color); doc.text(String(s), x, yy, opt || {}); }
  function rr(x, yy, w, h, r, fill, stroke, lw) { doc.setFillColor(fill); doc.setDrawColor(stroke || fill); doc.setLineWidth(lw == null ? 0.7 : lw); doc.roundedRect(x, yy, w, h, r, r, "FD"); }
  function dot(x, yy, r, fill) { doc.setFillColor(fill); doc.circle(x, yy, r, "F"); }
  function width(s, f, size) { font(f, size); return doc.getTextWidth(s); }
  /* runs: [{t, f, c}] wrapped into width; returns the last baseline */
  function runs(list, x, yy, w, lh, size, maxLines) {
    var words = [];
    list.forEach(function (r) { String(r.t).split(/(\s+)/).forEach(function (p) { if (p) words.push({ t: p, f: r.f, c: r.c }); }); });
    var lines = [[]], lw = 0;
    words.forEach(function (wd) {
      var ww = width(wd.t, wd.f, size);
      if (/^\s+$/.test(wd.t)) { if (lines[lines.length - 1].length) { lines[lines.length - 1].push(wd); lw += ww; } return; }
      if (lw + ww > w && lines[lines.length - 1].length) { var L = lines[lines.length - 1]; while (L.length && /^\s+$/.test(L[L.length - 1].t)) L.pop(); lines.push([]); lw = 0; }
      lines[lines.length - 1].push(wd); lw += ww;
    });
    if (maxLines && lines.length > maxLines) {
      lines = lines.slice(0, maxLines); var last = lines[maxLines - 1];
      while (last.length && (/^\s+$/.test(last[last.length - 1].t))) last.pop();
      var lw2 = last.reduce(function (a, b) { return a + width(b.t, b.f, size); }, 0);
      while (last.length > 1 && lw2 + width("…", "PlexSans", size) > w) { var rm = last.pop(); lw2 -= width(rm.t, rm.f, size); }
      while (last.length && /^\s+$/.test(last[last.length - 1].t)) last.pop();
      last[last.length - 1] = Object.assign({}, last[last.length - 1], { t: last[last.length - 1].t.replace(/[.,;:]$/, "") + "…" });
    }
    lines.forEach(function (L, i) {
      var cx = x;
      L.forEach(function (wd) { t(wd.t, cx, yy + i * lh, wd.f, size, wd.c || V2C.ink); cx += width(wd.t, wd.f, size); });
    });
    return yy + (lines.length - 1) * lh;
  }
  function header(eyebrow, title, sub) {
    t(eyebrow, 37, 40, "PlexBold", 9, V2C.gold, { charSpace: 0 });
    t(title, 37, 75, "PlexSerif", 27, V2C.ink);
    t(sub, 37, 95.5, "PlexSans", 10.5, V2C.ink);
    try { doc.addImage("data:image/png;base64," + A.emblem, "PNG", 535.28, 44.59, 23, 30.82); } catch (e) { /* no emblem */ }
  }
  function footer(page, note) {
    if (note) t(note, 37, 791.5, "PlexSans", 7.5, V2C.muted);
    doc.setDrawColor(V2C.line); doc.setLineWidth(0.7); doc.line(37, 800, 558.28, 800);
    t(F.name + " \xB7 Performance Assessment", 37, 815.5, "PlexSans", 7.5, V2C.muted);
    t(page + " / 2", 551.28, 816, "PlexBold", 8, V2C.gold, { align: "right" });
  }
  function center(s, cx, yy, f, size, color) { t(s, cx, yy, f, size, color, { align: "center" }); }

  /* ---- page 1: Results ---- */
  header("PERFORMANCE ASSESSMENT", F.name, F.title || "");
  rr(37, 108, 521.28, 51, 7, V2C.cream, V2C.line);
  t("ASSESSMENT PERIOD / " + F.months + " MONTHS", 51, 125, "PlexBold", 9, V2C.gold);
  t(F.period, 51, 149, "PlexBold", 18, V2C.ink);
  t("Results", 37, 191, "PlexSerif", 19, V2C.ink);
  rr(37, 203, 521.28, 128, 10, V2C.cream, V2C.line);
  t("SUGGESTED RATING", 51, 225, "PlexBold", 10, V2C.gold);
  var pills = [["Does not", "meet"], ["Partially", "meets"], ["Meets", "expectations"], ["Exceeds", "expectations"], ["Exceptional"]];
  pills.forEach(function (lines, i) {
    var x = 51 + i * 99.655, sel = i === F.ratingIdx;
    rr(x, 237, 94.655, 45, 6, sel ? V2C.green : V2C.card, sel ? V2C.green : V2C.line);
    lines.forEach(function (l, j) { center(l, x + 47.3276, 254.5 + j * 12, "PlexBold", 9.5, sel ? V2C.white : V2C.ink); });
  });
  var cx0 = 98.3276, step = 99.655, cs = cx0 + F.ratingIdx * step;
  doc.setLineWidth(5); doc.setDrawColor(V2C.line); doc.line(cx0, 304, cx0 + 4 * step, 304);
  doc.setDrawColor(V2C.green); if (F.ratingIdx > 0) doc.line(cx0, 304, cs, 304);
  for (var i = 0; i < 5; i++) dot(cx0 + i * step, 304, 3, i <= F.ratingIdx ? V2C.green : V2C.gold);
  dot(cs, 304, 9, V2C.white); dot(cs, 304, 6, V2C.green);
  var tiles = [
    ["DISCIPLINE", F.pct + "%", "Hours fulfilled", F.done + " / " + F.required + " h"],
    ["DELIVERY", String(F.completed), "Projects completed", F.scope + " in review scope"],
    ["LEADERSHIP", String(F.points), "Activity points", F.committees + " committee" + (F.committees === 1 ? "" : "s") + " + " + F.delegations + " delegation" + (F.delegations === 1 ? "" : "s")],
    ["RANKING", F.rank ? V2ord(F.rank) : "—", F.tied > 1 ? "Joint peer position" : "Peer position", "Self-placement: " + (F.self ? V2ord(F.self) : "—")],
  ];
  tiles.forEach(function (tl, i) {
    var x = 37 + i * 132.82, cx = x + 61.41;
    rr(x, 343, 122.82, 112, 10, V2C.card, V2C.line);
    t(tl[0], x + 9, 363, "PlexBold", 8, V2C.gold);
    center(tl[1], cx, 400, "PlexBold", 24, V2C.green);
    center(tl[2], cx, 416, "PlexBold", 10, V2C.ink);
    font("PlexSans", 8.5); doc.splitTextToSize(tl[3], 104).forEach(function (l, j) { center(l, cx, 432 + j * 11.47, "PlexSans", 8.5, V2C.muted); });
  });
  /* 01 delivery donut */
  rr(37, 467, 310, 180, 10, V2C.card, V2C.line);
  t("01", 51, 490, "PlexBold", 9, V2C.gold); t("Delivery performance", 77, 493, "PlexSerif", 14, V2C.ink);
  var segs = [[F.orig, V2C.green], [F.revised, V2C.gold], [F.late, V2C.terra]].filter(function (s) { return s[0] > 0; });
  var total = segs.reduce(function (a, s) { return a + s[0]; }, 0), DX = 102, DY = 570, R = 40, start = 90;
  doc.setLineWidth(9);
  function arc(a0, a1, color) {
    var pts = [], n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 2));
    for (var k = 0; k <= n; k++) { var a = (a0 + (a1 - a0) * k / n) * Math.PI / 180; pts.push([DX + R * Math.cos(a), DY - R * Math.sin(a)]); }
    doc.setDrawColor(color);
    doc.lines(pts.slice(1).map(function (p, k) { return [p[0] - pts[k][0], p[1] - pts[k][1]]; }), pts[0][0], pts[0][1], [1, 1], "S", false);
  }
  if (!total) arc(90, -270, V2C.line);
  else if (segs.length === 1) arc(90, -270, segs[0][1]);
  else segs.forEach(function (s) { var sweep = s[0] / total * 360; arc(start - 1.5, start - sweep + 1.5, s[1]); start -= sweep; });
  center(String(F.completed), DX, 574, "PlexBold", 27, V2C.green);
  center(F.completed === 1 ? "completion" : "completions", DX, 587, "PlexSans", 8, V2C.ink);
  [[F.orig + " met original deadline", V2C.green], [F.revised + " met revised deadline", V2C.gold], [F.late + " completed late", V2C.terra]].forEach(function (l, i) {
    dot(158, 535 + i * 29, 3.5, l[1]); t(l[0], 169, 538 + i * 29, "PlexSans", 10, V2C.ink);
  });
  /* 02 assessment summary */
  rr(359, 467, 199.28, 180, 10, V2C.card, V2C.line);
  t("02", 373, 490, "PlexBold", 9, V2C.gold); t("Assessment", 399, 493, "PlexSerif", 14, V2C.ink); t("summary", 399, 511.9, "PlexSerif", 14, V2C.ink);
  var N = F.narrative, strong = V2firstSentence((N.strengths && N.strengths[0] && N.strengths[0].summary) || N.keyInsight);
  var dev = (N.topDevelopmentPriority && (N.topDevelopmentPriority.summary || N.topDevelopmentPriority.title)) || (N.developmentAreas && N.developmentAreas[0] && N.developmentAreas[0].summary) || (N.suggestedPaths && N.suggestedPaths[0] && N.suggestedPaths[0].detail) || "Keep the current delivery standard.";
  var yEnd = runs([{ t: "Strong contribution:", f: "PlexBold" }, { t: " " + V2lc(strong), f: "PlexSans" }], 373, 539.3, 171, 14.175, 10.5, 3);
  runs([{ t: "Next priority:", f: "PlexBold" }, { t: " " + V2lc(V2firstSentence(dev)), f: "PlexSans" }], 373, yEnd + 22.18, 171, 14.175, 10.5, 3);
  /* 03 ranking comparison */
  rr(37, 659, 521.28, 110, 10, V2C.card, V2C.line);
  t("03", 51, 682, "PlexBold", 9, V2C.gold); t("Ranking comparison", 77, 685, "PlexSerif", 14, V2C.ink);
  t(F.rank ? "Peer result: " + (F.tied > 1 ? "joint " : "") + V2ord(F.rank) + " of " + F.of : "Peer result: no complete ranking round", 51, 712.4, "PlexBold", 10.5, V2C.green);
  var tieLine = F.tied > 1 && F.tied === F.of ? "All " + (F.of === 4 ? "four" : F.of) + " managers tied. " : F.tied > 1 ? F.tied + "-way tie. " : "";
  t(tieLine + F.first + "’s self-placement: " + (F.self ? V2ord(F.self) : "—") + ".", 51, 728.1, "PlexSans", 9.2, V2C.ink);
  var order = [{ t: F.first + "’s order:", f: "PlexBold" }];
  F.own.slice().sort(function (a, b) { return a.position - b.position; }).forEach(function (o, i) {
    order.push({ t: (i ? " \xB7 " : " "), f: "PlexSans" });
    order.push({ t: o.position + " " + V2first(o.name), f: o.self ? "PlexBold" : "PlexSans" });
  });
  if (F.own.length) runs(order, 51, 745.1, 490, 12, 9.2); else t(F.first + " has not submitted a ranking for this round.", 51, 745.1, "PlexSans", 9.2, V2C.ink);
  footer(1, "Attendance uses temporary sample figures." + (F.tied > 1 ? " Joint ranking is a " + (F.tied === 4 ? "four" : F.tied) + "-way tie;" : "") + " activity points are not a leadership score.");

  /* ---- page 2: Core Competencies ---- */
  doc.addPage();
  header("PERFORMANCE ASSESSMENT", "Core Competencies", F.name + " \xB7 " + (F.title || ""));
  rr(37, 108, 521.28, 34, 7, V2C.cream, V2C.line);
  t("ASSESSMENT PERIOD", 50, 127.5, "PlexBold", 8.5, V2C.gold); t(F.period, 183, 130, "PlexBold", 14, V2C.ink);
  rr(37, 153, 521.28, 174, 10, V2C.card, V2C.line);
  t("FEEDBACK PROFILE", 51, 175, "PlexBold", 9, V2C.gold);
  var RX = 111, RY = 245, RR = 45;
  function vtx(k, r) { var a = (90 - 60 * k) * Math.PI / 180; return [RX + r * Math.cos(a), RY - r * Math.sin(a)]; }
  function poly(pts, style) { doc.lines(pts.slice(1).map(function (p, k) { return [p[0] - pts[k][0], p[1] - pts[k][1]]; }), pts[0][0], pts[0][1], [1, 1], style, true); }
  doc.setDrawColor(V2C.line); doc.setLineWidth(0.6);
  [0.25, 0.5, 0.75, 1].forEach(function (f) { poly([0, 1, 2, 3, 4, 5].map(function (k) { return vtx(k, RR * f); }), "S"); });
  doc.setLineWidth(0.7);
  for (var k = 0; k < 6; k++) { var p2 = vtx(k, RR); doc.line(RX, RY, p2[0], p2[1]); }
  var comps = Xr.map(function (key) { return F.comps.find(function (c) { return c.key === key; }) || { key: key, strengths: 0, development: 0, entries: [] }; });
  var dpts = comps.map(function (c, k) { return vtx(k, (c.strengths + c.development) / F.maxTotal * RR); });
  doc.setFillColor(V2C.green); doc.setGState(new doc.GState({ opacity: 0.12 })); poly(dpts, "F");
  doc.setGState(new doc.GState({ opacity: 1 })); doc.setDrawColor(V2C.green); doc.setLineWidth(0.6); poly(dpts, "S");
  [[108.75, 194.4], [154.74, 220.95], [154.74, 274.05], [108.75, 300.6], [62.76, 274.05], [62.76, 220.95]].forEach(function (p, k) { t(String(k + 1), p[0], p[1], "PlexSans", 7.5, V2C.gold); });
  center("Observation volume", RX, 310, "PlexBold", 8, V2C.green);
  comps.forEach(function (c, i) {
    var yy = 175 + 23 * i, W = 349.28;
    t((i + 1) + ". " + V2SHORT[c.key], 193, yy + 0.5, "PlexSans", 9.5, V2C.ink);
    t(c.strengths + " / " + c.development, 542.28, yy, "PlexBold", 9, V2C.ink, { align: "right" });
    rr(193, yy + 6, W, 4, 2, V2C.line, V2C.line);
    var gw = c.strengths / F.maxTotal * W, tw = c.development / F.maxTotal * W;
    if (gw > 0) rr(193, yy + 6, gw, 4, 1, V2C.green, V2C.green);
    if (tw > 0) rr(193 + gw, yy + 6, tw, 4, 1, V2C.terra, V2C.terra);
  });
  t("Green: strengths / Terracotta: development \xB7 Counts are not scores", 193, 315.4, "PlexSans", 7.4, V2C.muted);
  comps.forEach(function (c, i) {
    var x = i % 2 ? 303.64 : 37, top = 340 + Math.floor(i / 2) * 146;
    rr(x, top, 254.64, 134, 10, V2C.card, V2C.line);
    rr(x + 12, top + 12, 23, 21, 5, V2C.cream, V2C.cream);
    center("0" + (i + 1), x + 23.5, top + 23.5, "PlexBold", 8.5, V2C.gold);
    font("PlexSerif", 11.5); var tl = doc.splitTextToSize(V2TITLE[c.key], 198);
    tl.forEach(function (l, j) { t(l, x + 44, top + 23.5 + j * 14, "PlexSerif", 11.5, V2C.ink); });
    var by = top + 23.5 + (tl.length - 1) * 14 + 22.5;
    var st = V2pick(c, "strength"), dv = V2pick(c, "development");
    var lines = tl.length > 1 ? 2 : 3;
    var e1 = runs([{ t: "Strengths", f: "PlexBold", c: V2C.green }, { t: " " + (st || "No strengths noted in this period."), f: "PlexSans" }], x + 13, by, 228, 13, 10, lines);
    runs([{ t: "Development", f: "PlexBold", c: V2C.terra }, { t: " " + (dv || "No development points noted in this period."), f: "PlexSans" }], x + 13, e1 + 21, 228, 13, 10, lines);
  });
  footer(2, "Based on " + F.notes + " submitted notes and " + F.observations + " observations from the assessment period.");
  doc.setProperties({ title: F.name + " | Performance Assessment", author: "Employee Assessment Platform" });
  return new Uint8Array(doc.output("arraybuffer"));
}

/* ---------- the one-page promotion form (النموذج التعريفي للترفيع), A4 landscape ---------- */
var V2AR_RATING = { "Does not meet": "لا يلبي التوقعات", "Partially meets": "يلبي التوقعات جزئياً", "Meets expectations": "يلبي التوقعات", "Exceeds expectations": "يفوق التوقعات", "Exceptional": "استثنائي" };
var V2AR_ORD = ["", "الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس"];
var V2AR_COMP = { ownership_accountability: "تحمّل المسؤولية والمساءلة", people_leadership_development: "قيادة الأفراد وتطويرهم", communication_stakeholder: "التواصل وإدارة الجهات المعنية",
  decision_making_problem_solving: "اتخاذ القرار وحل المشكلات", strategic_thinking_business_awareness: "التفكير الاستراتيجي", critical_thinking_innovation: "التفكير النقدي والابتكار" };
var V2AR_STR = { ownership_accountability: "متابعة الالتزامات حتى الإنجاز بسرعة ودقة.", people_leadership_development: "دعم الزملاء وتوجيههم في القرارات الصعبة.",
  communication_stakeholder: "وضوح الإحاطات التنفيذية وحسن التنسيق مع الجهات المعنية.", decision_making_problem_solving: "موازنة الأولويات واتخاذ قرارات عملية في الوقت المناسب.",
  strategic_thinking_business_awareness: "ربط العمل بأولويات المكتب وتبسيط القضايا المعقدة.", critical_thinking_innovation: "تطوير أساليب العمل ومراجعة الافتراضات بموضوعية." };
var V2AR_DEV = { ownership_accountability: "توضيح تفويض المسؤوليات قبل المراجعة القادمة.", people_leadership_development: "منح الفريق مسؤولية أكبر في إعداد المسودات والتسليم.",
  communication_stakeholder: "التصعيد المبكر للاعتماديات الخارجية قبل أن تؤثر على الجدول الزمني.", decision_making_problem_solving: "تقديم توصية مبدئية مبكراً مع توضيح الافتراضات.",
  strategic_thinking_business_awareness: "ربط مؤشرات المشاريع بنتائج الخطة التشغيلية بعيدة المدى.", critical_thinking_innovation: "تجربة الأساليب الجديدة على نطاق محدود قبل تعميمها." };
function V2dmy(s) { if (!s) return ""; var p = s.slice(0, 10).split("-"); return p[2] + "/" + p[1] + "/" + p[0]; }
/* ---- end of v2 ---- */
