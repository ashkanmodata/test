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

/* ---------- the Overview ---------- */
function V2Card(props) {
  return y(De, { className: props.className, children: [d(xt, { icon: props.icon, title: props.title, sub: props.sub }), d(Oe, { children: props.children })] });
}
function V2Overview({ employeeId: id, actor: actor, mine: mine }) {
  var today = yt(new Date());
  var e = V2one("select * from employees where id = ?", [id]);
  if (!e) return null;
  var roles = V2q("select * from employee_previous_roles where employee_id = ? order by started_on desc, position", [id]);
  var jd = V2one("select j.body, j.updated_at, u.name as updated_by from job_descriptions j left join user u on u.id = j.updated_by where j.employee_id = ?", [id]);
  var kpis = V2q("select * from job_kpis where employee_id = ? order by position, id", [id]);
  var resp = V2responsibilities(id);
  var active = resp.filter(function (r) { return r.status === "active"; });
  var history = resp.filter(function (r) { return r.status !== "active"; }).sort(function (a, b) { return String(b.completed_on || "").localeCompare(String(a.completed_on || "")); });
  var committees = V2q("select name from employee_committees where employee_id = ? order by position, id", [id]);
  var since = V2addDays(today, -30);
  var delegations = V2q("select occurred_on, delegate_name, purpose from delegations where employee_id = ? and deleted_at is null and occurred_on >= ? and occurred_on <= ? order by occurred_on desc, id desc", [id, since, today]);
  var rk = V2ranking(id);
  var base = mine ? "/me" : "/employees/" + id;

  /* 1. CV summary */
  var cv = d(V2Card, { className: "v2-cv", icon: xr, title: "CV summary", sub: mine ? null : "Key information", children: y(Fe, { children: [
    y("dl", { className: "v2-facts", children: [
      y("div", { className: "v2-fact", children: [d("dt", { children: "Experience" }), y("dd", { children: [V2span(e.career_start, today), e.career_start && d("small", { children: "Since " + V2month(e.career_start) })] })] }),
      y("div", { className: "v2-fact", children: [d("dt", { children: "Joining date" }), y("dd", { children: [e.started_at ? ge(e.started_at) : "Not recorded", e.started_at && d("small", { children: V2span(e.started_at, today) + " in the office" })] })] }),
      y("div", { className: "v2-fact", children: [d("dt", { children: "Current position" }), y("dd", { children: [e.job_title || "Not recorded", e.reports_to && d("small", { children: "Reports to " + e.reports_to })] })] }),
    ] }),
    d("p", { className: "v2-sub", children: "Previous roles" }),
    roles.length ? d("ul", { className: "v2-list", children: roles.map(function (r) {
      return y("li", { children: [y("span", { children: [d("b", { style: { fontWeight: 600 }, children: r.title }), d("span", { className: "v2-muted", children: " \xB7 " + r.employer })] }),
        d("span", { className: "v2-muted", children: V2month(r.started_on) + " – " + V2month(r.ended_on) })] }, r.id);
    }) }) : d("p", { className: "v2-empty", children: "No previous roles recorded." }),
  ] }) });

  /* 6. ranking and self-ranking */
  var p = rk.peer, s = rk.self;
  var rankCard = d(V2Card, { className: "v2-rankcard", icon: eo, title: "Ranking", sub: p ? p.round.label : "Peer ranking", children: y(Fe, { children: [
    y("dl", { className: "v2-rank", children: [
      y("div", { className: "v2-fact", children: [d("dt", { children: "Current ranking" }),
        mine ? y("dd", { children: ["—", d("small", { children: "Shared with you in your report" })] })
          : y("dd", { children: [p ? (p.tied > 1 ? "Joint " : "") + V2ord(p.rank) : "—", d("small", { children: p ? "of " + p.of + (p.tied > 1 ? " \xB7 " + p.tied + "-way tie" : "") : "No complete round yet" })] })] }),
      y("div", { className: "v2-fact", children: [d("dt", { children: "Self-ranking" }),
        y("dd", { children: [s && s.position ? V2ord(s.position) : "—", d("small", { children: s ? s.round.label + " \xB7 " + Je(s.submittedAt) : "Not submitted yet" })] })] }),
    ] }),
    s && y(Fe, { children: [
      d("p", { className: "v2-sub", children: (mine ? "Your" : V2first(e.display_name) + "’s") + " most recent order" }),
      d("ol", { className: "v2-order", children: s.order.map(function (o) {
        return y("li", { className: o.rankedEmployeeId === id ? "v2-self" : "", children: [d("b", { children: o.position }), d("span", { children: s.names[o.rankedEmployeeId] || "Employee " + o.rankedEmployeeId })] }, o.rankedEmployeeId);
      }) }),
    ] }),
  ] }) });

  /* 2. job description */
  var lines = String(jd ? jd.body : "").split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
  var intro = lines.filter(function (l) { return l.indexOf("•") !== 0; }), bullets = lines.filter(function (l) { return l.indexOf("•") === 0; }).map(function (l) { return l.replace(/^•\s*/, ""); });
  var jdCard = d(V2Card, { icon: zo, title: "Current job description", sub: "Maintained by the administrator", children: jd ? y("div", { className: "v2-jd", children: [
    intro.map(function (l, i) { return d("p", { children: l }, "p" + i); }),
    bullets.length > 0 && d("ul", { children: bullets.map(function (l, i) { return d("li", { children: l }, "b" + i); }) }),
    d("p", { className: "v2-meta", children: "Last updated " + Je(jd.updated_at) + (jd.updated_by ? " by " + jd.updated_by : "") }),
  ] }) : d("p", { className: "v2-empty", children: "No job description yet. The administrator adds it on the employee's admin page." }) });

  /* 3. KPIs */
  var ai = kpis.some(function (k) { return k.source === "ai_suggested"; });
  var kpiCard = d(V2Card, { icon: kv, title: "KPIs for this job", sub: "Linked to the job description", children: y(Fe, { children: [
    ai && d("p", { style: { margin: "0 0 10px" }, children: d("span", { className: "v2-badge", title: "The client may supply government KPIs; confirm the source before finalizing.", children: "AI-suggested \xB7 source to be confirmed" }) }),
    kpis.length ? d("div", { children: kpis.map(function (k) { return y("div", { className: "v2-kpi", children: [d("span", { children: k.title }), d("b", { children: k.target })] }, k.id); }) })
      : d("p", { className: "v2-empty", children: "No KPIs yet." }),
  ] }) });

  /* 4. responsibilities: projects and tasks, completed items in history */
  function item(r) {
    var late = r.effective_deadline < today;
    return y("div", { className: "v2-item", id: "responsibility-" + r.id, children: [
      d("p", { children: r.title }),
      y("p", { className: "v2-when" + (late ? " v2-late" : ""), children: [late ? "Overdue \xB7 was due " : "Due ", ge(r.effective_deadline),
        r.effective_deadline !== r.deadline ? " (extended from " + ge(r.deadline) + ")" : "", r.pending_extensions ? " \xB7 extension requested" : ""] }),
    ] }, r.id);
  }
  function group(kind, label) {
    var list = active.filter(function (r) { return r.kind === kind; });
    return y("div", { children: [y("h3", { children: [label, d("span", { children: list.length + " active" })] }),
      list.length ? list.map(item) : d("p", { className: "v2-empty", children: "No active " + label.toLowerCase() + "." })] });
  }
  function result(r) {
    if (!r.completed_on) return "Closed";
    if (r.completed_on <= r.deadline) return "On time";
    if (r.completed_on <= r.effective_deadline) return "Met revised deadline";
    return "Late";
  }
  var workCard = d(V2Card, { icon: ji, title: "Responsibilities", sub: "Projects and tasks \xB7 a project counts twice a task", children: y(Fe, { children: [
    y("div", { className: "v2-work", children: [group("project", "Projects"), group("task", "Tasks")] }),
    y("details", { className: "v2-history", children: [
      y("summary", { children: ["History \xB7 ", history.length, " completed"] }),
      history.length ? y("table", { children: [
        d("thead", { children: y("tr", { children: [d("th", { children: "Item" }), d("th", { children: "Type" }), d("th", { children: "Completed" }), d("th", { children: "Result" })] }) }),
        d("tbody", { children: history.map(function (r) {
          var res = result(r);
          return y("tr", { children: [d("td", { children: r.title }), d("td", { children: r.kind === "project" ? "Project" : "Task" }), d("td", { children: r.completed_on ? ge(r.completed_on) : "—" }),
            d("td", { children: d("span", { className: "v2-badge" + (res === "On time" ? " v2-green" : res === "Late" ? " v2-red" : ""), children: res }) })] }, r.id);
        }) }),
      ] }) : d("p", { className: "v2-empty", children: "Nothing completed yet." }),
    ] }),
  ] }) });

  /* 5. committees and delegations from the last month (the full history stays stored for the annual report) */
  var leadCard = d(V2Card, { icon: xr, title: "Committees & delegations", sub: "Last 30 days \xB7 " + ge(since) + " – " + ge(today), children: y("div", { className: "v2-two", children: [
    y("div", { children: [d("p", { className: "v2-sub", style: { marginTop: 0 }, children: "Committees" }),
      committees.length ? d("div", { className: "v2-chips", children: committees.map(function (c, i) { return d("span", { className: "v2-badge v2-green", children: c.name }, i); }) })
        : d("p", { className: "v2-empty", children: "No committee memberships." })] }),
    y("div", { children: [d("p", { className: "v2-sub", style: { marginTop: 0 }, children: "Delegations" }),
      delegations.length ? d("ul", { className: "v2-list", children: delegations.map(function (x, i) {
        return y("li", { children: [y("span", { children: [d("b", { style: { fontWeight: 600 }, children: x.delegate_name }), d("span", { className: "v2-muted", children: " \xB7 " + x.purpose })] }), d("span", { className: "v2-muted", children: ge(x.occurred_on) })] }, i);
      }) }) : d("p", { className: "v2-empty", children: "No delegations in the last 30 days." })] }),
  ] }) });

  return y("div", { className: "v2-ov", "data-v2-overview": id, children: [
    cv, rankCard,
    y("div", { className: "v2-row2", children: [jdCard, kpiCard] }),
    d("div", { className: "v2-span2", children: workCard }),
    d("div", { className: "v2-span2", children: leadCard }),
  ] });
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
    d("p", { className: "v2-muted", style: { margin: 0 }, children: "Shown as “AI-suggested \xB7 source to be confirmed” until edited here. Replace them with the government KPIs once the client confirms the source." }),
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

