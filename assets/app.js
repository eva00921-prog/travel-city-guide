// 城市旅遊指南：所有頁面共用的程式
// 新增城市不需要修改這個檔案，只要新增 data/cities/<id>.json 並登記到 data/cities.json

const REGION_ORDER = ["東北亞", "東南亞", "歐洲", "北美洲", "大洋洲", "其他"];

// 所有資料都經過跳脫再放進 HTML，避免內容裡的特殊字元破壞版面
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = (n) => `NT$ ${Number(n).toLocaleString("zh-TW")}`;

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`讀取 ${path} 失敗`);
  return res.json();
}

async function loadAllCities() {
  const { cities } = await loadJSON("data/cities.json");
  return Promise.all(cities.map((id) => loadJSON(`data/cities/${id}.json`)));
}

/* ===== 首頁 ===== */
async function renderIndex() {
  const grid = document.getElementById("city-grid");
  const filters = document.getElementById("filters");
  const cities = await loadAllCities();

  const regions = REGION_ORDER.filter((r) => cities.some((c) => c.region === r));
  filters.innerHTML = ["全部", ...regions]
    .map((r, i) => `<button class="chip${i === 0 ? " active" : ""}" data-region="${esc(r)}">${esc(r)}</button>`)
    .join("");

  const draw = (region) => {
    grid.innerHTML = cities
      .filter((c) => region === "全部" || c.region === region)
      .map((c) => `
        <a class="ticket" href="city.html?id=${esc(c.id)}" style="--accent:${esc(c.theme_color)}">
          <div class="ticket-main">
            <div class="ticket-top">
              <span class="ticket-code">TPE → ${esc(c.name_en.toUpperCase())}</span>
              <span class="ticket-emoji">${esc(c.emoji)}</span>
            </div>
            <h2>${esc(c.name)}<small>${esc(c.country)}</small></h2>
            <p>${esc(c.tagline)}</p>
          </div>
          <div class="ticket-stub">
            <div><span class="stub-label">飛行</span><span class="stub-value">${esc(c.quick_facts.flight_time)}</span></div>
            <div><span class="stub-label">時差</span><span class="stub-value">${esc(c.quick_facts.time_diff.replace("比台北", ""))}</span></div>
            <div><span class="stub-label">每日預算</span><span class="stub-value">${money(c.budget.per_day_twd.standard)}</span></div>
          </div>
        </a>`)
      .join("");
  };

  filters.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    filters.querySelectorAll(".chip").forEach((b) => b.classList.toggle("active", b === btn));
    draw(btn.dataset.region);
  });
  draw("全部");
  document.getElementById("city-count").textContent = cities.length;
}

