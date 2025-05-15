let selectedRow = null;
let selectedId = null;
let theme = localStorage.getItem("homelab-dashboard-theme") || "light";
document.body.classList.add(theme === "dark" ? "dark-theme" : "light-theme");

// Retrieve data when the page loads
document.addEventListener("DOMContentLoaded", function () {
  loadTableData();
});

// Theme toggle
document.getElementById("themeToggle").addEventListener("click", function () {
  theme = localStorage.getItem("homelab-dashboard-theme") || "light";

  if (theme === "light") {
    document.body.classList.add("dark-theme");
    localStorage.setItem("homelab-dashboard-theme", "dark");
  } else {
    document.body.classList.remove("dark-theme");
    localStorage.setItem("homelab-dashboard-theme", "light");
  }
});

// Add new service to table
document.getElementById("addServiceBtn").addEventListener("click", function () {
  const icon = document.getElementById("iconInput").value;
  const serviceName = document.getElementById("serviceNameInput").value;
  const urlMask = document.getElementById("urlMaskInput").value;
  const externalPort = document.getElementById("externalPortInput").value;

  insertNewRow(icon, serviceName, urlMask, externalPort);
  clearForm();
});

// Add a new row
function insertNewRow(icon, serviceName, urlMask, externalPort) {
  fetch("/services", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      icon,
      serviceName,
      urlMask,
      externalPort,
    }),
  })
    .then((response) => response.json())
    .then(() => loadTableData());
}

// Load table data
function loadTableData() {
  fetch("/services")
    .then((response) => response.json())
    .then((services) => {
      const tableBody = document.querySelector("#serviceTable tbody");
      tableBody.innerHTML = "";

      const { cloudflareBase, tailscaleBase, localhostBase } =
        loadLocalStorageUrlData();

      services.forEach((service) => {
        const cloudflareLink = `${cloudflareBase.replace(
          /\/$/,
          ""
        )}/${service.urlMask.replace(/^\//, "")}`;
        const tailscaleLink = `${tailscaleBase}:${service.externalPort}`;
        const localhostLink = `${localhostBase}:${service.externalPort}`;

        const row = `
                <tr>
                    <td><img src="${service.icon}" alt="Icon" width="30" height="30"></td>
                    <td>${service.serviceName}</td>
                    <td><a href="${cloudflareLink}" class="serviceUrl" target="_blank">${cloudflareLink}</a></td>
                    <td><a href="${tailscaleLink}" class="serviceUrl" target="_blank">${tailscaleLink}</a></td>
                    <td><a href="${localhostLink}" class="serviceUrl" target="_blank">${localhostLink}</a></td>
                    <td>
                        <button class="button edit-button" onclick="editRow(${service.id})">Edit</button>
                        <button class="button delete-button" onclick="deleteRow(${service.id})">Delete</button>
                    </td>
                </tr>
            `;
        tableBody.innerHTML += row;
      });
    });
}

//  Modify Row
function editRow(id) {
  selectedId = id;
  fetch(`/services/${id}`)
    .then((response) => response.json())
    .then((service) => {
      document.getElementById("iconInput").value = service.icon;
      document.getElementById("serviceNameInput").value = service.serviceName;
      document.getElementById("urlMaskInput").value = service.urlMask;
      document.getElementById("externalPortInput").value = service.externalPort;

      document.getElementById("addServiceBtn").style.display = "none";
      document.getElementById("updateServiceBtn").style.display = "inline";
      document.getElementById("form-title").innerText = "Edit Service";
    });
}

// Update service
document
  .getElementById("updateServiceBtn")
  .addEventListener("click", function () {
    const icon = document.getElementById("iconInput").value;
    const serviceName = document.getElementById("serviceNameInput").value;
    const urlMask = document.getElementById("urlMaskInput").value;
    const externalPort = document.getElementById("externalPortInput").value;

    fetch(`/services/${selectedId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        icon,
        serviceName,
        urlMask,
        externalPort,
      }),
    }).then(() => {
      loadTableData();
      clearForm();
    });
    document.getElementById("updateServiceBtn").style.display = "none";
    document.getElementById("addServiceBtn").style.display = "inline";
    document.getElementById("form-title").innerText = "Add New Service";
  });

// Remove Service
function deleteRow(id) {
  fetch(`/services/${id}`, {
    method: "DELETE",
  }).then(() => loadTableData());
}

// Clean the form
function clearForm() {
  document.getElementById("iconInput").value = "";
  document.getElementById("serviceNameInput").value = "";
  document.getElementById("urlMaskInput").value = "";
  document.getElementById("externalPortInput").value = "";

  selectedRow = null;
  selectedId = null;

  document.getElementById("addServiceBtn").style.display = "inline";
  document.getElementById("updateServiceBtn").style.display = "none";
  document.getElementById("form-title").innerText = "Add New Service";
}

function isValidUrl(str) {
  try {
    new URL(str);
    return true;
  } catch (error) {
    console.error("Invalid URL:", error);
    return false;
  }
}

function normalizeIconInput() {
  const input = document.getElementById("iconInput");
  const value = input.value.trim();

  if (!value) return;

  if (!isValidUrl(value)) {
    input.value = `https://cdn.jsdelivr.net/gh/selfhst/icons/png/${value}.png`;
  }
}

document
  .getElementById("iconInput")
  .addEventListener("blur", normalizeIconInput);

// DOCKER SERVICES
document.addEventListener("DOMContentLoaded", function () {
  const dockerTableBody = document.querySelector("#dockerServiceTable tbody");

  fetch("/docker/containers")
    .then((response) => response.json())
    .then((projects) => {
      dockerTableBody.innerHTML = "";

      Object.entries(projects).forEach(([projectName, projectData]) => {
        Object.entries(projectData.services).forEach(
          ([serviceName, serviceData]) => {
            serviceData.containers.forEach((container) => {
              const ports = container.ports
                .map((p) => {
                  return `${p.ip || "localhost"}:${p.public || p.private}/${
                    p.type
                  }`;
                })
                .join(", ");

              const dockerRow = document.createElement("tr");

              dockerRow.innerHTML = `
              <td>${projectName}</td>
              <td>${serviceName}</td>
              <td>${container.state} (${container.status})</td>
              <td>${ports || "-"}</td>`;
              dockerTableBody.appendChild(dockerRow);
            });
          }
        );
      });
    })
    .catch((error) => {
      console.error("Error fetching Docker data:", error);
    });
});

function loadLocalStorageUrlData() {
  const cloudflareBase = localStorage.getItem("cloudflareBase") || "";
  const tailscaleBase = localStorage.getItem("tailscaleBase") || "";
  const localhostBase = localStorage.getItem("localhostBase") || "";

  return {
    cloudflareBase,
    tailscaleBase,
    localhostBase,
  };
}

// DEFAULT URLS
document.addEventListener("DOMContentLoaded", function () {
  const { cloudflareBase, tailscaleBase, localhostBase } =
    loadLocalStorageUrlData();
  document.getElementById("cloudflareBaseInput").value = cloudflareBase;
  document.getElementById("tailscaleBaseInput").value = tailscaleBase;
  document.getElementById("localhostBaseInput").value = localhostBase;
});

// Save base URLs
document.getElementById("saveBaseUrlsBtn").addEventListener("click", () => {
  localStorage.setItem(
    "cloudflareBase",
    document.getElementById("cloudflareBaseInput").value
  );
  localStorage.setItem(
    "tailscaleBase",
    document.getElementById("tailscaleBaseInput").value
  );
  localStorage.setItem(
    "localhostBase",
    document.getElementById("localhostBaseInput").value
  );
  alert("Base URLs saved!");
});
