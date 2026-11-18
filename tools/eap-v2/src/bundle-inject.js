/* ---- Employee Assessment Platform v2 (tools/eap-v2/src/bundle-inject.js) ----------------------------------------
   Injected into the copied app bundle, so it runs with the app's own React, components (De card, Oe content, xt
   header, ne button, Ee link), helpers (ge date, yt Dubai today, bh ranking aggregate, V audit) and store (Mt). */
function V2q(sql, args) {
  var r = Mt.db.exec(sql, args || []);
  if (!r.length) return [];
  var cols = r[0].columns;
  return r[0].values.map(function (v) { var o = {}; cols.forEach(function (c, i) { o[c] = v[i]; }); return o; });
}
function V2one(sql, args) { return V2q(sql, args)[0] || null; }
var V2MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function V2month(s) { if (!s) return ""; var p = s.split("-"); return V2MONTHS[Number(p[1]) - 1] + " " + p[0]; }
function V2addDays(s, n) { var d = new Date(s + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function V2ord(n) { var s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
function V2years(from, today) {
  if (!from) return null;
  var a = from.split("-").map(Number), b = today.split("-").map(Number);
  var m = (b[0] - a[0]) * 12 + (b[1] - a[1]) - (b[2] < a[2] ? 1 : 0);
  return { y: Math.floor(m / 12), m: m % 12 };
}
function V2span(from, today) {
  var t = V2years(from, today);
  if (!t) return "Not recorded";
  return t.y + (t.y === 1 ? " year" : " years") + (t.m ? " " + t.m + (t.m === 1 ? " month" : " months") : "");
}
function V2first(name) { return String(name || "").split(" ")[0]; }

/* ---------- data ---------- */
function V2responsibilities(employeeId) {
  return V2q("select r.id, r.title, r.description, r.started_on, r.deadline, r.status, r.completed_on, r.kind," +
    " coalesce((select x.approved_deadline from responsibility_extensions x where x.responsibility_id = r.id and x.outcome = 'approved' and x.approved_deadline is not null order by x.decided_at desc, x.id desc limit 1), r.deadline) as effective_deadline," +
    " (select count(*) from responsibility_extensions x where x.responsibility_id = r.id and x.outcome = 'pending') as pending_extensions" +
    " from responsibilities r where r.employee_id = ? order by r.deadline", [employeeId]);
}
function V2rounds() {
  var rounds = V2q("select id, label, opened_on, due_on from ranking_rounds order by opened_on desc, id desc");
  var names = {};
  V2q("select id, display_name from employees").forEach(function (e) { names[e.id] = e.display_name; });
  return rounds.map(function (r) {
    var members = V2q("select employee_id from ranking_round_members where round_id = ? order by employee_id", [r.id]).map(function (m) { return m.employee_id; });
    var subs = V2q("select ranker_employee_id, submitted_at from ranking_submissions where round_id = ?", [r.id]).map(function (s) {
      return { rankerEmployeeId: s.ranker_employee_id, submittedAt: s.submitted_at,
        items: V2q("select ranked_employee_id, position from ranking_submission_items where round_id = ? and ranker_employee_id = ?", [r.id, s.ranker_employee_id])
          .map(function (i) { return { rankedEmployeeId: i.ranked_employee_id, position: i.position }; }) };
    });
    var agg = null;
    try { agg = bh(members, subs); } catch (e) { agg = null; }
    return { id: r.id, label: r.label, openedOn: r.opened_on, dueOn: r.due_on, members: members, submissions: subs, aggregate: agg, names: names };
  });
}
/* the latest complete round's peer result and the employee's most recent self-ranking */
function V2ranking(employeeId) {
  var rounds = V2rounds(), peer = null, self = null;
  for (var i = 0; i < rounds.length && !peer; i++) {
    var r = rounds[i];
    if (!r.aggregate) continue;
    var row = r.aggregate.find(function (a) { return a.employeeId === employeeId; });
    if (!row) continue;
    var tied = r.aggregate.filter(function (a) { return a.rank === row.rank; }).length;
    peer = { round: r, rank: row.rank, tied: tied, of: r.aggregate.length, aggregate: r.aggregate, names: r.names };
  }
  for (var j = 0; j < rounds.length && !self; j++) {
    var s = rounds[j].submissions.find(function (x) { return x.rankerEmployeeId === employeeId; });
    if (!s) continue;
    var mine = s.items.find(function (x) { return x.rankedEmployeeId === employeeId; });
    self = { round: rounds[j], position: mine ? mine.position : null, submittedAt: s.submittedAt,
      order: s.items.slice().sort(function (a, b) { return a.position - b.position; }), names: rounds[j].names };
  }
  return { peer: peer, self: self };
}

/* ---------- the administrator's job description and KPI editor (on /admin/employees/{id}) ---------- */
function V2AdminJob({ employeeId: id, actor: actor }) {
  var jd = V2one("select body, updated_at from job_descriptions where employee_id = ?", [id]);
  var kpis = V2q("select title, target, source from job_kpis where employee_id = ? order by position, id", [id]);
  return y(De, { children: [d(fo, { children: d(bi, { children: "Job description & KPIs" }) }),
    d(Oe, { children: d(V2JobEditor, { employeeId: id, actorId: actor.id, body: jd ? jd.body : "", kpis: kpis.map(function (k) { return { title: k.title, target: k.target, source: k.source }; }) }) })] });
}
function V2JobEditor({ employeeId: id, actorId: actorId, body: body0, kpis: kpis0 }) {
  var _a = (0, v.useState)(body0), body = _a[0], setBody = _a[1];
  var _b = (0, v.useState)(kpis0.length ? kpis0 : [{ title: "", target: "", source: "admin" }]), kpis = _b[0], setKpis = _b[1];
  var _c = (0, v.useState)(""), msg = _c[0], setMsg = _c[1];
  function setKpi(i, k, val) { setKpis(kpis.map(function (x, j) { return j === i ? Object.assign({}, x, { [k]: val, source: "admin" }) : x; })); setMsg(""); }
  function save(ev) {
    ev.preventDefault();
    var now = new Date().toISOString(), rows = kpis.filter(function (k) { return k.title.trim(); });
    try {
      Mt.db.run("BEGIN");
      Mt.db.run("insert into job_descriptions (employee_id, body, updated_by, updated_at) values (?, ?, ?, ?) on conflict(employee_id) do update set body = excluded.body, updated_by = excluded.updated_by, updated_at = excluded.updated_at", [id, body.trim(), actorId, now]);
      Mt.db.run("delete from job_kpis where employee_id = ?", [id]);
      rows.forEach(function (k, i) { Mt.db.run("insert into job_kpis (employee_id, title, target, source, position) values (?, ?, ?, ?, ?)", [id, k.title.trim(), k.target.trim(), k.source || "admin", i]); });
      Mt.db.run("insert into audit_events (ts, actor_user_id, action, object_type, object_id, employee_id, result, detail) values (?, ?, 'job_description.update', 'employee', ?, ?, 'ok', ?)", [now, actorId, String(id), id, JSON.stringify({ kpis: rows.length })]);
      Mt.db.run("COMMIT");
      Mt.changed();
      setMsg("Saved.");
    } catch (e) { try { Mt.db.run("ROLLBACK"); } catch (x) { /* nothing open */ } setMsg("Could not save: " + e.message); }
  }
  return y("form", { className: "v2-editor", onSubmit: save, "data-v2-editor": id, children: [
    d("label", { htmlFor: "v2-jd-" + id, style: { marginTop: 0 }, children: "Current job description" }),
    d("textarea", { id: "v2-jd-" + id, name: "jobDescription", value: body, onChange: function (e) { setBody(e.target.value); setMsg(""); } }),
    d("p", { className: "v2-muted", style: { margin: "4px 0 0" }, children: "One paragraph, then one duty per line starting with •" }),
    d("label", { children: "KPIs for this job" }),
    d("p", { className: "v2-muted", style: { margin: 0 }, children: "Replace these with the government KPIs once the client confirms the source." }),
    kpis.map(function (k, i) {
      return y("div", { className: "v2-kpirow", children: [
        d("input", { "aria-label": "KPI " + (i + 1), name: "kpiTitle", value: k.title, placeholder: "KPI", onChange: function (e) { setKpi(i, "title", e.target.value); } }),
        d("input", { "aria-label": "Target " + (i + 1), name: "kpiTarget", value: k.target, placeholder: "Target", onChange: function (e) { setKpi(i, "target", e.target.value); } }),
        d("button", { type: "button", className: "v2-iconbtn", "aria-label": "Remove KPI " + (i + 1), onClick: function () { setKpis(kpis.filter(function (x, j) { return j !== i; })); setMsg(""); }, children: "Remove" }),
      ] }, i);
    }),
    y("div", { className: "v2-actions", children: [
      d("button", { type: "button", className: "v2-iconbtn", onClick: function () { setKpis(kpis.concat([{ title: "", target: "", source: "admin" }])); }, children: "Add KPI" }),
      d(ne, { type: "submit", size: "touch", children: "Save job description & KPIs" }),
      msg && d("span", { role: "status", className: "v2-muted", children: msg }),
    ] }),
  ] });
}
V2JobEditor.__eapClient = !0;

