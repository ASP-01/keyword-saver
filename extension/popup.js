document.addEventListener("DOMContentLoaded", () => {
  function getKeywords(callback) {
    chrome.storage.sync.get(["keywords"], (result) => {
      callback(result.keywords || []);
    });
  }

  function saveKeywords(data, callback) {
    chrome.storage.sync.set({ keywords: data }, () => {
      if (callback) callback();
    });
  }

  const body = document.body;
  const toast = document.getElementById("toast");
  const list = document.getElementById("keywordList");
  let currentTagFilter = null;

  const savedExportFormat = localStorage.getItem("lastExportFormat");
  if (savedExportFormat) {
    document.getElementById("exportFormat").value = savedExportFormat;
  }

  // THEME SETUP
  const savedTheme = localStorage.getItem("theme") || "dark";
  body.classList.add(savedTheme);
  document.getElementById("themeToggle").checked = savedTheme === "dark";

  document.getElementById("themeToggle").addEventListener("change", () => {
    const theme = document.getElementById("themeToggle").checked ? "dark" : "light";
    body.classList.remove("light", "dark");
    body.classList.add(theme);
    localStorage.setItem("theme", theme);
  });

  // Autofill current tab URL
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    document.getElementById("url").value = tabs[0]?.url || "";
  });

  function loadKeywords() {
    getKeywords(data => {
      data = data.map(entry => {
        if (!entry.timestamp) entry.timestamp = new Date().toISOString();
        return entry;
      });

      if (currentTagFilter) {
        data = data.filter(entry =>
          entry.tags &&
          entry.tags.split(",").some(tag => tag.trim() === currentTagFilter)
        );
      }

      const search = document.getElementById("search").value.toLowerCase().trim();
      if (search) {
        data = data.filter(entry => {
          const keywordMatch = entry.keyword.toLowerCase().includes(search);
          const tagMatch = entry.tags && entry.tags.toLowerCase().includes(search);
          return keywordMatch || tagMatch;
        });

        chrome.storage.sync.get(null, result => {
          console.log("SYNC STORAGE CONTENTS:", result);
        });
        
        data.sort((a, b) => {
          const aKey = a.keyword.toLowerCase();
          const bKey = b.keyword.toLowerCase();
          if (aKey === search && bKey !== search) return -1;
          if (bKey === search && aKey !== search) return 1;
          if (aKey.startsWith(search) && !bKey.startsWith(search)) return -1;
          if (bKey.startsWith(search) && !aKey.startsWith(search)) return 1;
          return 0;
        });
      } else {
        const sort = document.getElementById("sortSelect").value;
        if (sort === "newest") data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        else if (sort === "oldest") data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        else if (sort === "az") data.sort((a, b) => a.keyword.localeCompare(b.keyword));
        else if (sort === "za") data.sort((a, b) => b.keyword.localeCompare(a.keyword));
      }

      data.sort((a, b) => (b.favorite === true) - (a.favorite === true));

      list.innerHTML = "";
      data.forEach((entry, index) => {
        const starIcon = entry.favorite ? '⭐' : '☆';
        const li = document.createElement("li");

        li.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong>${entry.keyword}</strong>
            <button class="star-btn" data-timestamp="${entry.timestamp}">${starIcon}</button>
          </div>
          <a href="${entry.url}" target="_blank">${entry.url}</a>
          <div class="tag-row">
            ${
              entry.tags
                ? entry.tags.split(",").map(tag => `<span class="tag" data-tag="${tag.trim()}">${tag.trim()}</span>`).join(" ")
                : "<span class='tag empty'>no tags</span>"
            }
          </div>
          <button class="delete-btn" data-index="${index}">❌</button>
        `;
        list.appendChild(li);
      });

      document.getElementById("clearFilterBtn").style.display = currentTagFilter ? "block" : "none";
    });
  }

  document.getElementById("saveBtn").addEventListener("click", () => {
    const keyword = document.getElementById("keyword").value.trim();
    const url = document.getElementById("url").value.trim();
    const tags = document.getElementById("tags").value.trim();
    if (!keyword || !url) return alert("Keyword and URL required!");

    getKeywords(data => {
      data.push({
        keyword,
        url,
        tags: tags || "",
        favorite: false,
        timestamp: new Date().toISOString()
      });
      saveKeywords(data, () => {
        document.getElementById("keyword").value = "";
        document.getElementById("tags").value = "";
        showToast("Saved!");
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
        
        loadKeywords();
      });
    });
  });

  document.getElementById("keywordList").addEventListener("click", (e) => {
    if (e.target.classList.contains("tag")) {
      currentTagFilter = e.target.dataset.tag;
      loadKeywords();
    } else if (e.target.classList.contains("star-btn")) {
      const timestamp = e.target.dataset.timestamp;
      getKeywords(data => {
        data = data.map(entry => {
          if (entry.timestamp === timestamp) {
            return { ...entry, favorite: !entry.favorite };
          }
          return entry;
        });
        saveKeywords(data, loadKeywords);
      });
    } else if (e.target.classList.contains("delete-btn")) {
      const index = parseInt(e.target.dataset.index);
      getKeywords(data => {
        data.splice(index, 1);
        saveKeywords(data, loadKeywords);
      });
    }
  });
  document.getElementById("importBtn").addEventListener("click", () => {
    const fileInput = document.getElementById("importFile");
    const file = fileInput.files[0];
  
    if (!file) {
      showToast("Please select a JSON file");
      return;
    }
  
    const reader = new FileReader();
  
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
  
        if (!Array.isArray(importedData)) {
          showToast("Invalid JSON format");
          return;
        }
  
        // Filter to valid entries (has keyword + url)
        const cleanData = importedData.filter(item => item.keyword && item.url);
  
        // Merge with existing sync keywords
        getKeywords(existing => {
          const merged = [...existing];
  
          cleanData.forEach(newItem => {
            // avoid duplicates by keyword+url
            const isDuplicate = existing.some(
              existingItem =>
                existingItem.keyword === newItem.keyword &&
                existingItem.url === newItem.url
            );
            if (!isDuplicate) {
              merged.push({
                keyword: newItem.keyword,
                url: newItem.url,
                tags: newItem.tags || "",
                favorite: !!newItem.favorite,
                timestamp: newItem.timestamp || new Date().toISOString()
              });
            }
          });
  
          saveKeywords(merged, () => {
            showToast("Imported successfully!");
            loadKeywords();
          });
        });
      } catch (err) {
        showToast("Error reading file");
        console.error("Import error:", err);
      }
    };
  
    reader.readAsText(file);
  });
  
  document.getElementById("copyAllBtn").addEventListener("click", () => {
    getKeywords(data => {
      if (data.length === 0) {
        showToast("No keywords to copy");
        return;
      }
      const output = data.map(entry => {
        return `Keyword: ${entry.keyword}\nURL: ${entry.url}\nTags: ${entry.tags || "none"}\n------------------------`;
      }).join("\n");
      navigator.clipboard.writeText(output)
        .then(() => showToast("Copied to clipboard!"))
        .catch(() => showToast("Failed to copy"));
    });
  });

  document.getElementById("exportBtn").addEventListener("click", () => {
    getKeywords(data => {
      const format = document.getElementById("exportFormat").value;
      if (data.length === 0) {
        showToast("No keywords to export");
        return;
      }
      let content = "";
      let filename = document.getElementById("exportFilename").value.trim() || "keywords";
      if (format === "json") {
        content = JSON.stringify(data, null, 2);
        filename += ".json";
      } else {
        content = `### Saved Keywords\n\n` + data.map(entry => `- **${entry.keyword}**  \n  🔗 ${entry.url}  \n  🏷️ Tags: ${entry.tags || "none"}\n`).join("\n");
        filename += ".md";
      }
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Exported as ${format}`);
    });
  });

  document.getElementById("previewBtn").addEventListener("click", () => {
    getKeywords(data => {
      const format = document.getElementById("exportFormat").value;
      const previewBox = document.getElementById("exportPreview");
      if (data.length === 0) {
        showToast("No data to preview");
        previewBox.style.display = "none";
        return;
      }
      let content = "";
      if (format === "json") {
        content = JSON.stringify(data, null, 2);
      } else {
        content = `### Saved Keywords\n\n` + data.map(entry => `- **${entry.keyword}**\n  🔗 ${entry.url}\n  🏷️ Tags: ${entry.tags || "none"}\n`).join("\n");
      }
      previewBox.value = content;
      previewBox.style.display = "block";
    });
  });

  document.getElementById("exportFormat").addEventListener("change", (e) => {
    localStorage.setItem("lastExportFormat", e.target.value);
  });

  document.getElementById("search").addEventListener("input", loadKeywords);
  document.getElementById("sortSelect").addEventListener("change", loadKeywords);
  
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 1500);
  }
