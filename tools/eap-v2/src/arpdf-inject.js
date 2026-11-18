
/* ---- round 2 (tools/eap-v2/src/arpdf-inject.js): the Arabic reports ----------------------------------------------
   One-pager: النموذج التعريفي للتقييم, A4 landscape, every scorecard figure on one page.
   Full detailed report: the same first page, then الشخصية, then العمل and رأي القائد in detail.
   Drawn on a canvas (the browser shapes the Arabic in the Dubai font) and wrapped as PDF pages by jsPDF. */
var V2fontsReady = null;
function V2arabicFonts() {
  if (V2fontsReady) return V2fontsReady;
  var A = window.__eapV2Assets;
  function bytes(b64) { var bin = atob(b64), out = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }
  var list = [["400", A.dubaiRegular], ["500", A.dubaiMedium], ["700", A.dubaiBold]].map(function (f) { var ff = new FontFace("V2Dubai", bytes(f[1]), { weight: f[0] }); document.fonts.add(ff); return ff.load(); });
  var img = new Promise(function (ok) { var im = new Image(); im.onload = function () { ok(im); }; im.onerror = function () { ok(null); }; im.src = "data:image/png;base64," + A.emblem; });
  V2fontsReady = Promise.all(list).then(function () { return img; });
  return V2fontsReady;
}
var V2AR_SHORT = { ownership_accountability: "المسؤولية", people_leadership_development: "قيادة الأفراد", communication_stakeholder: "التواصل",
  decision_making_problem_solving: "اتخاذ القرار", strategic_thinking_business_awareness: "التفكير الاستراتيجي", critical_thinking_innovation: "التفكير النقدي" };
var V2AR_RATING_ORDER = ["لا يلبي التوقعات", "يلبي جزئياً", "يلبي التوقعات", "يفوق التوقعات", "استثنائي"];
var V2RX = /[؀-ۿ]/;
function V2my(s) { if (!s) return ""; var p = s.split("-"); return p[1] + "/" + p[0]; }

/* everything both reports print */
function V2arData(rep) {
  var F = V2figures(rep), id = F.id;
  var pr = V2one("select * from employee_profile_ar where employee_id = ?", [id]) || {};
  var emp = V2one("select * from employees where id = ?", [id]) || {};
  var roles = V2q("select * from employee_previous_roles where employee_id = ? order by started_on desc, position limit 2", [id]);
  var kpis = V2q("select * from job_kpis where employee_id = ? order by position, id", [id]);
  var evals = []; try { evals = JSON.parse(pr.evaluations || "[]"); } catch (e) { evals = []; }
  var names = {}; V2q("select e.id, e.display_name, p.name_ar from employees e left join employee_profile_ar p on p.employee_id = e.id").forEach(function (r) { names[r.display_name] = r.name_ar || r.display_name; });
  var comps = Xr.map(function (k) { return F.comps.find(function (c) { return c.key === k; }) || { key: k, strengths: 0, development: 0, entries: [] }; });
  var topS = comps.slice().sort(function (a, b) { return b.strengths - a.strengths || a.development - b.development; }).filter(function (c) { return c.strengths > 0; });
  var topD = comps.slice().sort(function (a, b) { return b.development - a.development || a.strengths - b.strengths; }).filter(function (c) { return c.development > 0; });
  var ratingEn = V2RATINGS[F.ratingIdx];
  var rec = F.ratingIdx >= 3 ? "يوصى بالتقدير المقترح والاستمرار في المسار الحالي" : F.ratingIdx === 2 ? "يوصى بالتقدير المقترح مع متابعة مجالات التطوير" : "يوصى بخطة تحسين واضحة قبل المراجعة القادمة";
  var positions = [[pr.workplace_ar || "ديوان ولي العهد", pr.title_ar || emp.job_title || "", V2my(emp.started_at), "حتى الآن"]]
    .concat(roles.map(function (r) { return [r.employer_ar || r.employer, r.title_ar || r.title, V2my(r.started_on), V2my(r.ended_on)]; }));
  return { F: F, pr: pr, emp: emp, kpis: kpis, evals: evals, names: names, comps: comps, topS: topS, topD: topD, ratingEn: ratingEn, ratingAr: V2AR_RATING[ratingEn], rec: rec, positions: positions,
    nameAr: pr.name_ar || F.name, kindAr: F.months >= 12 ? "التقييم السنوي" : "تقييم " + F.months + " أشهر",
    periodAr: V2dmy(F.sn.meta.periodStart) + " – " + V2dmy(F.sn.meta.periodEnd) };
}

