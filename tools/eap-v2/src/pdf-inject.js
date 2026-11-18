
/* ---------- report downloads: two buttons, one-page form and Visual Scorecard ---------- */
function V2Downloads(x) {
  return y("div", { className: "flex flex-wrap gap-2 print:hidden", "data-v2-downloads": x.reportId, children: [
    d(V2Dl, { reportId: x.reportId, filename: x.filename, kind: "form", label: "One-page form (PDF)" }),
    d(V2Dl, { reportId: x.reportId, filename: x.filename, kind: "scorecard", label: "Visual Scorecard (PDF)" }),
  ] });
}
function V2fileName(name, kind) { return kind === "form" ? String(name).replace("Performance Assessment", "Promotion Form (one page)") : name; }
function V2Dl({ reportId: e, filename: t, kind: K, label: LB }) {
  var _a = (0, v.useState)(!1), busy = _a[0], setBusy = _a[1], _b = (0, v.useState)(""), err = _b[0], setErr = _b[1];
  async function go() {
    setBusy(!0); setErr("");
    try {
      var r = await fetch("/api/reports/" + e + "/pdf?kind=" + K, { cache: "no-store" });
      if (!r.ok) { var j = await r.json().catch(function () { return {}; }); throw new Error(j.error || "Could not download the PDF."); }
      var url = URL.createObjectURL(await r.blob()), a = document.createElement("a");
      a.href = url; a.download = V2fileName(t, K); document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 6e4);
    } catch (x) { setErr(x instanceof Error ? x.message : "Could not download the PDF."); } finally { setBusy(!1); }
  }
  return y("div", { children: [
    y(ne, { type: "button", size: "touch", variant: K === "form" ? "outline" : "default", disabled: busy, onClick: go, "data-v2-dl": K, children: [d(Cv, { className: "size-4", "aria-hidden": !0 }), " ", busy ? "Preparing PDF…" : LB] }),
    err && d("p", { role: "alert", className: "mt-2 max-w-sm text-sm text-red-700", children: err }),
  ] });
}
V2Dl.__eapClient = !0;
async function V2Pdf(report, kind) { return kind === "form" ? V2FormPdf(report) : V2ScorecardPdf(report); }

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
var V2fontsReady = null;
function V2arabicFonts(doc) {
  if (V2fontsReady) return V2fontsReady;
  var A = window.__eapV2Assets;
  function bytes(b64) { var bin = atob(b64), out = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }
  var list = [["400", A.dubaiRegular], ["500", A.dubaiMedium], ["700", A.dubaiBold]].map(function (f) { var ff = new FontFace("V2Dubai", bytes(f[1]), { weight: f[0] }); document.fonts.add(ff); return ff.load(); });
  V2fontsReady = Promise.all(list);
  return V2fontsReady;
}
async function V2FormPdf(rep) {
  await V2arabicFonts();
  var F = V2figures(rep), id = F.id;
  var pr = V2one("select * from employee_profile_ar where employee_id = ?", [id]) || {};
  var emp = V2one("select * from employees where id = ?", [id]) || {};
  var roles = V2q("select * from employee_previous_roles where employee_id = ? order by started_on desc, position limit 2", [id]);
  var kpiCount = (V2one("select count(*) as n from job_kpis where employee_id = ?", [id]) || { n: 0 }).n;
  var evals = []; try { evals = JSON.parse(pr.evaluations || "[]"); } catch (e) { evals = []; }

  var S = 3, W = 842, H = 595, cv = document.createElement("canvas");
  cv.width = W * S; cv.height = H * S;
  var g = cv.getContext("2d"), k = W / 1810;
  g.scale(S, S); g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
  g.scale(k, k); g.translate(-62, -17);   /* draw in the reference image's pixel space */
  var BEIGE = "#EEEDE6", LABEL = "#E7E5DB", GRAY = "#D6D6D2", GRAY2 = "#C9C9C5", EDGE = "#BDB9A5", DOT = "#A9A79A", INK = "#2B2B2B", GOLD = "#A99C7F";
  function rect(x1, y1, x2, y2, fill, stroke, dash, lw) {
    if (fill) { g.fillStyle = fill; g.fillRect(x1, y1, x2 - x1, y2 - y1); }
    if (stroke) { g.save(); g.strokeStyle = stroke; g.lineWidth = lw || 1.5; g.setLineDash(dash ? [3, 3] : []); g.strokeRect(x1, y1, x2 - x1, y2 - y1); g.restore(); }
  }
  function cell(x1, y1, x2, y2, fill) { rect(x1, y1, x2, y2, fill, DOT, true, 1.4); }
  function font(size, weight) { g.font = (weight || 500) + " " + size + "px V2Dubai, 'Noto Kufi Arabic', sans-serif"; }
  function txt(s, x, yy, size, weight, color, align) { font(size, weight); g.fillStyle = color || INK; g.direction = "rtl"; g.textAlign = align || "right"; g.textBaseline = "middle"; g.fillText(String(s == null ? "" : s), x, yy); }
  function fit(s, x, yy, maxW, size, weight, color, align) { var sz = size; font(sz, weight); while (sz > 12 && g.measureText(String(s)).width > maxW) { sz -= 1; font(sz, weight); } txt(s, x, yy, sz, weight, color, align); }
  function wrap(s, maxW, size, weight) {
    font(size, weight); var words = String(s).split(/\s+/), lines = [], cur = "";
    words.forEach(function (w) { var test = cur ? cur + " " + w : w; if (g.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test; });
    if (cur) lines.push(cur); return lines;
  }

  /* header band and frame */
  rect(80, 45, 1855, 222, BEIGE, EDGE, false, 1.5);
  rect(80, 222, 1855, 1246, null, "#9C9C9C", true, 1.4);
  txt("سري للغاية", 967, 73, 26, 700, "#C00000", "center");
  txt("النموذج التعريفي للترفيع", 1778, 132, 50, 700, "#111");
  /* employee data tab */
  g.fillStyle = "#E5E3DA"; g.beginPath(); g.moveTo(1528, 279); g.lineTo(1528, 244); g.quadraticCurveTo(1528, 236, 1536, 236); g.lineTo(1709, 236); g.quadraticCurveTo(1717, 236, 1717, 244); g.lineTo(1717, 279); g.closePath(); g.fill();
  g.strokeStyle = "#CFCCBF"; g.lineWidth = 1.2; g.stroke();
  txt("بيانات الموظف", 1698, 258, 21, 500, "#8A8672");

  /* right block: rank, name, workplace, title, hire date */
  var R = [[282, 334], [334, 381], [381, 431], [431, 488], [488, 536]];
  var rLabels = ["الرتبة الحالية :", "الاسم :", "جهة العمل:", "المسمى الوظيفي:", "تاريخ التعيين"];
  var rValues = [pr.rank_ar || "", pr.name_ar || F.name, pr.workplace_ar || "ديوان ولي العهد", pr.title_ar || emp.job_title || "", V2dmy(emp.started_at)];
  R.forEach(function (r, i) {
    cell(1518, r[0], 1717, r[1], LABEL); txt(rLabels[i], 1706, (r[0] + r[1]) / 2, 20, 700);
    if (i === 0) {
      cell(1385, r[0], 1518, r[1], "#fff"); fit(rValues[0], 1508, (r[0] + r[1]) / 2, 118, 18, 500);
      cell(1167, r[0], 1385, r[1], LABEL); txt("الرتبة المرشح إليها :", 1375, (r[0] + r[1]) / 2, 20, 700);
      cell(1050, r[0], 1167, r[1], "#fff"); fit(pr.target_rank_ar || "", 1158, (r[0] + r[1]) / 2, 100, 18, 500);
    } else { cell(1050, r[0], 1518, r[1], "#fff"); fit(rValues[i], 1505, (r[0] + r[1]) / 2, 440, 20, 500); }
  });
  /* middle block: mobile, last three annual evaluations, birth date, national ID, residence */
  cell(799, 282, 1043, 319, LABEL); txt("الهاتف المتحرك:", 1033, 300, 20, 700); cell(403, 282, 799, 319, "#fff"); txt(pr.mobile || "", 785, 300, 19, 500, INK);
  cell(799, 319, 1043, 414, LABEL); txt("التقييم السنوي لآخر 3", 1033, 353, 20, 700); txt("سنوات:", 1033, 379, 20, 700);
  var cols = [[669, 799], [540, 669], [403, 540]];
  cols.forEach(function (c, j) {
    var ev = evals[j] || [];
    cell(c[0], 319, c[1], 361, GRAY2); txt(ev[0] || "", (c[0] + c[1]) / 2, 340, 19, 700, INK, "center");
    cell(c[0], 361, c[1], 414, GRAY); fit(ev[1] || "", c[1] - 6, 387, c[1] - c[0] - 12, 16, 500);
  });
  [["تاريخ الميلاد:", 414, 452, V2dmy(pr.birth_date)], ["رقم الهوية الوطنية:", 452, 500, pr.national_id || ""], ["محل الإقامة:", 500, 538, pr.residence_ar || ""]].forEach(function (r) {
    cell(799, r[1], 1043, r[2], LABEL); txt(r[0], 1033, (r[1] + r[2]) / 2, 20, 700); cell(403, r[1], 799, r[2], "#fff"); fit(r[3], 785, (r[1] + r[2]) / 2, 370, 19, 500);
  });
  /* photo */
  rect(177, 280, 397, 535, BEIGE, EDGE, false, 1.5);
  g.fillStyle = "#DAD7CB"; g.beginPath(); g.arc(287, 380, 46, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(287, 505, 82, 60, 0, Math.PI, 0); g.fill();
  /* qualifications */
  cell(177, 546, 1717, 580, LABEL); txt("المؤهلات العلمية (آخر مؤهل دراسي)", 947, 563, 20, 700, INK, "center");
  cell(956, 580, 1717, 614, GRAY2); txt("الشهادة/التخصص", 1336, 597, 20, 700, INK, "center");
  cell(177, 580, 956, 614, GRAY2); txt("الجامعة / الكلية", 566, 597, 20, 700, INK, "center");
  cell(956, 614, 1717, 643, "#fff"); fit(pr.degree_ar || "", 1336, 629, 740, 18, 500, INK, "center");
  cell(177, 614, 956, 643, "#fff"); fit(pr.university_ar || "", 566, 629, 760, 18, 500, INK, "center");
  /* last three positions */
  cell(174, 667, 1715, 701, LABEL); txt("آخر ثلاث مناصب أو عمل المسند", 945, 684, 20, 700, INK, "center");
  cell(1258, 701, 1715, 769, GRAY); txt("جهة العمل", 1487, 735, 20, 700, INK, "center");
  cell(800, 701, 1258, 769, GRAY); txt("المسمى الوظيفي", 1029, 735, 20, 700, INK, "center");
  cell(174, 701, 800, 736, GRAY); txt("فترة العمل", 487, 718, 20, 700, INK, "center");
  cell(468, 736, 800, 769, GRAY); txt("من", 634, 752, 20, 700, INK, "center");
  cell(174, 736, 468, 769, GRAY); txt("إلى", 321, 752, 20, 700, INK, "center");
  var posRows = [[pr.workplace_ar || "ديوان ولي العهد", pr.title_ar || emp.job_title || "", V2dmy(emp.started_at), "حتى الآن"]]
    .concat(roles.map(function (r) { return [r.employer_ar || r.employer, r.title_ar || r.title, V2dmy(r.started_on), V2dmy(r.ended_on)]; }));
  [[769, 803], [803, 835], [835, 867]].forEach(function (r, i) {
    var row = posRows[i] || ["", "", "", ""], my = (r[0] + r[1]) / 2;
    cell(1258, r[0], 1715, r[1], "#fff"); fit(row[0], 1487, my, 440, 17, 500, INK, "center");
    cell(800, r[0], 1258, r[1], "#fff"); fit(row[1], 1029, my, 440, 17, 500, INK, "center");
    cell(468, r[0], 800, r[1], "#fff"); txt(row[2], 634, my, 17, 500, INK, "center");
    cell(174, r[0], 468, r[1], "#fff"); txt(row[3], 321, my, 17, 500, INK, "center");
  });

  /* the three boxes: personality, work, leader's opinion */
  var comps = F.comps.slice();
  var topS = comps.slice().sort(function (a, b) { return b.strengths - a.strengths || a.development - b.development; }).filter(function (c) { return c.strengths > 0; }).slice(0, 2);
  var topD = comps.slice().sort(function (a, b) { return b.development - a.development || a.strengths - b.strengths; }).filter(function (c) { return c.development > 0; })[0];
  var personality = topS.map(function (c) { return V2AR_STR[c.key]; });
  if (topD) personality.push("مجال التطوير: " + V2AR_DEV[topD.key]);
  if (!personality.length) personality.push("لا توجد ملاحظات كافية في هذه الفترة.");
  var work = [
    "إنجاز " + F.completed + " من أصل " + F.scope + " مشاريع ومهام خلال فترة التقييم.",
    F.orig + " في الموعد الأصلي، " + F.revised + " في الموعد المعدّل، " + F.late + " متأخرة.",
    "الالتزام بالموعد المعتمد: " + (F.effPct == null ? "—" : F.effPct + "%") + " · الانضباط: " + F.pct + "%.",
    "القيادة: " + F.committees + " لجان و" + F.delegations + " تفويضات · مؤشرات الأداء: " + kpiCount + ".",
  ];
  var ratingEn = V2RATINGS[F.ratingIdx], rec = F.ratingIdx >= 3 ? "يوصى بالترفيع" : F.ratingIdx === 2 ? "يوصى بالترفيع مع متابعة مجالات التطوير" : "لا يوصى بالترفيع في هذه المرحلة";
  var leader = [
    "التقدير المقترح: " + V2AR_RATING[ratingEn] + ".",
    "الترتيب بين الأقران: " + (F.rank ? V2AR_ORD[F.rank] + (F.tied > 1 ? " (مشترك)" : "") + " من " + F.of : "—") + " · الترتيب الذاتي: " + (F.self ? V2AR_ORD[F.self] : "—") + ".",
    rec + (topD ? "، مع التركيز على " + V2AR_COMP[topD.key] + "." : "."),
  ];
  function icon(kind, cx, cy) {
    g.save();
    g.fillStyle = "#E9E9E9"; g.beginPath(); g.arc(cx, cy, 40, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#fff"; g.beginPath(); g.arc(cx, cy, 31, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#D8D8D8"; g.lineWidth = 2; g.stroke();
    g.fillStyle = "#333"; g.strokeStyle = "#333"; g.lineWidth = 2;
    if (kind === "person") { g.beginPath(); g.arc(cx, cy - 7, 7, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(cx - 13, cy + 13); g.quadraticCurveTo(cx, cy - 3, cx + 13, cy + 13); g.closePath(); g.fill(); }
    if (kind === "work") { g.strokeRect(cx - 15, cy - 7, 30, 21); g.strokeRect(cx - 6, cy - 13, 12, 6); g.beginPath(); g.moveTo(cx - 15, cy + 2); g.lineTo(cx + 15, cy + 2); g.stroke(); g.beginPath(); g.arc(cx + 13, cy - 12, 5, 0, Math.PI * 2); g.stroke(); }
    if (kind === "leader") { g.beginPath(); g.arc(cx, cy - 15, 4.5, 0, Math.PI * 2); g.stroke(); g.strokeRect(cx - 6, cy - 9, 12, 9); g.strokeRect(cx - 10, cy, 20, 4); g.beginPath(); g.moveTo(cx - 7, cy + 4); g.lineTo(cx - 5, cy + 20); g.lineTo(cx + 5, cy + 20); g.lineTo(cx + 7, cy + 4); g.stroke(); }
    g.restore();
  }
  function box(x1, x2, barTop, title, kind, iconX, lines) {
    rect(x1, barTop, x2, barTop + 65, "#E3E1D6");
    txt(title, iconX - 70, barTop + 32, 21, 700, "#222", "right");
    icon(kind, iconX, barTop + 30);
    g.save(); g.strokeStyle = GOLD; g.lineWidth = 2.5; g.beginPath(); g.roundRect(x1, barTop + 71, x2 - x1, 227, 4); g.stroke(); g.restore();
    var yy = barTop + 98, maxW = x2 - x1 - 46;
    lines.forEach(function (l) {
      wrap(l, maxW, 17, 500).forEach(function (w, j) {
        if (yy > barTop + 288) return;
        if (j === 0) txt("•", x2 - 14, yy, 17, 700, GOLD);
        txt(w, x2 - 30, yy, 17, 500, INK); yy += 25;
      });
      yy += 6;
    });
  }
  box(1274, 1618, 916, "الشخصيـة", "person", 1562, personality);
  box(801, 1193, 920, "العمـل", "work", 1132, work);
  box(369, 713, 920, "رأي القائـد", "leader", 656, leader);

  var doc = V2doc("landscape");
  doc.addImage(cv.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, W, H, undefined, "FAST");
  doc.setProperties({ title: (pr.name_ar || F.name) + " | النموذج التعريفي للترفيع", author: "Employee Assessment Platform" });
  return new Uint8Array(doc.output("arraybuffer"));
}
/* ---- end of v2 ---- */
