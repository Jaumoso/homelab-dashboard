const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const RateLimit = require("express-rate-limit");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "./.env") });
const Docker = require("dockerode");

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Docker
const docker = new Docker({ socketPath: "/var/run/docker.sock" });

// Rate limiter middleware
const limiter = RateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});

// Middleware setup
app.use(cors());
app.use(bodyParser.json());
app.use(limiter);
app.set("trust proxy", 1); // Trust first proxy

// SQLite database connection
const db = new sqlite3.Database(
  path.resolve(__dirname, "./db/services.db"),
  (err) => {
    if (err) {
      console.error("Error opening database:", err.message);
    } else {
      db.run(
        "CREATE TABLE IF NOT EXISTS services (id INTEGER PRIMARY KEY, icon TEXT, serviceName TEXT, publicUrl TEXT, tailscaleUrl TEXT, localUrl TEXT, externalPort TEXT)",
        (err) => {
          if (err) {
            console.error("Error creating table:", err.message);
          }
        }
      );
    }
  }
);

// Configuration storage
const configTable = "config";

// Create config table if it doesn't exist
db.run(`CREATE TABLE IF NOT EXISTS ${configTable} (
  id INTEGER PRIMARY KEY,
  publicDomains TEXT,
  tailscaleHost TEXT,
  localHost TEXT
)`);

// Obtain all services
app.get("/api/services", (req, res) => {
  db.all("SELECT * FROM services", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Obtain a service by its id
app.get("/api/services/:id", (req, res) => {
  db.get("SELECT * FROM services WHERE id = ?", [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(row);
  });
});

// Add a new service
app.post("/api/services", (req, res) => {
  const { icon, serviceName, publicUrl, tailscaleUrl, localUrl, externalPort } =
    req.body;
  const sql =
    "INSERT INTO services (icon, serviceName, publicUrl, tailscaleUrl, localUrl, externalPort) VALUES (?, ?, ?, ?, ?, ?)";
  const params = [
    icon,
    serviceName,
    publicUrl,
    tailscaleUrl,
    localUrl,
    externalPort,
  ];

  db.run(sql, params, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ id: this.lastID });
  });
});

// Modify a service
app.put("/api/services/:id", (req, res) => {
  const { icon, serviceName, publicUrl, tailscaleUrl, localUrl, externalPort } =
    req.body;
  const sql =
    "UPDATE services SET icon = ?, serviceName = ?, publicUrl = ?, tailscaleUrl = ?, localUrl = ?, externalPort = ? WHERE id = ?";
  const params = [
    icon,
    serviceName,
    publicUrl,
    tailscaleUrl,
    localUrl,
    externalPort,
    req.params.id,
  ];

  db.run(sql, params, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ updatedID: this.changes });
  });
});

// Remove a service
app.delete("/api/services/:id", (req, res) => {
  const sql = "DELETE FROM services WHERE id = ?";
  db.run(sql, req.params.id, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ deletedID: this.changes });
  });
});

// Get configuration
app.get("/api/config", (req, res) => {
  db.get(`SELECT * FROM ${configTable} WHERE id = 1`, (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(row || { publicDomains: [], tailscaleHost: "", localHost: "" });
  });
});

// Save configuration
app.post("/api/config", (req, res) => {
  const { publicDomains, tailscaleHost, localHost } = req.body;
  const sql = `INSERT INTO ${configTable} (id, publicDomains, tailscaleHost, localHost) VALUES (1, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET publicDomains = ?, tailscaleHost = ?, localHost = ?`;
  const params = [
    JSON.stringify(publicDomains),
    tailscaleHost,
    localHost,
    JSON.stringify(publicDomains),
    tailscaleHost,
    localHost,
  ];

  db.run(sql, params, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: "Configuration saved successfully!" });
  });
});

// Docker containers endpoint
app.get("/api/docker/containers", async (req, res) => {
  try {
    const containers = await docker.listContainers({ all: true });
    const projects = {};

    containers.forEach((container) => {
      const labels = container.Labels || {};
      const project = labels["com.docker.compose.project"];
      const service = labels["com.docker.compose.service"];

      if (!project || !service) return;

      if (!projects[project]) {
        projects[project] = { containerCount: 0, services: {} };
      }

      projects[project].containerCount += 1;

      if (!projects[project].services[service]) {
        projects[project].services[service] = { containers: [] };
      }

      projects[project].services[service].containers.push({
        id: container.Id,
        name: container.Names?.[0]?.replace(/^\//, "") || "",
        status: container.Status,
        state: container.State,
        ports: container.Ports.map((p) => ({
          private: p.PrivatePort,
          public: p.PublicPort,
          type: p.Type,
          ip: p.IP,
        })),
      });
    });
    console.log(projects);
    res.json(projects);
  } catch (err) {
    console.error("Error fetching containers:", err);
    res.status(500).json({ error: err.message });
  }
});

// Serve static files
const frontendPath = path.resolve(__dirname, "../public");
app.use(express.static(frontendPath));

// Serve the main HTML file
app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// Start the server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
