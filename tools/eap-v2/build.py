#!/usr/bin/env python3
"""Build CPC_Security_Platform_Prototype_v10.html from v9.

Adds a 6th portal card, "Employee Assessment Platform v2" (/employee_assessment_platform_v2/), a copy of the
Employee Assessment Platform card with the client's November 2026 changes. Every other card is left byte-for-byte
as it is in v9.

    python3 tools/eap-v2/build.py prototype/CPC_Security_Platform_Prototype_v9.html prototype/CPC_Security_Platform_Prototype_v10.html

Every patch to the copied app bundle is an exact string that must occur exactly once, so a different input
fails loudly instead of building something half-patched.
"""
import base64
import gzip
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OLD_BASE = "/employee_assessment_platform/"
NEW_BASE = "/employee_assessment_platform_v2/"


def read(*parts, mode="r"):
    with open(os.path.join(HERE, *parts), mode) as f:
        return f.read()


def replace_once(text, old, new, what):
    n = text.count(old)
    if n != 1:
        raise SystemExit(f"patch '{what}': expected 1 match, found {n}")
    return text.replace(old, new)


# ---------------------------------------------------------------- the copied app bundle
def patch_bundle(js):
    # 1. its own store, address and title, so it never touches Card 5's database
    js = replace_once(js,
        'Mt=typeof window<"u"&&window.parent&&window.parent.__eapStore||typeof window<"u"&&window.__eapStore,Br="/employee_assessment_platform"',
        'Mt=typeof window<"u"&&window.parent&&window.parent.__eapStore2||typeof window<"u"&&window.__eapStore2,Br="/employee_assessment_platform_v2"',
        "store and base path")
    js = replace_once(js, 'Xx="Employee Assessment Platform"', 'Xx="Employee Assessment Platform v2"', "document title")

    # 2. main navigation: Ranking and Reports removed (Dashboard, Senior managers, Inbox stay)
    js = replace_once(js,
        ',{key:"ranking",label:"Ranking",href:"/ranking",icon:eo},{key:"reports",label:"Reports",href:"/?section=reports",icon:zo}];',
        '];', "main navigation")

    # 3. employee tabs: one row, Overview · Notes · Report · Development Plan
    js = replace_once(js,
        'function pQ({basePath:e,active:t,mine:r}){let a=t==="responsibilities"||t==="notes",n=t==="summary"||t==="leadership"||t==="plan"||t==="ranking",o=[{key:"overview",label:"Overview",href:e,selected:t==="overview"},{key:"work",label:"Work",href:`${e}/responsibilities`,selected:a},{key:"assessment",label:"Assessment",href:`${e}/summary`,selected:n}],i=Kxe(e,r).filter(s=>a?["responsibilities","notes"].includes(s.key):n&&["summary","leadership","plan","ranking"].includes(s.key));',
        'function pQ({basePath:e,active:t,mine:r}){let a=!1,n=!1,o=[{key:"overview",label:"Overview",href:e,selected:t==="overview"||t==="summary"||t==="responsibilities"||t==="leadership"},{key:"notes",label:"Notes",href:`${e}/notes`,selected:t==="notes"},{key:"plan",label:"Development Plan",href:`${e}/plan`,selected:t==="plan"}],i=[];',
        "employee tabs")

    # 4. profile header: no "View profile" link (the profile page is not in the navigation any more)
    js = replace_once(js,
        'y(Ee,{href:`${o}/profile`,"aria-current":i?"page":void 0,"aria-label":`View ${e}\'s profile`,className:"group flex w-fit items-center gap-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring",children:',
        'y(Ee,{href:o,"aria-label":`${e} overview`,className:"group flex w-fit items-center gap-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring",children:',
        "profile header link")
    js = replace_once(js,
        'y("span",{className:"print:hidden",children:[t&&" \\xB7 ",d("span",{className:"font-medium text-gold group-hover:underline",children:"View profile \\u203A"})]})',
        'null', "View profile label")

    # 5. dashboard senior-manager cards: no "View work"; the card opens the Overview
    js = replace_once(js,
        'y("div",{className:"flex items-center gap-3",children:[d(en,{name:u.displayName,employeeId:u.id,photoUpdatedAt:u.photoUpdatedAt,size:"md"}),y("div",{className:"min-w-0",children:[d("h3",{className:"font-heading text-lg font-semibold",children:u.displayName}),d("p",{className:"text-sm text-muted-foreground",children:u.jobTitle})]})]}),d(Xk,{active:c,overdue:f,extensions:m,href:`/employees/${u.id}/responsibilities`}),y(Ee,{href:h?.href??`/employees/${u.id}/responsibilities`,',
        'y(Ee,{prefetch:!1,href:`/employees/${u.id}`,"data-v2-manager":u.id,className:"flex items-center gap-3 rounded-xl outline-none hover:bg-white/40 focus-visible:ring-2 focus-visible:ring-gold",children:[d(en,{name:u.displayName,employeeId:u.id,photoUpdatedAt:u.photoUpdatedAt,size:"md"}),y("div",{className:"min-w-0",children:[d("h3",{className:"font-heading text-lg font-semibold",children:u.displayName}),d("p",{className:"text-sm text-muted-foreground",children:u.jobTitle})]})]}),d(Xk,{active:c,overdue:f,extensions:m,href:`/employees/${u.id}`}),y(Ee,{href:`/employees/${u.id}`,',
        "manager card links")
    js = replace_once(js,
        ',d(ne,{asChild:!0,size:"touch",variant:"outline",children:y(Ee,{prefetch:!1,href:`/employees/${u.id}/responsibilities`,children:["View work ",d(la,{className:"size-4"})]})})',
        '', "View work button")

    # 5b. dashboard manager cards: the "Latest work update" panel becomes quick links (Notes, Report, Development Plan)
    js = replace_once(js,
        'y(Ee,{href:`/employees/${u.id}`,className:"block rounded-xl bg-muted/50 p-3 transition-colors hover:bg-gold-tint",children:[y("p",{className:"mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground",children:[d(Td,{className:"size-4"})," Latest work update"]}),d("p",{className:"text-sm font-medium",children:h?.title??"No recent progress updates"}),d("p",{className:"mt-1 line-clamp-1 text-sm text-muted-foreground",children:h?.detail??"Open their work to review responsibilities and start a conversation."}),h&&d("p",{className:"mt-2 text-xs text-muted-foreground",children:h.when})]})',
        '', "manager card latest work update")

    # 5e. Inbox: only Extension request, Overdue and Notes reminder; no work updates
    js = replace_once(js,
        ',...o.map(({update:s,task:l,name:u})=>({id:`update-${s.id}`,employeeId:l.employeeId,name:u,title:l.title,detail:s.body,occurredAt:s.createdAt,when:cL(s.createdAt),href:i(l.employeeId,l.id),kind:"update"}))]',
        ']', "inbox: no work updates")
    js = replace_once(js, 'i=(s,l)=>`/employees/${s}/responsibilities#responsibility-${l}`;return V(e,{actorUserId:t.id,action:"dashboard.activity.view"',
        'i=(s,l)=>`/employees/${s}#responsibility-${l}`;return V(e,{actorUserId:t.id,action:"dashboard.activity.view"', "inbox links to the overview pop-up")
    js = replace_once(js, 'var dee="eap.inbox.filters"', 'var dee="eap.inbox.filters.v2"', "inbox filter key")
    js = replace_once(js, 'function dL(e){return e==="update"?2:e==="feedback"?4:1}', 'function dL(e){return e==="overdue"?2:e==="feedback"?4:1}', "inbox groups")
    js = replace_once(js, 'feedback:{label:"Feedback reminder",', 'feedback:{label:"Notes reminder",', "notes reminder label")
    js = replace_once(js, 'a=[{bit:1,label:"Needs your review"},{bit:2,label:"Latest updates"},{bit:4,label:"Feedback"}]',
        'a=[{bit:1,label:"Extension request"},{bit:2,label:"Overdue"},{bit:4,label:"Notes reminder"}]', "inbox filters")
    js = replace_once(js, 'children:"Decisions, progress and conversations."', 'children:"Extension requests, overdue items and notes reminders."', "inbox subtitle")
    js = replace_once(js, 'children:[e.filter(i=>dL(i.kind)===1).length," to review"]', 'children:[e.filter(i=>dL(i.kind)===1).length," extension requests"]', "inbox badge")

    # 5f. dashboard: modern summary (tiles, workload by manager, delivery health) and richer manager cards
    js = replace_once(js,
        'd(Vh,{managers:i.map(u=>({id:u.employee.id,name:u.employee.displayName,active:u.activeCount,overdue:u.overdueCount,extensions:u.pendingExtensions}))}),',
        'd(V2DashTop,{cards:i}),', "dashboard summary")
    a0 = js.index('i.length?d("div",{className:"grid gap-5 md:grid-cols-2",children:i.map(')
    a1 = js.index(':d(ir,{icon:xr,message:"No active senior managers.', a0)
    js = js[:a0] + 'i.length?d(V2ManagerCards,{cards:i})' + js[a1:]

    # 5c. employee header: a highlighted Notes button at the top right
    js = replace_once(js,
        'function sr({active:e,mine:t,...r}){return y(Fe,{children:[!t&&d(Cc,{}),d(mQ,{...r,profileActive:e===null}),',
        'function sr({active:e,mine:t,...r}){return y(Fe,{children:[!t&&d(Cc,{}),y("div",{className:"v2-head",children:[d(mQ,{...r,profileActive:e===null}),!t&&d(V2NotesButton,{employeeId:r.employeeId})]}),',
        "header notes button")

    # 5d. Notes page: no duplicate Drafts list; each timeline note says General or which project/task
    js = replace_once(js, 'd(ite,{employeeId:n,drafts:w,selectedDate:g,filters:x}),', '', "notes drafts")
    js = replace_once(js, 'd(va,{employeeId:n,employeeName:o.displayName,focus:u,editable:!0}),', '', "notes page: no Focus block")
    js = replace_once(js, 'active:"plan",mine:!1}),d(va,{employeeId:a,employeeName:n.displayName,focus:i,editable:!0}),', 'active:"plan",mine:!1}),', "plan page: no Focus block")
    js = replace_once(js, 'd("span",{className:"font-heading text-base",children:ge(o.occurredAt)}),',
        'd("span",{className:"font-heading text-base",children:ge(o.occurredAt)}),d(V2NoteTags,{noteId:o.id}),', "note tags")

    # 6. the Overview body (manager and the employee's own /me) is the v2 Overview
    js = replace_once(js,
        'r&&d(Pk,{}),y("div",{className:"space-y-6",children:[y("section",{className:"overview-activity"',
        'r&&d(Pk,{}),d(V2Overview,{employeeId:o.id,actor:e,mine:r}),!1&&y("div",{className:"space-y-6",children:[y("section",{className:"overview-activity"',
        "overview body")

    # 7. the administrator maintains the job description and KPIs on the employee's admin page
    js = replace_once(js,
        'd(Oe,{children:d(Wh,{employeeId:n.id,initialTraining:i})})]})]})]})}var CU={};',
        'd(Oe,{children:d(Wh,{employeeId:n.id,initialTraining:i})})]}),d(V2AdminJob,{employeeId:n.id,actor:t.user})]})]})}var CU={};',
        "admin job description card")

    # 8. every report PDF is the Visual Scorecard, drawn here (no recorded PDFs, no print dialog)
    js = replace_once(js,
        'async function jG(e){let{identity:t,meta:r}=e.snapshot,a=Mt.pdfs[qu(t.displayName,r.periodStart,r.periodEnd)];if(a)return a;let n=new Error("PDF_PRINT");throw n.report=e,n}',
        'async function jG(e){return V2ScorecardPdf(e)}',
        "report PDF")

    # 8c. the report pages show the Arabic reports on screen instead of the English web report
    js = replace_once(js, 'function t0({snapshot:e,rating:t,narrative:r,ownRanking:a,overallRanking:n}){',
        'function t0(x){return d(V2ReportViewer,{report:x})}function t0Old({snapshot:e,rating:t,narrative:r,ownRanking:a,overallRanking:n}){', "on-screen report")

    # 8b. two downloads per report: the one-page promotion form and the Visual Scorecard
    js = replace_once(js,
        'let l=await jG(s),{identity:u,meta:c}=s.snapshot,f=qu(u.displayName,c.periodStart,c.periodEnd);',
        'let K0=new URL(e.url).searchParams.get("kind"),K=K0==="form"||K0==="detailed"?K0:"scorecard",LG=new URL(e.url).searchParams.get("lang")==="en"?"en":"ar",l=await jG(s,K,LG),{identity:u,meta:c}=s.snapshot,f=V2fileName(qu(u.displayName,c.periodStart,c.periodEnd),K,LG);',
        "PDF route kind")
    js = replace_once(js, 'async function jG(e){return V2ScorecardPdf(e)}', 'async function jG(e,k,lg){return V2Pdf(e,k,lg)}', "PDF kind switch")
    js = replace_once(js, 'function Ec({reportId:e,filename:t}){', 'function Ec(x){return d(V2Downloads,x)}function EcOld({reportId:e,filename:t}){', "download buttons")

    # 9. the v2 code itself, inside the bundle so it uses the app's own components and store
    inject = read("src", "bundle-inject.js") + read("src", "ui-inject.js") + read("src", "pdf-inject.js") + read("src", "arpdf-inject.js")
    js = replace_once(js, 'var Ar=window,Xx=', inject + '\nvar Ar=window,Xx=', "inject v2 code")
    return js


