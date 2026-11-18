
/* ---- round 2 (tools/eap-v2/src/ui-inject.js): Overview layout, Notes button and dialog, project/task pop-up,
   reports block, dashboard quick links, note labels ---------------------------------------------------------- */
function V2refresh() { try { Mt.changed(); } catch (e) { /* saved later */ } try { (window.__eapRefresh || tg)(); } catch (e) { /* next navigation */ } }
function V2actor() { return Mt.session && Mt.session.userId; }
function V2now() { return new Date().toISOString(); }
var V2CAT = { strength: "Strength observed", development: "Area for development", training: "Recommended training or exposure" };
function V2classify(text) {
  var t = String(text).toLowerCase();
  if (/(course|training|workshop|programme|program|certif|coach(ing)? session|exposure|دورة|ورشة|تدريب|برنامج)/.test(t)) return "training";
  if (/(should|needs?|must|late|delay|improv|missed|slip|earlier|instead|not yet|struggl|lack|overdue|يجب|تأخر|تحسين|ينبغي)/.test(t)) return "development";
  return "strength";
}

/* a box in the Overview: gold icon tile, serif title, subtitle, body and a source line */
function V2Box({ icon: icon, title: title, sub: sub, foot: foot, action: action, className: className, children: children }) {
  return y("section", { className: "v2-box " + (className || ""), children: [
    y("header", { className: "v2-box__head", children: [
      d("span", { className: "v2-box__icon", children: d(icon, { className: "size-4", "aria-hidden": !0 }) }),
      y("div", { className: "v2-box__titles", children: [d("h2", { className: "v2-box__title", children: title }), sub && d("p", { className: "v2-box__sub", children: sub })] }),
      action,
    ] }),
    d("div", { className: "v2-box__body", children: children }),
    foot && d("p", { className: "v2-box__foot", children: foot }),
  ] });
}

