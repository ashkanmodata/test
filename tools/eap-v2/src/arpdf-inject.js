
/* ---- tools/eap-v2/src/arpdf-inject.js: the assessment reports, in Arabic and in English ---------------------------
   One-pager (النموذج التعريفي للتقييم / Assessment Profile Form): every figure on one A4 landscape page.
   Full detailed report: the same first page, then personality, then work and the leader's opinion in detail.
   Each page is laid out once, right to left. Arabic draws it as is; English mirrors the layout (left to right) and
   draws its text unmirrored. Drawn on a canvas in the Dubai (Arabic) or IBM Plex (English) font, wrapped by jsPDF. */
var V2fontsReady = null;
function V2reportFonts() {
  if (V2fontsReady) return V2fontsReady;
  var A = window.__eapV2Assets;
  function bytes(b64) { var bin = atob(b64), out = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }
  var faces = [["V2Dubai", "400", A.dubaiRegular], ["V2Dubai", "500", A.dubaiMedium], ["V2Dubai", "700", A.dubaiBold], ["V2Plex", "400", A.sans], ["V2Plex", "500", A.sans], ["V2Plex", "700", A.bold]];
  var list = faces.map(function (f) { var ff = new FontFace(f[0], bytes(f[2]), { weight: f[1] }); document.fonts.add(ff); return ff.load(); });
  var img = new Promise(function (ok) { var im = new Image(); im.onload = function () { ok(im); }; im.onerror = function () { ok(null); }; im.src = "data:image/png;base64," + A.emblem; });
  V2fontsReady = Promise.all(list).then(function () { return img; });
  return V2fontsReady;
}
var V2RX = /[؀-ۿ]/;
function V2my(s) { if (!s) return ""; var p = s.split("-"); return p[1] + "/" + p[0]; }
/* the five-step scale, best first: Excellent … Very Poor (app ratings map onto it) */
var V2SCALE = { ar: ["ممتاز", "جيد جداً", "جيد", "ضعيف", "ضعيف جداً"], en: ["Excellent", "Very Good", "Good", "Poor", "Very Poor"] };
function V2scaleIdx(ratingIdx) { return 4 - ratingIdx; }   /* ratingIdx: 0 Does not meet … 4 Exceptional */
var V2AR_SHORT = { ownership_accountability: "المسؤولية", people_leadership_development: "قيادة الأفراد", communication_stakeholder: "التواصل",
  decision_making_problem_solving: "اتخاذ القرار", strategic_thinking_business_awareness: "التفكير الاستراتيجي", critical_thinking_innovation: "التفكير النقدي" };
var V2EN_STR = { ownership_accountability: "Follows commitments through to delivery, quickly and accurately.", people_leadership_development: "Supports and coaches colleagues through difficult decisions.",
  communication_stakeholder: "Gives clear executive briefings and coordinates well with stakeholders.", decision_making_problem_solving: "Balances priorities and takes practical, timely decisions.",
  strategic_thinking_business_awareness: "Links work to office priorities and simplifies complex issues.", critical_thinking_innovation: "Improves ways of working and challenges weak assumptions." };
var V2EN_DEV = { ownership_accountability: "Make delegated ownership explicit before the next review.", people_leadership_development: "Give the team more responsibility for drafts and delivery.",
  communication_stakeholder: "Escalate external dependencies before they affect the timeline.", decision_making_problem_solving: "Offer a provisional recommendation sooner, with assumptions stated.",
  strategic_thinking_business_awareness: "Link project measures to longer-term operating-plan outcomes.", critical_thinking_innovation: "Trial new approaches on a small scale before rolling them out." };