// === Sync Debug Section ===
// === Sync Debug Section ===
const debugBtn = document.getElementById("debugToggleBtn");
const refreshBtn = document.getElementById("debugRefreshBtn");
const debugBox = document.getElementById("syncDebugBox");

function updateSyncDebugBox() {
  chrome.storage.sync.get(null, (res) => {
    debugBox.textContent = JSON.stringify(res, null, 2);
  });
}
const clearBtn = document.getElementById("debugClearBtn");

// Show/hide Clear button with the debug view
debugBtn.addEventListener("click", () => {
  const isVisible = debugBox.style.display === "block";
  debugBox.style.display = isVisible ? "none" : "block";
  refreshBtn.style.display = isVisible ? "none" : "inline-block";
  clearBtn.style.display = isVisible ? "none" : "inline-block";
  debugBtn.textContent = isVisible ? "Show Sync Data" : "Hide Sync Data";
  if (!isVisible) updateSyncDebugBox();
});
// ☁️ Backup to Cloud (Download .json)
document.getElementById("cloudBackupBtn").addEventListener("click", () => {
  getKeywords(data => {
    if (!data || data.length === 0) {
      showToast("Nothing to backup");
      return;
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `keyword_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Backup downloaded");
  });
});

// ☁️ Restore from File (uses same logic as importBtn)
document.getElementById("cloudRestoreBtn").addEventListener("click", () => {
  document.getElementById("importFile").click();
});

clearBtn.addEventListener("click", () => {
  if (confirm("Are you sure you want to clear all synced keywords?")) {
    chrome.storage.sync.set({ keywords: [] }, () => {
      showToast("Cleared all keywords");
      updateSyncDebugBox();
      loadKeywords();
    });
  }
});

debugBtn.addEventListener("click", () => {
  const isVisible = debugBox.style.display === "block";
  debugBox.style.display = isVisible ? "none" : "block";
  refreshBtn.style.display = isVisible ? "none" : "inline-block";
  debugBtn.textContent = isVisible ? "Show Sync Data" : "Hide Sync Data";
  if (!isVisible) updateSyncDebugBox();
});

refreshBtn.addEventListener("click", updateSyncDebugBox);

// ✅ Final call inside DOMContentLoaded
loadKeywords();
});