# ---------------------------------------------------------------- the packed data
def patch_data(data):
    vfs, api, pages, modules, demo = data["vfs"], data["api"], data["pages"], data["modules"], data["demo"]

    # the card on the portal: after the four visible cards
    key = "GET /config/assistants.json"
    rec = api[key]
    conf = json.loads(rec[3])
    src = next(a for a in conf["assistants"] if a["id"] == "employee-assessment-platform")
    card = json.loads(json.dumps(src))
    card.update({
        "id": "employee-assessment-platform-v2",
        "order": 6,
        "name": {"en": "Employee Assessment Platform v2", "ar": "منصة تقييم الموظفين ٢"},
        "description": {
            "en": "The revised Employee Assessment Platform from the November client review: one Overview per senior manager "
                  "(CV summary, job description, KPIs, projects and tasks, recent committees and delegations, ranking and self-ranking), "
                  "four tabs (Overview, Notes, Report, Development Plan) and the two-page Visual Scorecard report as PDF.",
            "ar": "منصة تقييم الموظفين بعد مراجعة العميل في نوفمبر: نظرة عامة واحدة لكل مدير (ملخص السيرة، الوصف الوظيفي، مؤشرات الأداء، "
                  "المشاريع والمهام، اللجان والتفويضات الأخيرة، الترتيب والترتيب الذاتي)، وأربعة تبويبات، وتقرير بطاقة الأداء المرئية بصيغة PDF.",
        },
        "launch": dict(src["launch"], url=NEW_BASE),
    })
    if any(a["id"] == card["id"] for a in conf["assistants"]):
        raise SystemExit("the v2 card is already in assistants.json")
    conf["assistants"].insert(conf["assistants"].index(src) + 1, card)
    api[key] = [rec[0], rec[1], rec[2], json.dumps(conf, ensure_ascii=False, indent=1)]

    # the card's files: Card 5's, at the new address; the bundle patched; the scorecard's font and library files
    for path in [p for p in vfs if p.startswith(OLD_BASE)]:
        vfs[NEW_BASE + path[len(OLD_BASE):]] = list(vfs[path])
    app = vfs[NEW_BASE + "eap-app.js"]
    if app[1]:
        raise SystemExit("eap-app.js is expected as text")
    app[2] = patch_bundle(app[2])
    vfs[NEW_BASE + "v2/jspdf.umd.min.js"] = ["text/javascript", 0, read("vendor", "jspdf.umd.min.js")]
    emblem = vfs[OLD_BASE + "cpc/brand/abu-dhabi-emblem.png"]
    emblem_b64 = emblem[2] if emblem[1] else base64.b64encode(emblem[2].encode("latin1")).decode()
    fonts = {
        "sans": base64.b64encode(read("vendor", "PlexSans-Regular.ttf", mode="rb")).decode(),
        "bold": base64.b64encode(read("vendor", "PlexSans-SemiBold.ttf", mode="rb")).decode(),
        "serif": base64.b64encode(read("vendor", "PlexSerif-Medium.ttf", mode="rb")).decode(),
        "emblem": emblem_b64,
    }
    for key, name in (("dubaiRegular", "Regular"), ("dubaiMedium", "Medium"), ("dubaiBold", "Bold")):
        f = vfs["/security_affairs_demo/assets/font/Dubai-%s.woff2" % name]
        fonts[key] = f[2] if f[1] else base64.b64encode(f[2].encode("latin1")).decode()
    vfs[NEW_BASE + "v2/scorecard-assets.js"] = ["text/javascript", 0,
        "// IBM Plex (SIL Open Font License 1.1) and the emblem, for the Visual Scorecard PDF\nwindow.__eapV2Assets=" + json.dumps(fonts) + ";\n"]
    vfs[NEW_BASE + "v2/overview.css"] = ["text/css", 0, read("src", "overview.css")]

    # the card's page: Card 5's, at the new address, with the v2 files
    page = pages["eap2"].replace(OLD_BASE, NEW_BASE)
    page = replace_once(page, 'parent.__cpcShim(window, "eap2");', 'parent.__cpcShim(window, "eap3");', "page shim id")
    page = replace_once(page, '<!-- cpc-appbar-head -->',
        '<link rel="stylesheet" href="cpcvfs:' + NEW_BASE + 'v2/overview.css">\n<!-- cpc-appbar-head -->', "page css")
    page = replace_once(page, '<script src="cpcvfs:' + NEW_BASE + 'eap-app.js"></script>',
        '<script src="cpcvfs:' + NEW_BASE + 'v2/jspdf.umd.min.js"></script>\n'
        '<script src="cpcvfs:' + NEW_BASE + 'v2/scorecard-assets.js"></script>\n'
        '<script src="cpcvfs:' + NEW_BASE + 'eap-app.js"></script>', "page scripts")
    pages["eap3"] = page
    modules["eap3"] = list(modules.get("eap2", []))

    # the card's demo data: Card 5's accounts and files; its own version, so its saved copy is its own
    d = json.loads(json.dumps(demo["data"]["eap2"]))
    d["version"] = d["version"] + "-v2.2"
    d["pdfs"] = {}
    demo["data"]["eap3"] = d
    return data