/* every phrase the reports print, per language */
var V2T = {
  ar: {
    secret: "سري للغاية", form: "النموذج التعريفي للتقييم", detailed: "التقرير التفصيلي للتقييم", period: "فترة التقييم",
    kind: function (m) { return m >= 12 ? "التقييم السنوي" : "تقييم " + m + " أشهر"; },
    secPersonality: "الشخصية والكفاءات الأساسية", secWork: "العمل ورأي القائد", tab: "بيانات الموظف",
    grid: ["الاسم", "المسمى الوظيفي", "المستوى الوظيفي", "جهة العمل", "تاريخ التعيين", "تاريخ الميلاد", "رقم الهوية الوطنية", "الهاتف المتحرك"],
    evals: "التقييم السنوي لآخر 3 سنوات", qual: "المؤهلات العلمية (آخر مؤهل دراسي)", degree: "الشهادة/التخصص", uni: "الجامعة / الكلية",
    tiles: ["الانضباط", "إنجاز المسؤوليات", "القيادة", "الترتيب"],
    hours: "ساعات العمل المنجزة", hoursOf: function (d, r) { return d + " / " + r + " ساعة"; }, completed: "مسؤوليات مكتملة", scope: function (n) { return n + " ضمن نطاق التقييم"; },
    points: "نقاط النشاط", lead: function (c, d) { return c + " لجان + " + d + " تفويضات"; }, jointPeer: "مركز مشترك بين الأقران", peer: "المركز بين الأقران",
    selfPlace: function (o) { return "الترتيب الذاتي: " + o; }, rating: "التقدير المقترح",
    delivery: "إنجاز المسؤوليات", donut: "مكتملة", legend: [" في الموعد الأصلي", " في الموعد المعدّل", " مكتملة متأخرة"], onApproved: function (p) { return "الالتزام بالموعد المعتمد: " + p; },
    comps: "الكفاءات: نقاط القوة / التطوير", compsKey: "الأخضر: نقاط القوة · التيراكوتا: التطوير · الأعداد ليست درجات",
    positions: "آخر ثلاث مناصب أو عمل المسند", posHead: ["جهة العمل", "المسمى الوظيفي", "من", "إلى"], present: "حتى الآن",
    boxes: ["الشخصيـة", "العمـل", "رأي القائـد"],
    foot: function (n, o) { return "أرقام الحضور عينة مؤقتة · نقاط النشاط ليست درجة قيادية · بناءً على " + n + " ملاحظة و" + o + " مشاهدة"; },
    ord: function (n) { return ["", "الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس"][n] || String(n); },
    comp: V2AR_COMP, short: V2AR_SHORT, str: V2AR_STR, dev: V2AR_DEV, devArea: "مجال التطوير: ", devMore: "مجال تطوير إضافي: ", noNotes: "لا توجد ملاحظات كافية في هذه الفترة.",
    work: function (F, k) { return ["إنجاز " + F.completed + " من " + F.scope + " مسؤوليات ضمن نطاق التقييم.", F.orig + " في الموعد الأصلي، " + F.revised + " في الموعد المعدّل، " + F.late + " مكتملة متأخرة.",
      "الالتزام بالموعد المعتمد " + (F.effPct == null ? "—" : F.effPct + "%") + " · الانضباط " + F.pct + "%.", "القيادة: " + F.committees + " لجان و" + F.delegations + " تفويضات (" + F.points + " نقاط نشاط).",
      "مؤشرات الأداء المرتبطة بالوصف الوظيفي: " + k + " مؤشرات."]; },
    ratingLine: function (r) { return "التقدير المقترح: " + r + "."; },
    rankLine: function (F, o) { return "الترتيب بين الأقران: " + (F.rank ? o(F.rank) + (F.tied > 1 ? " (مشترك)" : "") + " من " + F.of : "—") + " · الترتيب الذاتي: " + (F.self ? o(F.self) : "—") + "."; },
    rec: ["يوصى بخطة تحسين واضحة قبل المراجعة القادمة", "يوصى بخطة تحسين واضحة قبل المراجعة القادمة", "يوصى بالتقدير المقترح مع متابعة مجالات التطوير", "يوصى بالتقدير المقترح والاستمرار في المسار الحالي", "يوصى بالتقدير المقترح والاستمرار في المسار الحالي"],
    focus: function (c) { return "، مع التركيز على " + c + "."; },
    profile: "ملف الملاحظات", volume: "حجم الملاحظات لكل كفاءة", summary: "ملخص الشخصية", basis: function (n, o) { return "بناءً على " + n + " ملاحظة و" + o + " مشاهدة خلال الفترة"; },
    counts: function (s, d) { return "نقاط القوة " + s + " · التطوير " + d; }, strengths: "نقاط القوة", development: "التطوير",
    noStr: "لم تُسجّل نقاط قوة في هذه الفترة.", noDev: "لم تُسجّل ملاحظات تطوير في هذه الفترة.", verdict: ["لا توجد ملاحظات", "قوة واضحة", "أولوية للتطوير", "متوازنة"],
    workTitle: "العمل وإنجاز المسؤوليات", mini: ["مكتملة", "في الموعد الأصلي", "في الموعد المعتمد", "متأخرة"],
    table: ["المسؤولية", "الموعد الأصلي", "الموعد المعتمد", "تاريخ الإنجاز", "النتيجة"], results: ["في الموعد", "في الموعد المعدّل", "متأخرة", "غير مكتملة"],
    more: function (n) { return "و" + n + " مسؤوليات أخرى ضمن الفترة"; }, kpis: "مؤشرات الأداء المرتبطة بالوصف الوظيفي", discLead: "الانضباط والقيادة",
    discLine: function (F) { return "الانضباط: " + F.pct + "% (" + F.done + " من " + F.required + " ساعة مطلوبة، أرقام عينة مؤقتة)."; },
    leadLine: function (F) { return "القيادة: " + F.committees + " لجان و" + F.delegations + " تفويضات خلال الفترة، بإجمالي " + F.points + " نقاط نشاط."; },
    leader: "رأي القائد", ratingIs: function (r) { return "التقدير: " + r; }, reasons: "أسباب التقدير",
    reasonLines: function (F) { return ["المسؤوليات: أُنجزت " + F.completed + " مسؤوليات، منها " + F.orig + " في الموعد الأصلي و" + (F.orig + F.revised) + " في الموعد المعتمد.", "الانضباط: نسبة " + F.pct + "% من الساعات المطلوبة (أرقام عينة).", "القيادة: " + F.committees + " لجان و" + F.delegations + " تفويضات (" + F.points + " نقاط نشاط)."]; },
    rankCmp: "مقارنة الترتيب", ownOrder: "ترتيب الموظف للزملاء:", plan: "التوصية وخطة التطوير",
    devPlan: function (c, d) { return "تطوير " + c + ": " + d; }, training: function (a, b) { return "التدريب: " + a + " برامج مكتملة و" + b + " قيد التنفيذ أو التخطيط خلال الفترة."; },
    pdfTitle: { form: "النموذج التعريفي للتقييم", detailed: "التقرير التفصيلي للتقييم" },
    opinionTitle: "رأي القائد المستند إلى ملاحظاته", ratingBasis: "مقترح بناءً على ملاحظات القائد وسجل الإنجاز",
    opinion: function (o) {
      var t = "تُظهر ملاحظات القائد خلال الفترة (" + o.notes + " ملاحظة) أن أبرز نقاط القوة " + (o.s1 ? "هي " + o.s1 + (o.s2 ? " و" + o.s2 : "") + "، إذ سُجّلت " + o.sn + " ملاحظات إيجابية في " + o.s1 + "." : "لم تتضح بعد.");
      if (o.d1) t += " أما أولوية التطوير فهي " + o.d1 + " (" + o.dn + " ملاحظات): " + o.dtext;
      return t + " وبناءً على ذلك يرى القائد أن التقدير المناسب هو «" + o.rating + "».";
    },
  },
  en: {
    secret: "STRICTLY CONFIDENTIAL", form: "Assessment Profile Form", detailed: "Detailed Assessment Report", period: "Assessment period",
    kind: function (m) { return m >= 12 ? "Annual assessment" : m + "-month assessment"; },
    secPersonality: "Personality and core competencies", secWork: "Work and the leader's opinion", tab: "Employee data",
    grid: ["Name", "Job title", "Seniority", "Organisation", "Joining date", "Date of birth", "National ID", "Mobile"],
    evals: "Annual evaluation, last 3 years", qual: "Academic qualification (latest)", degree: "Degree / specialisation", uni: "University / college",
    tiles: ["DISCIPLINE", "DELIVERY", "LEADERSHIP", "RANKING"],
    hours: "Hours fulfilled", hoursOf: function (d, r) { return d + " / " + r + " h"; }, completed: "Responsibilities completed", scope: function (n) { return n + " in review scope"; },
    points: "Activity points", lead: function (c, d) { return c + " committees + " + d + " delegations"; }, jointPeer: "Joint peer position", peer: "Peer position",
    selfPlace: function (o) { return "Self-placement: " + o; }, rating: "SUGGESTED RATING",
    delivery: "Delivery of responsibilities", donut: "completed", legend: [" met original deadline", " met revised deadline", " completed late"], onApproved: function (p) { return "On approved deadline: " + p; },
    comps: "Competencies: strengths / development", compsKey: "Green: strengths · Terracotta: development · counts are not scores",
    positions: "Last three positions", posHead: ["Organisation", "Job title", "From", "To"], present: "Present",
    boxes: ["Personality", "Work", "Leader's opinion"],
    foot: function (n, o) { return "Attendance uses temporary sample figures · activity points are not a leadership score · based on " + n + " notes and " + o + " observations"; },
    ord: function (n) { return V2ord(n); },
    comp: V2TITLE, short: V2SHORT, str: V2EN_STR, dev: V2EN_DEV, devArea: "Development area: ", devMore: "Further development area: ", noNotes: "Not enough notes in this period.",
    work: function (F, k) { return [F.completed + " of " + F.scope + " responsibilities completed in the review period.", F.orig + " met the original deadline, " + F.revised + " a revised deadline, " + F.late + " completed late.",
      "On approved deadline " + (F.effPct == null ? "—" : F.effPct + "%") + " · discipline " + F.pct + "%.", "Leadership: " + F.committees + " committees and " + F.delegations + " delegations (" + F.points + " activity points).",
      k + " KPIs linked to the job description."]; },
    ratingLine: function (r) { return "Suggested rating: " + r + "."; },
    rankLine: function (F, o) { return "Peer ranking: " + (F.rank ? (F.tied > 1 ? "joint " : "") + o(F.rank) + " of " + F.of : "—") + " · self-ranking: " + (F.self ? o(F.self) : "—") + "."; },
    rec: ["Recommended: agree a clear improvement plan before the next review", "Recommended: agree a clear improvement plan before the next review", "Recommended: confirm the suggested rating and follow up the development areas", "Recommended: confirm the suggested rating and continue on the current path", "Recommended: confirm the suggested rating and continue on the current path"],
    focus: function (c) { return ", focusing on " + c.toLowerCase() + "."; },
    profile: "FEEDBACK PROFILE", volume: "Observation volume per competency", summary: "Personality summary", basis: function (n, o) { return "Based on " + n + " notes and " + o + " observations in the period"; },
    counts: function (s, d) { return "Strengths " + s + " · Development " + d; }, strengths: "Strengths", development: "Development",
    noStr: "No strengths noted in this period.", noDev: "No development points noted in this period.", verdict: ["No notes", "Clear strength", "Development priority", "Balanced"],
    workTitle: "Work and delivery of responsibilities", mini: ["Completed", "On original deadline", "On approved deadline", "Late"],
    table: ["Responsibility", "Original deadline", "Approved deadline", "Completed", "Result"], results: ["On time", "Revised deadline", "Late", "Not completed"],
    more: function (n) { return "and " + n + " more responsibilities in the period"; }, kpis: "KPIs linked to the job description", discLead: "Discipline and leadership",
    discLine: function (F) { return "Discipline: " + F.pct + "% (" + F.done + " of " + F.required + " required hours, temporary sample figures)."; },
    leadLine: function (F) { return "Leadership: " + F.committees + " committees and " + F.delegations + " delegations in the period, " + F.points + " activity points in total."; },
    leader: "Leader's opinion", ratingIs: function (r) { return "Rating: " + r; }, reasons: "Reasons for the rating",
    reasonLines: function (F) { return ["Responsibilities: " + F.completed + " completed, " + F.orig + " on the original deadline and " + (F.orig + F.revised) + " on the approved deadline.", "Discipline: " + F.pct + "% of the required hours (sample figures).", "Leadership: " + F.committees + " committees and " + F.delegations + " delegations (" + F.points + " activity points)."]; },
    rankCmp: "Ranking comparison", ownOrder: "The employee's own order:", plan: "Recommendation and development plan",
    devPlan: function (c, d) { return "Develop " + c.toLowerCase() + ": " + d; }, training: function (a, b) { return "Training: " + a + " programmes completed and " + b + " in progress or planned in the period."; },
    pdfTitle: { form: "Assessment Profile Form", detailed: "Detailed Assessment Report" },
    opinionTitle: "Leader's opinion, formed from the manager's notes", ratingBasis: "Suggested from the manager's notes and the delivery record", words: "In the manager's words",
    opinion: function (o) {
      var t = o.insight ? o.insight : "The manager's notes (" + o.notes + " in the period) point to " + (o.s1 ? o.s1.toLowerCase() + (o.s2 ? " and " + o.s2.toLowerCase() : "") + " as the clearest strengths." : "no clear strength yet.") + (o.d1 ? " The main development priority is " + o.d1.toLowerCase() + ": " + o.dtext : "");
      return t + " On this basis the leader supports a rating of " + o.rating + ".";
    },
  },
};

