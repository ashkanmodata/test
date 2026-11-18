<script>
// Card 6, Employee Assessment Platform v2 (/employee_assessment_platform_v2/): the same Employee Assessment app as
// Card 5, with the November 2026 client changes. The employee page has one Overview (CV summary, job description,
// KPIs, projects and tasks, recent committees and delegations, ranking and self-ranking) and four tabs: Overview,
// Notes, Report and Development Plan. Work, Assessment and View work are gone, Ranking and Reports are off the main
// navigation, and every report downloads as the two-page Visual Scorecard PDF. Card 5 is unchanged: this card keeps
// its own copy of the database (IndexedDB "cpc-employee-assessment-v2"), so the two cards never share saved changes.
// Built by tools/eap-v2/build.py from this file and tools/eap-v2/src/*.
window.__cpcDemoModules.push(function (api) {
  var B = "/employee_assessment_platform_v2";
  var D = api.data("eap3") || { accounts: [], files: [], pdfs: {} };
  var S = api.state("eap3", function () { return { session: null }; });
  var store = window.__eapStore2 = { db: null, files: {}, pdfs: {}, session: S.session, authConfig: null };
  var KEY = "cpc-eap3", saving = null;

  function idb() {
    return new Promise(function (ok, bad) {
      try { var r = indexedDB.open("cpc-employee-assessment-v2", 1); r.onupgradeneeded = function () { r.result.createObjectStore("kv"); }; r.onsuccess = function () { ok(r.result); }; r.onerror = function () { bad(r.error); }; }
      catch (e) { bad(e); }
    });
  }
  function idbGet() {
    return idb().then(function (db) { return new Promise(function (ok) { var q = db.transaction("kv").objectStore("kv").get(KEY); q.onsuccess = function () { ok(q.result || null); }; q.onerror = function () { ok(null); }; }); }).catch(function () { return null; });
  }
  function idbPut(v) {
    return idb().then(function (db) { return new Promise(function (ok) { var t = db.transaction("kv", "readwrite"); t.objectStore("kv").put(v, KEY); t.oncomplete = ok; t.onerror = ok; }); }).catch(function () {});
  }
  store.changed = function () {
    clearTimeout(saving);
    saving = setTimeout(function () {
      try { var bytes = store.db.export(); store.db.run("PRAGMA foreign_keys = ON"); idbPut({ v: D.version, db: bytes, files: store.files }); } catch (e) { /* this session only */ }
    }, 400);
  };

  // ---------- the v2 additions to the database: previous roles, job descriptions, KPIs, project/task kinds ----------
  function iso(d) { return d.toISOString().slice(0, 10); }
  function daysAgo(n) { var d = new Date(Date.now() + 144e5); d.setUTCDate(d.getUTCDate() - n); return iso(d); }
  var ROLES = {
    1: [["Policy Analyst", "Government Policy Institute", "2017-01-01", "2019-08-31"], ["Research Associate", "Public Services Directorate", "2015-03-01", "2016-12-31"]],
    2: [["Partnerships Specialist", "National Events Office", "2020-01-01", "2021-01-31"], ["Events Officer", "Culture and Heritage Authority", "2018-07-15", "2019-12-31"]],
    3: [["Business Intelligence Specialist", "Statistics Centre", "2021-07-01", "2022-12-31"], ["Data Analyst", "Digital Government Office", "2020-01-10", "2021-06-30"]],
    4: [["Legal Counsel", "Department of Legal Affairs", "2014-03-01", "2017-04-30"], ["Legal Associate", "Government Legal Advisory Unit", "2011-09-01", "2014-02-28"]],
  };
  var JD = {
    1: "Leads policy analysis for His Excellency's office and turns complex questions into clear, decision-ready briefings.\n" +
       "• Prepare executive briefings, policy notes and position papers for ExCo and Board meetings.\n" +
       "• Run the annual operating plan and policy assurance reviews with the strategy and finance teams.\n" +
       "• Coordinate with partner entities on cross-government policy commitments and escalate dependencies early.\n" +
       "• Develop the policy team (three analysts) through delegated ownership of drafts and delivery.",
    2: "Coordinates the office's programmes and partner events from planning to close, keeping every commitment tracked.\n" +
       "• Plan and run the programme calendar, steering committee packs and partner events.\n" +
       "• Maintain the programme action log and report progress, risks and slippage to His Excellency.\n" +
       "• Manage relationships with partner entities and external suppliers.\n" +
       "• Lead the events team (two coordinators) and the logistics budget.",
    3: "Owns the office's data, dashboards and data-quality controls so that decisions rest on reliable evidence.\n" +
       "• Build and maintain the performance dashboards used in quarterly reviews.\n" +
       "• Run data-governance controls, data-quality checks and the records rollout.\n" +
       "• Prepare analytical inputs for policy, budget and programme reviews.\n" +
       "• Lead the data team (fourteen staff across reporting and records).",
    4: "Provides legal advice on the office's decisions, agreements and procurement, and protects the office from legal and compliance risk.\n" +
       "• Review and draft agreements, MoUs and procurement contracts.\n" +
       "• Advise His Excellency and committees on legal and regulatory implications of proposals.\n" +
       "• Maintain the legal risk register and the ethics and procurement compliance framework.\n" +
       "• Coordinate with external counsel and government legal departments.",
  };
  var ROLES_AR = {
    1: [["محلل سياسات", "معهد السياسات الحكومية"], ["باحث مشارك", "إدارة الخدمات العامة"]],
    2: [["أخصائي شراكات", "المكتب الوطني للفعاليات"], ["مسؤول فعاليات", "هيئة الثقافة والتراث"]],
    3: [["أخصائي ذكاء الأعمال", "مركز الإحصاء"], ["محلل بيانات", "مكتب الحكومة الرقمية"]],
    4: [["مستشار قانوني", "دائرة الشؤون القانونية"], ["مساعد قانوني", "وحدة الاستشارات القانونية الحكومية"]],
  };
  // the one-page promotion form's employee data (fictional sample values)
  var PROFILE_AR = {
    1: ["آمنة السويدي", "الدرجة الأولى", "الدرجة الخاصة", "محلل سياسات أول", "050 412 3021", "1988-04-12", "784-1988-0000001-1", "أبوظبي", "ماجستير السياسات العامة", "جامعة الإمارات العربية المتحدة", [["2023", "يفوق التوقعات"], ["2024", "استثنائي"], ["2025", "يفوق التوقعات"]]],
    2: ["راشد المزروعي", "الدرجة الثانية", "الدرجة الأولى", "منسق برامج", "050 418 7710", "1991-09-03", "784-1991-0000002-2", "أبوظبي", "بكالوريوس إدارة الأعمال", "جامعة زايد", [["2023", "يلبي التوقعات"], ["2024", "يفوق التوقعات"], ["2025", "يلبي التوقعات"]]],
    3: ["مريم النعيمي", "الدرجة الثالثة", "الدرجة الثانية", "مسؤول بيانات", "050 433 9054", "1995-02-21", "784-1995-0000003-3", "العين", "بكالوريوس علم البيانات", "جامعة خليفة", [["2023", "يفوق التوقعات"], ["2024", "يفوق التوقعات"], ["2025", "استثنائي"]]],
    4: ["خالد الحمادي", "الدرجة الأولى", "الدرجة الخاصة", "مستشار قانوني أول", "050 450 1188", "1985-11-30", "784-1985-0000004-4", "أبوظبي", "ماجستير القانون العام", "جامعة السوربون أبوظبي", [["2023", "يلبي التوقعات"], ["2024", "يفوق التوقعات"], ["2025", "يفوق التوقعات"]]],
  };
  var SCALE_AR = { "Excellent": "ممتاز", "Very Good": "جيد جداً", "Good": "جيد", "Poor": "ضعيف", "Very Poor": "ضعيف جداً" };
  var PROFILE_EN = {
    1: ["Grade 1", "Special Grade", "Abu Dhabi", "Master of Public Policy", "United Arab Emirates University", [["2023", "Very Good"], ["2024", "Excellent"], ["2025", "Very Good"]]],
    2: ["Grade 2", "Grade 1", "Abu Dhabi", "Bachelor of Business Administration", "Zayed University", [["2023", "Good"], ["2024", "Very Good"], ["2025", "Good"]]],
    3: ["Grade 3", "Grade 2", "Al Ain", "Bachelor of Data Science", "Khalifa University", [["2023", "Very Good"], ["2024", "Very Good"], ["2025", "Excellent"]]],
    4: ["Grade 1", "Special Grade", "Abu Dhabi", "Master of Public Law", "Sorbonne University Abu Dhabi", [["2023", "Good"], ["2024", "Very Good"], ["2025", "Very Good"]]],
  };
  var KPIS_AR = {
    1: [["إحاطات تنفيذية مسلَّمة في الموعد المتفق عليه", "95% في الموعد"], ["توصيات سياسات تعتمدها اللجنة التنفيذية", "4 على الأقل كل ربع سنة"], ["إنجاز معالم الخطة التشغيلية", "90% من المعالم"], ["مسودات يتولاها أعضاء الفريق بالكامل", "50% على الأقل"]],
    2: [["معالم البرامج المنجزة في موعدها", "90% في الموعد"], ["رضا الشركاء بعد الفعاليات", "4.5 من 5 أو أعلى"], ["إغلاق الإجراءات المفتوحة خلال 10 أيام عمل", "85% من الإجراءات"], ["انحراف ميزانية الفعاليات", "ضمن ±5%"]],
    3: [["تحديث لوحات المؤشرات قبل موعد التقارير", "100% في الموعد"], ["معالجة مشكلات جودة البيانات ضمن المهلة", "90% من المشكلات"], ["السجلات المنقولة ضمن التحول الرقمي", "95% بنهاية العام"], ["الرد على الطلبات التحليلية خلال 5 أيام", "85% من الطلبات"]],
    4: [["مراجعة العقود ضمن المهلة المتفق عليها", "95% خلال 5 أيام"], ["مخاطر قانونية لها مالك وخطة معالجة", "100% من السجل"], ["ملفات مشتريات ممتثلة عند التدقيق", "دون ملاحظات جوهرية"], ["تصعيد الاستشارات قبل مواعيد القرار", "100% من الحالات"]],
  };
  var KPIS = {
    1: [["Executive briefings delivered on the agreed date", "95% on time"], ["Policy recommendations adopted by ExCo", "At least 4 a quarter"], ["Operating-plan milestones met", "90% of milestones"], ["Drafts owned end-to-end by team members", "At least 50% of drafts"]],
    2: [["Programme milestones delivered on schedule", "90% on time"], ["Partner satisfaction after events", "4.5 / 5 or higher"], ["Open actions closed within 10 working days", "85% of actions"], ["Event budget variance", "Within ±5%"]],
    3: [["Dashboards refreshed by the reporting deadline", "100% on time"], ["Data-quality issues resolved within SLA", "90% of issues"], ["Records migrated in the digital rollout", "95% by year end"], ["Analytical requests answered within 5 days", "85% of requests"]],
    4: [["Contracts reviewed within the agreed turnaround", "95% within 5 days"], ["Legal risks with an owner and mitigation", "100% of the register"], ["Procurement files compliant at audit", "No major findings"], ["Advice escalated before decision deadlines", "100% of cases"]],
  };
  function isProject(title) { return /rollout|framework|operating plan|programme|pilot|standards|continuity review/i.test(title); }
  function migrate(db) {
    db.run("CREATE TABLE IF NOT EXISTS v2_meta (key text PRIMARY KEY NOT NULL, value text)");
    var done = function (k) { var r = db.exec("select 1 from v2_meta where key = ?", [k]); return r.length > 0; };
    var mark = function (k) { db.run("insert or replace into v2_meta (key, value) values (?, ?)", [k, new Date().toISOString()]); };
    var he = db.exec("select id from user where role = 'manager' order by created_at limit 1");
    var heId = he.length ? he[0].values[0][0] : null;
    var admin = db.exec("select id from user where role = 'admin' order by created_at limit 1");
    var adminId = admin.length ? admin[0].values[0][0] : heId;
    if (!done("schema-1")) {
      db.run("CREATE TABLE IF NOT EXISTS employee_previous_roles (id integer PRIMARY KEY AUTOINCREMENT NOT NULL, employee_id integer NOT NULL, title text NOT NULL, employer text NOT NULL, title_ar text, employer_ar text, started_on text NOT NULL, ended_on text NOT NULL, position integer NOT NULL, FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE cascade)");
      db.run("CREATE TABLE IF NOT EXISTS employee_profile_ar (employee_id integer PRIMARY KEY NOT NULL, name_ar text, rank_ar text, target_rank_ar text, workplace_ar text, title_ar text, mobile text, birth_date text, national_id text, residence_ar text, degree_ar text, university_ar text, evaluations text, FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE cascade)");
      db.run("CREATE TABLE IF NOT EXISTS job_descriptions (employee_id integer PRIMARY KEY NOT NULL, body text NOT NULL, updated_by text NOT NULL, updated_at text NOT NULL, FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE cascade)");
      db.run("CREATE TABLE IF NOT EXISTS job_kpis (id integer PRIMARY KEY AUTOINCREMENT NOT NULL, employee_id integer NOT NULL, title text NOT NULL, target text NOT NULL, source text NOT NULL DEFAULT 'ai_suggested', position integer NOT NULL, FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE cascade)");
      var cols = db.exec("PRAGMA table_info(responsibilities)")[0].values.map(function (c) { return c[1]; });
      if (cols.indexOf("kind") < 0) db.run("ALTER TABLE responsibilities ADD COLUMN kind text NOT NULL DEFAULT 'task'");
      var emps = db.exec("select id from employees")[0];
      (emps ? emps.values : []).forEach(function (row) {
        var id = row[0];
        (ROLES[id] || []).forEach(function (r, i) { var ar = (ROLES_AR[id] || [])[i] || [null, null]; db.run("insert into employee_previous_roles (employee_id, title, employer, title_ar, employer_ar, started_on, ended_on, position) values (?, ?, ?, ?, ?, ?, ?, ?)", [id, r[0], r[1], ar[0], ar[1], r[2], r[3], i]); });
        var P = PROFILE_AR[id];
        if (P) db.run("insert or ignore into employee_profile_ar values (?, ?, ?, ?, 'ديوان ولي العهد', ?, ?, ?, ?, ?, ?, ?, ?)", [id, P[0], P[1], P[2], P[3], P[4], P[5], P[6], P[7], P[8], P[9], JSON.stringify(P[10])]);
        if (JD[id]) db.run("insert or ignore into job_descriptions (employee_id, body, updated_by, updated_at) values (?, ?, ?, ?)", [id, JD[id], adminId, "2026-10-01T06:00:00.000Z"]);
        (KPIS[id] || []).forEach(function (k, i) { db.run("insert into job_kpis (employee_id, title, target, source, position) values (?, ?, ?, 'ai_suggested', ?)", [id, k[0], k[1], i]); });
      });
      var resp = db.exec("select id, title from responsibilities")[0];
      (resp ? resp.values : []).forEach(function (r) { db.run("update responsibilities set kind = ? where id = ?", [isProject(r[1]) ? "project" : "task", r[0]]); });
      mark("schema-1");
    }
    // round 2: notes linked to a project or task (none = general), and the KPIs' Arabic wording for the reports
    if (!done("schema-2")) {
      db.run("CREATE TABLE IF NOT EXISTS v2_note_links (note_entry_id integer PRIMARY KEY NOT NULL, responsibility_id integer, FOREIGN KEY (note_entry_id) REFERENCES note_entries(id) ON DELETE cascade, FOREIGN KEY (responsibility_id) REFERENCES responsibilities(id))");
      var kc = db.exec("PRAGMA table_info(job_kpis)")[0].values.map(function (c) { return c[1]; });
      if (kc.indexOf("title_ar") < 0) db.run("ALTER TABLE job_kpis ADD COLUMN title_ar text");
      if (kc.indexOf("target_ar") < 0) db.run("ALTER TABLE job_kpis ADD COLUMN target_ar text");
      Object.keys(KPIS_AR).forEach(function (id) {
        KPIS_AR[id].forEach(function (k, i) { db.run("update job_kpis set title_ar = ?, target_ar = ? where employee_id = ? and position = ? and source = 'ai_suggested'", [k[0], k[1], Number(id), i]); });
      });
      mark("schema-2");
    }
    // round 5: the reports in English too, and the five-step rating scale (ممتاز … ضعيف جداً)
    if (!done("schema-3")) {
      var pc = db.exec("PRAGMA table_info(employee_profile_ar)")[0].values.map(function (c) { return c[1]; });
      ["rank_en", "target_rank_en", "workplace_en", "residence_en", "degree_en", "university_en", "evaluations_en"].forEach(function (c) { if (pc.indexOf(c) < 0) db.run("ALTER TABLE employee_profile_ar ADD COLUMN " + c + " text"); });
      Object.keys(PROFILE_EN).forEach(function (id) {
        var E = PROFILE_EN[id];
        db.run("update employee_profile_ar set rank_en = ?, target_rank_en = ?, workplace_en = 'Crown Prince Court', residence_en = ?, degree_en = ?, university_en = ?, evaluations_en = ?, evaluations = ? where employee_id = ?",
          [E[0], E[1], E[2], E[3], E[4], JSON.stringify(E[5]), JSON.stringify(E[5].map(function (x) { return [x[0], SCALE_AR[x[1]]]; })), Number(id)]);
      });
      mark("schema-3");
    }
    // round 6: seniority instead of a grade (Junior, Mid-level, Senior, Executive, Director)
    if (!done("schema-4")) {
      var sc = db.exec("PRAGMA table_info(employee_profile_ar)")[0].values.map(function (c) { return c[1]; });
      ["seniority_en", "seniority_ar"].forEach(function (c) { if (sc.indexOf(c) < 0) db.run("ALTER TABLE employee_profile_ar ADD COLUMN " + c + " text"); });
      var SEN = { 1: ["Senior", "أول"], 2: ["Mid-level", "متوسط"], 3: ["Mid-level", "متوسط"], 4: ["Executive", "تنفيذي"] };
      Object.keys(SEN).forEach(function (id) { db.run("update employee_profile_ar set seniority_en = ?, seniority_ar = ? where employee_id = ?", [SEN[id][0], SEN[id][1], Number(id)]); });
      mark("schema-4");
    }
    // round 7: how each seeded KPI is checked against the period's evidence (delivery figures or the manager's notes)
    if (!done("schema-5")) {
      var kc5 = db.exec("PRAGMA table_info(job_kpis)")[0].values.map(function (c) { return c[1]; });
      if (kc5.indexOf("measure") < 0) db.run("ALTER TABLE job_kpis ADD COLUMN measure text");
      var MEASURE = {
        1: ["ontime_eff:95", "notes:communication_stakeholder", "completion:90", "notes:people_leadership_development"],
        2: ["ontime_eff:90", "notes:communication_stakeholder", "notes:ownership_accountability", "none"],
        3: ["ontime_eff:100", "notes:ownership_accountability", "completion:95", "ontime_orig:85"],
        4: ["ontime_eff:95", "notes:ownership_accountability", "notes:decision_making_problem_solving", "notes:communication_stakeholder"],
      };
      Object.keys(MEASURE).forEach(function (id) { MEASURE[id].forEach(function (m, i) { db.run("update job_kpis set measure = ? where employee_id = ? and position = ? and source = 'ai_suggested'", [m, Number(id), i]); }); });
      mark("schema-5");
    }
    // The seeded history ends in September 2026, so a few delegations dated in the last month show the Overview's
    // "last 30 days" section working. They are added to the same table, so the full history stays complete.
    if (!done("recent-delegations-1") && heId) {
      var now = new Date().toISOString();
      [[1, 4, "Saeed Al Hosani", "Represented the office at the policy coordination meeting"], [1, 16, "Hessa Al Marri", "Led the ExCo briefing dry run"],
       [2, 7, "Ali Al Shamsi", "Chaired the partner events planning session"], [2, 22, "Noura Al Kaabi", "Signed off the supplier logistics plan"],
       [3, 9, "Hamad Al Ketbi", "Presented the quarterly dashboard to the steering committee"], [3, 18, "Latifa Al Nuaimi", "Approved the records-migration test plan"],
       [4, 5, "Sara Al Mazrouei", "Attended the procurement committee on the office's behalf"], [4, 26, "Omar Al Dhaheri", "Reviewed the partner MoU with external counsel"]]
        .forEach(function (x) { db.run("insert into delegations (employee_id, occurred_on, delegate_name, purpose, note, created_by, created_at, updated_at) values (?, ?, ?, ?, NULL, ?, ?, ?)", [x[0], daysAgo(x[1]), x[2], x[3], heId, now, now]); });
      mark("recent-delegations-1");
    }
  }
  store.migrate = migrate;

  store.ready = (function () {
    var code = new TextDecoder().decode(api.assetBytes("eap2-sql-wasm.js"));
    var initSqlJs = new Function("var module, exports, define;\n" + code + "\nreturn initSqlJs;")();
    return Promise.all([initSqlJs({ wasmBinary: api.assetBytes("eap2-sql.wasm") }), idbGet()]).then(function (r) {
      var SQL = r[0], saved = r[1] && r[1].v === D.version ? r[1] : null;
      store.db = new SQL.Database(saved ? saved.db : api.assetBytes("eap2-app.db"));
      store.db.run("PRAGMA foreign_keys = ON");
      try { migrate(store.db); } catch (e) { console.error("v2 migration", e); }
      if (saved) store.files = saved.files || {};
      else { D.files.forEach(function (f) { store.files[f] = api.assetBytes("eap2-file-" + f); }); store.changed(); }
    });
  })();

  function one(sql, args) { var r = store.db.exec(sql, args || []); return r.length && r[0].values.length ? r[0].values[0] : null; }
  var avatarUrls = {};
  store.avatarUrl = function (id) {
    var row = one("select photo_ext from employees where id = ?", [id]), key = row && row[0] ? "avatars/" + id + "." + row[0] : null;
    if (!key || !store.files[key]) return "data:,";
    if (!avatarUrls[key] || avatarUrls[key].bytes !== store.files[key]) {
      var type = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" }[row[0]] || "image/png";
      avatarUrls[key] = { bytes: store.files[key], url: URL.createObjectURL(new Blob([store.files[key]], { type: type })) };
    }
    return avatarUrls[key].url;
  };
  store.signIn = function (email, password, config) {
    email = String(email || "").trim().toLowerCase();
    var row = one("select u.id, a.password from user u left join account a on a.user_id = u.id and a.provider_id = 'credential' where lower(u.email) = ?", [email]);
    var demo = D.accounts.filter(function (a) { return a.email === email; })[0];
    var ok = row && ((demo && password === demo.password) || (row[1] && row[1] === "prototype:" + password));
    if (!ok) {
      try { if (config && config.hooks && config.hooks.after) config.hooks.after({ path: "/sign-in/email", body: { email: email }, context: { returned: { status: 401, body: { code: "INVALID_EMAIL_OR_PASSWORD" } } } }); } catch (e) { /* audit only */ }
      return Promise.resolve({ error: { status: 401, code: "INVALID_EMAIL_OR_PASSWORD", message: "Invalid email or password" } });
    }
    S.session = store.session = { id: api.id("s"), userId: row[0] };
    try { config.databaseHooks.session.create.after({ id: store.session.id, userId: row[0] }, { path: "/sign-in/email" }); } catch (e) { /* audit only */ }
    store.changed();
    return Promise.resolve({ data: { user: { id: row[0], email: email } } });
  };
  store.signOut = function (config) {
    var s = store.session;
    S.session = store.session = null;
    try { if (s) config.databaseHooks.session.delete.after({ id: s.id, userId: s.userId }, { path: "/sign-out" }); } catch (e) { /* audit only */ }
    store.changed();
    return Promise.resolve({ data: { success: true } });
  };

  api.route("GET", new RegExp("^" + B + "/api/(.*)$"), function (req) {
    var fn = req.w && req.w.__eapApi;
    if (!fn) return null;
    return fn(req.path.slice(B.length) + req.url.search).then(function (r) {
      return r.arrayBuffer().then(function (buf) { return { status: r.status, type: r.headers.get("content-type") || "application/octet-stream", body: new Uint8Array(buf), headers: { "content-disposition": r.headers.get("content-disposition") || "" } }; });
    });
  });

  api.onPage("platform", function () { S.session = store.session = null; });

  api.onPage("eap3", function (w) {
    var d = w.document;
    function bar() {
      var self = d.querySelector('.cpc-appbar__nav [data-k="app"]'), portal = d.querySelector('.cpc-appbar__nav [data-k="portal"]');
      if (!self) return;
      self.textContent = d.documentElement.getAttribute("lang") === "ar" ? "منصة تقييم الموظفين ٢" : "Employee Assessment Platform v2";
      self.setAttribute("data-label", self.textContent);
      self.setAttribute("href", B + "/"); self.hidden = false; self.setAttribute("aria-current", "page");
      if (portal) { portal.removeAttribute("aria-current"); portal.setAttribute("href", "/"); }
      var settings = d.querySelector('.cpc-appbar [data-k="settings"]');
      if (settings) { settings.setAttribute("href", "/#/settings"); settings.removeAttribute("aria-current"); }
    }
    bar();
    w.addEventListener("hashchange", function () { setTimeout(bar, 0); });
    function rendered() {
      bar();
      var form = d.querySelector("#eap-root form"), email = d.getElementById("email"), pw = d.getElementById("password");
      if (!form || !email || !pw || d.getElementById("eap-demo-accounts")) return;
      var box = d.createElement("section");
      box.id = "eap-demo-accounts"; box.setAttribute("aria-label", "Demo accounts");
      box.style.cssText = "max-width:440px;width:100%;margin:16px auto 0;padding:14px 16px;background:#fff;border:1px solid #e7e1d6;border-radius:14px;font-size:13px;line-height:1.4;color:#1f2a37;text-align:left;direction:ltr;box-sizing:border-box";
      box.innerHTML = '<div style="margin-bottom:8px"><b style="color:#8a6b3d">Demo accounts</b></div>' + D.accounts.map(function (a) {
        return '<button type="button" data-u="' + a.email + '" style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:1px 12px;width:100%;padding:7px 8px;border:0;border-top:1px solid #f0ebe1;background:none;font:inherit;text-align:left;cursor:pointer">' +
          "<b>" + a.label + '</b><span style="color:#8a6b3d">' + a.role + '</span><span style="color:#555e6b;overflow-wrap:anywhere">' + a.email + '</span><code style="color:#555e6b;white-space:nowrap;font-size:12px">' + a.password + "</code></button>";
      }).join("");
      var card = form.closest("[data-slot=card]") || form.parentElement;
      card.parentElement.insertBefore(box, card.nextSibling);
      if (w.getComputedStyle(card.parentElement).flexDirection === "row") card.parentElement.style.flexDirection = "column";
      box.addEventListener("click", function (ev) {
        var b = ev.target.closest("[data-u]"), a = b && D.accounts.filter(function (x) { return x.email === b.getAttribute("data-u"); })[0];
        if (!a) return;
        var set = Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, "value").set;
        set.call(email, a.email); email.dispatchEvent(new w.Event("input", { bubbles: true }));
        set.call(pw, a.password); pw.dispatchEvent(new w.Event("input", { bubbles: true }));
        pw.focus();
      });
    }
    w.addEventListener("eap:rendered", rendered);
    rendered();
  });
});
</script>
