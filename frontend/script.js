window.onload = fetchKeywords;

async function fetchKeywords() {
  console.log("Fetching updated keywords from server...");

  try {
    const res = await fetch("http://localhost:5000/keywords");
    const data = await res.json();
    console.log("Fetched from server:", data);

    const list = document.getElementById("keywordList");
    list.innerHTML = "";

    data.forEach(({ keyword, url, tags,timestamp }) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <strong>${keyword}</strong> - 
        <a href="${url}" target="_blank">${url}</a> 
        [Tags: ${tags || "none"}] 
        <button onclick="deleteKeyword('${timestamp}')">❌</button>
      `;
      list.appendChild(li);
    });
  } catch (err) {
    console.error("Error fetching keywords:", err);
  }
}

async function saveKeyword() {
  const keyword = document.getElementById("keyword").value.trim();
  const url = document.getElementById("url").value.trim();
  const tags = document.getElementById("tags").value.trim();

  if (!keyword || !url) {
    alert("Keyword and URL are required!");
    return;
  }

  try {
    const res = await fetch("http://localhost:5000/keywords", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword, url, tags }),
    });

    const result = await res.json();
    console.log("Save result:", result);

    fetchKeywords();

    document.getElementById("keyword").value = "";
    document.getElementById("url").value = "";
    document.getElementById("tags").value = "";
  } catch (err) {
    console.error("Error saving keyword:", err);
  }
}

async function deleteKeyword(timestamp) {
  try {
    const res = await fetch(`http://localhost:5000/keywords/${timestamp}`, {
      method: "DELETE"
    });

    const result = await res.json();
    console.log("Delete success:", result.success);

    if (result.success) fetchKeywords();
  } catch (err) {
    console.error("Error deleting keyword:", err);
  }
}
