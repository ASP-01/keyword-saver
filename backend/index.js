const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Optional: Allow all methods and headers
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// Local JSON file to simulate a database
const DATA_FILE = './keywords.json';

// Load keywords from file
function loadData() {
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');
  const raw = fs.readFileSync(DATA_FILE);
  return JSON.parse(raw);
}

// Save keywords to file
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// GET all keywords
app.get('/keywords', (req, res) => {
  const data = loadData();
  res.json(data);
});

// POST a new keyword
app.post('/keywords', (req, res) => {
  const { keyword, url, tags } = req.body;
  if (!keyword || !url) {
    return res.status(400).json({ error: 'Missing keyword or URL' });
  }

  const data = loadData();
  data.push({ keyword, url, tags, timestamp: new Date().toISOString() });
  saveData(data);
  res.status(201).json({ success: true });
});

// DELETE a keyword by exact match
app.delete("/keywords/:timestamp", (req, res) => {
  const timestamp = req.params.timestamp;
  let data = loadData();

  const filtered = data.filter(entry => entry.timestamp !== timestamp);

  if (filtered.length !== data.length) {
    saveData(filtered);
    return res.json({ success: true });
  }

  res.json({ success: false });
});


app.listen(PORT, () => {
  console.log(`✅ Backend server running at http://localhost:${PORT}`);
});
