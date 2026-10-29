(() => {
  "use strict";

  const cfg = window.ME_AUDIT_CONFIG || {};
  const API = (cfg.apiBase || "").replace(/\/$/, "");
  const exposeFull = cfg.exposeFullReport === true;

  const $ = (s) => document.querySelector(s);
  const dialog = $("#review-drawer");

  const ICONS = {
    perf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 16a9 9 0 1 1 16 0M12 12l5-5M5 19h14"/></svg>',
    seo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5M8 11h5M10.5 8.5v5"/></svg>',
    track: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 19V9m8 10V4m8 15v-7M2 21h20"/></svg>',
  };

  const CARD_META = {
    performance: { cls: "score-0", icon: ICONS.perf, scope: "Page loading and interaction performance" },
    seo: { cls: "score-1", icon: ICONS.seo, scope: "Technical and on-page checks, not search rankings" },
    tracking: { cls: "score-2", icon: ICONS.track, scope: "Detected setup; untested events remain unverified" },
  };

  const reviews = [
    { id: "website", title: "Deep Website Audit", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11"/></svg>', copy: "Website structure, usability, mobile experience and technical issues.", outcome: "A summary of key website issues and prioritised recommendations for improvement.", time: "3–5 business days", context: "Share the pages or issues that concern you. The team will confirm the audit scope and any information needed." },
    { id: "tracking", title: "Analytics & Event Tracking", icon: ICONS.track, copy: "Missing, duplicate or inaccurate interaction data and inconsistent reporting.", outcome: "Findings on tracking gaps, plus recommended fixes for more reliable data collection.", time: "3–5 business days", context: "Tell us which actions or reports look incorrect. Deeper validation may need event testing or authorised analytics access." },
    { id: "seo", title: "SEO Performance", icon: ICONS.seo, copy: "Search visibility and your website's SEO foundations.", outcome: "An overview of SEO issues and recommended focus areas. Review scope confirmed with you.", time: "3–5 business days", context: "The team will confirm the scope of the SEO review with you." },
    { id: "geo", title: "GEO & AI Visibility", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/></svg>', copy: "Your brand's visibility in AI-powered search and answers.", outcome: "An initial visibility review and suggested next steps. Review scope confirmed with you.", time: "3–5 business days", context: "The team will confirm the scope of the AI visibility review with you." },
    { id: "cro", title: "Conversion Performance", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 19 20 5M10 5h10v10M4 11v8h8"/></svg>', copy: "Page journeys, calls to action, forms and conversion barriers.", outcome: "Key friction points in the conversion journey and practical improvement recommendations.", time: "3–5 business days", context: "Share your main conversion goal and the pages you would like us to review." },
    { id: "email", title: "Email Marketing Performance", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>', copy: "Subscriber capture, automations, campaigns and audience segmentation.", outcome: "An assessment of email activity, relevant benchmark comparisons and prioritised next steps.", time: "5–10 business days", context: "A deeper review may need campaign data or screenshots, agreed after your request." },
    { id: "loyalty", title: "Loyalty Program Readiness", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m12 3 3 6 6 1-4.5 4.5 1 6.5-5.5-3-5.5 3 1-6.5L3 10l6-1Z"/></svg>', copy: "Member engagement, repeat purchases, points and tier structures.", outcome: "A readiness assessment and recommendations for your membership and loyalty programme.", time: "3–5 business days", context: "A deeper review may need information about your membership programme and repeat purchase activity." },
    { id: "trust", title: "Trust Maturity", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/></svg>', copy: "Customer reviews, brand trust signals and reputation-building opportunities.", outcome: "An overview of trust-building opportunities and recommendations for your brand.", time: "3–5 business days", context: "The team will confirm the trust review scope and required information with you." },
    { id: "affiliate", title: "Affiliate Marketing", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="5" cy="12" r="3"/><circle cx="19" cy="5" r="3"/><circle cx="19" cy="19" r="3"/><path d="m8 11 8-5M8 13l8 5"/></svg>', copy: "Your target markets, current affiliate activity and growth goals.", outcome: "A discussion of affiliate opportunities and where support would be most useful.", time: "3–5 business days", context: "Share your affiliate stage, target markets and goals to help us understand your programme." },
    { id: "whatsapp", title: "WhatsApp Channel Readiness", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 11.5a8.5 8.5 0 0 1-12.5 7.5L3 21l2-5.5A8.5 8.5 0 1 1 21 11.5Z"/><path d="M8 9h8M8 13h5"/></svg>', copy: "Response speed, template compliance, automation and conversion journeys.", outcome: "An assessment of your WhatsApp channel and recommendations to improve its effectiveness.", time: "3–5 business days", context: "Manual review · Feedback in 3–5 business days after required information is received." },
  ];

  const state = {
    url: "",
    email: "",
    jobId: null,
    area: "",
    reportReady: false,
    reportUnlocked: false,
    poll: null,
    scanStartedAt: 0,
    auditTags: [],
  };
  const SESSION_KEY = "me_audit_session";

  function persistSession() {
    if (!state.jobId) return;
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          jobId: state.jobId,
          url: state.url,
          email: state.email,
          reportReady: state.reportReady,
          reportUnlocked: state.reportUnlocked,
        })
      );
    } catch {
      /* ignore */
    }
  }

  function restoreSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.jobId && !state.jobId) state.jobId = saved.jobId;
      if (saved.url && !state.url) state.url = saved.url;
      if (saved.email && !state.email) state.email = saved.email;
      if (saved.reportReady) state.reportReady = true;
      if (saved.reportUnlocked) state.reportUnlocked = true;
    } catch {
      /* ignore */
    }
  }

  async function restoreUnlockedViewIfNeeded() {
    if (!state.reportUnlocked || !state.jobId || !state.email) return;
    try {
      const res = await fetch(`${API}/api/audit/${state.jobId}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: state.email,
          website_url: state.url,
          source: cfg.source || "shopify",
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.summary) {
        const host = data.normalized_url
          ? new URL(data.normalized_url).hostname
          : state.url
            ? new URL(state.url).hostname
            : "";
        if (state.url) $("#scan-url").value = state.url;
        showResults(data.summary, host);
      }
      if (data.full_report) {
        $("#unlock-panel").hidden = true;
        renderFullReport(data.full_report);
        $("#specialists").hidden = false;
      }
    } catch {
      /* ignore */
    }
  }

  function setUnlockError(message) {
    const el = $("#unlock-error");
    if (el) el.textContent = message || "";
  }

  function showSubscribeNotice(message) {
    if (!message) {
      $("#subscribe-notice")?.remove();
      return;
    }
    let el = $("#subscribe-notice");
    if (!el) {
      $("#full-report")?.insertAdjacentHTML(
        "afterbegin",
        '<p class="field-error results-note" id="subscribe-notice" role="alert"></p>'
      );
      el = $("#subscribe-notice");
    }
    if (el) el.textContent = message;
  }

  const SHOPIFY_EMAIL_MAX_LEN = 254;
  /** Practical subset accepted by Shopify customer / newsletter forms (ASCII, one @, domain with TLD). */
  const SHOPIFY_EMAIL_RE =
    /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/;

  function normalizeSubscribeEmail(raw) {
    return String(raw || "")
      .trim()
      .toLowerCase();
  }

  function validateShopifyEmail(raw) {
    const email = normalizeSubscribeEmail(raw);
    if (!email) {
      return { ok: false, email: "", message: "Enter your work email address." };
    }
    if (email.length > SHOPIFY_EMAIL_MAX_LEN) {
      return { ok: false, email, message: "Email is too long (maximum 254 characters)." };
    }
    const at = email.indexOf("@");
    if (at <= 0 || at !== email.lastIndexOf("@")) {
      return { ok: false, email, message: "Enter a valid email address (name@company.com)." };
    }
    const local = email.slice(0, at);
    if (local.length > 64) {
      return { ok: false, email, message: "The part before @ is too long." };
    }
    if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) {
      return { ok: false, email, message: "Enter a valid email address (name@company.com)." };
    }
    if (!SHOPIFY_EMAIL_RE.test(email)) {
      return {
        ok: false,
        email,
        message:
          "This email format is not accepted for subscription. Use a standard address like name@company.com.",
      };
    }
    return { ok: true, email, message: "" };
  }

  function getCustomerSubscribeForm() {
    return document.getElementById("unlock-form");
  }

  /**
   * data-shopify-captcha on #unlock-form wires on load; boot retries until Shopify.captcha is ready.
   * Also call on scan start / when results show so the widget is warm before unlock (no extra user wait).
   */
  function bootShopifyCustomerCaptcha() {
    const form = getCustomerSubscribeForm();
    if (!form) return;
    let attempts = 0;
    const tick = () => {
      const protect = window.Shopify?.captcha?.protect;
      if (typeof protect === "function") {
        protect(form, () => {});
        return;
      }
      if (attempts++ < 50) setTimeout(tick, 200);
    };
    tick();
  }

  async function apiErrorMessage(res, fallback) {
    try {
      const data = await res.clone().json();
      const detail = data?.detail;
      if (typeof detail === "string" && detail.trim()) return detail;
      if (Array.isArray(detail)) {
        const text = detail.map((d) => (typeof d === "string" ? d : d?.msg || "")).filter(Boolean).join("; ");
        if (text) return text;
      }
    } catch {
      /* ignore */
    }
    if (res.status === 403) return "Request blocked. Check API allowed origins include this store domain.";
    if (res.status === 404) return "Scan session not found. Please run the audit again.";
    if (res.status === 409) return "Audit still running. Wait for scores to finish, then try again.";
    return fallback || `Request failed (${res.status})`;
  }

  const SCAN_DIM_KEYS = ["performance", "seo", "tracking"];
  const SCAN_STEP_LABELS = [
    "Website Performance (PageSpeed mobile & desktop)",
    "SEO health sample",
    "Tracking & tags scan",
  ];
  const SCAN_DIM_LABEL_SHORT = {
    performance: "Performance",
    seo: "SEO",
    tracking: "Tracking",
  };

  function normalise(value) {
    try {
      const v = value.trim();
      if (!v || /\s/.test(v)) return null;
      const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
      if (!["http:", "https:"].includes(u.protocol) || !u.hostname.includes(".")) return null;
      return u;
    } catch {
      return null;
    }
  }

  function statusLabel(score) {
    if (score == null) return "Further checks needed";
    if (score >= 80) return "Good";
    if (score >= 60) return "Opportunities to improve";
    if (score >= 40) return "Needs improvement";
    return "Further checks needed";
  }

  function esc(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function renderAuditedUrlChip(label, url) {
    const raw = (url || "").trim();
    const text = `${label} · ${raw || "—"}`;
    if (!raw || raw === "—") {
      return `<span class="me-url-chip" title="${esc(text)}"><span class="me-url-chip-label">${esc(label)}</span><span class="me-url-chip-text">—</span></span>`;
    }
    let href = raw;
    if (!/^https?:\/\//i.test(href)) href = `https://${href}`;
    try {
      const parsed = new URL(href);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return `<span class="me-url-chip" title="${esc(text)}"><span class="me-url-chip-label">${esc(label)}</span><span class="me-url-chip-text">${esc(raw)}</span></span>`;
      }
      href = parsed.href;
    } catch {
      return `<span class="me-url-chip" title="${esc(text)}"><span class="me-url-chip-label">${esc(label)}</span><span class="me-url-chip-text">${esc(raw)}</span></span>`;
    }
    return `<a class="me-url-chip" href="${esc(href)}" target="_blank" rel="noopener noreferrer" title="${esc(href)}"><span class="me-url-chip-label">${esc(label)}</span><span class="me-url-chip-text">${esc(raw)}</span></a>`;
  }

  function buildReviewCards() {
    const host = $("#review-cards");
    if (!host) return;
    reviews.forEach((r) => {
      host.insertAdjacentHTML(
        "beforeend",
        `<article class="specialist-card"><div class="card-top"><span class="card-icon">${r.icon}</span><span class="review-type">FREE AUDIT</span></div><h3>${r.title}</h3><p class="review-scope">${r.copy}</p><div class="review-deliverable"><span>WHAT YOU'LL RECEIVE</span><p>${r.outcome}</p></div><div class="review-bottom"><div class="review-time"><span class="time-mark" aria-hidden="true">◷</span><div><small>ESTIMATED TURNAROUND</small><strong>${r.time}</strong></div></div><button type="button" class="text-link" data-review="${r.id}">Request a Free Audit <span>↗</span></button></div></article>`
      );
    });
    document.querySelectorAll("[data-review]").forEach((b) => b.addEventListener("click", () => openReview(b.dataset.review, b)));
  }

  function renderScoreCards(summary) {
    const grid = $("#score-grid");
    if (!grid) return;
    grid.innerHTML = "";
    (summary.dimensions || []).forEach((d) => {
      const meta = CARD_META[d.id] || { cls: "score-0", icon: ICONS.perf, scope: "" };
      const score = d.score != null ? d.score : 0;
      const display = d.score != null ? d.score : "—";
      grid.insertAdjacentHTML(
        "beforeend",
        `<article class="score-card ${meta.cls}"><div class="score-card-top"><h3>${esc(d.title)}</h3><span class="score-icon">${meta.icon}</span></div><div class="score-visual"><div class="score-ring" style="--score:${score}"><strong class="score">${display}<small>/ 100</small></strong></div><span class="score-caption">LIVE SCORE</span></div><span class="score-status">${statusLabel(d.score)}</span><div class="meter"><span style="width:${score}%"></span></div><p class="finding"><span>KEY FINDING</span> ${esc(d.finding || "")}</p><span class="score-scope">${esc(d.subtitle || meta.scope)}</span></article>`
      );
    });
  }

  function fmtMs(v) {
    if (v == null || Number.isNaN(Number(v))) return "—";
    const n = Number(v);
    if (n >= 1000) return `${(n / 1000).toFixed(1)}s`;
    return `${Math.round(n)}ms`;
  }

  const SEO_CHECK_LABELS = {
    home_access: "首页可访问",
    https: "HTTPS",
    robots: "robots.txt",
    sitemap: "Sitemap 可解析",
    sitemap_access: "Sitemap 可访问",
    sitemap_format: "Sitemap 格式",
    sitemap_url_inventory: "Sitemap 链接清单",
    sitemap_demo_urls: "Sitemap 审计 demo 链接",
    sitemap_sample: "Sitemap URL 抽样",
    status_200: "HTTP 200",
    index_directive: "索引指令 (robots meta)",
    canonical: "Canonical",
    sitemap_conflict: "Sitemap 与 noindex 一致性",
    title: "Title 标签",
    meta_description: "Meta description",
    h1: "H1",
    main_content: "正文内容",
    img_alt: "主要图片 alt",
    viewport: "Viewport",
    internal_links: "站内链接",
    html_lang: "html lang",
    mobile_performance: "移动端性能 (Lighthouse)",
    schema_website: "Schema · WebSite",
    schema_organization: "Schema · Organization",
    schema_product: "Schema · Product",
    schema_breadcrumb: "Schema · BreadcrumbList",
    schema_collection: "Schema · CollectionPage",
    json_ld_parse: "JSON-LD 解析",
  };

  const PAGE_TYPE_LABEL = { home: "首页", product: "产品页", collection: "分类页" };

  function seoCheckLabel(id) {
    return SEO_CHECK_LABELS[id] || id;
  }

  function checkStatusIcon(status) {
    const s = (status || "").toLowerCase();
    if (s === "pass") return `<span class="me-check-icon pass" aria-label="通过">✓</span>`;
    if (s === "partial" || s === "manual") return `<span class="me-check-icon partial" aria-label="有问题">!</span>`;
    if (s === "fail") return `<span class="me-check-icon fail" aria-label="不通过">✕</span>`;
    return `<span class="me-check-icon na" aria-label="未审计">✕</span>`;
  }

  function renderCheckEvidence(text) {
    if (!text) return "";
    const t = String(text);
    return `<span class="me-check-evidence-wrap"><span class="me-check-evidence me-check-evidence-clamp">${esc(t)}</span><button type="button" class="me-check-evidence-more" hidden aria-expanded="false" aria-label="查看完整说明">?</button><div class="me-check-evidence-popover" hidden role="tooltip">${esc(t)}</div></span>`;
  }

  function renderCheckRow(check) {
    const evidence = check.evidence || check.note || "";
    return `<div class="me-check-row">${checkStatusIcon(check.status)}<div class="me-check-body"><span class="me-check-id">${esc(seoCheckLabel(check.id))}</span>${evidence ? renderCheckEvidence(evidence) : ""}</div></div>`;
  }

  let evidenceUiBound = false;

  function refreshCheckEvidenceUi(container) {
    if (!container) return;
    const measure = () => {
      container.querySelectorAll(".me-check-evidence-wrap").forEach((wrap) => {
        const clamp = wrap.querySelector(".me-check-evidence-clamp");
        const btn = wrap.querySelector(".me-check-evidence-more");
        if (!clamp || !btn) return;
        const overflow = clamp.scrollHeight > clamp.clientHeight + 2;
        btn.hidden = !overflow;
        if (!overflow) wrap.classList.remove("is-popover-open");
      });
    };
    measure();
    requestAnimationFrame(() => {
      measure();
      setTimeout(measure, 60);
    });
  }

  function bindCheckEvidenceUi() {
    if (evidenceUiBound) return;
    const page = document.querySelector(".audit-page");
    if (!page) return;
    evidenceUiBound = true;

    let hoverTimer = null;
    let openWrap = null;

    function closePopover() {
      clearTimeout(hoverTimer);
      hoverTimer = null;
      if (!openWrap) return;
      const pop = openWrap.querySelector(".me-check-evidence-popover");
      const btn = openWrap.querySelector(".me-check-evidence-more");
      if (pop) pop.hidden = true;
      if (btn) btn.setAttribute("aria-expanded", "false");
      openWrap.classList.remove("is-popover-open");
      openWrap = null;
    }

    function openPopover(wrap) {
      if (!wrap) return;
      const btn = wrap.querySelector(".me-check-evidence-more");
      if (!btn || btn.hidden) return;
      closePopover();
      const pop = wrap.querySelector(".me-check-evidence-popover");
      if (!pop) return;
      pop.hidden = false;
      btn.setAttribute("aria-expanded", "true");
      wrap.classList.add("is-popover-open");
      openWrap = wrap;
    }

    page.addEventListener("click", (e) => {
      const btn = e.target.closest(".me-check-evidence-more");
      if (btn) {
        e.preventDefault();
        e.stopPropagation();
        const wrap = btn.closest(".me-check-evidence-wrap");
        if (wrap?.classList.contains("is-popover-open")) closePopover();
        else openPopover(wrap);
        return;
      }
      if (!e.target.closest(".me-check-evidence-wrap")) closePopover();
    });

    page.addEventListener(
      "mouseenter",
      (e) => {
        const btn = e.target.closest(".me-check-evidence-more");
        if (!btn || btn.hidden) return;
        const wrap = btn.closest(".me-check-evidence-wrap");
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => {
          if (wrap && document.body.contains(btn)) openPopover(wrap);
        }, 1000);
      },
      true
    );

    page.addEventListener(
      "mouseleave",
      (e) => {
        const btn = e.target.closest(".me-check-evidence-more");
        if (btn) {
          clearTimeout(hoverTimer);
          hoverTimer = null;
        }
        const wrap = e.target.closest(".me-check-evidence-wrap");
        if (wrap && openWrap === wrap) {
          const rel = e.relatedTarget;
          if (!rel || !wrap.contains(rel)) closePopover();
        }
      },
      true
    );

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closePopover();
    });
  }

  function structuredDetailToChecks(detail) {
    if (!detail || typeof detail !== "object") return [];
    const rows = [];
    const add = (id, block) => {
      if (!block || block.max == null) return;
      const score = Number(block.score ?? 0);
      const max = Number(block.max);
      let status = "fail";
      if (score >= max && max > 0) status = "pass";
      else if (score > 0) status = "partial";
      const ev =
        block.evidence && typeof block.evidence === "object"
          ? Object.entries(block.evidence)
              .filter(([, v]) => v != null && v !== "")
              .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
              .join(" · ")
          : "";
      rows.push({ id, status, evidence: ev || `得分 ${score}/${max}` });
    };
    add("schema_website", detail.website);
    add("schema_organization", detail.organization);
    add("schema_product", detail.product);
    add("schema_breadcrumb", detail.breadcrumb);
    add("schema_collection", detail.collectionPage);
    (detail.conditional || []).forEach((c, i) => {
      const ratio = c.ratio != null ? c.ratio : 0;
      rows.push({
        id: `schema_cond_${c.type || i}`,
        status: ratio >= 1 ? "pass" : ratio > 0 ? "partial" : c.applicable ? "fail" : "na",
        evidence: c.type ? `${c.type}${c.applicable ? "" : " (不适用)"}` : "",
      });
    });
    return rows;
  }

  function renderSeoDimensionChecks(dimPack, structuredDetail) {
    let html = "";
    if (dimPack?.checks?.length) {
      html += `<div class="me-check-list me-check-list-cols">${dimPack.checks.map(renderCheckRow).join("")}</div>`;
    }
    if (structuredDetail) {
      const sdRows = structuredDetailToChecks(structuredDetail);
      if (sdRows.length) {
        html += `<div class="me-subheading">Structured data</div><div class="me-check-list me-check-list-cols">${sdRows.map(renderCheckRow).join("")}</div>`;
      }
    }
    return html;
  }

  function renderSeoPageBlock(pageKey, pageData) {
    const label = PAGE_TYPE_LABEL[pageKey] || pageKey;
    if (!pageData?.audit) {
      return `<div class="me-seo-page-block"><h4>${esc(label)}</h4><p class="me-page-url">${esc(pageData?.note || "未审计")}${pageData?.tried ? ` · 尝试 ${pageData.tried} 个候选` : ""}</p><div class="me-check-list"><div class="me-check-row">${checkStatusIcon("na")}<div class="me-check-body"><span class="me-check-id">页面未纳入本次审计</span></div></div></div></div>`;
    }
    const a = pageData.audit;
    const dims = a.dimensions || {};
    let inner = `<div class="me-seo-page-block"><h4>${esc(label)}</h4><p class="me-page-url">${esc(a.url)}${a.title ? ` · ${esc(a.title)}` : ""}</p>`;
    inner += renderSeoDimensionChecks(dims.index_canonical);
    inner += `<div class="me-subheading">Content</div>${renderSeoDimensionChecks(dims.content)}`;
    inner += `<div class="me-subheading">Experience</div>${renderSeoDimensionChecks(dims.experience)}`;
    const sd = dims.structured_data;
    inner += renderSeoDimensionChecks(null, sd?.detail);
    (a.issues || []).forEach((iss) => {
      inner += `<div class="me-check-list"><div class="me-check-row">${checkStatusIcon("partial")}<div class="me-check-body"><span class="me-check-id">${esc(iss.title || "Issue")}</span>${renderCheckEvidence(iss.evidence || iss.suggestion || "")}</div></div></div>`;
    });
    inner += "</div>";
    return inner;
  }

  function renderPerfAuditList(audits) {
    if (!audits?.length) return `<p class="detail-note">未发现可优化的 Lighthouse 审计项。</p>`;
    return `<div class="me-audit-list me-audit-list-cols">${audits
      .map((a) => {
        const savings = [];
        if (a.tbt_saving) savings.push(`预期节省 TBT: ${a.tbt_saving} ms`);
        if (a.lcp_saving) savings.push(`预期节省 LCP: ${a.lcp_saving} ms`);
        if (a.fcp_saving) savings.push(`预期节省 FCP: ${a.fcp_saving} ms`);
        if (a.cls_saving) savings.push(`预期节省 CLS: ${a.cls_saving}`);
        if (a.actionable_js_count != null) savings.push(`可处理 JS: ${a.actionable_js_count} 个 / ${a.actionable_js_ms || 0} ms`);
        return `<div class="me-audit-item"><div class="name">${esc(a.audit_id || a.id || "audit")}</div><div class="note">${esc(a.note || a.description || "")}</div>${savings.map((s) => `<div class="saving">${esc(s)}</div>`).join("")}</div>`;
      })
      .join("")}</div>`;
  }

  function renderPerfStrategyBlock(data, label) {
    if (!data) return "";
    const scoreDisplay = data.score != null ? data.score : "—";
    const warn = data.warning ? `<p class="detail-note">⚠ ${esc(data.warning)}</p>` : "";
    const err = data.error ? `<p class="detail-note">${esc(data.error)}</p>` : "";
    return `<div class="me-report-block me-report-col-panel"><div class="me-subheading">${esc(label)}</div><div class="me-perf-score-row me-perf-score-row-compact"><div class="me-perf-score-pill"><div class="label">当前分数</div><div class="value${data.score == null ? " muted" : ""}">${esc(scoreDisplay)}</div></div></div>${warn}${err}${renderPerfAuditList(data.audit_details || [])}</div>`;
  }

  function trackingStatusIcon(status) {
    const s = (status || "").toLowerCase();
    if (s === "healthy") return `<span class="me-check-icon pass" aria-hidden="true">✓</span>`;
    if (s === "warning") return `<span class="me-check-icon partial" aria-hidden="true">!</span>`;
    if (s === "critical") return `<span class="me-check-icon fail" aria-hidden="true">✕</span>`;
    return `<span class="me-check-icon na" aria-hidden="true">✕</span>`;
  }

  function renderTrackingIssueCard(issue) {
    const st = (issue.status || "unknown").toLowerCase();
    const locked = st === "unknown";
    const expert =
      !locked && st !== "healthy" && issue.expertComment
        ? `<div class="expert">"${esc(issue.expertComment)}"</div>`
        : "";
    const healthy =
      !locked && st === "healthy"
        ? `<div class="expert" style="font-style:normal;color:#15803d">${esc(issue.expertComment || "符合行业标准")}</div>`
        : "";
    const lockedHint = locked ? `<div class="locked-hint">需要 GA4 授权解锁</div>` : "";
    const badge = st === "critical" ? `<span class="detail-note" style="display:inline;margin:0">CRITICAL</span>` : "";
    return `<article class="me-issue-card ${esc(st)}"><div class="me-issue-card-head"><h4>${esc(issue.title)} ${badge}</h4>${trackingStatusIcon(st)}</div><p class="desc">${esc(issue.description || "")}</p>${expert}${healthy}${lockedHint}</article>`;
  }

  function renderTrackingSection(title, desc, issues) {
    if (!issues.length) return "";
    return `<div class="me-track-section"><div class="me-subheading">${esc(title)}</div><p class="section-desc">${esc(desc)}</p><div class="me-issue-grid">${issues.map(renderTrackingIssueCard).join("")}</div></div>`;
  }

  function renderFullReport(report) {
    const box = $("#report-details");
    const wrap = $("#full-report");
    if (!box || !report) return;
    const blocks = [];
    if (report.performance) {
      const p = report.performance;
      const mobile = p.mobile || (p.strategy === "mobile" && !p.desktop ? p : null);
      const desktop = p.desktop || (p.strategy === "desktop" && !p.mobile ? p : null);
      const legacySingle = !p.mobile && !p.desktop && p.strategy ? p : null;
      const mobileScore = mobile?.score ?? legacySingle?.score ?? p.score;
      const desktopScore = desktop?.score ?? (legacySingle?.strategy === "desktop" ? legacySingle.score : null);
      let perfBody = "";
      if (mobile || (legacySingle && legacySingle.strategy !== "desktop")) {
        perfBody += renderPerfStrategyBlock(mobile || legacySingle, "Mobile · 优化建议");
      }
      if (desktop || p.desktop) {
        perfBody += renderPerfStrategyBlock(desktop || p.desktop, "Desktop · 优化建议");
      }
      blocks.push(
        `<article><span class="detail-number">01</span><div class="me-report-article-body"><div class="me-report-lede"><h3>Performance priorities</h3><p>${esc(p.summary_finding)}</p><div class="me-perf-score-row"><div class="me-perf-score-pill"><div class="label">Mobile</div><div class="value${mobileScore == null ? " muted" : ""}">${mobileScore != null ? esc(mobileScore) : "—"}</div></div><div class="me-perf-score-pill"><div class="label">Desktop</div><div class="value${desktopScore == null ? " muted" : ""}">${desktopScore != null ? esc(desktopScore) : "—"}</div></div></div></div><div class="me-report-cols-2">${perfBody}</div><span class="detail-note">Inspect loading conditions and validate again after changes.</span></div></article>`
      );
    }
    if (report.seo) {
      const s = report.seo;
      let extra = `<div class="me-report-detail-panel">`;
      if (s.crawl?.checks?.length) {
        extra += `<div class="me-subheading">Site crawl &amp; discovery</div><div class="me-check-list me-check-list-cols me-check-list-crawl">${s.crawl.checks.map(renderCheckRow).join("")}</div>`;
      }
      if (s.audited_urls) {
        extra += `<div class="me-report-url-strip detail-note"><strong>本次实际审计 URL</strong>${renderAuditedUrlChip("首页", s.audited_urls.home)}${renderAuditedUrlChip("产品", s.audited_urls.product)}${renderAuditedUrlChip("分类", s.audited_urls.collection)}</div>`;
      }
      extra += `<div class="me-seo-pages-grid">`;
      const order = ["home", "product", "collection"];
      order.forEach((k) => {
        if (s.pages?.[k]) extra += renderSeoPageBlock(k, s.pages[k]);
      });
      Object.entries(s.pages || {}).forEach(([k, v]) => {
        if (!order.includes(k)) extra += renderSeoPageBlock(k, v);
      });
      extra += `</div></div>`;
      let miss = "";
      if (s.scoring?.missing_page_audits?.length) {
        miss = `<p class="detail-note" style="color:#b45309">未审计页面（不计分）: ${esc(s.scoring.missing_page_audits.join(" · "))}</p>`;
      }
      blocks.push(
        `<article><span class="detail-number">02</span><div class="me-report-article-body"><div class="me-report-lede"><h3>SEO foundations</h3><p>${esc(s.summary_finding)} ${esc(s.scoring?.coverage_note || "")}</p>${miss}</div>${extra}<span class="detail-note">Suggested deeper review · SEO Performance</span></div></article>`
      );
    }
    if (report.tracking) {
      const tr = report.tracking;
      const issues = tr.issues || [];
      const byCat = (cat) => issues.filter((i) => (i.category || "infrastructure") === cat);
      blocks.push(
        `<article><span class="detail-number">03</span><div class="me-report-article-body"><div class="me-report-lede"><h3>Tracking and event coverage</h3><p>${esc(tr.summary_finding)}</p></div>${renderTrackingSection("1. 基础设施与追踪代码", "无需授权 · 检测页面 HTML 中的部署信号", byCat("infrastructure"))}<span class="detail-note">Accurate collection may require event testing and authorised access to analytics tools.</span></div></article>`
      );
    }
    box.innerHTML = blocks.join("");
    wrap.hidden = false;
    bindCheckEvidenceUi();
    refreshCheckEvidenceUi(box);
  }

  function updateReportContext(summary) {
    const ctx = $("#report-context");
    const lines = $("#report-context-lines");
    const val = $("#report-context-value");
    if (!ctx || !summary) return;
    const text = (summary.dimensions || []).map((d) => `${d.title} ${d.score ?? "—"}/100`).join(" · ");
    if (lines) lines.textContent = text;
    if (val) {
      val.disabled = false;
      val.value = text;
    }
    ctx.hidden = false;
  }

  function coverageCards() {
    return Array.from(document.querySelectorAll(".scan-card .coverage-card"));
  }

  function ensureScanStepList() {
    let list = $("#scan-step-list");
    if (list) return list;
    const host = $("#scan-progress");
    if (!host) return null;
    host.insertAdjacentHTML(
      "afterbegin",
      `<ul class="me-scan-step-list" id="scan-step-list">${SCAN_STEP_LABELS.map(
        (t, i) =>
          `<li class="me-scan-step" data-step="${i}"><span class="me-scan-step-icon" aria-hidden="true"></span><span class="me-scan-step-text">${esc(t)}</span></li>`
      ).join("")}</ul>`
    );
    const track = host.querySelector(".progress-track span");
    if (track) track.id = "scan-progress-fill";
    const p = host.querySelector("p");
    if (p) p.id = "scan-progress-label";
    return $("#scan-step-list");
  }

  function resetScanProgress() {
    state.scanStartedAt = Date.now();
    ensureScanStepList();
    updateScanProgress({
      performance: "pending",
      seo: "pending",
      tracking: "pending",
    }, "queued");
    coverageCards().forEach((c) => c.classList.remove("is-scanning", "is-done"));
  }

  function updateScanProgress(progress, stage) {
    const prog = progress || {};
    ensureScanStepList();
    const fill = $("#scan-progress-fill") || document.querySelector("#scan-progress .progress-track span");
    const label = $("#scan-progress-label") || document.querySelector("#scan-progress p");
    let doneCount = 0;
    const running = [];
    SCAN_DIM_KEYS.forEach((key, idx) => {
      const st = prog[key] || (stage === "queued" ? "pending" : "running");
      const stepEl = document.querySelector(`.me-scan-step[data-step="${idx}"]`);
      if (stepEl) {
        stepEl.classList.remove("is-active", "is-done");
        if (st === "done") stepEl.classList.add("is-done");
        else if (st === "running") stepEl.classList.add("is-active");
      }
      const card = coverageCards()[idx];
      if (card) {
        card.classList.remove("is-scanning", "is-done");
        if (st === "done") card.classList.add("is-done");
        else if (st === "running") card.classList.add("is-scanning");
      }
      if (st === "done") doneCount += 1;
      else if (st === "running") running.push(SCAN_DIM_LABEL_SHORT[key]);
    });
    let pct;
    if (stage === "completed") pct = 100;
    else if (stage === "finalizing") pct = 92;
    else if (stage === "queued") pct = 8;
    else pct = Math.min(88, 12 + Math.round((doneCount / SCAN_DIM_KEYS.length) * 76));
    if (fill) {
      fill.style.animation = "none";
      fill.style.transform = "none";
      fill.style.width = `${pct}%`;
    }
    if (label) {
      if (stage === "finalizing") {
        label.textContent = "Merging results and preparing your scores…";
      } else if (stage === "completed") {
        label.textContent = "Audit complete.";
      } else if (running.length === 0 && stage === "queued") {
        label.textContent = "Starting all three checks in parallel…";
      } else if (running.length) {
        label.textContent = `Running in parallel: ${running.join(" · ")}${
          running.includes("Performance") ? " (PageSpeed may take a minute)" : ""
        }`;
      } else if (doneCount === SCAN_DIM_KEYS.length) {
        label.textContent = "All checks finished — preparing your report…";
      } else {
        label.textContent = "Running automated checks…";
      }
    }
  }

  function hideScanProgress() {
    $("#scan-progress").hidden = true;
    coverageCards().forEach((c) => c.classList.remove("is-scanning", "is-done"));
  }

  function showResults(summary, hostname) {
    state.reportReady = true;
    $("#results").hidden = false;
    $("#result-domain").textContent = hostname;
    renderScoreCards(summary);
    updateReportContext(summary);
    updateScanProgress(
      { performance: "done", seo: "done", tracking: "done" },
      "completed"
    );
    setTimeout(hideScanProgress, 400);
    $("#scan-form button").disabled = false;
    if (!exposeFull) bootShopifyCustomerCaptcha();
  }

  function showPostReport(report) {
    renderFullReport(report);
    $("#specialists").hidden = false;
    if (exposeFull) {
      $("#unlock-panel").hidden = true;
      state.reportUnlocked = true;
    } else {
      $("#unlock-panel").hidden = false;
    }
  }

  async function pollJob(jobId) {
    const q = exposeFull ? "?include_full=true" : "";
    const res = await fetch(`${API}/api/audit/${jobId}${q}`);
    if (!res.ok) throw new Error("Poll failed");
    const data = await res.json();
    if (data.status === "failed") throw new Error(data.error_message || "Audit failed");
    if (data.status === "running" || data.status === "queued") {
      const stage = data.progress_stage || (data.status === "queued" ? "queued" : "parallel");
      updateScanProgress(data.progress, stage);
    }
    if (data.status === "completed" && data.summary) {
      clearInterval(state.poll);
      state.poll = null;
      const host = data.normalized_url ? new URL(data.normalized_url).hostname : new URL(state.url).hostname;
      showResults(data.summary, host);
      persistSession();
      if (exposeFull && data.full_report) showPostReport(data.full_report);
      else if (!exposeFull) $("#unlock-panel").hidden = false;
      $("#results").scrollIntoView({ behavior: "smooth" });
    }
  }

  async function startScan(url) {
    const res = await fetch(`${API}/api/audit/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.href }),
    });
    if (!res.ok) throw new Error("Could not start audit");
    const { job_id } = await res.json();
    state.jobId = job_id;
    state.poll = setInterval(() => pollJob(job_id).catch(onScanError), 2000);
    await pollJob(job_id);
  }

  function onScanError(err) {
    clearInterval(state.poll);
    state.poll = null;
    hideScanProgress();
    $("#scan-form button").disabled = false;
    $("#url-error").textContent = err.message || String(err);
  }

  /** hCaptcha token is only injected after interaction with fields in the same Shopify customer form. */
  function waitForHcaptchaToken(form, timeoutMs = 12000) {
    return new Promise((resolve, reject) => {
      const started = Date.now();
      const poll = () => {
        const field = form.querySelector(
          'textarea[name="h-captcha-response"], input[name="h-captcha-response"]'
        );
        const token = (field && field.value) || "";
        if (token.length > 30) {
          resolve(token);
          return;
        }
        if (Date.now() - started >= timeoutMs) {
          reject(new Error("CAPTCHA token not ready"));
          return;
        }
        setTimeout(poll, 120);
      };
      poll();
    });
  }

  function shopifyFormPostFetch(form) {
    const action = (form.getAttribute("action") || "/contact").split("#")[0];
    const body = new FormData(form);
    return fetch(action, { method: "POST", body, credentials: "same-origin" }).then(async (res) => {
      const text = await res.text();
      const lower = text.toLowerCase();
      if (lower.includes("missing captcha") || lower.includes("captcha token")) {
        throw new Error("CAPTCHA");
      }
      if (res.status >= 400) {
        throw new Error(`Subscribe HTTP ${res.status}`);
      }
      return true;
    });
  }

  function acquireHcaptchaForForm(form) {
    return new Promise((resolve, reject) => {
      if (!form) {
        reject(new Error("Subscribe form missing"));
        return;
      }
      const run = () => {
        waitForHcaptchaToken(form).then(resolve).catch(reject);
      };
      const protect = window.Shopify?.captcha?.protect;
      if (typeof protect === "function") protect(form, run);
      else run();
    });
  }

  async function postShopifyFormWithCaptcha(form) {
    await acquireHcaptchaForForm(form);
    await shopifyFormPostFetch(form);
  }

  /** One tag per unlock: audit-{hostname}-{YYYY.MM.DD.HH.mm} e.g. audit-aff.meetdtc.com-2026.10.28.06.18 */
  function buildAuditUnlockTag(websiteUrl) {
    const auditedUrl = (websiteUrl || "").trim();
    let host = "unknown";
    try {
      const href = /^https?:\/\//i.test(auditedUrl) ? auditedUrl : `https://${auditedUrl}`;
      host = new URL(href).hostname.toLowerCase();
    } catch {
      /* ignore */
    }
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const timePart = [
      d.getFullYear(),
      pad(d.getMonth() + 1),
      pad(d.getDate()),
      pad(d.getHours()),
      pad(d.getMinutes()),
    ].join(".");
    const tag = `audit-${host}-${timePart}`;
    return tag.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 255);
  }

  /** One new audit-* tag per unlock POST (Shopify merges tags on existing customers). */
  function applyAuditCustomerTags(tagsInput, websiteUrl) {
    if (!tagsInput) return;
    const baseRaw = tagsInput.getAttribute("data-me-base-tags") || "free-audit, newsletter";
    const base = baseRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const unlockTag = buildAuditUnlockTag(websiteUrl);
    if (!state.auditTags.includes(unlockTag)) state.auditTags.push(unlockTag);
    tagsInput.value = [...base, unlockTag].join(", ");
  }

  function prepareUnlockCustomerForm(form, customerEmail, websiteUrl) {
    if (!form) throw new Error("Subscribe form missing");
    const check = validateShopifyEmail(customerEmail);
    if (!check.ok) throw new Error(check.message);
    const ef = form.querySelector('[name="contact[email]"]');
    const tf = form.querySelector('[name="contact[tags]"]');
    if (ef) ef.value = check.email;
    applyAuditCustomerTags(tf, websiteUrl);
    return check.email;
  }

  async function submitUnlockCustomerSubscribe(customerEmail, websiteUrl, captchaPromise) {
    const form = getCustomerSubscribeForm();
    prepareUnlockCustomerForm(form, customerEmail, websiteUrl);
    await (captchaPromise || acquireHcaptchaForForm(form));
    await shopifyFormPostFetch(form);
  }

  /** Retries help when hCaptcha or network flakes — each visitor/device is independent. */
  async function submitUnlockCustomerSubscribeWithRetry(customerEmail, websiteUrl, initialCaptchaPromise) {
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (attempt > 0) {
        bootShopifyCustomerCaptcha();
        await new Promise((resolve) => setTimeout(resolve, 700 + attempt * 500));
      }
      try {
        const cap = attempt === 0 ? initialCaptchaPromise : null;
        await submitUnlockCustomerSubscribe(customerEmail, websiteUrl, cap);
        return;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error("Subscribe failed");
  }

  async function submitShopifyContact(formId, { email, websiteUrl, bodyLines, displayName }) {
    if (cfg.submitContactForm === false) return false;
    const form = document.getElementById(formId);
    if (!form) return false;

    const customerEmail = (email || "").trim();
    const auditedUrl = (websiteUrl || "").trim();
    if (!customerEmail) return false;

    const nf = form.querySelector('[name="contact[name]"]');
    const ef = form.querySelector('[name="contact[email]"]');
    const bf = form.querySelector('[name="contact[body]"]');
    const cf = form.querySelector('[name="contact[customer_email]"]');
    const wf = form.querySelector('[name="contact[audited_website]"]');

    if (ef) ef.value = customerEmail;
    if (cf) cf.value = customerEmail;
    if (wf) wf.value = auditedUrl;

    const body =
      bodyLines && bodyLines.length
        ? bodyLines.join("\n")
        : [
            "ME Audit contact",
            "",
            `Customer email: ${customerEmail}`,
            auditedUrl ? `Website audited: ${auditedUrl}` : "",
          ]
            .filter((line) => line !== "")
            .join("\n");
    if (bf) bf.value = body;

    if (nf) {
      let name = (displayName || "").trim();
      if (!name && auditedUrl) {
        try {
          name = `Audit · ${new URL(auditedUrl).hostname}`;
        } catch {
          /* ignore */
        }
      }
      if (!name) name = customerEmail.split("@")[0] || "ME Audit";
      nf.value = name;
    }

    await postShopifyFormWithCaptcha(form);
    return true;
  }

  function closeDrawer() {
    if (dialog?.open) dialog.close();
    document.body.classList.remove("drawer-open");
  }

  function openReview(id, trigger) {
    const review = reviews.find((r) => r.id === id);
    if (!review || !dialog) return;
    state.area = id;
    state.lastTrigger = trigger;
    $("#selected-service-name").textContent = review.title;
    $("#selected-service-value").value = review.id;
    $("#drawer-description").textContent = review.copy;
    $("#drawer-outcome").textContent = review.outcome;
    $("#drawer-turnaround").textContent = `Estimated turnaround: ${review.time}`;
    $("#request-context").textContent = review.context;
    $("#request-error").textContent = "";
    for (const [key, on] of [
      ["affiliate", id === "affiliate"],
      ["whatsapp", id === "whatsapp"],
    ]) {
      const box = $(`#${key}-fields`);
      if (box) {
        box.hidden = !on;
        box.disabled = !on;
      }
    }
    if (!$("#request-url").value) $("#request-url").value = state.url;
    if (!$("#request-email").value) $("#request-email").value = state.email;
    $("#report-context").hidden = !state.reportReady;
    $("#request-form").hidden = false;
    $("#request-success").hidden = true;
    document.body.classList.add("drawer-open");
    dialog.showModal();
  }

  buildReviewCards();
  bindCheckEvidenceUi();
  restoreSession();
  restoreUnlockedViewIfNeeded();
  bootShopifyCustomerCaptcha();
  $("#report-email")?.addEventListener("focus", bootShopifyCustomerCaptcha);
  $("#report-email")?.addEventListener("input", bootShopifyCustomerCaptcha);
  $("#report-email")?.addEventListener("blur", () => {
    const input = $("#report-email");
    if (!input?.value.trim()) {
      setUnlockError("");
      return;
    }
    const check = validateShopifyEmail(input.value);
    setUnlockError(check.ok ? "" : check.message);
    if (check.ok && input.value !== check.email) input.value = check.email;
  });

  $("#scan-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const u = normalise($("#scan-url").value);
    if (!u) {
      $("#url-error").textContent = "Enter a valid website address, for example yourcompany.com.";
      return;
    }
    $("#url-error").textContent = "";
    state.url = u.href;
    state.reportReady = false;
    state.reportUnlocked = false;
    state.jobId = null;
    state.auditTags = [];
    setUnlockError("");
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
    $("#scan-url").value = u.href;
    $("#results").hidden = true;
    $("#full-report").hidden = true;
    $("#specialists").hidden = true;
    $("#unlock-panel").hidden = true;
    $("#scan-progress").hidden = false;
    resetScanProgress();
    $("#scan-form button").disabled = true;
    bootShopifyCustomerCaptcha();
    startScan(u).catch(onScanError);
  });

  $("#unlock-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const btn = form.querySelector('button[type="submit"]');
    setUnlockError("");
    if (!state.jobId) {
      setUnlockError("Scan session expired. Please run the audit again from the top of the page.");
      return;
    }
    const emailInput = $("#report-email");
    const emailCheck = validateShopifyEmail(emailInput?.value || "");
    if (!emailCheck.ok) {
      setUnlockError(emailCheck.message);
      emailInput?.focus();
      return;
    }
    state.email = emailCheck.email;
    if (emailInput) emailInput.value = state.email;
    showSubscribeNotice("");
    if (btn) {
      btn.disabled = true;
      btn.setAttribute("aria-busy", "true");
    }
    const websiteUrlForTags = (state.url || "").trim();
    let captchaPromise;
    try {
      prepareUnlockCustomerForm(form, state.email, websiteUrlForTags);
      captchaPromise = acquireHcaptchaForForm(form);
    } catch (prepErr) {
      setUnlockError(prepErr.message || String(prepErr));
      if (btn) {
        btn.disabled = false;
        btn.removeAttribute("aria-busy");
      }
      return;
    }
    try {
      const res = await fetch(`${API}/api/audit/${state.jobId}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: state.email, website_url: state.url, source: cfg.source || "shopify" }),
      });
      if (!res.ok) throw new Error(await apiErrorMessage(res, "Could not unlock report"));
      const data = await res.json();
      if (!data.full_report) {
        throw new Error("Full report is unavailable. Run a new scan and try again.");
      }
      state.reportUnlocked = true;
      persistSession();
      $("#unlock-panel").hidden = true;
      renderFullReport(data.full_report);
      $("#specialists").hidden = false;
      const websiteUrl = (data.website_url || state.url || "").trim();
      if (websiteUrl) state.url = websiteUrl;
      if (websiteUrl && websiteUrl !== websiteUrlForTags) {
        prepareUnlockCustomerForm(form, state.email, websiteUrl);
      }
      submitUnlockCustomerSubscribeWithRetry(state.email, websiteUrl, captchaPromise)
        .then(() => showSubscribeNotice(""))
        .catch(() => {
          showSubscribeNotice(
            "Report unlocked. Mailing list signup did not complete — please press View My Full Report once more."
          );
        });
      $("#full-report").scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      $("#unlock-panel").hidden = false;
      setUnlockError(err.message || String(err));
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.removeAttribute("aria-busy");
      }
    }
  });

  $("#request-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!e.currentTarget.reportValidity()) return;
    const u = normalise($("#request-url").value);
    if (!u) {
      $("#request-error").textContent = "Enter a valid website URL.";
        return;
      }
    const emailCheck = validateShopifyEmail($("#request-email").value);
    if (!emailCheck.ok) {
      $("#request-error").textContent = emailCheck.message;
      return;
    }
    const review = reviews.find((r) => r.id === state.area);
    const payload = {
      service: review?.title || state.area,
      full_name: $("#request-name").value.trim(),
      email: emailCheck.email,
      website_url: u.href,
      company_name: $("#request-company").value.trim() || null,
      audit_job_id: state.jobId,
      source: cfg.source || "shopify",
      affiliate_markets: $("#target-markets")?.value || null,
      affiliate_stage: $("#affiliate-stage")?.value || null,
      affiliate_platform: $("#affiliate-platform")?.value || null,
      affiliate_goal: $("#affiliate-goal")?.value || null,
      whatsapp_context: $("#whatsapp-account")?.value || null,
      help_message: $("#request-message")?.value || null,
    };
    try {
      await fetch(`${API}/api/expert-review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await submitShopifyContact("me-expert-shopify-form", {
        email: payload.email,
        websiteUrl: payload.website_url,
        displayName: payload.full_name,
        bodyLines: [
          "ME Expert Review request",
          "",
          `Customer email: ${payload.email}`,
          `Website audited: ${payload.website_url}`,
          `Service: ${payload.service}`,
          `Name: ${payload.full_name}`,
          payload.company_name ? `Company: ${payload.company_name}` : "",
          payload.audit_job_id ? `Audit job ID: ${payload.audit_job_id}` : "",
          payload.help_message ? `Message: ${payload.help_message}` : "",
        ].filter(Boolean),
      });
      $("#success-copy").textContent = `${payload.service} · ${u.hostname} · ${payload.email}`;
      $("#request-form").hidden = true;
      $("#request-success").hidden = false;
    } catch {
      $("#request-error").textContent = "Could not submit request.";
    }
  });

  $("#drawer-close")?.addEventListener("click", closeDrawer);
  dialog?.addEventListener("close", () => document.body.classList.remove("drawer-open"));
  $("#change-service")?.addEventListener("click", () => {
    closeDrawer();
    $("#specialists")?.scrollIntoView({ behavior: "smooth" });
  });
  $("#another-review")?.addEventListener("click", () => {
    closeDrawer();
    $("#specialists")?.scrollIntoView({ behavior: "smooth" });
  });
  $("#edit-request")?.addEventListener("click", () => {
    $("#request-form").hidden = false;
    $("#request-success").hidden = true;
  });
  $("#restart")?.addEventListener("click", () => {
    $("#scan-url").focus();
    $("#scan-form").scrollIntoView({ behavior: "smooth", block: "center" });
  });
})();