/* everything both reports print */
function V2arData(rep, lang) {
  var F = V2figures(rep), id = F.id, en = lang === "en", T = V2T[en ? "en" : "ar"];
  var pr = V2one("select * from employee_profile_ar where employee_id = ?", [id]) || {};
  var emp = V2one("select * from employees where id = ?", [id]) || {};
  var roles = V2q("select * from employee_previous_roles where employee_id = ? order by started_on desc, position limit 2", [id]);
  var kpis = V2q("select * from job_kpis where employee_id = ? order by position, id", [id]);
  var evals = []; try { evals = JSON.parse((en ? pr.evaluations_en : pr.evaluations) || "[]"); } catch (e) { evals = []; }
  var names = {}; V2q("select e.display_name, p.name_ar from employees e left join employee_profile_ar p on p.employee_id = e.id").forEach(function (r) { names[r.display_name] = en ? r.display_name : r.name_ar || r.display_name; });
  var comps = Xr.map(function (k) { return F.comps.find(function (c) { return c.key === k; }) || { key: k, strengths: 0, development: 0, entries: [] }; });
  var topS = comps.slice().sort(function (a, b) { return b.strengths - a.strengths || a.development - b.development; }).filter(function (c) { return c.strengths > 0; });
  var topD = comps.slice().sort(function (a, b) { return b.development - a.development || a.strengths - b.strengths; }).filter(function (c) { return c.development > 0; });
  var si = V2scaleIdx(F.ratingIdx), ratingLabel = V2SCALE[en ? "en" : "ar"][si];
  var current = en ? [pr.workplace_en || "Crown Prince Court", emp.job_title || "", V2my(emp.started_at), T.present] : [pr.workplace_ar || "ديوان ولي العهد", pr.title_ar || emp.job_title || "", V2my(emp.started_at), T.present];
  var positions = [current].concat(roles.map(function (r) { return en ? [r.employer, r.title, V2my(r.started_on), V2my(r.ended_on)] : [r.employer_ar || r.employer, r.title_ar || r.title, V2my(r.started_on), V2my(r.ended_on)]; }));
  return { F: F, T: T, en: en, pr: pr, emp: emp, kpis: kpis, evals: evals, names: names, comps: comps, topS: topS, topD: topD, si: si, ratingLabel: ratingLabel, positions: positions,
    name: en ? F.name : pr.name_ar || F.name, otherName: en ? (pr.name_ar || "") : F.name, title: en ? (emp.job_title || "") : (pr.title_ar || emp.job_title || ""),
    kindLabel: T.kind(F.months), periodLabel: V2dmy(F.sn.meta.periodStart) + " – " + V2dmy(F.sn.meta.periodEnd),
    grid: en ? [F.name, emp.job_title || "", pr.seniority_en || "", pr.workplace_en || "Crown Prince Court", V2dmy(emp.started_at), V2dmy(pr.birth_date), pr.national_id || "", pr.mobile || ""]
      : [pr.name_ar || F.name, pr.title_ar || emp.job_title || "", pr.seniority_ar || "", pr.workplace_ar || "ديوان ولي العهد", V2dmy(emp.started_at), V2dmy(pr.birth_date), pr.national_id || "", pr.mobile || ""],
    degree: en ? pr.degree_en || "" : pr.degree_ar || "", university: en ? pr.university_en || "" : pr.university_ar || "" };
}