# ---------------------------------------------------------------- the prototype file
def build(src, dst):
    html = open(src, encoding="utf-8").read()
    m = re.search(r'(<script id="cpc-data" type="application/octet-stream">)([A-Za-z0-9+/=\s]+)(</script>)', html)
    if not m:
        raise SystemExit("cpc-data not found")
    data = json.loads(gzip.decompress(base64.b64decode(m.group(2))).decode("utf-8"))
    data = patch_data(data)
    packed = base64.b64encode(gzip.compress(json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode("utf-8"), 9, mtime=0)).decode()
    html = html[:m.start(2)] + packed + html[m.end(2):]

    # the shell: the card's page id and address
    html = replace_once(html,
        'eap: "/employee_assessment/", eap2: "/employee_assessment_platform/" };',
        'eap: "/employee_assessment/", eap2: "/employee_assessment_platform/", eap3: "/employee_assessment_platform_v2/" };',
        "shell BASES")
    html = replace_once(html,
        '    if (/^\\/employee_assessment_platform(\\/|$)/i.test(pathname)) return "eap2";\n',
        '    if (/^\\/employee_assessment_platform(\\/|$)/i.test(pathname)) return "eap2";\n'
        '    if (/^\\/employee_assessment_platform_v2(\\/|$)/i.test(pathname)) return "eap3";\n',
        "shell pageOf")

    # Card 6's module, after Card 5's
    module = read("src", "card6-module.js").rstrip("\n") + "\n"
    anchor = '// The prototype\'s shell (scripts/build-prototype.py puts it in prototype/CPC-Platform-Prototype.html).'
    i = html.index(anchor)
    j = html.rindex("<script>", 0, i)
    html = html[:j] + module + html[j:]
    html = replace_once(html, "<title>Security Affairs Platform · Crown Prince Court</title>",
                        "<title>Security Affairs Platform · Crown Prince Court</title>", "title check")
    with open(dst, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"wrote {dst} ({os.path.getsize(dst):,} bytes)")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    build(sys.argv[1], sys.argv[2])