/* ---------- a simple modal ---------- */
function V2Modal({ title: title, sub: sub, onClose: onClose, children: children, wide: wide }) {
  (0, v.useEffect)(function () {
    function k(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", k); return function () { window.removeEventListener("keydown", k); };
  }, [onClose]);
  var node = d("div", { className: "v2-modal", role: "dialog", "aria-modal": "true", "aria-label": title, onMouseDown: function (e) { if (e.target === e.currentTarget) onClose(); }, children:
    y("div", { className: "v2-modal__card" + (wide ? " v2-modal__card--wide" : ""), children: [
      y("div", { className: "v2-modal__head", children: [
        y("div", { children: [d("h2", { className: "v2-modal__title", children: title }), sub && d("p", { className: "v2-box__sub", children: sub })] }),
        d("button", { type: "button", className: "v2-iconbtn", "aria-label": "Close", onClick: onClose, children: "✕" }),
      ] }),
      d("div", { className: "v2-modal__body", children: children }),
    ] }) });
  /* above the app's sidebar and page layers */
  try { return (0, $te.createPortal)(node, document.body); } catch (e) { return node; }
}
V2Modal.__eapClient = !0;

/* ---------- the New note dialog: general or project/task, one text box ---------- */
function V2saveNote(employeeId, text, itemId, category) {
  var who = V2actor(), today = yt(new Date()), now = V2now(), cat = category || V2classify(text);
  if (!who) throw new Error("Sign in again to write notes.");
  Mt.db.run("BEGIN");
  try {
    var note = V2one("select id, submitted_at from notes where employee_id = ? and occurred_at = ? and deleted_at is null", [employeeId, today]), noteId;
    if (!note) {
      Mt.db.run("insert into notes (employee_id, author_user_id, occurred_at, submitted_at, created_at, updated_at) values (?, ?, ?, ?, ?, ?)", [employeeId, who, today, now, now, now]);
      noteId = V2one("select last_insert_rowid() as id").id;
    } else {
      noteId = note.id;
      Mt.db.run("update notes set submitted_at = coalesce(submitted_at, ?), updated_at = ?, edited_at = case when submitted_at is null then edited_at else ? end where id = ?", [now, now, now, noteId]);
    }
    var pos = (V2one("select coalesce(max(position), -1) + 1 as p from note_entries where note_id = ? and category = ?", [noteId, cat]) || { p: 0 }).p;
    Mt.db.run("insert into note_entries (note_id, category, position, text, created_at, updated_at) values (?, ?, ?, ?, ?, ?)", [noteId, cat, pos, text.trim(), now, now]);
    var entryId = V2one("select last_insert_rowid() as id").id;
    Mt.db.run("insert into v2_note_links (note_entry_id, responsibility_id) values (?, ?)", [entryId, itemId || null]);
    Mt.db.run("insert into audit_events (ts, actor_user_id, action, object_type, object_id, employee_id, result, detail) values (?, ?, 'note.create', 'note', ?, ?, 'ok', ?)", [now, who, String(noteId), employeeId, JSON.stringify({ category: cat, responsibilityId: itemId || null })]);
    Mt.db.run("COMMIT");
  } catch (e) { try { Mt.db.run("ROLLBACK"); } catch (x) { /* none open */ } throw e; }
  return cat;
}
function V2NoteForm({ employeeId: employeeId, presetId: presetId, onDone: onDone, onCancel: onCancel }) {
  var items = V2q("select id, title, kind from responsibilities where employee_id = ? and status = 'active' order by kind, deadline", [employeeId]);
  var _a = (0, v.useState)(presetId ? "item" : "general"), scope = _a[0], setScope = _a[1];
  var _b = (0, v.useState)(presetId || (items[0] && items[0].id) || ""), itemId = _b[0], setItem = _b[1];
  var _c = (0, v.useState)(""), text = _c[0], setText = _c[1];
  var _d = (0, v.useState)(""), msg = _d[0], setMsg = _d[1];
  var item = items.find(function (r) { return String(r.id) === String(itemId); });
  function submit(ev) {
    ev.preventDefault();
    if (!text.trim()) { setMsg("Write the note first."); return; }
    try { var cat = V2saveNote(employeeId, text, null); setText(""); setMsg("Saved as \u201C" + V2CAT[cat] + "\u201D."); V2refresh(); if (onDone) onDone(cat); }
    catch (e) { setMsg("Could not save: " + e.message); }
  }
  return y("div", { className: "v2-editor v2-noteform", "data-v2-noteform": employeeId, children: [
    d("p", { className: "v2-label", style: { marginTop: 0 }, children: "This note is" }),
    y("div", { className: "v2-seg", role: "radiogroup", "aria-label": "Note type", children: [
      d("button", { type: "button", role: "radio", "aria-checked": scope === "general", className: scope === "general" ? "on" : "", onClick: function () { setScope("general"); setMsg(""); }, children: "General" }),
      d("button", { type: "button", role: "radio", "aria-checked": scope === "item", className: scope === "item" ? "on" : "", disabled: !items.length, "data-v2-scope": "item", onClick: function () { setScope("item"); setMsg(""); }, children: "Project / task specific" }),
    ] }),
    scope === "item" ? y(Fe, { children: [
      d("label", { htmlFor: "v2-note-item-" + employeeId, children: "Project or task" }),
      d("select", { id: "v2-note-item-" + employeeId, name: "responsibility", value: itemId, onChange: function (e) { setItem(e.target.value); }, children:
        items.map(function (r) { return d("option", { value: r.id, children: (r.kind === "project" ? "Project \xB7 " : "Task \xB7 ") + r.title }, r.id); }) }),
      item && d("div", { style: { marginTop: 14 }, children: d(V2ItemNoteForm, { employeeId: employeeId, item: item, onDone: function (n) { setMsg(n + (n === 1 ? " note entry" : " note entries") + " saved for " + item.title + "."); if (onDone) onDone(n); }, onCancel: onCancel }, item.id) }),
      msg && d("p", { role: "status", className: "v2-status", children: msg }),
    ] }) : y("form", { onSubmit: submit, children: [
      d("label", { htmlFor: "v2-note-text-" + employeeId, children: "Note" }),
      d("textarea", { id: "v2-note-text-" + employeeId, name: "note", value: text, placeholder: "What did you observe? Write it in your own words; the platform files it as a strength, a development point or a training idea.", onChange: function (e) { setText(e.target.value); setMsg(""); } }),
      y("div", { className: "v2-actions", children: [
        d(ne, { type: "submit", size: "touch", children: "Save note" }),
        onCancel && d("button", { type: "button", className: "v2-iconbtn", onClick: onCancel, children: "Cancel" }),
        msg && d("span", { role: "status", className: "v2-muted", children: msg }),
      ] }),
    ] }),
  ] });
}
V2NoteForm.__eapClient = !0;

/* the project/task pop-up's note form: project-specific, in the app's three note boxes */
var V2CATS = ["strength", "development", "training"];
function V2ItemNoteForm({ employeeId: employeeId, item: item, onDone: onDone, onCancel: onCancel }) {
  var _a = (0, v.useState)({ strength: [""], development: [""], training: [""] }), boxes = _a[0], setBoxes = _a[1];
  var _b = (0, v.useState)(""), msg = _b[0], setMsg = _b[1];
  function set(c, i, val) { var n = Object.assign({}, boxes); n[c] = boxes[c].map(function (x, j) { return j === i ? val : x; }); setBoxes(n); setMsg(""); }
  function add(c) { var n = Object.assign({}, boxes); n[c] = boxes[c].concat([""]); setBoxes(n); }
  function remove(c, i) { var n = Object.assign({}, boxes); n[c] = boxes[c].filter(function (x, j) { return j !== i; }); if (!n[c].length) n[c] = [""]; setBoxes(n); }
  function submit(ev) {
    ev.preventDefault();
    var rows = [];
    V2CATS.forEach(function (c) { boxes[c].forEach(function (t) { if (t.trim()) rows.push([c, t]); }); });
    if (!rows.length) { setMsg("Write at least one note."); return; }
    try { rows.forEach(function (r) { V2saveNote(employeeId, r[1], item.id, r[0]); }); V2refresh(); if (onDone) onDone(rows.length); }
    catch (e) { setMsg("Could not save: " + e.message); }
  }
  return y("form", { className: "v2-catform", onSubmit: submit, "data-v2-itemnote": item.id, children: [
    y("p", { className: "v2-catform__for", children: ["Note for this " + (item.kind === "project" ? "project" : "task") + ": ", d("b", { children: item.title })] }),
    V2CATS.map(function (c) {
      return y("div", { className: "v2-cat v2-cat--" + c, children: [
        y("div", { className: "v2-cat__head", children: [d(Px[c], { className: "size-4", "aria-hidden": !0 }), " ", V2CAT[c]] }),
        y("div", { className: "v2-cat__body", children: [
          boxes[c].map(function (t, i) {
            return y("div", { className: "v2-cat__row", children: [
              d("textarea", { "aria-label": V2CAT[c] + " " + (i + 1), "data-v2-cat": c, value: t, onChange: function (e) { set(c, i, e.target.value); } }),
              d("button", { type: "button", className: "v2-cat__x", "aria-label": "Remove", onClick: function () { remove(c, i); }, children: "\u2715" }),
            ] }, i);
          }),
          d("button", { type: "button", className: "v2-cat__add", onClick: function () { add(c); }, children: "+ Add" }),
        ] }),
      ] }, c);
    }),
    y("div", { className: "v2-actions", children: [
      d(ne, { type: "submit", size: "touch", children: "Save note" }),
      onCancel && d("button", { type: "button", className: "v2-iconbtn", onClick: onCancel, children: "Cancel" }),
      msg && d("span", { role: "status", className: "v2-muted", children: msg }),
    ] }),
  ] });
}
V2ItemNoteForm.__eapClient = !0;

/* the highlighted Notes button at the top right of the employee header */
function V2NotesButton({ employeeId: employeeId }) {
  var _a = (0, v.useState)(!1), open = _a[0], setOpen = _a[1];
  var close = (0, v.useCallback)(function () { setOpen(!1); }, []);
  var recent = open ? V2q("select ne.id, ne.text, ne.category, n.occurred_at, l.responsibility_id, r.title, r.kind from note_entries ne join notes n on n.id = ne.note_id left join v2_note_links l on l.note_entry_id = ne.id left join responsibilities r on r.id = l.responsibility_id where n.employee_id = ? and n.deleted_at is null and n.submitted_at is not null order by n.occurred_at desc, ne.id desc limit 5", [employeeId]) : [];
  return y(Fe, { children: [
    y("button", { type: "button", className: "v2-notesbtn", "data-v2-notes": employeeId, onClick: function () { setOpen(!0); }, children: [d(Td, { className: "size-4", "aria-hidden": !0 }), " Write Notes"] }),
    open && y(V2Modal, { title: "New note", sub: "General, or about one project or task", onClose: close, children: [
      d(V2NoteForm, { employeeId: employeeId }),
      d("p", { className: "v2-sub", children: "Recent notes" }),
      recent.length ? d("ul", { className: "v2-notelist", children: recent.map(function (n) {
        return y("li", { children: [y("p", { className: "v2-notelist__meta", children: [ge(n.occurred_at), " \xB7 ", V2CAT[n.category] || n.category, " \xB7 ", d("span", { className: "v2-badge" + (n.responsibility_id ? "" : " v2-green"), children: n.responsibility_id ? (n.kind === "project" ? "Project: " : "Task: ") + n.title : "General" })] }), d("p", { children: n.text })] }, n.id);
      }) }) : d("p", { className: "v2-empty", children: "No notes yet." }),
      d("p", { style: { marginTop: 14 }, children: d(Ee, { href: "/employees/" + employeeId + "/notes", className: "v2-link", onClick: close, children: "Open all notes →" }) }),
    ] }),
  ] });
}
V2NotesButton.__eapClient = !0;

/* labels on the Notes timeline: General, or the project/task the note's entries are about */
function V2NoteTags({ noteId: noteId }) {
  var rows = V2q("select l.responsibility_id as rid, r.title, r.kind from note_entries ne left join v2_note_links l on l.note_entry_id = ne.id left join responsibilities r on r.id = l.responsibility_id where ne.note_id = ?", [noteId]);
  var general = !rows.length || rows.some(function (r) { return !r.rid; }), seen = {}, tags = [];
  if (general) tags.push(d("span", { className: "v2-badge v2-green", children: "General" }, "g"));
  rows.forEach(function (r) { if (r.rid && !seen[r.rid]) { seen[r.rid] = 1; tags.push(d("span", { className: "v2-badge", children: (r.kind === "project" ? "Project: " : "Task: ") + r.title }, r.rid)); } });
  return d("span", { className: "v2-tags", "data-v2-tags": noteId, children: tags });
}

/* ---------- the project/task pop-up ---------- */
function V2ItemDialog({ item: item0, employeeId: employeeId, onClose: onClose }) {
  var _a = (0, v.useState)(0), tick = _a[0], setTick = _a[1];
  var _b = (0, v.useState)("details"), mode = _b[0], setMode = _b[1];
  var _c = (0, v.useState)(""), newDate = _c[0], setDate = _c[1];
  var _d = (0, v.useState)(""), reason = _d[0], setReason = _d[1];
  var _e = (0, v.useState)(""), msg = _e[0], setMsg = _e[1];
  var item = V2responsibilities(employeeId).find(function (r) { return r.id === item0.id; }) || item0;
  var exts = V2q("select x.*, u.name as requester from responsibility_extensions x left join user u on u.id = x.requested_by where x.responsibility_id = ? order by x.created_at desc, x.id desc", [item.id]);
  var notes = V2q("select ne.id, ne.text, ne.category, n.occurred_at from v2_note_links l join note_entries ne on ne.id = l.note_entry_id join notes n on n.id = ne.note_id where l.responsibility_id = ? and n.deleted_at is null order by n.occurred_at desc, ne.id desc", [item.id]);
  var today = yt(new Date()), active = item.status === "active", who = V2actor();
  function done(text) { setMsg(text); setTick(tick + 1); V2refresh(); }
  function decide(x, ok) {
    var now = V2now();
    try {
      if (ok) Mt.db.run("update responsibility_extensions set outcome = 'approved', approved_deadline = requested_deadline, decided_by = ?, decided_at = ?, updated_at = ? where id = ? and outcome = 'pending'", [who, now, now, x.id]);
      else Mt.db.run("update responsibility_extensions set outcome = 'rejected', approved_deadline = NULL, decided_by = ?, decided_at = ?, updated_at = ? where id = ? and outcome = 'pending'", [who, now, now, x.id]);
      Mt.db.run("insert into audit_events (ts, actor_user_id, action, object_type, object_id, employee_id, result, detail) values (?, ?, ?, 'responsibility_extension', ?, ?, 'ok', NULL)", [now, who, ok ? "extension.approve" : "extension.reject", String(x.id), employeeId]);
      done(ok ? "Extension approved: new deadline " + ge(x.requested_deadline) + "." : "Extension request declined.");
    } catch (e) { setMsg("Could not save: " + e.message); }
  }
  function addExtension(ev) {
    ev.preventDefault();
    var prev = item.effective_deadline, now = V2now();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate) || newDate <= prev) { setMsg("Choose a new deadline after " + ge(prev) + "."); return; }
    if (!reason.trim()) { setMsg("Add a short reason."); return; }
    try {
      Mt.db.run("insert into responsibility_extensions (responsibility_id, previous_deadline, requested_deadline, reason, requested_by, outcome, approved_deadline, decided_by, decided_at, created_at, updated_at) values (?, ?, ?, ?, ?, 'approved', ?, ?, ?, ?, ?)", [item.id, prev, newDate, reason.trim(), who, newDate, who, now, now, now]);
      Mt.db.run("insert into audit_events (ts, actor_user_id, action, object_type, object_id, employee_id, result, detail) values (?, ?, 'extension.grant', 'responsibility', ?, ?, 'ok', ?)", [now, who, String(item.id), employeeId, JSON.stringify({ to: newDate })]);
      setDate(""); setReason(""); done("Extension added: new deadline " + ge(newDate) + ".");
    } catch (e) { setMsg("Could not save: " + e.message); }
  }
  var late = active && item.effective_deadline < today;
  var outcome = { pending: "Pending", approved: "Approved", rejected: "Declined" };
  return y(V2Modal, { title: item.title, sub: (item.kind === "project" ? "Project" : "Task") + (active ? " \xB7 active" : " \xB7 completed"), onClose: onClose, wide: !0, children: [
    mode === "note" ? y(Fe, { children: [
      d("p", { className: "v2-sub", style: { marginTop: 0 }, children: "Write a note about this " + (item.kind === "project" ? "project" : "task") }),
      d(V2ItemNoteForm, { employeeId: employeeId, item: item, onDone: function (n) { setMode("details"); done(n + (n === 1 ? " note entry" : " note entries") + " saved for this " + (item.kind === "project" ? "project" : "task") + "."); }, onCancel: function () { setMode("details"); } }),
    ] }) : y(Fe, { children: [
      y("dl", { className: "v2-facts", children: [
        y("div", { className: "v2-fact", children: [d("dt", { children: "Start date" }), d("dd", { children: ge(item.started_on) })] }),
        y("div", { className: "v2-fact", children: [d("dt", { children: active ? "Deadline" : "Completed" }), y("dd", { className: late ? "v2-late" : "", children: [active ? ge(item.effective_deadline) : item.completed_on ? ge(item.completed_on) : "—",
          item.effective_deadline !== item.deadline && d("small", { children: "Proposed deadline " + ge(item.deadline) }), late && d("small", { children: "Overdue" })] })] }),
        y("div", { className: "v2-fact", children: [d("dt", { children: "Type" }), y("dd", { children: [item.kind === "project" ? "Project" : "Task", d("small", { children: item.kind === "project" ? "Counts twice a task" : "Single task" })] })] }),
      ] }),
      item.description && d("p", { className: "v2-desc", children: item.description }),
      y("div", { className: "v2-dialog-grid", children: [
        y("section", { children: [
          d("p", { className: "v2-sub", children: "Extensions" }),
          exts.length ? d("ul", { className: "v2-list", children: exts.map(function (x) {
            return y("li", { "data-v2-ext": x.id, children: [y("div", { style: { minWidth: 0, flex: "1 1 220px" }, children: [
                y("p", { style: { margin: 0 }, children: [ge(x.previous_deadline), " → ", d("b", { children: ge(x.requested_deadline) }), " ", d("span", { className: "v2-badge" + (x.outcome === "approved" ? " v2-green" : x.outcome === "rejected" ? " v2-red" : ""), children: outcome[x.outcome] || x.outcome })] }),
                d("p", { className: "v2-muted", style: { margin: "2px 0 0" }, children: x.reason + (x.requester ? " \xB7 " + x.requester : "") }),
              ] }),
              x.outcome === "pending" && y("span", { className: "v2-actions", style: { marginTop: 0 }, children: [
                d(ne, { type: "button", size: "touch", onClick: function () { decide(x, !0); }, children: "Approve" }),
                d("button", { type: "button", className: "v2-iconbtn", onClick: function () { decide(x, !1); }, children: "Decline" }),
              ] })] }, x.id);
          }) }) : d("p", { className: "v2-empty", children: "No extension requests." }),
          active && y("form", { className: "v2-editor", onSubmit: addExtension, children: [
            d("label", { htmlFor: "v2-ext-date", children: "Add extension" }),
            y("div", { className: "v2-kpirow", style: { gridTemplateColumns: "minmax(0,1fr) minmax(0,2fr) auto", marginTop: 0 }, children: [
              d("input", { id: "v2-ext-date", type: "date", value: newDate, min: V2addDays(item.effective_deadline, 1), onChange: function (e) { setDate(e.target.value); setMsg(""); } }),
              d("input", { "aria-label": "Reason", placeholder: "Reason", value: reason, onChange: function (e) { setReason(e.target.value); setMsg(""); } }),
              d(ne, { type: "submit", size: "touch", children: "Add" }),
            ] }),
          ] }),
        ] }),
        y("section", { children: [
          y("div", { className: "v2-row", children: [d("p", { className: "v2-sub", children: "Notes on this " + (item.kind === "project" ? "project" : "task") }),
            d(ne, { type: "button", size: "touch", variant: "outline", onClick: function () { setMode("note"); setMsg(""); }, "data-v2-writenote": item.id, children: "Write note" })] }),
          notes.length ? d("div", { className: "v2-catnotes", children: V2CATS.map(function (c) {
            var list = notes.filter(function (n) { return n.category === c; });
            if (!list.length) return null;
            return y("div", { className: "v2-cat v2-cat--" + c, "data-v2-catlist": c, children: [
              y("div", { className: "v2-cat__head", children: [d(Px[c], { className: "size-4", "aria-hidden": !0 }), " ", V2CAT[c]] }),
              d("ul", { className: "v2-cat__list", children: list.map(function (n) { return y("li", { children: [d("span", { className: "v2-cat__date", children: ge(n.occurred_at) }), d("span", { children: n.text })] }, n.id); }) }),
            ] }, c);
          }) }) : d("p", { className: "v2-empty", children: "No notes written about this item yet." }),
        ] }),
      ] }),
      msg && d("p", { role: "status", className: "v2-status", children: msg }),
    ] }),
  ] });
}
V2ItemDialog.__eapClient = !0;
function V2Item({ item: r, employeeId: employeeId, today: today }) {
  var _a = (0, v.useState)(function () { try { return (ds.hash || "") === "#responsibility-" + r.id; } catch (e) { return !1; } }), open = _a[0], setOpen = _a[1];
  var close = (0, v.useCallback)(function () { setOpen(!1); try { if (ds.hash === "#responsibility-" + r.id) ds.hash = ""; } catch (e) { /* router state */ } }, [r.id]);
  var late = r.effective_deadline < today;
  return y(Fe, { children: [
    y("button", { type: "button", className: "v2-item" + (late ? " v2-item--late" : r.pending_extensions ? " v2-item--ext" : ""), id: "responsibility-" + r.id, "data-v2-item": r.id, onClick: function () { setOpen(!0); }, children: [
      d("span", { className: "v2-item__due" + (late ? " late" : ""), children: late ? "Overdue" : V2dueIn(today, r.effective_deadline) }),
      y("span", { className: "v2-item__main", children: [d("span", { className: "v2-item__title", children: r.title }),
        y("span", { className: "v2-when" + (late ? " v2-late" : ""), children: [late ? "Overdue \xB7 was due " : "Due ", ge(r.effective_deadline), r.effective_deadline !== r.deadline ? " \xB7 extended" : "", r.pending_extensions ? " \xB7 extension requested" : ""] })] }),
      d(la, { className: "size-4 v2-item__arrow", "aria-hidden": !0 }),
    ] }),
    open && d(V2ItemDialog, { item: r, employeeId: employeeId, onClose: close }),
  ] });
}
V2Item.__eapClient = !0;