/* a canvas page in PDF points (842 x 595), drawn at 3x */
function V2page() {
  var S = 3, W = 842, H = 595, cv = document.createElement("canvas");
  cv.width = W * S; cv.height = H * S;
  var g = cv.getContext("2d"); g.scale(S, S); g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
  var K = { ink: "#201F1A", line: "#E5DECE", green: "#365C53", gold: "#94713E", card: "#F7F6F2", terra: "#B76C51", cream: "#F4EFE4", muted: "#69665E",
    beige: "#EEEDE6", label: "#E7E5DB", gray: "#D9D9D5", gray2: "#CBCBC6", edge: "#BDB9A5", dot: "#A9A79A", bar: "#E3E1D6", frame: "#A99C7F" };
  var P = { cv: cv, g: g, K: K, W: W, H: H };
  P.font = function (size, weight) { g.font = (weight || 500) + " " + size + "px V2Dubai, 'Noto Kufi Arabic', sans-serif"; };
  P.txt = function (s, x, y, size, weight, color, align) {
    s = String(s == null ? "" : s); P.font(size, weight); g.fillStyle = color || K.ink;
    g.direction = V2RX.test(s) ? "rtl" : "ltr"; g.textAlign = align || "right"; g.textBaseline = "middle"; g.fillText(s, x, y);
  };
  P.width = function (s, size, weight) { P.font(size, weight); return g.measureText(String(s)).width; };
  P.fit = function (s, x, y, maxW, size, weight, color, align) { var sz = size; while (sz > 5 && P.width(s, sz, weight) > maxW) sz -= 0.25; P.txt(s, x, y, sz, weight, color, align); };
  P.wrap = function (s, maxW, size, weight) {
    var words = String(s).split(/\s+/), lines = [], cur = "";
    words.forEach(function (w) { var t = cur ? cur + " " + w : w; if (P.width(t, size, weight) > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
    if (cur) lines.push(cur); return lines;
  };
  /* right-aligned paragraph; returns the y after it */
  P.para = function (s, xRight, y, maxW, size, weight, color, lh, maxLines) {
    var lines = P.wrap(s, maxW, size, weight); if (maxLines && lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] += "…"; }
    lines.forEach(function (l, i) { P.txt(l, xRight, y + i * lh, size, weight, color); }); return y + lines.length * lh;
  };
  P.bullets = function (list, xRight, y, maxW, size, lh, yMax, dotColor) {
    list.forEach(function (s) {
      if (y > yMax) return;
      g.fillStyle = dotColor || K.gold; g.beginPath(); g.arc(xRight - 2.5, y, 1.8, 0, Math.PI * 2); g.fill();
      var lines = P.wrap(s, maxW - 10, size, 500);
      lines.forEach(function (l) { if (y <= yMax) P.txt(l, xRight - 9, y, size, 500, K.ink); y += lh; });
      y += lh * 0.35;
    });
    return y;
  };
  P.rect = function (x1, y1, x2, y2, fill, stroke, dash, lw) {
    if (fill) { g.fillStyle = fill; g.fillRect(x1, y1, x2 - x1, y2 - y1); }
    if (stroke) { g.save(); g.strokeStyle = stroke; g.lineWidth = lw || 0.6; g.setLineDash(dash ? [1.6, 1.6] : []); g.strokeRect(x1, y1, x2 - x1, y2 - y1); g.restore(); }
  };
  P.cell = function (x1, y1, x2, y2, fill) { P.rect(x1, y1, x2, y2, fill, K.dot, true, 0.6); };
  P.rr = function (x, y, w, h, r, fill, stroke, lw) {
    g.beginPath(); g.roundRect(x, y, w, h, r);
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 0.6; g.stroke(); }
  };
  P.dot = function (x, y, r, fill) { g.fillStyle = fill; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
  /* delivery donut, clockwise from the top: original (green), revised (gold), late (terracotta) */
  P.donut = function (cx, cy, r, lw, segs, center, caption) {
    var total = segs.reduce(function (a, s) { return a + s[0]; }, 0), start = -90;
    g.lineWidth = lw; g.lineCap = "butt";
    if (!total) { g.strokeStyle = K.line; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke(); }
    var live = segs.filter(function (s) { return s[0] > 0; });
    live.forEach(function (s) {
      var sweep = s[0] / total * 360, gap = live.length > 1 ? 1.5 : 0;
      g.strokeStyle = s[1]; g.beginPath(); g.arc(cx, cy, r, (start + gap) * Math.PI / 180, (start + sweep - gap) * Math.PI / 180); g.stroke(); start += sweep;
    });
    P.txt(center, cx, cy - 3, r * 0.62, 700, K.green, "center");
    P.txt(caption, cx, cy + r * 0.42, Math.max(6, r * 0.19), 500, K.ink, "center");
  };
  /* hexagon radar of observation volume; axis 1 at the top, clockwise */
  P.radar = function (cx, cy, R, values, max, labels) {
    function v(k, r) { var a = (-90 + 60 * k) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
    g.strokeStyle = K.line; g.lineWidth = 0.6;
    [0.25, 0.5, 0.75, 1].forEach(function (f) { g.beginPath(); for (var k = 0; k < 6; k++) { var p = v(k, R * f); k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); } g.closePath(); g.stroke(); });
    for (var k = 0; k < 6; k++) { var p = v(k, R); g.beginPath(); g.moveTo(cx, cy); g.lineTo(p[0], p[1]); g.stroke(); }
    g.beginPath(); values.forEach(function (val, k) { var p = v(k, val / max * R); k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.closePath();
    g.fillStyle = "rgba(54,92,83,.14)"; g.fill(); g.strokeStyle = K.green; g.lineWidth = 0.9; g.stroke();
    (labels || ["1", "2", "3", "4", "5", "6"]).forEach(function (l, k) { var p = v(k, R + 9); P.txt(l, p[0], p[1], 7, 700, K.gold, "center"); });
  };
  /* green strengths + terracotta development, growing leftwards from xRight */
  P.splitbar = function (xRight, y, w, h, s, dv, max) {
    P.rr(xRight - w, y, w, h, h / 2, K.line);
    var gw = s / max * w, tw = dv / max * w;
    if (gw > 0) P.rr(xRight - gw, y, gw, h, h / 2, K.green);
    if (tw > 0) P.rr(xRight - gw - tw, y, tw, h, h / 2, K.terra);
  };
  P.icon = function (kind, cx, cy, r) {
    P.dot(cx, cy, r, "#E9E9E9"); P.dot(cx, cy, r * 0.78, "#fff");
    g.save(); g.translate(cx, cy); g.scale(r / 40, r / 40); g.fillStyle = "#333"; g.strokeStyle = "#333"; g.lineWidth = 2.4;
    if (kind === "person") { g.beginPath(); g.arc(0, -7, 7, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(-13, 13); g.quadraticCurveTo(0, -3, 13, 13); g.closePath(); g.fill(); }
    if (kind === "work") { g.strokeRect(-15, -7, 30, 21); g.strokeRect(-6, -13, 12, 6); g.beginPath(); g.moveTo(-15, 2); g.lineTo(15, 2); g.stroke(); }
    if (kind === "leader") { g.beginPath(); g.arc(0, -15, 4.5, 0, Math.PI * 2); g.stroke(); g.strokeRect(-6, -9, 12, 9); g.strokeRect(-10, 0, 20, 4); g.beginPath(); g.moveTo(-7, 4); g.lineTo(-5, 20); g.lineTo(5, 20); g.lineTo(7, 4); g.stroke(); }
    g.restore();
  };
  return P;
}

/* the page header band, frame and footer shared by every page */
function V2arChrome(P, A, emblem, title, section, page, pages) {
  var K = P.K;
  P.rect(20, 14, 822, 72, K.beige, K.edge, false, 0.8);
  P.rect(20, 72, 822, 578, null, "#9C9C9C", true, 0.7);
  P.txt("سري للغاية", 421, 25, 9.5, 700, "#C00000", "center");
  P.txt(title, 806, 42, 21, 700, "#111");
  P.txt(A.kindAr + " · فترة التقييم " + A.periodAr + (section ? " · " + section : ""), 806, 62, 9, 500, K.muted);
  if (emblem) P.g.drawImage(emblem, 32, 22, 30, 40.2);
  P.txt(A.nameAr, 72, 36, 11, 700, K.ink, "left");
  P.txt(A.F.name, 72, 52, 8, 500, K.muted, "left");
  P.txt("سري للغاية · " + A.nameAr + " · " + title, 806, 587, 6.8, 500, K.muted);
  P.txt(page + " / " + pages, 36, 587, 7, 700, K.gold, "left");
}
function V2arHead(P, x1, x2, y, title) { P.rect(x1, y, x2, y + 15, P.K.label, P.K.dot, true, 0.6); P.txt(title, (x1 + x2) / 2, y + 8, 8.2, 700, P.K.ink, "center"); }
function V2arWork(A) {
  var F = A.F;
  return [
    "إنجاز " + F.completed + " من " + F.scope + " مسؤوليات ضمن نطاق التقييم.",
    F.orig + " في الموعد الأصلي، " + F.revised + " في الموعد المعدّل، " + F.late + " مكتملة متأخرة.",
    "الالتزام بالموعد المعتمد " + (F.effPct == null ? "—" : F.effPct + "%") + " · الانضباط " + F.pct + "%.",
    "القيادة: " + F.committees + " لجان و" + F.delegations + " تفويضات (" + F.points + " نقاط نشاط).",
    "مؤشرات الأداء المرتبطة بالوصف الوظيفي: " + A.kpis.length + " مؤشرات.",
  ];
}
function V2arPersonality(A, n) {
  var out = A.topS.slice(0, n).map(function (c) { return V2AR_STR[c.key]; });
  if (A.topD[0]) out.push("مجال التطوير: " + V2AR_DEV[A.topD[0].key]);
  return out.length ? out : ["لا توجد ملاحظات كافية في هذه الفترة."];
}
function V2arRank(A) {
  var F = A.F;
  return "الترتيب بين الأقران: " + (F.rank ? V2AR_ORD[F.rank] + (F.tied > 1 ? " (مشترك)" : "") + " من " + F.of : "—") + " · الترتيب الذاتي: " + (F.self ? V2AR_ORD[F.self] : "—") + ".";
}
function V2arLeader(A) {
  return ["التقدير المقترح: " + A.ratingAr + ".", V2arRank(A), A.rec + (A.topD[0] ? "، مع التركيز على " + V2AR_COMP[A.topD[0].key] + "." : ".")];
}

/* page 1: the one-pager */
function V2arPageOne(A, emblem, page, pages) {
  var P = V2page(), K = P.K, F = A.F, pr = A.pr, emp = A.emp;
  V2arChrome(P, A, emblem, "النموذج التعريفي للتقييم", null, page, pages);
  /* employee data tab */
  P.rr(712, 78, 94, 16, [3, 3, 0, 0], "#E5E3DA", "#CFCCBF"); P.txt("بيانات الموظف", 798, 86.5, 8.5, 500, "#8A8672");
  /* photo */
  P.rect(744, 96, 806, 182, K.beige, K.edge, false, 0.7);
  P.dot(775, 128, 13, "#DAD7CB"); P.g.fillStyle = "#DAD7CB"; P.g.beginPath(); P.g.ellipse(775, 180, 24, 20, 0, Math.PI, 0); P.g.fill();
  /* employee data grid: two label/value pairs per row */
  var rows = [["الاسم", A.nameAr, "المسمى الوظيفي", pr.title_ar || emp.job_title || ""], ["الرتبة الحالية", pr.rank_ar || "", "جهة العمل", pr.workplace_ar || "ديوان ولي العهد"],
    ["تاريخ التعيين", V2dmy(emp.started_at), "تاريخ الميلاد", V2dmy(pr.birth_date)], ["رقم الهوية الوطنية", pr.national_id || "", "الهاتف المتحرك", pr.mobile || ""]];
  rows.forEach(function (r, i) {
    var y1 = 96 + i * 21.5, y2 = y1 + 21.5, my = (y1 + y2) / 2;
    P.cell(670, y1, 738, y2, K.label); P.fit(r[0], 734, my, 62, 8, 700);
    P.cell(566, y1, 670, y2, "#fff"); P.fit(r[1], 665, my, 96, 8.2, 500);
    P.cell(498, y1, 566, y2, K.label); P.fit(r[2], 562, my, 62, 8, 700);
    P.cell(392, y1, 498, y2, "#fff"); P.fit(r[3], 493, my, 98, 8.2, 500);
  });
  /* annual evaluations and qualification */
  V2arHead(P, 28, 384, 96, "التقييم السنوي لآخر 3 سنوات");
  [[265, 384], [146, 265], [28, 146]].forEach(function (c, j) {
    var ev = A.evals[j] || [];
    P.cell(c[0], 111, c[1], 125, K.gray2); P.txt(ev[0] || "", (c[0] + c[1]) / 2, 118.5, 8, 700, K.ink, "center");
    P.cell(c[0], 125, c[1], 141, K.gray); P.fit(ev[1] || "", (c[0] + c[1]) / 2, 133.5, c[1] - c[0] - 8, 7.8, 500, K.ink, "center");
  });
  V2arHead(P, 28, 384, 146, "المؤهلات العلمية (آخر مؤهل دراسي)");
  P.cell(206, 161, 384, 172, K.gray2); P.txt("الشهادة/التخصص", 295, 166.8, 7.2, 700, K.ink, "center");
  P.cell(28, 161, 206, 172, K.gray2); P.txt("الجامعة / الكلية", 117, 166.8, 7.2, 700, K.ink, "center");
  P.cell(206, 172, 384, 182, "#fff"); P.fit(pr.degree_ar || "", 295, 177.3, 170, 7.4, 500, K.ink, "center");
  P.cell(28, 172, 206, 182, "#fff"); P.fit(pr.university_ar || "", 117, 177.3, 170, 7.4, 500, K.ink, "center");

  /* four figure tiles */
  var tiles = [
    ["الانضباط", F.pct + "%", "ساعات العمل المنجزة", F.done + " / " + F.required + " ساعة"],
    ["إنجاز المسؤوليات", String(F.completed), "مسؤوليات مكتملة", F.scope + " ضمن نطاق التقييم"],
    ["القيادة", String(F.points), "نقاط النشاط", F.committees + " لجان + " + F.delegations + " تفويضات"],
    ["الترتيب", F.rank ? V2AR_ORD[F.rank] : "—", F.tied > 1 ? "مركز مشترك بين الأقران" : "المركز بين الأقران", "الترتيب الذاتي: " + (F.self ? V2AR_ORD[F.self] : "—")],
  ];
  tiles.forEach(function (t, i) {
    var x = 714 - i * 98, cx = x + 46;
    P.rr(x, 190, 92, 72, 6, K.card, K.line);
    P.txt(t[0], x + 86, 201, 7.6, 700, K.gold);
    P.txt(t[1], cx, 222, 18, 700, K.green, "center");
    P.fit(t[2], cx, 241, 84, 7.6, 700, K.ink, "center");
    P.fit(t[3], cx, 253, 84, 6.8, 500, K.muted, "center");
  });
  /* suggested rating: lowest on the right, as Arabic reads */
  P.rr(28, 190, 384, 72, 7, K.cream, K.line);
  P.txt("التقدير المقترح", 404, 201, 8.2, 700, K.gold);
  for (var i = 0; i < 5; i++) {
    var px = 334 - i * 74, sel = i === F.ratingIdx;
    P.rr(px, 208, 70, 22, 4, sel ? K.green : K.card, sel ? K.green : K.line);
    P.fit(V2AR_RATING_ORDER[i], px + 35, 219.5, 64, 7.6, 700, sel ? "#fff" : K.ink, "center");
  }
  var c0 = 369, step = 74, cs = c0 - F.ratingIdx * step;
  P.g.lineWidth = 3.4; P.g.strokeStyle = K.line; P.g.beginPath(); P.g.moveTo(c0, 246); P.g.lineTo(c0 - 4 * step, 246); P.g.stroke();
  P.g.strokeStyle = K.green; P.g.beginPath(); P.g.moveTo(c0, 246); P.g.lineTo(cs, 246); P.g.stroke();
  for (var k = 0; k < 5; k++) P.dot(c0 - k * step, 246, 2.2, k <= F.ratingIdx ? K.green : K.gold);
  P.dot(cs, 246, 6.5, "#fff"); P.dot(cs, 246, 4.4, K.green);

  /* delivery donut */
  P.rr(566, 270, 240, 120, 7, K.card, K.line);
  P.txt("إنجاز المسؤوليات", 798, 283, 9, 700, K.ink); P.txt("01", 576, 283, 7.5, 700, K.gold, "left");
  P.donut(620, 336, 30, 8, [[F.orig, K.green], [F.revised, K.gold], [F.late, K.terra]], String(F.completed), "مكتملة");
  [[F.orig + " في الموعد الأصلي", K.green], [F.revised + " في الموعد المعدّل", K.gold], [F.late + " مكتملة متأخرة", K.terra]].forEach(function (l, j) {
    P.dot(792, 310 + j * 17, 3, l[1]); P.txt(l[0], 785, 310 + j * 17, 8, 500, K.ink);
  });
  P.txt("الالتزام بالموعد المعتمد: " + (F.effPct == null ? "—" : F.effPct + "%"), 798, 375, 7.4, 500, K.muted);
  /* competencies */
  P.rr(296, 270, 262, 120, 7, K.card, K.line);
  P.txt("الكفاءات: نقاط القوة / التطوير", 550, 283, 9, 700, K.ink); P.txt("02", 306, 283, 7.5, 700, K.gold, "left");
  A.comps.forEach(function (c, j) {
    var yy = 300 + j * 13.2;
    P.fit((j + 1) + ". " + V2AR_SHORT[c.key], 550, yy, 74, 7.3, 500, K.ink);
    P.splitbar(472, yy - 2.2, 138, 4.4, c.strengths, c.development, F.maxTotal);
    P.txt(c.strengths + " / " + c.development, 306, yy, 7.2, 700, K.ink, "left");
  });
  P.txt("الأخضر: نقاط القوة · التيراكوتا: التطوير · الأعداد ليست درجات", 550, 381, 6.4, 500, K.muted);
  /* last three positions */
  V2arHead(P, 28, 288, 270, "آخر ثلاث مناصب أو عمل المسند");
  P.cell(196, 285, 288, 300, K.gray); P.txt("جهة العمل", 242, 292.5, 7.4, 700, K.ink, "center");
  P.cell(100, 285, 196, 300, K.gray); P.txt("المسمى الوظيفي", 148, 292.5, 7.4, 700, K.ink, "center");
  P.cell(64, 285, 100, 300, K.gray); P.txt("من", 82, 292.5, 7.4, 700, K.ink, "center");
  P.cell(28, 285, 64, 300, K.gray); P.txt("إلى", 46, 292.5, 7.4, 700, K.ink, "center");
  [0, 1, 2].forEach(function (i) {
    var r = A.positions[i] || ["", "", "", ""], y1 = 300 + i * 30, y2 = y1 + 30, my = (y1 + y2) / 2;
    P.cell(196, y1, 288, y2, "#fff"); P.para(r[0], 284, my - (P.wrap(r[0], 84, 7, 500).length > 1 ? 4.5 : 0), 84, 7, 500, K.ink, 9, 2);
    P.cell(100, y1, 196, y2, "#fff"); P.para(r[1], 192, my - (P.wrap(r[1], 88, 7, 500).length > 1 ? 4.5 : 0), 88, 7, 500, K.ink, 9, 2);
    P.cell(64, y1, 100, y2, "#fff"); P.txt(r[2], 82, my, 6.8, 500, K.ink, "center");
    P.cell(28, y1, 64, y2, "#fff"); P.fit(r[3], 46, my, 33, 6.8, 500, K.ink, "center");
  });

  /* the three boxes */
  var boxes = [[554.7, 806, "الشخصيـة", "person", V2arPersonality(A, 2)], [291.3, 542.7, "العمـل", "work", V2arWork(A)], [28, 279.3, "رأي القائـد", "leader", V2arLeader(A)]];
  boxes.forEach(function (b) {
    P.rect(b[0], 398, b[1], 420, K.bar);
    P.icon(b[3], b[1] - 16, 409, 12.5);
    P.txt(b[2], b[1] - 36, 409.5, 10, 700, "#222");
    P.rr(b[0], 424, b[1] - b[0], 138, 3, null, K.frame, 1.1);
    P.bullets(b[4], b[1] - 8, 437, b[1] - b[0] - 16, 8, 11.6, 556);
  });
  P.txt("أرقام الحضور عينة مؤقتة · نقاط النشاط ليست درجة قيادية · بناءً على " + F.notes + " ملاحظة و" + F.observations + " مشاهدة", 421, 570, 6.4, 500, K.muted, "center");
  return P;
}

/* page 2: الشخصية in detail */
function V2arPagePersonality(A, emblem, page, pages) {
  var P = V2page(), K = P.K, F = A.F;
  V2arChrome(P, A, emblem, "التقرير التفصيلي للتقييم", "الشخصية والكفاءات الأساسية", page, pages);
  /* radar + summary on the left */
  P.rr(28, 84, 236, 214, 8, K.card, K.line);
  P.txt("ملف الملاحظات", 256, 98, 9, 700, K.gold);
  P.radar(146, 196, 70, A.comps.map(function (c) { return c.strengths + c.development; }), F.maxTotal);
  P.txt("حجم الملاحظات لكل كفاءة", 146, 286, 7.5, 700, K.green, "center");
  P.rr(28, 306, 236, 266, 8, "#fff", K.frame, 1);
  P.rect(28, 306, 264, 328, K.bar); P.icon("person", 248, 317, 10); P.txt("ملخص الشخصية", 232, 317.5, 9.5, 700);
  P.bullets(V2arPersonality(A, 3).concat(A.topD.slice(1, 2).map(function (c) { return "مجال تطوير إضافي: " + V2AR_DEV[c.key]; })), 256, 342, 220, 8.2, 12, 548);
  P.txt("بناءً على " + F.notes + " ملاحظة و" + F.observations + " مشاهدة خلال الفترة", 146, 562, 6.8, 500, K.muted, "center");
  /* six competency cards on the right */
  A.comps.forEach(function (c, i) {
    var col = i % 2, row = Math.floor(i / 2), x2 = 806 - col * 273, x1 = x2 - 263, y1 = 84 + row * 166, h = 156;
    P.rr(x1, y1, 263, h, 8, K.card, K.line);
    P.rr(x2 - 34, y1 + 10, 24, 20, 5, K.cream); P.txt("0" + (i + 1), x2 - 22, y1 + 20.5, 8, 700, K.gold, "center");
    P.txt(V2AR_COMP[c.key], x2 - 42, y1 + 20.5, 10.5, 700, K.ink);
    P.txt("نقاط القوة " + c.strengths + " · التطوير " + c.development, x2 - 12, y1 + 42, 7.6, 500, K.muted);
    P.splitbar(x1 + 132, y1 + 39.8, 120, 4.4, c.strengths, c.development, F.maxTotal);
    var yy = y1 + 60;
    P.txt("نقاط القوة", x2 - 12, yy, 8.4, 700, K.green);
    yy = P.para(c.strengths ? V2AR_STR[c.key] : "لم تُسجّل نقاط قوة في هذه الفترة.", x2 - 12, yy + 13, 239, 8.2, 500, K.ink, 11.5, 2);
    P.txt("التطوير", x2 - 12, yy + 6, 8.4, 700, K.terra);
    yy = P.para(c.development ? V2AR_DEV[c.key] : "لم تُسجّل ملاحظات تطوير في هذه الفترة.", x2 - 12, yy + 19, 239, 8.2, 500, K.ink, 11.5, 2);
    var verdict = c.strengths + c.development === 0 ? "لا توجد ملاحظات" : c.strengths > c.development ? "قوة واضحة" : c.development > c.strengths ? "أولوية للتطوير" : "متوازنة";
    P.rr(x1 + 10, y1 + h - 24, 70, 15, 7.5, c.strengths > c.development ? "#e6eeeb" : c.development > c.strengths ? "#f6e6e0" : K.cream);
    P.txt(verdict, x1 + 45, y1 + h - 16.3, 7.2, 700, c.strengths > c.development ? K.green : c.development > c.strengths ? "#9a4f37" : K.gold, "center");
  });
  return P;
}

/* page 3: العمل and رأي القائد in detail */
function V2arPageWork(A, emblem, page, pages) {
  var P = V2page(), K = P.K, F = A.F;
  V2arChrome(P, A, emblem, "التقرير التفصيلي للتقييم", "العمل ورأي القائد", page, pages);
  /* العمل, right half */
  var x1 = 424, x2 = 806;
  P.rect(x1, 84, x2, 106, K.bar); P.icon("work", x2 - 14, 95, 10); P.txt("العمل وإنجاز المسؤوليات", x2 - 30, 95.5, 10, 700);
  var mini = [["مكتملة", String(F.completed)], ["في الموعد الأصلي", F.completed ? Math.round(F.orig / F.completed * 100) + "%" : "—"], ["في الموعد المعتمد", F.effPct == null ? "—" : F.effPct + "%"], ["متأخرة", String(F.late)]];
  mini.forEach(function (m, i) { var bx = x2 - 92 - i * 96.7; P.rr(bx, 112, 92, 40, 6, K.card, K.line); P.txt(m[1], bx + 46, 127, 14, 700, K.green, "center"); P.fit(m[0], bx + 46, 144, 84, 7.2, 500, K.muted, "center"); });
  var cols = [[x2 - 150, x2, "المسؤولية"], [x2 - 208, x2 - 150, "الموعد الأصلي"], [x2 - 266, x2 - 208, "الموعد المعتمد"], [x2 - 322, x2 - 266, "تاريخ الإنجاز"], [x1, x2 - 322, "النتيجة"]];
  cols.forEach(function (c) { P.cell(c[0], 160, c[1], 176, K.gray); P.fit(c[2], (c[0] + c[1]) / 2, 168, c[1] - c[0] - 4, 7.2, 700, K.ink, "center"); });
  var items = F.sn.responsibilities.items, y = 176, maxRows = 11;
  items.slice(0, maxRows).forEach(function (it) {
    var res = it.completedInPeriod ? (it.originalOnTime ? ["في الموعد", K.green] : it.effectiveOnTime ? ["في الموعد المعدّل", K.gold] : ["متأخرة", K.terra]) : ["غير مكتملة", K.muted];
    cols.forEach(function (c) { P.cell(c[0], y, c[1], y + 17, "#fff"); });
    P.fit(it.title, x2 - 4, y + 8.5, 142, 7, 500, K.ink, "right");
    P.txt(V2dmy(it.originalDeadline), (cols[1][0] + cols[1][1]) / 2, y + 8.5, 6.8, 500, K.ink, "center");
    P.txt(V2dmy(it.effectiveDeadline), (cols[2][0] + cols[2][1]) / 2, y + 8.5, 6.8, 500, K.ink, "center");
    P.txt(it.completedOn ? V2dmy(it.completedOn) : "—", (cols[3][0] + cols[3][1]) / 2, y + 8.5, 6.8, 500, K.ink, "center");
    P.txt(res[0], (cols[4][0] + cols[4][1]) / 2, y + 8.5, 7.2, 700, res[1], "center");
    y += 17;
  });
  if (items.length > maxRows) { P.txt("و" + (items.length - maxRows) + " مسؤوليات أخرى ضمن الفترة", x2 - 4, y + 8, 6.8, 500, K.muted); y += 14; }
  y += 10;
  P.txt("مؤشرات الأداء المرتبطة بالوصف الوظيفي", x2, y, 9, 700, K.ink);
  y += 14;
  A.kpis.slice(0, 5).forEach(function (k, i) {
    P.rr(x1, y - 7, x2 - x1, 16, 4, i % 2 ? "#fff" : K.card);
    P.fit(k.title_ar || k.title, x2 - 8, y + 1, 250, 7.6, 500, K.ink);
    P.fit(k.target_ar || k.target, x1 + 8, y + 1, 100, 7.6, 700, K.green, "left");
    y += 18;
  });
  y += 6;
  P.txt("الانضباط والقيادة", x2, y, 9, 700, K.ink); y += 14;
  P.bullets(["الانضباط: " + F.pct + "% (" + F.done + " من " + F.required + " ساعة مطلوبة، أرقام عينة مؤقتة).",
    "القيادة: " + F.committees + " لجان و" + F.delegations + " تفويضات خلال الفترة، بإجمالي " + F.points + " نقاط نشاط."], x2, y, x2 - x1, 8, 11.5, 572);

  /* رأي القائد, left half */
  var l1 = 28, l2 = 408;
  P.rect(l1, 84, l2, 106, K.bar); P.icon("leader", l2 - 14, 95, 10); P.txt("رأي القائد", l2 - 30, 95.5, 10, 700);
  P.rr(l1, 112, l2 - l1, 62, 7, K.cream, K.line);
  P.txt("التقدير المقترح", l2 - 10, 124, 8.2, 700, K.gold);
  for (var i = 0; i < 5; i++) {
    var px = l2 - 82 - i * 74.4, sel = i === F.ratingIdx;
    P.rr(px, 132, 70, 20, 4, sel ? K.green : K.card, sel ? K.green : K.line);
    P.fit(V2AR_RATING_ORDER[i], px + 35, 142.5, 64, 7.4, 700, sel ? "#fff" : K.ink, "center");
  }
  P.txt("التقدير: " + A.ratingAr, l2 - 10, 164, 8.4, 700, K.green);
  var reasons = ["المسؤوليات: أُنجزت " + F.completed + " مسؤوليات، منها " + F.orig + " في الموعد الأصلي و" + (F.orig + F.revised) + " في الموعد المعتمد.",
    "الانضباط: نسبة " + F.pct + "% من الساعات المطلوبة (أرقام عينة).",
    "القيادة: " + F.committees + " لجان و" + F.delegations + " تفويضات (" + F.points + " نقاط نشاط)."];
  y = 190; P.txt("أسباب التقدير", l2, y, 9, 700, K.ink); y = P.bullets(reasons, l2, y + 14, l2 - l1, 8, 11.5, 572);
  y += 4; P.txt("مقارنة الترتيب", l2, y, 9, 700, K.ink); y += 14;
  P.txt(V2arRank(A), l2, y, 8, 500, K.ink); y += 14;
  var order = F.own.slice().sort(function (a, b) { return a.position - b.position; });
  if (order.length) {
    P.txt("ترتيب الموظف للزملاء:", l2, y, 8, 700, K.ink); y += 13;
    order.forEach(function (o) {
      P.rr(l2 - 150, y - 6.5, 150, 13, 3, o.self ? K.cream : "#fff");
      P.txt(V2AR_ORD[o.position] || o.position, l2 - 6, y, 7.6, 700, K.gold); P.txt(A.names[o.name] || o.name, l2 - 46, y, 7.6, o.self ? 700 : 500, K.ink); y += 14;
    });
  }
  y += 6; P.txt("التوصية وخطة التطوير", l2, y, 9, 700, K.ink); y += 14;
  var plan = [A.rec + "."].concat(A.topD.slice(0, 2).map(function (c) { return "تطوير " + V2AR_COMP[c.key] + ": " + V2AR_DEV[c.key]; }));
  var training = (F.sn.training || []), doneT = training.filter(function (t) { return t.status === "completed"; }).length, openT = training.length - doneT;
  plan.push("التدريب: " + doneT + " برامج مكتملة و" + openT + " قيد التنفيذ أو التخطيط خلال الفترة.");
  P.bullets(plan, l2, y, l2 - l1, 8, 11.5, 572);
  return P;
}

function V2arPdf(pages, title) {
  var doc = V2doc("landscape");
  pages.forEach(function (P, i) { if (i) doc.addPage("a4", "landscape"); doc.addImage(P.cv.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, 842, 595, undefined, "FAST"); });
  doc.setProperties({ title: title, author: "Employee Assessment Platform" });
  return new Uint8Array(doc.output("arraybuffer"));
}
/* the report's pages as canvases, for the PDF and for viewing on screen */
async function V2arPages(rep, kind) {
  var emblem = await V2arabicFonts(), A = V2arData(rep);
  var pages = kind === "form" ? [V2arPageOne(A, emblem, 1, 1)] : [V2arPageOne(A, emblem, 1, 3), V2arPagePersonality(A, emblem, 2, 3), V2arPageWork(A, emblem, 3, 3)];
  return { A: A, pages: pages };
}
async function V2FormPdf(rep) {
  var emblem = await V2arabicFonts(), A = V2arData(rep);
  return V2arPdf([V2arPageOne(A, emblem, 1, 1)], A.nameAr + " | النموذج التعريفي للتقييم");
}
async function V2DetailedPdf(rep) {
  var emblem = await V2arabicFonts(), A = V2arData(rep);
  return V2arPdf([V2arPageOne(A, emblem, 1, 3), V2arPagePersonality(A, emblem, 2, 3), V2arPageWork(A, emblem, 3, 3)], A.nameAr + " | التقرير التفصيلي للتقييم");
}
