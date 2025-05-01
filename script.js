document.addEventListener("DOMContentLoaded", () => {

  const body = document.body;
  const list = document.getElementById("keywordList");
  const toast = document.getElementById("toast");

  let currentTagFilter = null;

  // ✅ Theme toggle
  const savedTheme = localStorage.getItem("theme") || "light";
  body.classList.add(savedTheme);
  document.getElementById("themeToggle").checked = savedTheme === "dark";

  document.getElementById("themeToggle").addEventListener("change", () => {
    const theme = document.getElementById("themeToggle").checked ? "dark" : "light";
    body.classList.remove("light", "dark");
    body.classList.add(theme);
    localStorage.setItem("theme", theme);
  });

  // ✅ Save keyword
  document.getElementById("saveBtn").addEventListener("click", () => {
    const keyword = document.getElementById("keyword").value.trim();
    const url = document.getElementById("url").value.trim();
    const tags = document.getElementById("tags").value.trim();

    if (!keyword || !url) {
      alert("Keyword and URL required!");
      return;
    }

    let data = JSON.parse(localStorage.getItem("keywords") || "[]");

    data.push({
      keyword,
      url,
      tags: tags || "",
      favorite: false,
      timestamp: new Date().toISOString()
    });

    localStorage.setItem("keywords", JSON.stringify(data));
    document.getElementById("keyword").value = "";
    document.getElementById("url").value = "";
    document.getElementById("tags").value = "";

    showToast("Saved!");
    loadKeywords();
  });

  // ✅ Load keywords
  function loadKeywords() {
    let data = JSON.parse(localStorage.getItem("keywords") || "[]");

    const search = document.getElementById("search").value.trim().toLowerCase();
    const sort = document.getElementById("sortSelect").value;

    if (currentTagFilter) {
      data = data.filter(entry => 
        entry.tags && entry.tags.split(",").map(tag => tag.trim()).includes(currentTagFilter)
      );
    }

    if (search) {
      data = data.filter(entry => 
        entry.keyword.toLowerCase().includes(search) ||
        (entry.tags && entry.tags.toLowerCase().includes(search))
      );
    }

    // Sort
    if (sort === "newest") {
      data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } else if (sort === "oldest") {
      data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    } else if (sort === "az") {
      data.sort((a, b) => a.keyword.localeCompare(b.keyword));
    } else if (sort === "za") {
      data.sort((a, b) => b.keyword.localeCompare(a.keyword));
    }

    list.innerHTML = "";

    data.forEach((entry, index) => {
      const div = document.createElement("div");
      div.className = "keyword-card";
      div.innerHTML = `
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
    <strong>${entry.keyword}</strong>
    <div style="display: flex; gap: 8px;">
    <button class="star-btn" data-timestamp="${entry.timestamp}">${entry.favorite ? '⭐' : '☆'}</button>

            <button class="delete-btn" data-index="${index}">❌</button>
    </div>
  </div>
  <a href="${entry.url}" target="_blank">${entry.url}</a>
  <div class="tag-row" style="margin-top:6px;">
    ${
      entry.tags ? entry.tags.split(",").map(tag => 
        `<span class="tag" data-tag="${tag.trim()}">${tag.trim()}</span>`
      ).join("") : "<small>No tags</small>"
    }
  </div>
`;

            list.appendChild(div);
    });
  }

  // ✅ Toast
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 1500);
  }

  // ✅ Event listeners
  document.getElementById("search").addEventListener("input", loadKeywords);
  document.getElementById("sortSelect").addEventListener("change", loadKeywords);

  list.addEventListener("click", (e) => {
    if (e.target.classList.contains("delete-btn")) {
      const index = e.target.dataset.index;
      let data = JSON.parse(localStorage.getItem("keywords") || "[]");
      data.splice(index, 1);
      localStorage.setItem("keywords", JSON.stringify(data));
      showToast("Deleted!");
      loadKeywords();
    }  else if (e.target.classList.contains("star-btn")) {
      const timestamp = e.target.dataset.timestamp;
      let data = JSON.parse(localStorage.getItem("keywords") || "[]");
    
      data = data.map(entry => {
        if (entry.timestamp === timestamp) {
          return { ...entry, favorite: !entry.favorite };
        }
        return entry;
      });
    
      localStorage.setItem("keywords", JSON.stringify(data));
      e.target.classList.add("bounce");
      setTimeout(() => {
        e.target.classList.remove("bounce");
        loadKeywords();  // Reload after animation
      }, 500);
    } 
  else if (e.target.classList.contains("tag")) {
      currentTagFilter = e.target.dataset.tag;
      loadKeywords();
    }
  });

  // ✅ Export functionality
  document.getElementById("exportBtn").addEventListener("click", () => {
    const data = JSON.parse(localStorage.getItem("keywords") || "[]");
    if (data.length === 0) {
      showToast("No data to export");
      return;
    }
    const format = document.getElementById("exportFormat").value;
    let content = "";
    let filename = document.getElementById("exportFilename").value.trim() || "keywords";

    if (format === "json") {
      content = JSON.stringify(data, null, 2);
      filename += ".json";
    } else {
      content = `### Saved Keywords\n\n` + data.map(entry => 
        `- **${entry.keyword}**\n  🔗 ${entry.url}\n  🏷️ Tags: ${entry.tags || "none"}\n`
      ).join("\n");
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

  // ✅ Preview functionality
  document.getElementById("previewBtn").addEventListener("click", () => {
    const data = JSON.parse(localStorage.getItem("keywords") || "[]");
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
      content = `### Saved Keywords\n\n` + data.map(entry => 
        `- **${entry.keyword}**\n  🔗 ${entry.url}\n  🏷️ Tags: ${entry.tags || "none"}\n`
      ).join("\n");
    }

    previewBox.value = content;
    previewBox.style.display = "block";
  });

  // ✅ Import functionality
  document.getElementById("importBtn").addEventListener("click", () => {
    const fileInput = document.getElementById("importFile");
    const file = fileInput.files[0];
    if (!file) {
      showToast("Please select a file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (!Array.isArray(imported)) {
          showToast("Invalid file format");
          return;
        }
        const existing = JSON.parse(localStorage.getItem("keywords") || "[]");
        const merged = [...existing, ...imported];
        localStorage.setItem("keywords", JSON.stringify(merged));
        showToast("Imported successfully");
        loadKeywords();
      } catch (err) {
        showToast("Error importing file");
      }
    };
    reader.readAsText(file);
  });
  document.getElementById("debugBtn").addEventListener("click", () => {
    const debugBox = document.getElementById("syncDebugBox");
    const data = JSON.parse(localStorage.getItem("keywords") || "[]");
    debugBox.textContent = JSON.stringify(data, null, 2);
    debugBox.style.display = debugBox.style.display === "block" ? "none" : "block";
  });
  document.getElementById("cloudBackupBtn").addEventListener("click", () => {
  const data = JSON.parse(localStorage.getItem("keywords") || "[]");
  if (data.length === 0) {
    showToast("No keywords to backup");
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

// ✅ Restore from File (uses same import logic)
document.getElementById("cloudRestoreBtn").addEventListener("click", () => {
  document.getElementById("importFile").click(); // Triggers the import file input
});


  // ✅ Load first time
  loadKeywords();
});
