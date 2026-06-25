const entries = window.MISREADING_DICTIONARY || [];

const state = {
  query: "",
  category: "all",
  sort: "rank",
  lang: "en",
};

const els = {
  count: document.querySelector("#entryCount"),
  search: document.querySelector("#searchInput"),
  category: document.querySelector("#categoryFilter"),
  sort: document.querySelector("#sortSelect"),
  cards: document.querySelector("#cards"),
  index: document.querySelector("#termIndex"),
  summary: document.querySelector("#activeSummary"),
  langEn: document.querySelector("#langEn"),
  langJa: document.querySelector("#langJa"),
  toolsToggle: document.querySelector("#toolsToggle"),
  toolsPanel: document.querySelector("#toolsPanel"),
  pullRefresh: document.querySelector("#pullRefresh"),
};

const copy = {
  en: {
    title: "Misreading Dictionary",
    lead: "Words that drift away from standard meaning and begin to carry your own distance.",
    search: "Search",
    category: "Category",
    sort: "Sort",
    all: "All",
    rankSort: "Semantic distance",
    termSort: "Headword",
    categorySort: "Category",
    index: "INDEX",
    standard: "Standard",
    misreading: "Misread",
    sources: "Articles",
    showTools: "Show tools",
    hideTools: "Hide tools",
    pull: "Pull to refresh",
    release: "Release to refresh",
    refreshing: "Refreshing",
    empty: "No matching entries.",
    showing: (count) => `${count} entries shown`,
  },
  ja: {
    title: "誤読辞書",
    lead: "標準的な意味から少しずれて、あなたの文章の中で別の距離を持ちはじめた言葉たち。",
    search: "検索",
    category: "カテゴリ",
    sort: "並び順",
    all: "すべて",
    rankSort: "意味距離順",
    termSort: "見出し語順",
    categorySort: "カテゴリ順",
    index: "索引",
    standard: "標準義",
    misreading: "誤読義",
    sources: "出典記事",
    showTools: "検索・索引を表示",
    hideTools: "検索・索引を隠す",
    pull: "引いて更新",
    release: "離して更新",
    refreshing: "更新中",
    empty: "該当する言葉がありません。",
    showing: (count) => `${count}件を表示中`,
  },
};

const categoryPalette = {
  "場所・風土": { accent: "#5f9f16", soft: "#e4f3cf" },
  "記憶・時間": { accent: "#3d9a78", soft: "#d9f0e7" },
  "欲望・承認": { accent: "#8c8f19", soft: "#eef0cf" },
  "AI・思考": { accent: "#2f8f9f", soft: "#d7eef2" },
  "設計・組織": { accent: "#6c8f24", soft: "#e6edcf" },
  "その他": { accent: "#6f6f5f", soft: "#ecece4" },
};

function normalize(text) {
  return String(text || "").toLocaleLowerCase("ja-JP");
}

function localized(value, fallback = "") {
  if (value && typeof value === "object") {
    return value[state.lang] || value.ja || value.en || fallback;
  }
  return value || fallback;
}

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function categoryStyle(category) {
  const colors = categoryPalette[category?.ja] || categoryPalette["その他"];
  return `--category-accent: ${colors.accent}; --category-soft: ${colors.soft};`;
}

function setupFilters() {
  const categories = [...new Map(entries.map((entry) => [entry.category.ja, entry.category])).values()].sort((a, b) =>
    localized(a).localeCompare(localized(b), state.lang === "ja" ? "ja" : "en")
  );
  for (const category of categories) {
    const option = document.createElement("option");
    option.value = category.ja;
    option.textContent = localized(category);
    els.category.appendChild(option);
  }
}

function refreshStaticCopy() {
  const t = copy[state.lang];
  document.documentElement.lang = state.lang === "ja" ? "ja" : "en";
  document.title = t.title;
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n");
    if (typeof t[key] === "string") node.textContent = t[key];
  });
  els.search.placeholder = state.lang === "ja" ? "縁側、欲望、距離..." : "engawa, desire, distance...";
  [...els.category.options].forEach((option) => {
    if (option.value === "all") option.textContent = t.all;
    const match = entries.find((entry) => entry.category.ja === option.value);
    if (match) option.textContent = localized(match.category);
  });
  [...els.sort.options].forEach((option) => {
    const key = option.getAttribute("data-i18n");
    if (key && typeof t[key] === "string") option.textContent = t[key];
  });
  els.langEn.classList.toggle("active", state.lang === "en");
  els.langJa.classList.toggle("active", state.lang === "ja");
  els.toolsToggle.textContent = els.toolsPanel.classList.contains("is-collapsed") ? t.showTools : t.hideTools;
  els.pullRefresh.querySelector("span").textContent = t.pull;
}

function filteredEntries() {
  const query = normalize(state.query);
  let result = entries.filter((entry) => {
    const matchesCategory = state.category === "all" || entry.category.ja === state.category;
    const haystack = normalize([
      localized(entry.term),
      entry.term?.ja,
      entry.term?.en,
      entry.kana,
      entry.category?.ja,
      entry.category?.en,
      entry.standardMeaning?.ja,
      entry.standardMeaning?.en,
      entry.misreading?.ja,
      entry.misreading?.en,
      ...(entry.sources || []).map((source) => source.title),
    ].join(" "));
    return matchesCategory && haystack.includes(query);
  });

  result = [...result].sort((a, b) => {
    if (state.sort === "term") return localized(a.term).localeCompare(localized(b.term), state.lang === "ja" ? "ja" : "en");
    if (state.sort === "category") {
      return localized(a.category).localeCompare(localized(b.category), state.lang === "ja" ? "ja" : "en") || a.rank - b.rank;
    }
    return a.rank - b.rank;
  });

  return result;
}