/* ===== 城市頁 ===== */
async function renderCity() {
  const root = document.getElementById("city");
  const id = new URLSearchParams(location.search).get("id");
  const { cities: ids } = await loadJSON("data/cities.json");
  if (!ids.includes(id)) {
    root.innerHTML = `<div class="notice">找不到這個城市，<a href="index.html">回到首頁</a></div>`;
    return;
  }
  const c = await loadJSON(`data/cities/${id}.json`);
  document.title = `${c.name} 旅遊指南｜城市旅遊指南`;
  document.documentElement.style.setProperty("--accent", c.theme_color);

  const f = c.quick_facts;
  const facts = [["貨幣", f.currency], ["語言", f.language], ["時差", f.time_diff],
                 ["飛行時間", f.flight_time], ["最佳季節", f.best_season], ["插頭電壓", f.plug]];
  const b = c.budget.per_day_twd;
  const tiers = [["省錢", b.save], ["標準", b.standard], ["舒適", b.comfort]];

  const i = ids.indexOf(id);
  const [prev, next] = await Promise.all([
    loadJSON(`data/cities/${ids[(i - 1 + ids.length) % ids.length]}.json`),
    loadJSON(`data/cities/${ids[(i + 1) % ids.length]}.json`),
  ]);

  root.innerHTML = `
    <section class="city-hero">
      <div class="container">
        <a class="back" href="index.html">← 所有城市</a>
        <span class="emoji">${esc(c.emoji)}</span>
        <h1>${esc(c.name)}<small>${esc(c.name_en)}・${esc(c.country)}</small></h1>
        <p class="tagline">${esc(c.tagline)}</p>
      </div>
    </section>

    <div class="container">
      <div class="facts">
        ${facts.map(([k, v]) => `<div class="fact"><div class="fact-label">${k}</div><div class="fact-value">${esc(v)}</div></div>`).join("")}
      </div>

      <nav class="toc">
        <a href="#intro">城市簡介</a><a href="#spots">必去景點</a><a href="#food">在地美食</a>
        <a href="#transport">交通方式</a><a href="#budget">每日預算</a><a href="#itinerary">建議行程</a><a href="#tips">旅遊提醒</a>
      </nav>

      <section class="section" id="intro">
        <h2>城市簡介</h2>
        <p class="intro">${esc(c.intro)}</p>
      </section>

      <section class="section" id="spots">
        <h2>必去景點</h2>
        <div class="cards">
          ${c.spots.map((s) => `
            <article class="card">
              <span class="area">${esc(s.area)}</span>
              <h3>${esc(s.name)}</h3>
              <p>${esc(s.desc)}</p>
              <div class="tip">💡 ${esc(s.tip)}</div>
            </article>`).join("")}
        </div>
      </section>

      <section class="section" id="food">
        <h2>在地美食</h2>
        <div class="food-list">
          ${c.food.map((d) => `
            <div class="food">
              <h3>${esc(d.name)}</h3>
              <div><p>${esc(d.desc)}</p><div class="where">📍 ${esc(d.where)}</div></div>
            </div>`).join("")}
        </div>
      </section>

      <section class="section" id="transport">
        <h2>交通方式</h2>
        <div class="transport">
          <div class="card"><h3>✈️ 機場到市區</h3><p>${esc(c.transport.airport)}</p></div>
          <div class="card"><h3>🚇 市區移動</h3><p>${esc(c.transport.city)}</p></div>
          <div class="card"><h3>🎫 交通卡與票券</h3><p>${esc(c.transport.pass)}</p></div>
        </div>
      </section>

      <section class="section" id="budget">
        <h2>每日預算</h2>
        <div class="budget">
          ${tiers.map(([k, v]) => `
            <div class="budget-row">
              <span>${k}</span>
              <div class="budget-bar"><span style="width:${Math.round((v / b.comfort) * 100)}%"></span></div>
              <span class="budget-value">${money(v)}</span>
            </div>`).join("")}
        </div>
        <p class="budget-notes">${esc(c.budget.notes)}</p>
      </section>

      <section class="section" id="itinerary">
        <h2>${c.itinerary.length} 天建議行程</h2>
        <div class="timeline">
          ${c.itinerary.map((d) => `
            <div class="day">
              <div class="day-num">DAY ${d.day}</div>
              <div class="card"><h3>${esc(d.title)}</h3>
                <ol>${d.plan.map((p) => `<li>${esc(p)}</li>`).join("")}</ol>
              </div>
            </div>`).join("")}
        </div>
      </section>

      <section class="section" id="tips">
        <h2>旅遊提醒</h2>
        <ul class="tips">${c.tips.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
      </section>

      <nav class="pager">
        <a href="city.html?id=${esc(prev.id)}"><small>上一個城市</small>${esc(prev.emoji)} ${esc(prev.name)}</a>
        <a href="city.html?id=${esc(next.id)}"><small>下一個城市</small>${esc(next.name)} ${esc(next.emoji)}</a>
      </nav>
      <p class="budget-notes" style="text-align:center;margin-top:32px">資料更新於 ${esc(c.updated)}，價格與交通資訊可能變動，出發前請再次確認。</p>
    </div>`;
}

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  const run = page === "city" ? renderCity : renderIndex;
  run().catch((e) => {
    const box = document.getElementById(page === "city" ? "city" : "city-grid");
    box.innerHTML = `<div class="notice">資料載入失敗：${esc(e.message)}<br>如果是直接用瀏覽器打開檔案，請改用 python -m http.server 開啟。</div>`;
  });
});