/* ---------- reports at the bottom of the Overview ---------- */
function V2addMonths(s, n) { var p = s.split("-").map(Number), dt = new Date(Date.UTC(p[0], p[1] - 1 + n, p[2])); return dt.toISOString().slice(0, 10); }
/* a report object (snapshot, rating, narrative, rankings) for the signed-in account, as the PDF route builds it */
function V2loadReport(reportId, mine) {
  try {
    if (!mine) { var l = E.select().from(te).where(N(te.id, reportId)).get(); if (!l || l.status !== "complete") return null; var u = Wl(l); return u.ok ? Object.assign({}, u, $h(E, l)) : null; }
    var emp = E.select().from(P).where(N(P.userId, V2actor())).get(); return emp ? Bh(E, emp.id, reportId) || null : null;
  } catch (e) { console.error("v2 report", e); return null; }
}
function V2reportFile(rep, kind, lang) { var m = rep.snapshot.meta; return V2fileName(qu(rep.snapshot.identity.displayName, m.periodStart, m.periodEnd), kind, lang); }
async function V2downloadReport(rep, kind, lang) {
  var bytes = await V2Pdf(rep, kind, lang), url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" })), a = document.createElement("a");
  a.href = url; a.download = V2reportFile(rep, kind, lang); document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 6e4);
}
var V2KINDS = [["form", "One-pager"], ["detailed", "Full detailed report"]];
/* the reports on screen: report tabs, language tabs, the pages as images, and a download button */
function V2ReportViewer({ report: rep, initial: initial, initialLang: initialLang }) {
  var _a = (0, v.useState)(initial || "form"), kind = _a[0], setKind = _a[1];
  var _l = (0, v.useState)(initialLang || "en"), lang = _l[0], setLang = _l[1];
  var _b = (0, v.useState)({}), pages = _b[0], setPages = _b[1];
  var _c = (0, v.useState)(""), err = _c[0], setErr = _c[1];
  var _d = (0, v.useState)(!1), busy = _d[0], setBusy = _d[1];
  var key = kind + "-" + lang;
  (0, v.useEffect)(function () {
    if (pages[key]) return;
    var live = !0;
    V2arPages(rep, kind, lang).then(function (r) { if (!live) return; setPages(function (old) { var n = Object.assign({}, old); n[key] = r.pages.map(function (P) { return P.cv.toDataURL("image/jpeg", 0.9); }); return n; }); })
      .catch(function (e) { if (live) setErr("Could not prepare the report: " + e.message); });
    return function () { live = !1; };
  }, [key]);
  async function dl() { setBusy(!0); try { await V2downloadReport(rep, kind, lang); } catch (e) { setErr("Could not download: " + e.message); } finally { setBusy(!1); } }
  return y("div", { className: "v2-viewer", "data-v2-viewer": key, children: [
    y("div", { className: "v2-viewer__bar", children: [
      y("div", { className: "v2-viewer__tabs", children: [
        d("div", { className: "v2-seg", role: "tablist", "aria-label": "Report", children: V2KINDS.map(function (k) {
          return d("button", { type: "button", role: "tab", "aria-selected": kind === k[0], className: kind === k[0] ? "on" : "", "data-v2-tab": k[0], onClick: function () { setKind(k[0]); setErr(""); }, children: k[1] }, k[0]);
        }) }),
        d("div", { className: "v2-seg", role: "tablist", "aria-label": "Language", children: V2LANGS.map(function (l) {
          return d("button", { type: "button", role: "tab", "aria-selected": lang === l[0], className: lang === l[0] ? "on" : "", "data-v2-langtab": l[0], onClick: function () { setLang(l[0]); setErr(""); }, children: l[1] }, l[0]);
        }) }),
      ] }),
      y(ne, { type: "button", size: "touch", disabled: busy, onClick: dl, "data-v2-viewdl": key, children: [d(Cv, { className: "size-4", "aria-hidden": !0 }), " ", busy ? "Preparing PDF\u2026" : "Download PDF (" + (lang === "en" ? "English" : "Arabic") + ")"] }),
    ] }),
    err && d("p", { role: "alert", className: "v2-status", style: { background: "#f6e6e0", color: "#9a4f37" }, children: err }),
    pages[key] ? d("div", { className: "v2-viewer__pages", children: pages[key].map(function (src, i) {
      return d("img", { src: src, alt: (kind === "form" ? "One-pager" : "Full detailed report") + ", page " + (i + 1), className: "v2-viewer__page" }, key + i);
    }) }) : !err && d("p", { className: "v2-viewer__loading", children: "Preparing the report\u2026" }),
  ] });
}
V2ReportViewer.__eapClient = !0;
/* Open report: each report, in English or Arabic, viewed on screen or downloaded */
function V2OpenReport({ reportId: reportId, filename: filename, employeeId: employeeId, mine: mine, title: title }) {
  var _a = (0, v.useState)(!1), open = _a[0], setOpen = _a[1];
  var _b = (0, v.useState)(null), view = _b[0], setView = _b[1];
  var close = (0, v.useCallback)(function () { setView(null); }, []);
  var rep = view ? V2loadReport(reportId, mine) : null;
  return y("div", { className: "v2-open", children: [
    y("button", { type: "button", className: "v2-openbtn", "aria-expanded": open, "data-v2-open": reportId, onClick: function () { setOpen(!open); }, children: ["Open report ", d("span", { "aria-hidden": !0, children: open ? "\u25B4" : "\u25BE" })] }),
    open && d("div", { className: "v2-open__menu", children: V2KINDS.map(function (k) {
      return y("div", { className: "v2-open__block", children: [
        d("p", { className: "v2-open__name", children: k[1] }),
        V2LANGS.map(function (l) {
          return y("div", { className: "v2-open__row", children: [
            d("span", { className: "v2-open__lang", children: l[1] }),
            y("span", { className: "v2-open__acts", children: [
              y("button", { type: "button", className: "v2-iconbtn v2-viewbtn", "data-v2-view": k[0], "data-v2-viewlang": l[0], onClick: function () { setView([k[0], l[0]]); }, children: ["View on screen"] }),
              d(V2Dl, { reportId: reportId, filename: filename, kind: k[0], lang: l[0], label: "Download" }),
            ] }),
          ] }, l[0]);
        }),
      ] }, k[0]);
    }) }),
    view && d(V2Modal, { title: title || "Assessment report", sub: "View on screen", onClose: close, wide: !0, children:
      rep ? d(V2ReportViewer, { report: rep, initial: view[0], initialLang: view[1] }) : d("p", { className: "v2-empty", children: "This report could not be opened." }) }),
  ] });
}
V2OpenReport.__eapClient = !0;
function V2Reports({ employee: e, mine: mine }) {
  var today = yt(new Date());
  var anchor = (V2one("select anchor_date from assessment_settings where id = 1") || {}).anchor_date || "2025-09-01";
  var kinds = [["semiannual", "6-month review", 6], ["yearly", "Annual review", 12]];
  return d(V2Box, { icon: zo, title: "Assessment reports", sub: "Cycle starts " + ge(anchor) + " \xB7 two reports each: one-pager and full detailed report", className: "v2-span2", foot: "Reports \xB7 frozen at generation", children:
    y("div", { className: "v2-reports", children: [
      y("div", { className: "v2-reports__who", children: [d(en, { name: e.display_name, employeeId: e.id, photoUpdatedAt: e.photo_updated_at, size: "md" }),
        y("div", { children: [d("h3", { className: "font-heading text-lg font-semibold", children: e.display_name }), d("p", { className: "text-sm text-muted-foreground", children: e.job_title })] })] }),
      d("div", { className: "v2-reports__grid", children: kinds.map(function (k) {
        var end = V2addDays(V2addMonths(anchor, k[2]), -1);
        var rep = V2one("select id, created_at, shared_at from assessments where employee_id = ? and period_kind = ? and period_start = ? and period_end = ? and status = 'complete'" + (mine ? " and shared_at is not null" : "") + " order by created_at desc, id desc limit 1", [e.id, k[0], anchor, end]);
        var ended = today > end;
        return y("div", { className: "v2-review", "data-v2-review": k[0], children: [
          y("div", { className: "v2-review__head", children: [d("h4", { children: k[1] }), d(la, { className: "size-4", "aria-hidden": !0 })] }),
          d("p", { className: "v2-review__period", children: ge(anchor) + " – " + ge(end) }),
          rep ? d("span", { className: "v2-badge" + (rep.shared_at ? " v2-green" : ""), children: rep.shared_at ? "Shared" : "Not shared yet" })
            : d("span", { className: "v2-badge", children: ended ? "Period ended" : "In progress" }),
          rep ? d(V2OpenReport, { reportId: rep.id, filename: qu(e.display_name, anchor, end), employeeId: e.id, mine: mine, title: e.display_name + " \xB7 " + k[1] })
            : mine ? d("p", { className: "v2-muted", children: "Not shared with you yet." })
            : y("div", { className: "v2-review__gen", children: [d("p", { className: "v2-muted", children: ended ? "Ready to generate" : "Available after " + ge(end) }), ended && d(Nc, { employeeId: e.id, periodKind: k[0], enabled: !0 })] }),
        ] }, k[0]);
      }) }),
    ] }) });
}

