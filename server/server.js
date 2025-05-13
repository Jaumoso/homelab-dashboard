const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const RateLimit = require("express-rate-limit");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "./.env") });

// const Docker = require("dockerode");
// const docker = new Docker({ socketPath: "/var/run/docker.sock" });

const rootDir = path.resolve(__dirname, "..");
console.log("Root directory:", rootDir);
const limiter = RateLimit({
  windowsMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // max 100 requests per windowMS
});

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(limiter);

// Trust frontend proxy
app.set("trust proxy", 1);

// Connection to SQLite database
const db = new sqlite3.Database(`${rootDir}/server/db/services.db`, (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    db.run(
      "CREATE TABLE IF NOT EXISTS services (id INTEGER PRIMARY KEY, icon TEXT, serviceName TEXT, cloudflareLink TEXT, tailscaleLink TEXT, localhostLink TEXT)",
      (err) => {
        if (err) {
          console.log("Error creating table:", err.message);
        }
      }
    );
  }
});

// Obtain all services
app.get("/api/services", (req, res) => {
  db.all("SELECT * FROM services", [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Obtain a service by its id
app.get("/api/services/:id", (req, res) => {
  db.get("SELECT * FROM services WHERE id = ?", [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
    }
    res.json(row);
  });
});

// Add a new service
app.post("/api/services", (req, res) => {
  const { icon, serviceName, cloudflareLink, tailscaleLink, localhostLink } =
    req.body;
  const sql =
    "INSERT INTO services (icon, serviceName, cloudflareLink, tailscaleLink, localhostLink) VALUES (?, ?, ?, ?, ?)";
  const params = [
    icon,
    serviceName,
    cloudflareLink,
    tailscaleLink,
    localhostLink,
  ];
  db.run(sql, params, function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    }
    res.json({ id: this.lastID });
  });
});

// Modify a service
app.put("/api/services/:id", (req, res) => {
  const { icon, serviceName, cloudflareLink, tailscaleLink, localhostLink } =
    req.body;
  const sql =
    "UPDATE services SET icon = ?, serviceName = ?, cloudflareLink = ?, tailscaleLink = ?, localhostLink = ? WHERE id = ?";
  const params = [
    icon,
    serviceName,
    cloudflareLink,
    tailscaleLink,
    localhostLink,
    req.params.id,
  ];
  db.run(sql, params, function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    }
    res.json({ updatedID: this.changes });
  });
});

// Remove a service
app.delete("/api/services/:id", (req, res) => {
  const sql = "DELETE FROM services WHERE id = ?";
  db.run(sql, req.params.id, function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    }
    res.json({ deletedID: this.changes });
  });
});

// app.get("/api/containers", async (req, res) => {
//   try {
//     const containers = await docker.listContainers();
//     const services = containers.map((container) => {
//       const ports = container.Ports.map((port) => ({
//         internal: port.PrivatePort,
//         external: port.PublicPort,
//         type: port.Type,
//         ip: port.IP,
//       }));
//       return {
//         id: container.Id,
//         name: container.Names[0].substring(1),
//         state: container.State,
//         status: container.Status,
//         ports: ports,
//       };
//     });
//     res.json(services);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

const frontendPath = path.resolve(__dirname, "../public");
app.use(express.static(frontendPath));

app.get("/", (_, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// Turn on the server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