function renderIndex(list) {
  els.index.innerHTML = list
    .map((entry) => `<a href="#${escapeHtml(entry.id)}"><span>${escapeHtml(localized(entry.term))}</span><small>${entry.rank}</small></a>`)
    .join("");
}

function renderCards(list) {
  if (!list.length) {
    els.cards.innerHTML = `<p class="empty">${copy[state.lang].empty}</p>`;
    return;
  }

  els.cards.innerHTML = list
    .map((entry) => {
      const sources = (entry.sources || [])
        .map((source) => `<a class="source-link" href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.title)}</a>`)
        .join("");

      return `
        <article class="dictionary-card" id="${escapeHtml(entry.id)}" style="${categoryStyle(entry.category)}">
          <div class="card-topline">
            <span class="rank">#${entry.rank}</span>
            <span class="category">${escapeHtml(localized(entry.category))}</span>
          </div>
          <header class="card-head">
            <h2>${escapeHtml(localized(entry.term))}</h2>
            ${entry.kana ? `<p class="kana">${escapeHtml(entry.kana)}</p>` : ""}
          </header>
          <dl>
            <div>
              <dt>${copy[state.lang].standard}</dt>
              <dd>${escapeHtml(localized(entry.standardMeaning))}</dd>
            </div>
            <div>
              <dt>${copy[state.lang].misreading}</dt>
              <dd>${escapeHtml(localized(entry.misreading))}</dd>
            </div>
            ${sources ? `<div><dt>${copy[state.lang].sources}</dt><dd class="sources">${sources}</dd></div>` : ""}
          </dl>
          ${entry.notes ? `<p class="notes">${escapeHtml(entry.notes)}</p>` : ""}
        </article>
      `;
    })
    .join("");
}

function render() {
  const list = filteredEntries();
  refreshStaticCopy();
  els.count.textContent = entries.length;
  els.summary.textContent = copy[state.lang].showing(list.length);
  renderIndex(list);
  renderCards(list);
}

els.search.addEventListener("input", (event) => {
  state.query = event.target.value;
  render();
});

els.category.addEventListener("change", (event) => {
  state.category = event.target.value;
  render();
});

els.sort.addEventListener("change", (event) => {
  state.sort = event.target.value;
  render();
});

els.langEn.addEventListener("click", () => {
  state.lang = "en";
  render();
});

els.langJa.addEventListener("click", () => {
  state.lang = "ja";
  render();
});

els.toolsToggle.addEventListener("click", () => {
  const collapsed = els.toolsPanel.classList.toggle("is-collapsed");
  els.toolsToggle.setAttribute("aria-expanded", String(!collapsed));
  els.toolsToggle.textContent = collapsed ? copy[state.lang].showTools : copy[state.lang].hideTools;
});

function setupPullToRefresh() {
  if (!("ontouchstart" in window) || !els.pullRefresh) return;

  const threshold = 86;
  let startX = 0;
  let startY = 0;
  let pullDistance = 0;
  let active = false;
  let ready = false;

  function reset() {
    active = false;
    ready = false;
    pullDistance = 0;
    els.pullRefresh.classList.remove("is-visible", "is-ready", "is-refreshing");
    els.pullRefresh.style.transform = "";
    els.pullRefresh.querySelector("span").textContent = copy[state.lang].pull;
  }

  window.addEventListener(
    "touchstart",
    (event) => {
      if (window.scrollY > 0 || event.touches.length !== 1) return;
      const target = event.target;
      if (target instanceof Element && target.closest("button, a, input, select, textarea")) return;
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
      active = true;
    },
    { passive: true }
  );

  window.addEventListener(
    "touchmove",
    (event) => {
      if (!active || event.touches.length !== 1) return;
      const touch = event.touches[0];
      const deltaX = Math.abs(touch.clientX - startX);
      const deltaY = touch.clientY - startY;
      if (deltaY <= 0 || deltaX > deltaY) return reset();

      pullDistance = Math.min(deltaY * 0.5, 112);
      ready = pullDistance >= threshold;
      els.pullRefresh.classList.add("is-visible");
      els.pullRefresh.classList.toggle("is-ready", ready);
      els.pullRefresh.style.transform = `translate(-50%, ${Math.round(pullDistance - 52)}px)`;
      els.pullRefresh.querySelector("span").textContent = ready ? copy[state.lang].release : copy[state.lang].pull;
    },
    { passive: true }
  );

  window.addEventListener("touchend", () => {
    if (!active) return;
    if (ready) {
      els.pullRefresh.classList.add("is-refreshing");
      els.pullRefresh.querySelector("span").textContent = copy[state.lang].refreshing;
      window.location.reload();
      return;
    }
    reset();
  });

  window.addEventListener("touchcancel", reset);
}

setupFilters();
setupPullToRefresh();
render();