/* a canvas page in PDF points (842 x 595) at 3x; laid out right to left, mirrored for English */
function V2page(A) {
  var S = 3, W = 842, H = 595, M = !!(A && A.en), cv = document.createElement("canvas");
  cv.width = W * S; cv.height = H * S;
  var g = cv.getContext("2d");
  function base() { if (M) g.setTransform(-S, 0, 0, S, W * S, 0); else g.setTransform(S, 0, 0, S, 0, 0); }
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = "#fff"; g.fillRect(0, 0, cv.width, cv.height); base();
  var K = { ink: "#201F1A", line: "#E5DECE", green: "#365C53", gold: "#94713E", card: "#F7F6F2", terra: "#B76C51", cream: "#F4EFE4", muted: "#69665E",
    beige: "#EEEDE6", label: "#E7E5DB", gray: "#D9D9D5", gray2: "#CBCBC6", edge: "#BDB9A5", dot: "#A9A79A", bar: "#E3E1D6", frame: "#A99C7F" };
  var family = M ? "V2Plex, 'IBM Plex Sans', sans-serif" : "V2Dubai, 'Noto Kufi Arabic', sans-serif", scale = M ? 0.92 : 1;
  var P = { cv: cv, g: g, K: K, W: W, H: H, M: M };
  P.font = function (size, weight) { g.font = (weight || 500) + " " + (size * scale) + "px " + family; };
  P.txt = function (s, x, y, size, weight, color, align) {
    s = String(s == null ? "" : s); P.font(size, weight); g.fillStyle = color || K.ink;
    var al = align || "right";
    if (M) { x = W - x; al = al === "right" ? "left" : al === "left" ? "right" : al; }
    g.save(); g.setTransform(S, 0, 0, S, 0, 0);
    g.direction = V2RX.test(s) ? "rtl" : "ltr"; g.textAlign = al; g.textBaseline = "middle"; g.fillText(s, x, y);
    g.restore();
  };
  P.image = function (img, x, y, w, h) { g.save(); g.setTransform(S, 0, 0, S, 0, 0); g.drawImage(img, M ? W - x - w : x, y, w, h); g.restore(); };
  P.width = function (s, size, weight) { P.font(size, weight); return g.measureText(String(s)).width; };
  P.fit = function (s, x, y, maxW, size, weight, color, align) { var sz = size; while (sz > 5 && P.width(s, sz, weight) > maxW) sz -= 0.25; P.txt(s, x, y, sz, weight, color, align); };
  P.wrap = function (s, maxW, size, weight) {
    var words = String(s).split(/\s+/), lines = [], cur = "";
    words.forEach(function (w) { var t = cur ? cur + " " + w : w; if (P.width(t, size, weight) > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
    if (cur) lines.push(cur); return lines;
  };
  P.para = function (s, xRight, y, maxW, size, weight, color, lh, maxLines) {
    var lines = P.wrap(s, maxW, size, weight); if (maxLines && lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] += "…"; }
    lines.forEach(function (l, i) { P.txt(l, xRight, y + i * lh, size, weight, color); }); return y + lines.length * lh;
  };
  P.bullets = function (list, xRight, y, maxW, size, lh, yMax, dotColor) {
    list.forEach(function (s) {
      if (y > yMax) return;
      g.fillStyle = dotColor || K.gold; g.beginPath(); g.arc(xRight - 2.5, y, 1.8, 0, Math.PI * 2); g.fill();
      P.wrap(s, maxW - 10, size, 500).forEach(function (l) { if (y <= yMax) P.txt(l, xRight - 9, y, size, 500, K.ink); y += lh; });
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
  /* hexagon radar; axis 1 at the top, numbered clockwise in either language */
  P.radar = function (cx, cy, R, values, max) {
    var dir = M ? -1 : 1;
    function v(k, r) { var a = (-90 + dir * 60 * k) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
    g.strokeStyle = K.line; g.lineWidth = 0.6;
    [0.25, 0.5, 0.75, 1].forEach(function (f) { g.beginPath(); for (var k = 0; k < 6; k++) { var p = v(k, R * f); k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); } g.closePath(); g.stroke(); });
    for (var k = 0; k < 6; k++) { var p = v(k, R); g.beginPath(); g.moveTo(cx, cy); g.lineTo(p[0], p[1]); g.stroke(); }
    g.beginPath(); values.forEach(function (val, k) { var p = v(k, val / max * R); k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.closePath();
    g.fillStyle = "rgba(54,92,83,.14)"; g.fill(); g.strokeStyle = K.green; g.lineWidth = 0.9; g.stroke();
    for (var j = 0; j < 6; j++) { var q = v(j, R + 9); P.txt(String(j + 1), q[0], q[1], 7, 700, K.gold, "center"); }
  };
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

/* header band, frame and footer on every page */
function V2arChrome(P, A, emblem, title, section, page, pages) {
  var K = P.K, T = A.T;
  P.rect(20, 14, 822, 72, K.beige, K.edge, false, 0.8);
  P.rect(20, 72, 822, 578, null, "#9C9C9C", true, 0.7);
  P.txt(T.secret, 421, 25, A.en ? 8 : 9.5, 700, "#C00000", "center");
  P.txt(title, 806, 42, A.en ? 20 : 21, 700, "#111");
  P.txt(A.kindLabel + " · " + T.period + " " + A.periodLabel + (section ? " · " + section : ""), 806, 62, 9, 500, K.muted);
  if (emblem) P.image(emblem, 32, 22, 30, 40.2);
  P.txt(A.name, 72, 36, 11, 700, K.ink, "left");
  P.txt(A.otherName, 72, 52, 8, 500, K.muted, "left");
  P.txt(T.secret + " · " + A.name + " · " + title, 806, 587, 6.8, 500, K.muted);
  P.txt(page + " / " + pages, 36, 587, 7, 700, K.gold, "left");
}
function V2arHead(P, x1, x2, y, title) { P.rect(x1, y, x2, y + 15, P.K.label, P.K.dot, true, 0.6); P.txt(title, (x1 + x2) / 2, y + 8, 8.2, 700, P.K.ink, "center"); }
function V2arPersonality(A, n) {
  var T = A.T, out = A.topS.slice(0, n).map(function (c) { return T.str[c.key]; });
  if (A.topD[0]) out.push(T.devArea + T.dev[A.topD[0].key]);
  return out.length ? out : [T.noNotes];
}
function V2arLeader(A) {
  var T = A.T, F = A.F;
  return [T.ratingLine(A.ratingLabel), T.rankLine(F, T.ord), T.rec[F.ratingIdx] + (A.topD[0] ? T.focus(T.comp[A.topD[0].key]) : ".")];
}
/* the leader's opinion, formed from the manager's notes: the report's AI insight (English) or the note pattern */
function V2arOpinion(A) {
  var T = A.T, s1 = A.topS[0], s2 = A.topS[1], d1 = A.topD[0], N = A.F.narrative || {};
  return T.opinion({ notes: A.F.notes, rating: A.ratingLabel, insight: A.en ? String(N.keyInsight || "").trim() : "",
    s1: s1 && T.comp[s1.key], s2: s2 && T.comp[s2.key], sn: s1 ? s1.strengths : 0, d1: d1 && T.comp[d1.key], dn: d1 ? d1.development : 0, dtext: d1 ? T.dev[d1.key] : "" });
}
function V2arQuotes(A) {
  var out = [];
  A.comps.forEach(function (c) { c.entries.forEach(function (e) { out.push(e); }); });
  function best(cat) { var l = out.filter(function (e) { return e.category === cat; }).map(function (e) { return e.text.trim(); }).sort(function (a, b) { return a.length - b.length; }); return l.find(function (t) { return t.length > 40; }) || l[0]; }
  return [best("strength"), best("development")].filter(Boolean);
}
/* the five-step scale: best on the reading-start side, the marker on the rating, the fill from the low end */
function V2arScale(P, A, x1, y1, w, h, labelSize) {
  var K = P.K, T = A.T, si = A.si, labels = V2SCALE[A.en ? "en" : "ar"];
  P.rr(x1, y1, w, h, 7, K.cream, K.line);
  P.txt(T.rating, x1 + w - 8, y1 + 11, 8.2, 700, K.gold);
  var pw = (w - 16 - 4 * 4) / 5, cx = [];
  for (var i = 0; i < 5; i++) {
    var pos = A.en ? 4 - i : i, px = x1 + w - 8 - pw - pos * (pw + 4), sel = i === si;   /* English reads Very Poor … Excellent left to right */
    cx.push(px + pw / 2);
    P.rr(px, y1 + 18, pw, 22, 4, sel ? K.green : K.card, sel ? K.green : K.line);
    P.fit(labels[i], px + pw / 2, y1 + 29.5, pw - 6, labelSize || 8, 700, sel ? "#fff" : K.ink, "center");
  }
  var sy = y1 + 56, lo = cx[4], hi = cx[0];
  P.g.lineWidth = 3.4; P.g.strokeStyle = K.line; P.g.beginPath(); P.g.moveTo(lo, sy); P.g.lineTo(hi, sy); P.g.stroke();
  P.g.strokeStyle = K.green; P.g.beginPath(); P.g.moveTo(lo, sy); P.g.lineTo(cx[si], sy); P.g.stroke();
  for (var k = 0; k < 5; k++) P.dot(cx[k], sy, 2.2, k >= si ? K.green : K.gold);
  P.dot(cx[si], sy, 6.5, "#fff"); P.dot(cx[si], sy, 4.4, K.green);
}

/* page 1: the one-pager */
function V2arPageOne(A, emblem, page, pages) {
  var P = V2page(A), K = P.K, F = A.F, T = A.T;
  V2arChrome(P, A, emblem, T.form, null, page, pages);
  P.rr(712, 78, 94, 16, [3, 3, 0, 0], "#E5E3DA", "#CFCCBF"); P.txt(T.tab, 798, 86.5, 8.5, 500, "#8A8672");
  P.rect(744, 96, 806, 182, K.beige, K.edge, false, 0.7);
  P.dot(775, 128, 13, "#DAD7CB"); P.g.fillStyle = "#DAD7CB"; P.g.beginPath(); P.g.ellipse(775, 180, 24, 20, 0, Math.PI, 0); P.g.fill();
  for (var i = 0; i < 4; i++) {
    var y1 = 96 + i * 21.5, y2 = y1 + 21.5, my = (y1 + y2) / 2;
    P.cell(670, y1, 738, y2, K.label); P.fit(T.grid[i * 2], 734, my, 62, 8, 700);
    P.cell(566, y1, 670, y2, "#fff"); P.fit(A.grid[i * 2], 665, my, 96, 8.2, 500);
    P.cell(498, y1, 566, y2, K.label); P.fit(T.grid[i * 2 + 1], 562, my, 62, 8, 700);
    P.cell(392, y1, 498, y2, "#fff"); P.fit(A.grid[i * 2 + 1], 493, my, 98, 8.2, 500);
  }
  V2arHead(P, 28, 384, 96, T.evals);
  [[265, 384], [146, 265], [28, 146]].forEach(function (c, j) {
    var ev = A.evals[j] || [];
    P.cell(c[0], 111, c[1], 125, K.gray2); P.txt(ev[0] || "", (c[0] + c[1]) / 2, 118.5, 8, 700, K.ink, "center");
    P.cell(c[0], 125, c[1], 141, K.gray); P.fit(ev[1] || "", (c[0] + c[1]) / 2, 133.5, c[1] - c[0] - 8, 7.8, 500, K.ink, "center");
  });
  V2arHead(P, 28, 384, 146, T.qual);
  P.cell(206, 161, 384, 172, K.gray2); P.txt(T.degree, 295, 166.8, 7.2, 700, K.ink, "center");
  P.cell(28, 161, 206, 172, K.gray2); P.txt(T.uni, 117, 166.8, 7.2, 700, K.ink, "center");
  P.cell(206, 172, 384, 182, "#fff"); P.fit(A.degree, 295, 177.3, 170, 7.4, 500, K.ink, "center");
  P.cell(28, 172, 206, 182, "#fff"); P.fit(A.university, 117, 177.3, 170, 7.4, 500, K.ink, "center");
  var tiles = [
    [T.tiles[0], F.pct + "%", T.hours, T.hoursOf(F.done, F.required)],
    [T.tiles[1], String(F.completed), T.completed, T.scope(F.scope)],
    [T.tiles[2], String(F.points), T.points, T.lead(F.committees, F.delegations)],
    [T.tiles[3], F.rank ? T.ord(F.rank) : "—", F.tied > 1 ? T.jointPeer : T.peer, T.selfPlace(F.self ? T.ord(F.self) : "—")],
  ];
  tiles.forEach(function (t, i) {
    var x = 714 - i * 98, cx = x + 46;
    P.rr(x, 190, 92, 72, 6, K.card, K.line);
    P.fit(t[0], x + 86, 201, 80, 7.6, 700, K.gold);
    P.txt(t[1], cx, 222, 18, 700, K.green, "center");
    P.fit(t[2], cx, 241, 84, 7.6, 700, K.ink, "center");
    P.fit(t[3], cx, 253, 84, 6.8, 500, K.muted, "center");
  });
  V2arHead(P, 28, 412, 190, T.positions);
  [[290, 412, 0], [160, 290, 1], [94, 160, 2], [28, 94, 3]].forEach(function (c) { P.cell(c[0], 205, c[1], 217, K.gray); P.fit(T.posHead[c[2]], (c[0] + c[1]) / 2, 211, c[1] - c[0] - 4, 7.2, 700, K.ink, "center"); });
  [0, 1, 2].forEach(function (i) {
    var r = A.positions[i] || ["", "", "", ""], y1 = 217 + i * 15, my = y1 + 7.5;
    P.cell(290, y1, 412, y1 + 15, "#fff"); P.fit(r[0], 406, my, 112, 7.2, 500, K.ink);
    P.cell(160, y1, 290, y1 + 15, "#fff"); P.fit(r[1], 284, my, 120, 7.2, 500, K.ink);
    P.cell(94, y1, 160, y1 + 15, "#fff"); P.txt(r[2], 127, my, 7, 500, K.ink, "center");
    P.cell(28, y1, 94, y1 + 15, "#fff"); P.fit(r[3], 61, my, 60, 7, 500, K.ink, "center");
  });
  P.rr(566, 270, 240, 120, 7, K.card, K.line);
  P.txt(T.delivery, 798, 283, 9, 700, K.ink); P.txt("01", 576, 283, 7.5, 700, K.gold, "left");
  P.donut(620, 336, 30, 8, [[F.orig, K.green], [F.revised, K.gold], [F.late, K.terra]], String(F.completed), T.donut);
  [[F.orig + T.legend[0], K.green], [F.revised + T.legend[1], K.gold], [F.late + T.legend[2], K.terra]].forEach(function (l, j) {
    P.dot(792, 310 + j * 17, 3, l[1]); P.fit(l[0], 785, 310 + j * 17, 120, 8, 500, K.ink);
  });
  P.txt(T.onApproved(F.effPct == null ? "—" : F.effPct + "%"), 798, 375, 7.4, 500, K.muted);
  P.rr(296, 270, 262, 120, 7, K.card, K.line);
  P.fit(T.comps, 550, 283, 230, 9, 700, K.ink); P.txt("02", 306, 283, 7.5, 700, K.gold, "left");
  A.comps.forEach(function (c, j) {
    var yy = 300 + j * 13.2;
    P.fit((j + 1) + ". " + T.short[c.key], 550, yy, 74, 7.3, 500, K.ink);
    P.splitbar(472, yy - 2.2, 138, 4.4, c.strengths, c.development, F.maxTotal);
    P.txt(c.strengths + " / " + c.development, 306, yy, 7.2, 700, K.ink, "left");
  });
  P.fit(T.compsKey, 550, 381, 245, 6.4, 500, K.muted);
  V2arScale(P, A, 28, 270, 260, 120, 6.8);
  P.txt(T.ratingIs(A.ratingLabel), 280, 350, 11, 700, K.green);
  P.fit(T.ratingBasis, 280, 368, 244, 6.8, 500, K.muted);
  var boxes = [[554.7, 806, T.boxes[0], "person", V2arPersonality(A, 2)], [291.3, 542.7, T.boxes[1], "work", T.work(F, A.kpis.length)], [28, 279.3, T.boxes[2], "leader", null]];
  boxes.forEach(function (b) {
    P.rect(b[0], 398, b[1], 420, K.bar);
    P.icon(b[3], b[1] - 16, 409, 12.5);
    P.txt(b[2], b[1] - 36, 409.5, 10, 700, "#222");
    P.rr(b[0], 424, b[1] - b[0], 138, 3, null, K.frame, 1.1);
    if (b[4]) P.bullets(b[4], b[1] - 8, 437, b[1] - b[0] - 16, 8, 11.6, 556);
    else {
      var oy = P.para(V2arOpinion(A), b[1] - 8, 437, b[1] - b[0] - 16, 7.8, 500, K.ink, 11.2, 8);
      P.bullets([T.rankLine(F, T.ord)], b[1] - 8, oy + 6, b[1] - b[0] - 16, 7.6, 11, 556, K.green);
    }
  });
  P.fit(T.foot(F.notes, F.observations), 421, 570, 760, 6.4, 500, K.muted, "center");
  return P;
}

/* page 2: personality in detail */
function V2arPagePersonality(A, emblem, page, pages) {
  var P = V2page(A), K = P.K, F = A.F, T = A.T;
  V2arChrome(P, A, emblem, T.detailed, T.secPersonality, page, pages);
  P.rr(28, 84, 236, 214, 8, K.card, K.line);
  P.txt(T.profile, 256, 98, 9, 700, K.gold);
  P.radar(146, 196, 70, A.comps.map(function (c) { return c.strengths + c.development; }), F.maxTotal);
  P.txt(T.volume, 146, 286, 7.5, 700, K.green, "center");
  P.rr(28, 306, 236, 266, 8, "#fff", K.frame, 1);
  P.rect(28, 306, 264, 328, K.bar); P.icon("person", 248, 317, 10); P.txt(T.summary, 232, 317.5, 9.5, 700);
  P.bullets(V2arPersonality(A, 3).concat(A.topD.slice(1, 2).map(function (c) { return T.devMore + T.dev[c.key]; })), 256, 342, 220, 8.2, 12, 548);
  P.fit(T.basis(F.notes, F.observations), 146, 562, 220, 6.8, 500, K.muted, "center");
  A.comps.forEach(function (c, i) {
    var col = i % 2, row = Math.floor(i / 2), x2 = 806 - col * 273, x1 = x2 - 263, y1 = 84 + row * 166, h = 156;
    P.rr(x1, y1, 263, h, 8, K.card, K.line);
    P.rr(x2 - 34, y1 + 10, 24, 20, 5, K.cream); P.txt("0" + (i + 1), x2 - 22, y1 + 20.5, 8, 700, K.gold, "center");
    P.fit(T.comp[c.key], x2 - 42, y1 + 20.5, 210, 10.5, 700, K.ink);
    P.txt(T.counts(c.strengths, c.development), x2 - 12, y1 + 42, 7.6, 500, K.muted);
    P.splitbar(x1 + 132, y1 + 39.8, 120, 4.4, c.strengths, c.development, F.maxTotal);
    var yy = y1 + 60;
    P.txt(T.strengths, x2 - 12, yy, 8.4, 700, K.green);
    yy = P.para(c.strengths ? T.str[c.key] : T.noStr, x2 - 12, yy + 13, 239, 8.2, 500, K.ink, 11.5, 2);
    P.txt(T.development, x2 - 12, yy + 6, 8.4, 700, K.terra);
    P.para(c.development ? T.dev[c.key] : T.noDev, x2 - 12, yy + 19, 239, 8.2, 500, K.ink, 11.5, 2);
    var v = c.strengths + c.development === 0 ? 0 : c.strengths > c.development ? 1 : c.development > c.strengths ? 2 : 3;
    P.rr(x1 + 10, y1 + h - 24, 84, 15, 7.5, v === 1 ? "#e6eeeb" : v === 2 ? "#f6e6e0" : K.cream);
    P.fit(T.verdict[v], x1 + 52, y1 + h - 16.3, 78, 7.2, 700, v === 1 ? K.green : v === 2 ? "#9a4f37" : K.gold, "center");
  });
  return P;
}

/* page 3: work and the leader's opinion in detail */
function V2arPageWork(A, emblem, page, pages) {
  var P = V2page(A), K = P.K, F = A.F, T = A.T;
  V2arChrome(P, A, emblem, T.detailed, T.secWork, page, pages);
  var x1 = 424, x2 = 806;
  P.rect(x1, 84, x2, 106, K.bar); P.icon("work", x2 - 14, 95, 10); P.txt(T.workTitle, x2 - 30, 95.5, 10, 700);
  var mini = [String(F.completed), F.completed ? Math.round(F.orig / F.completed * 100) + "%" : "—", F.effPct == null ? "—" : F.effPct + "%", String(F.late)];
  mini.forEach(function (m, i) { var bx = x2 - 92 - i * 96.7; P.rr(bx, 112, 92, 40, 6, K.card, K.line); P.txt(m, bx + 46, 127, 14, 700, K.green, "center"); P.fit(T.mini[i], bx + 46, 144, 84, 7.2, 500, K.muted, "center"); });
  var cols = [[x2 - 150, x2], [x2 - 208, x2 - 150], [x2 - 266, x2 - 208], [x2 - 322, x2 - 266], [x1, x2 - 322]];
  cols.forEach(function (c, i) { P.cell(c[0], 160, c[1], 176, K.gray); P.fit(T.table[i], (c[0] + c[1]) / 2, 168, c[1] - c[0] - 4, 7.2, 700, K.ink, "center"); });
  var items = F.sn.responsibilities.items, y = 176, maxRows = 11;
  items.slice(0, maxRows).forEach(function (it) {
    var res = it.completedInPeriod ? (it.originalOnTime ? [T.results[0], K.green] : it.effectiveOnTime ? [T.results[1], K.gold] : [T.results[2], K.terra]) : [T.results[3], K.muted];
    cols.forEach(function (c) { P.cell(c[0], y, c[1], y + 17, "#fff"); });
    P.fit(it.title, x2 - 4, y + 8.5, 142, 7, 500, K.ink);
    P.txt(V2dmy(it.originalDeadline), (cols[1][0] + cols[1][1]) / 2, y + 8.5, 6.8, 500, K.ink, "center");
    P.txt(V2dmy(it.effectiveDeadline), (cols[2][0] + cols[2][1]) / 2, y + 8.5, 6.8, 500, K.ink, "center");
    P.txt(it.completedOn ? V2dmy(it.completedOn) : "—", (cols[3][0] + cols[3][1]) / 2, y + 8.5, 6.8, 500, K.ink, "center");
    P.fit(res[0], (cols[4][0] + cols[4][1]) / 2, y + 8.5, cols[4][1] - cols[4][0] - 4, 7.2, 700, res[1], "center");
    y += 17;
  });
  if (items.length > maxRows) { P.txt(T.more(items.length - maxRows), x2 - 4, y + 8, 6.8, 500, K.muted); y += 14; }
  y += 10;
  P.txt(T.kpis, x2, y, 9, 700, K.ink); y += 14;
  A.kpis.slice(0, 5).forEach(function (k, i) {
    P.rr(x1, y - 7, x2 - x1, 16, 4, i % 2 ? "#fff" : K.card);
    P.fit(A.en ? k.title : k.title_ar || k.title, x2 - 8, y + 1, 250, 7.6, 500, K.ink);
    P.fit(A.en ? k.target : k.target_ar || k.target, x1 + 8, y + 1, 100, 7.6, 700, K.green, "left");
    y += 18;
  });
  y += 6;
  P.txt(T.discLead, x2, y, 9, 700, K.ink); y += 14;
  P.bullets([T.discLine(F), T.leadLine(F)], x2, y, x2 - x1, 8, 11.5, 572);
  var l1 = 28, l2 = 408;
  P.rect(l1, 84, l2, 106, K.bar); P.icon("leader", l2 - 14, 95, 10); P.txt(T.leader, l2 - 30, 95.5, 10, 700);
  V2arScale(P, A, l1, 112, l2 - l1, 64, 7.6);
  P.txt(T.ratingIs(A.ratingLabel), l2 - 10, 186, 8.6, 700, K.green);
  y = 202; P.txt(T.opinionTitle, l2, y, 9, 700, K.ink);
  P.rr(l1, y + 7, l2 - l1, 4, 2, K.cream);
  y = P.para(V2arOpinion(A), l2 - 6, y + 20, l2 - l1 - 12, 7.9, 500, K.ink, 11, 6) + 2;
  if (A.en) { V2arQuotes(A).forEach(function (q) { y = P.para("\u201C" + q + "\u201D", l2 - 10, y, l2 - l1 - 20, 7.2, 500, K.muted, 10, 2) + 2; }); }
  y += 6; P.txt(T.reasons, l2, y, 9, 700, K.ink); y = P.bullets(T.reasonLines(F), l2, y + 13, l2 - l1, 7.8, 10.8, 572);
  y += 2; P.txt(T.rankCmp, l2, y, 9, 700, K.ink); y += 13;
  P.fit(T.rankLine(F, T.ord), l2, y, l2 - l1, 7.8, 500, K.ink); y += 13;
  var order = F.own.slice().sort(function (a, b) { return a.position - b.position; });
  if (order.length) {
    P.txt(T.ownOrder, l2, y, 7.8, 700, K.ink); y += 12;
    order.forEach(function (o) {
      P.rr(l2 - 170, y - 6, 170, 12, 3, o.self ? K.cream : "#fff");
      P.txt(T.ord(o.position), l2 - 6, y, 7.4, 700, K.gold); P.txt(A.names[o.name] || o.name, l2 - 50, y, 7.4, o.self ? 700 : 500, K.ink); y += 12.5;
    });
  }
  y += 6; P.txt(T.plan, l2, y, 9, 700, K.ink); y += 13;
  var plan = [T.rec[F.ratingIdx] + "."].concat(A.topD.slice(0, 2).map(function (c) { return T.devPlan(T.comp[c.key], T.dev[c.key]); }));
  var training = (F.sn.training || []), doneT = training.filter(function (t) { return t.status === "completed"; }).length;
  plan.push(T.training(doneT, training.length - doneT));
  P.bullets(plan, l2, y, l2 - l1, 7.8, 10.8, 574);
  return P;
}

function V2arPdf(pages, title) {
  var doc = V2doc("landscape");
  pages.forEach(function (P, i) { if (i) doc.addPage("a4", "landscape"); doc.addImage(P.cv.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, 842, 595, undefined, "FAST"); });
  doc.setProperties({ title: title, author: "Employee Assessment Platform" });
  return new Uint8Array(doc.output("arraybuffer"));
}
/* the report's pages as canvases, for the PDF and for viewing on screen */
async function V2arPages(rep, kind, lang) {
  var emblem = await V2reportFonts(), A = V2arData(rep, lang);
  var pages = kind === "form" ? [V2arPageOne(A, emblem, 1, 1)] : [V2arPageOne(A, emblem, 1, 3), V2arPagePersonality(A, emblem, 2, 3), V2arPageWork(A, emblem, 3, 3)];
  return { A: A, pages: pages };
}
async function V2ReportPdf(rep, kind, lang) {
  var r = await V2arPages(rep, kind, lang);
  return V2arPdf(r.pages, r.A.name + " | " + r.A.T.pdfTitle[kind]);
}
