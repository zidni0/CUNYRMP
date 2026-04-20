(async () => {
  const SKIP = new Set(["staff", "tba", "staff staff", ""]);

  function normalizeName(raw) {
    const lower = raw.trim().toLowerCase().replace(/[^a-z\s]/g, "").trim();
    if (SKIP.has(lower)) return "";
    return lower;
  }

  function getSchoolId() {
    return new Promise(resolve => {
      chrome.storage.local.get("selectedSchoolId", r => resolve(r.selectedSchoolId ?? null));
    });
  }

  function getRating(name, schoolId) {
    return new Promise(resolve => {
      chrome.runtime.sendMessage({ type: "GET_RATING", name, schoolId }, resolve);
    });
  }

  function getTopReview(profNodeId, legacyId) {
    return new Promise(resolve => {
      chrome.runtime.sendMessage({ type: "GET_TOP_REVIEW", profNodeId, legacyId }, resolve);
    });
  }

  function starClass(rating) {
    if (rating == null) return "rmp-ext-star-gray";
    if (rating >= 4.0) return "rmp-ext-star-green";
    if (rating >= 3.0) return "rmp-ext-star-yellow";
    return "rmp-ext-star-red";
  }

  function formatDate(raw) {
    if (!raw) return "";
    const d = new Date(raw);
    if (isNaN(d)) return raw;
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  function buildPanel(prof) {
    const url = `https://www.ratemyprofessors.com/professor/${prof.legacyId}`;
    const hasRatings = (prof.numRatings ?? 0) > 0;
    const panel = document.createElement("div");
    panel.className = "rmp-ext-panel";

    const row1 = document.createElement("div");
    row1.className = "rmp-ext-stats";

    const stars = document.createElement("span");
    stars.className = "rmp-ext-stars " + starClass(hasRatings ? prof.avgRating : null);
    stars.textContent = "\u2B50 " + (hasRatings ? prof.avgRating.toFixed(1) : "N/A");
    row1.appendChild(stars);

    if (hasRatings && prof.wouldTakeAgainPercent != null && prof.wouldTakeAgainPercent !== -1) {
      const wta = document.createElement("span");
      wta.className = "rmp-ext-wouldtake";
      wta.textContent = "Would take again: " + Math.round(prof.wouldTakeAgainPercent) + "%";
      row1.appendChild(wta);
    }
    panel.appendChild(row1);

    const row2 = document.createElement("div");
    row2.className = "rmp-ext-stats";
    if (hasRatings) {
      const diff = document.createElement("span");
      diff.className = "rmp-ext-difficulty";
      diff.textContent = "Difficulty: " + prof.avgDifficulty.toFixed(1);
      row2.appendChild(diff);

      const cnt = document.createElement("span");
      cnt.className = "rmp-ext-ratings";
      cnt.textContent = "(" + (prof.numRatings === 1 ? "1 rating" : prof.numRatings + " ratings") + ")";
      row2.appendChild(cnt);
    } else {
      row2.textContent = "No ratings yet";
    }
    panel.appendChild(row2);

    const linkDivider = document.createElement("hr");
    linkDivider.className = "rmp-ext-divider";
    panel.appendChild(linkDivider);

    const link = document.createElement("a");
    link.className = "rmp-ext-link";
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "\uD83D\uDD17 View on Rate My Professors";
    panel.appendChild(link);

    return panel;
  }

  function fillReview(panel, res) {
    if (!res?.found) return;

    const linkDivider = panel.querySelector(".rmp-ext-divider");

    const reviewDivider = document.createElement("hr");
    reviewDivider.className = "rmp-ext-divider";

    const reviewDiv = document.createElement("div");
    reviewDiv.className = "rmp-ext-review";

    const text = document.createElement("p");
    text.className = "rmp-ext-review-text";
    text.textContent = res.comment;
    reviewDiv.appendChild(text);

    const meta = document.createElement("span");
    meta.className = "rmp-ext-review-meta";
    meta.textContent = formatDate(res.date);
    reviewDiv.appendChild(meta);

    const expandBtn = document.createElement("button");
    expandBtn.className = "rmp-ext-expand";
    expandBtn.type = "button";
    expandBtn.textContent = "[expand]";
    expandBtn.addEventListener("click", () => {
      const expanded = text.classList.toggle("rmp-ext-review-text--expanded");
      expandBtn.textContent = expanded ? "[collapse]" : "[expand]";
    });
    reviewDiv.appendChild(expandBtn);

    panel.insertBefore(reviewDiv, linkDivider);
    panel.insertBefore(reviewDivider, reviewDiv);
  }

  async function processElement(el) {
    if (el.dataset.rmpProcessed) return;
    el.dataset.rmpProcessed = "1";

    const schoolId = await getSchoolId();
    if (!schoolId) return;

    const rawText = Array.from(el.childNodes)
      .filter(n => n.nodeType === Node.TEXT_NODE)
      .map(n => n.textContent)
      .join(",");

    const names = rawText.split(",").map(s => s.trim()).filter(Boolean);

    for (const raw of names) {
      const name = normalizeName(raw);
      if (!name) continue;

      const ratingRes = await getRating(name, schoolId);
      const prof = ratingRes?.ok ? ratingRes.data : null;
      if (!prof) {
        continue;
      }

      const panel = buildPanel(prof);
      el.appendChild(panel);

      getTopReview(prof.id, prof.legacyId)
        .then(reviewRes => fillReview(panel, reviewRes))
        .catch(err => console.error("RMP top review error:", err));
    }
  }

  function scanInstructors() {
    document.querySelectorAll("div.rightnclear[title='Instructor(s)']").forEach(el => {
      if (el.textContent.trim()) processElement(el);
    });
  }

  function resetAndScan() {
    document.querySelectorAll("[data-rmp-processed]").forEach(el => {
      delete el.dataset.rmpProcessed;
    });
    document.querySelectorAll(".rmp-ext-panel").forEach(el => el.remove());
    scanInstructors();
  }

  const schoolId = await getSchoolId();
  if (!schoolId) {
    console.log("RMP: pick a campus in the extension popup to enable ratings.");
  }

  scanInstructors();

  let debounceTimer;
  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(scanInstructors, 150);
  });

  observer.observe(document.body, { childList: true, subtree: true });

  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === "CAMPUS_CHANGED") resetAndScan();
  });
})();
