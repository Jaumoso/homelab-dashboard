let selectedRow = null;
let selectedId = null;
let theme = localStorage.getItem("homelab-dashboard-theme") || "light";
document.body.classList.add(theme === "dark" ? "dark" : "light");

// Retrieve data when the page loads
document.addEventListener("DOMContentLoaded", function () {
  loadTableData();
  loadDockerData();
});

// Theme toggle
document.getElementById("themeToggle").addEventListener("click", function () {
  theme = localStorage.getItem("homelab-dashboard-theme") || "light";

  if (theme === "light") {
    document.body.classList.add("dark");
    document.body.classList.remove("light");
    localStorage.setItem("homelab-dashboard-theme", "dark");
  } else {
    document.body.classList.add("light");
    document.body.classList.remove("dark");
    localStorage.setItem("homelab-dashboard-theme", "light");
  }
});

// Add new service to table
document.getElementById("addServiceBtn").addEventListener("click", function () {
  const icon = document.getElementById("iconInput").value;
  const serviceName = document.getElementById("serviceNameInput").value;
  const subdomain = document.getElementById("subdomainInput").value;
  const externalPort = document.getElementById("externalPortInput").value;

  insertNewRow(icon, serviceName, subdomain, externalPort);
  clearForm();
});

// Add a new row
function insertNewRow(icon, serviceName, subdomain, externalPort) {
  fetch("/services", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      icon,
      serviceName,
      subdomain,
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
        const regex = /^(https?:)\/\/(.*)/;
        const protocolMatch = regex.exec(cloudflareBase);
        const protocol = protocolMatch ? protocolMatch[1] : "https:";
        const domain = protocolMatch
          ? protocolMatch[2].replace(/\/+$/, "")
          : cloudflareBase.replace(/\/+$/, "");

        const cloudflareLink = `${protocol}//${service.subdomain}.${domain}`;
        const tailscaleLink = `${tailscaleBase}:${service.externalPort}`;
        const localhostLink = `${localhostBase}:${service.externalPort}`;

        const row = `
          <tr class="border-b hover:bg-gray-100 dark:hover:bg-gray-700">
            <td class="py-4 px-6">
            ${
              service.icon
                ? `<img src="${service.icon}" alt="Icon" class="w-12 h-12 mx-auto"></td>`
                : ""
            }
            <td class="py-4 px-6">${service.serviceName}</td>
            <td class="py-4 px-6">
            ${
              service.subdomain
                ? `<a href="${cloudflareLink}" class="text-blue-500 hover:underline" target="_blank">${cloudflareLink}</a>`
                : ""
            } 
            </td>
            <td class="py-4 px-6"><a href="${tailscaleLink}" class="text-blue-500 hover:underline" target="_blank">${tailscaleLink}</a></td>
            <td class="py-4 px-6"><a href="${localhostLink}" class="text-blue-500 hover:underline" target="_blank">${localhostLink}</a></td>
            <td class="py-4 px-6">
              <button class="px-4 py-2 bg-yellow-500 text-white rounded-lg shadow-sm hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500" onclick="editRow(${
                service.id
              })">Edit</button>
              <button class="px-4 py-2 bg-red-500 text-white rounded-lg shadow-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500" onclick="deleteRow(${
                service.id
              })">Delete</button>
            </td>
          </tr>
        `;
        tableBody.innerHTML += row;
      });
    });
}

// Modify Row
function editRow(id) {
  selectedId = id;
  fetch(`/services/${id}`)
    .then((response) => response.json())
    .then((service) => {
      document.getElementById("iconInput").value = service.icon;
      document.getElementById("serviceNameInput").value = service.serviceName;
      document.getElementById("subdomainInput").value = service.subdomain;
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
    const subdomain = document.getElementById("subdomainInput").value;
    const externalPort = document.getElementById("externalPortInput").value;

    fetch(`/services/${selectedId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        icon,
        serviceName,
        subdomain,
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
  document.getElementById("subdomainInput").value = "";
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

// Search functionality
document.getElementById("searchInput").addEventListener("input", function () {
  const searchTerm = this.value.toLowerCase();
  const rows = document.querySelectorAll("#serviceTable tbody tr");

  rows.forEach((row) => {
    const serviceName = row
      .querySelector("td:nth-child(2)")
      .textContent.toLowerCase();
    if (serviceName.includes(searchTerm)) {
      row.style.display = "";
    } else {
      row.style.display = "none";
    }
  });
});

// Load Docker Data
function loadDockerData() {
  fetch("/docker/containers")
    .then((response) => response.json())
    .then((projects) => {
      const dockerTableBody = document.querySelector(
        "#dockerServiceTable tbody"
      );
      dockerTableBody.innerHTML = "";

      Object.entries(projects).forEach(([projectName, projectData]) => {
        // Project Summary Row
        const projectRow = document.createElement("tr");
        projectRow.className = "border-b bg-gray-200 dark:bg-gray-700";
        projectRow.innerHTML = `
          <td class="py-4 px-6 font-bold" colspan="4">${projectName} (${projectData.containerCount} containers)</td>
        `;
        dockerTableBody.appendChild(projectRow);

        // Container Rows
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

              const containerRow = document.createElement("tr");
              containerRow.className =
                "border-b hover:bg-gray-100 dark:hover:bg-gray-700";
              containerRow.innerHTML = `
              <td class="py-4 px-6"></td>
              <td class="py-4 px-6">${container.name}</td>
              <td class="py-4 px-6">${container.state} (${
                container.status
              })</td>
              <td class="py-4 px-6">${ports || "-"}</td>
            `;
              dockerTableBody.appendChild(containerRow);
            });
          }
        );
      });
    })
    .catch((error) => {
      console.error("Error fetching Docker data:", error);
    });
}

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