function V2dueIn(today, day) {
  var n = Math.round((new Date(day + "T00:00:00Z") - new Date(today + "T00:00:00Z")) / 864e5);
  return n === 0 ? "Due today" : n === 1 ? "1 day" : n + " days";
}
/* the summary strip at the top of the Overview */
function V2Glance({ items: items }) {
  return d("section", { className: "v2-glance v2-span2", "aria-label": "At a glance", children: items.map(function (it, i) {
    return y("div", { className: "v2-glance__item" + (it.tone ? " v2-glance__item--" + it.tone : ""), children: [
      d("span", { className: "v2-glance__icon", children: d(it.icon, { className: "size-4", "aria-hidden": !0 }) }),
      y("div", { children: [d("p", { className: "v2-glance__label", children: it.label }), d("p", { className: "v2-glance__value", children: it.value }), it.sub && d("p", { className: "v2-glance__sub", children: it.sub })] }),
    ] }, i);
  }) });
}
/* ---------- the Overview ---------- */
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

  /* 1. CV summary */
  var cv = d(V2Box, { icon: xr, title: "CV summary", sub: "Experience, joining date, current position and previous roles", className: "v2-span2", foot: "CV summary \xB7 from the employee profile", children: y("div", { className: "v2-cvgrid", children: [
    y("dl", { className: "v2-facts", children: [
      y("div", { className: "v2-fact", children: [d("dt", { children: "Experience" }), y("dd", { children: [V2span(e.career_start, today), e.career_start && d("small", { children: "Since " + V2month(e.career_start) })] })] }),
      y("div", { className: "v2-fact", children: [d("dt", { children: "Joining date" }), y("dd", { children: [e.started_at ? ge(e.started_at) : "Not recorded", e.started_at && d("small", { children: V2span(e.started_at, today) + " in the office" })] })] }),
      y("div", { className: "v2-fact", children: [d("dt", { children: "Current position" }), y("dd", { children: [e.job_title || "Not recorded", e.reports_to && d("small", { children: "Reports to " + e.reports_to })] })] }),
    ] }),
    y("div", { children: [
      d("p", { className: "v2-sub", style: { marginTop: 0 }, children: "Previous roles" }),
      roles.length ? d("ol", { className: "v2-timeline", children: roles.map(function (r) {
        return y("li", { children: [d("span", { className: "v2-timeline__dot", "aria-hidden": !0 }), y("div", { children: [d("p", { className: "v2-timeline__title", children: r.title }), d("p", { className: "v2-muted", children: r.employer + " \xB7 " + V2month(r.started_on) + " – " + V2month(r.ended_on) })] })] }, r.id);
      }) }) : d("p", { className: "v2-empty", children: "No previous roles recorded." }),
    ] }),
  ] }) });

  /* 2. job description */
  var lines = String(jd ? jd.body : "").split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
  var intro = lines.filter(function (l) { return l.indexOf("•") !== 0; }), bullets = lines.filter(function (l) { return l.indexOf("•") === 0; }).map(function (l) { return l.replace(/^•\s*/, ""); });
  var jdCard = d(V2Box, { icon: zo, title: "Current job description", foot: jd ? "Current job description \xB7 updated " + Je(jd.updated_at) + (jd.updated_by ? " by " + jd.updated_by : "") : "Current job description", children: jd ? y("div", { className: "v2-jd", children: [
    intro.map(function (l, i) { return d("p", { className: "v2-jd__lead", children: l }, "p" + i); }),
    bullets.length > 0 && d("ul", { children: bullets.map(function (l, i) { return d("li", { children: l }, "b" + i); }) }),
  ] }) : d("p", { className: "v2-empty", children: "No job description yet. The administrator adds it on the employee's admin page." }) });

  /* 3. KPIs */
  var kpiCard = d(V2Box, { icon: kv, title: "KPIs for this job", foot: "KPIs for this job", children:
    kpis.length ? d("ol", { className: "v2-kpis", children: kpis.map(function (k, i) { return y("li", { children: [d("span", { className: "v2-kpis__n", children: i + 1 }), d("span", { className: "v2-kpis__t", children: k.title }), d("b", { children: k.target })] }, k.id); }) })
      : d("p", { className: "v2-empty", children: "No KPIs yet." }) });

  /* 4. projects and tasks */
  function group(kind, label) {
    var list = active.filter(function (r) { return r.kind === kind; });
    return y("div", { className: "v2-group", children: [y("h3", { children: [label, d("span", { className: "v2-count", children: list.length })] }),
      list.length ? list.map(function (r) { return d(V2Item, { item: r, employeeId: id, today: today }, r.id); }) : d("p", { className: "v2-empty", children: "No active " + label.toLowerCase() + "." })] });
  }
  function result(r) {
    if (!r.completed_on) return "Closed";
    if (r.completed_on <= r.deadline) return "On time";
    if (r.completed_on <= r.effective_deadline) return "Met revised deadline";
    return "Late";
  }
  var workCard = d(V2Box, { icon: ji, title: "Responsibilities", sub: "Projects and tasks \xB7 select one to see extensions and notes", className: "v2-span2", foot: "Responsibilities \xB7 a project counts twice a task \xB7 completed items move to history", children: y(Fe, { children: [
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

  /* 5. committees and delegations from the last month */
  var leadCard = d(V2Box, { icon: xr, title: "Committees & delegations", sub: "Last 30 days \xB7 " + ge(since) + " – " + ge(today), className: "v2-span2", foot: "Committees & delegations \xB7 the full history is kept for the annual report", children: y("div", { className: "v2-two", children: [
    y("div", { children: [d("p", { className: "v2-sub", style: { marginTop: 0 }, children: "Committees" }),
      committees.length ? d("div", { className: "v2-chips", children: committees.map(function (c, i) { return d("span", { className: "v2-chip", children: c.name }, i); }) })
        : d("p", { className: "v2-empty", children: "No committee memberships." })] }),
    y("div", { children: [d("p", { className: "v2-sub", style: { marginTop: 0 }, children: "Delegations" }),
      delegations.length ? d("ul", { className: "v2-list", children: delegations.map(function (x, i) {
        return y("li", { children: [y("span", { children: [d("b", { style: { fontWeight: 600 }, children: x.delegate_name }), d("span", { className: "v2-muted", children: " \xB7 " + x.purpose })] }), d("span", { className: "v2-muted", children: ge(x.occurred_on) })] }, i);
      }) }) : d("p", { className: "v2-empty", children: "No delegations in the last 30 days." })] }),
  ] }) });

  /* 6. ranking and self-ranking (below committees and delegations) */
  var p = rk.peer, s = rk.self;
  var rankCard = d(V2Box, { icon: eo, title: "Ranking", sub: p ? "Peer result from " + p.round.label : "Peer ranking", className: "v2-span2", foot: "Ranking \xB7 peer result and the most recent self-ranking", children: y("div", { className: "v2-rankgrid", children: [
    y("dl", { className: "v2-rank", children: [
      y("div", { className: "v2-fact v2-fact--big v2-fact--medal", children: [d("dt", { children: "Current ranking" }),
        mine ? y("dd", { children: ["—", d("small", { children: "Shared with you in your report" })] })
          : y("dd", { children: [p ? (p.tied > 1 ? "Joint " : "") + V2ord(p.rank) : "—", d("small", { children: p ? "of " + p.of + (p.tied > 1 ? " \xB7 " + p.tied + "-way tie" : "") : "No complete round yet" })] })] }),
      y("div", { className: "v2-fact v2-fact--big", children: [d("dt", { children: "Self-ranking" }),
        y("dd", { children: [s && s.position ? V2ord(s.position) : "—", d("small", { children: s ? s.round.label + " \xB7 " + Je(s.submittedAt) : "Not submitted yet" })] })] }),
    ] }),
    s ? y("div", { children: [
      d("p", { className: "v2-sub", style: { marginTop: 0 }, children: (mine ? "Your" : V2first(e.display_name) + "’s") + " most recent order" }),
      d("ol", { className: "v2-order", children: s.order.map(function (o) {
        return y("li", { className: o.rankedEmployeeId === id ? "v2-self" : "", children: [d("b", { children: o.position }), d("span", { children: s.names[o.rankedEmployeeId] || "Employee " + o.rankedEmployeeId })] }, o.rankedEmployeeId);
      }) }),
    ] }) : d("p", { className: "v2-empty", children: "No self-ranking submitted yet." }),
  ] }) });

  var overdue = active.filter(function (r) { return r.effective_deadline < today; }).length, projects = active.filter(function (r) { return r.kind === "project"; }).length;
  var exp = V2years(e.career_start, today);
  var glance = d(V2Glance, { items: [
    { icon: xr, label: "Experience", value: exp ? exp.y + " yrs" : "\u2014", sub: "Joined " + (e.started_at ? V2month(e.started_at) : "\u2014") },
    { icon: ji, label: "Active work", value: String(active.length), sub: projects + " projects \xB7 " + (active.length - projects) + " tasks" },
    { icon: ua, label: "Overdue", value: String(overdue), sub: overdue ? "needs attention" : "all on track", tone: overdue ? "warn" : "ok" },
    { icon: xr, label: "Committees & delegations", value: committees.length + " \xB7 " + delegations.length, sub: "delegations in the last 30 days" },
    { icon: eo, label: "Peer ranking", value: mine ? "\u2014" : p ? (p.tied > 1 ? "Joint " : "") + V2ord(p.rank) : "\u2014", sub: s && s.position ? "Self-ranking " + V2ord(s.position) : "No self-ranking yet", tone: "gold" },
  ] });
  return y("div", { className: "v2-ov", "data-v2-overview": id, children: [glance, cv, jdCard, kpiCard, workCard, leadCard, rankCard, d(V2Reports, { employee: e, mine: mine })] });
}
