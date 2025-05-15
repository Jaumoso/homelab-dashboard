const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const RateLimit = require("express-rate-limit");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "./.env") });

const Docker = require("dockerode");
const docker = new Docker({ socketPath: "/var/run/docker.sock" });
// const docker = new Docker({
//   socketPath: "tcp://127.0.0.1:2375", // Usar TCP en Windows
// });

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
const db = new sqlite3.Database(`./server/db/services.db`, (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    db.run(
      "CREATE TABLE IF NOT EXISTS services (id INTEGER PRIMARY KEY, icon TEXT, serviceName TEXT, urlMask TEXT, externalPort TEXT)",
      (err) => {
        if (err) {
          console.log("Error creating table:", err.message);
        }
      }
    );
  }
});

// Obtain all services
app.get("/services", (req, res) => {
  db.all("SELECT * FROM services", [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Obtain a service by its id
app.get("/services/:id", (req, res) => {
  db.get("SELECT * FROM services WHERE id = ?", [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
    }
    res.json(row);
  });
});

// Add a new service
app.post("/services", (req, res) => {
  const { icon, serviceName, urlMask, externalPort } = req.body;
  const sql =
    "INSERT INTO services (icon, serviceName, urlMask, externalPort) VALUES (?, ?, ?, ?)";
  const params = [icon, serviceName, urlMask, externalPort];
  db.run(sql, params, function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    }
    res.json({ id: this.lastID });
  });
});

// Modify a service
app.put("/services/:id", (req, res) => {
  const { icon, serviceName, urlMask, externalPort } = req.body;
  const sql =
    "UPDATE services SET icon = ?, serviceName = ?, urlMask = ?, externalPort = ? WHERE id = ?";
  const params = [icon, serviceName, urlMask, externalPort, req.params.id];
  db.run(sql, params, function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    }
    res.json({ updatedID: this.changes });
  });
});

// Remove a service
app.delete("/services/:id", (req, res) => {
  const sql = "DELETE FROM services WHERE id = ?";
  db.run(sql, req.params.id, function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    }
    res.json({ deletedID: this.changes });
  });
});

// app.get("/docker/containers", async (_, res) => {
//   try {
//     const containers = await docker.listContainers({ all: false });

//     const projects = {};

//     containers.forEach((container) => {
//       const labels = container.Labels || {};
//       const project = labels["com.docker.compose.project"];
//       const service = labels["com.docker.compose.service"];

//       if (!project || !service) return;

//       if (!projects[project]) {
//         projects[project] = {
//           containerCount: 0,
//           services: {},
//         };
//       }

//       projects[project].containerCount += 1;

//       if (!projects[project].services[service]) {
//         projects[project].services[service] = {
//           containers: [],
//         };
//       }

//       projects[project].services[service].containers.push({
//         id: container.Id,
//         name: container.Names?.[0]?.replace(/^\//, "") || "",
//         status: container.Status,
//         state: container.State,
//         ports: container.Ports.map((p) => ({
//           private: p.PrivatePort,
//           public: p.PublicPort,
//           type: p.Type,
//           ip: p.IP,
//         })),
//       });
//     });

//     res.json(projects);
//   } catch (err) {
//     console.error("Error al obtener contenedores:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

app.get("/docker/containers", async (_, res) => {
  try {
    // Mock de contenedor
    const mockProjects = {
      "mock-project": {
        containerCount: 1,
        services: {
          "mock-service": {
            containers: [
              {
                id: "1234567890abcdef",
                name: "mock-container",
                status: "Up 10 minutes",
                state: "running",
                ports: [
                  {
                    private: 3000,
                    public: 8080,
                    type: "tcp",
                    ip: "0.0.0.0",
                  },
                ],
              },
            ],
          },
        },
      },
    };

    // Devuelve el mock directamente
    res.json(mockProjects);
  } catch (err) {
    console.error("Error al obtener contenedores:", err);
    res.status(500).json({ error: err.message });
  }
});

const frontendPath = path.resolve(__dirname, "../public");
app.use(express.static(frontendPath));

app.get("/", (_, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// Turn on the server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
