import { searchSchool, searchProfessor, fetchRatings } from "./lib/rmp.js";

const SCHOOL_TTL = 30 * 24 * 60 * 60 * 1000;
const PROF_TTL   =  7 * 24 * 60 * 60 * 1000;
const REVIEW_TTL = 30 * 24 * 60 * 60 * 1000;

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .sort()
    .join(" ");
}

async function getCached(key) {
  return new Promise(resolve => {
    chrome.storage.local.get(key, result => {
      resolve(result[key] ?? null);
    });
  });
}

async function setCached(key, value) {
  return new Promise(resolve => {
    chrome.storage.local.set({ [key]: value }, resolve);
  });
}

async function getSchoolId(schoolName) {
  const key = `school:${schoolName}`;
  const cached = await getCached(key);
  if (cached && Date.now() - cached.cachedAt < SCHOOL_TTL) return cached.id;

  const school = await searchSchool(schoolName);
  if (!school) return null;

  await setCached(key, { id: school.id, cachedAt: Date.now() });
  return school.id;
}

function namesMatch(queried, prof) {
  const a = new Set(normalizeName(queried).split(" ").filter(Boolean));
  const profName = [prof.firstName, prof.lastName].filter(Boolean).join(" ");
  const b = new Set(normalizeName(profName).split(" ").filter(Boolean));
  let overlap = 0;
  a.forEach(t => { if (b.has(t)) overlap++; });
  return overlap >= a.size;
}

async function getRating(name, schoolId) {
  const norm = normalizeName(name);
  const key = `prof:${schoolId}:${norm}`;
  const cached = await getCached(key);
  if (cached && Date.now() - cached.cachedAt < PROF_TTL) return cached.data;

  const results = await searchProfessor(name, schoolId);
  const prof = results.find(p => namesMatch(name, p)) ?? null;
  if (!prof) {
    await setCached(key, { data: null, cachedAt: Date.now() });
    return null;
  }

  await setCached(key, { data: prof, cachedAt: Date.now() });
  return prof;
}

async function getTopReview(profNodeId, legacyId) {
  const key = `reviewKey:${legacyId}`;
  const cached = await getCached(key);
  if (cached && Date.now() - cached.cachedAt < REVIEW_TTL) {
    return { found: cached.found, comment: cached.comment, date: cached.date };
  }

  const ratings = await fetchRatings(profNodeId);

  const candidates = ratings.filter(r => {
    if (!r.comment) return false;
    return r.comment.trim().split(/\s+/).length >= 20;
  });

  candidates.sort((a, b) => {
    const hDiff = (b.helpfulRating ?? 0) - (a.helpfulRating ?? 0);
    if (hDiff !== 0) return hDiff;
    return new Date(b.date) - new Date(a.date);
  });

  let pick = null;
  if (candidates.length) {
    if (candidates[0].helpfulRating > 0) {
      pick = candidates[0];
    } else {
      pick = candidates.slice().sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    }
  }

  if (!pick) {
    await setCached(key, { found: false, cachedAt: Date.now() });
    return { found: false };
  }

  const result = { found: true, comment: pick.comment, date: pick.date, cachedAt: Date.now() };
  await setCached(key, result);
  return result;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "GET_RATING") {
    getRating(msg.name, msg.schoolId)
      .then(data => sendResponse({ ok: true, data }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === "GET_SCHOOL_ID") {
    getSchoolId(msg.schoolName)
      .then(id => sendResponse({ ok: true, id }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === "GET_TOP_REVIEW") {
    getTopReview(msg.profNodeId, msg.legacyId)
      .then(data => sendResponse({ ok: true, ...data }))
      .catch(err => {
        console.error("GET_TOP_REVIEW error:", err);
        sendResponse({ ok: false, error: err.message });
      });
    return true;
  }

  if (msg.type === "CLEAR_CACHE") {
    chrome.storage.local.clear(() => sendResponse({ ok: true }));
    return true;
  }
});
