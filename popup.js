const schoolSelect = document.getElementById("school-select");
const schoolStatus = document.getElementById("school-status");
const applyBtn     = document.getElementById("apply-campus");
const clearBtn     = document.getElementById("clear-cache");

function showStatus(el, msg, ok) {
  el.textContent = msg;
  el.className = "status " + (ok ? "ok" : "err");
  setTimeout(() => { el.textContent = ""; el.className = "status"; }, 3000);
}

chrome.storage.local.get("selectedSchool", result => {
  if (result.selectedSchool) schoolSelect.value = result.selectedSchool;
});

applyBtn.addEventListener("click", async () => {
  const schoolName = schoolSelect.value;
  if (!schoolName) {
    showStatus(schoolStatus, "Select a campus first.", false);
    return;
  }

  schoolStatus.textContent = "Applied. Loading ratings...";
  schoolStatus.className = "status";

  const res = await chrome.runtime.sendMessage({ type: "GET_SCHOOL_ID", schoolName });
  if (!res?.ok || !res.id) {
    showStatus(schoolStatus, "Error: could not find campus on RMP.", false);
    return;
  }

  chrome.storage.local.set({ selectedSchool: schoolName, selectedSchoolId: res.id });

  const tabs = await chrome.tabs.query({ url: "https://sb.cunyfirst.cuny.edu/*" });
  tabs.forEach(tab => {
    chrome.tabs.sendMessage(tab.id, { type: "CAMPUS_CHANGED", schoolId: res.id }).catch(() => {});
  });

  showStatus(schoolStatus, "Ready.", true);
});

clearBtn.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "CLEAR_CACHE" });
  showStatus(schoolStatus, "Cache cleared.", true);
});
