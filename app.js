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
    empty: "該当する言葉がありません。",
    showing: (count) => `${count}件を表示中`,
  },
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
        <article class="dictionary-card" id="${escapeHtml(entry.id)}">
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

setupFilters();
render();
