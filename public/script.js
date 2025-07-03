// Global variables
let selectedId = null;
let theme = localStorage.getItem("homelab-theme") || "light";
let config = {
  publicDomains: [],
  tailscaleHost: "",
  localHost: "",
};

// Initialize theme
document.body.classList.add(theme === "dark" ? "dark" : "light");

// Theme toggle
document.getElementById("themeToggle").addEventListener("click", function () {
  theme = theme === "light" ? "dark" : "light";
  document.body.classList.toggle("dark");
  document.body.classList.toggle("light");
  localStorage.setItem("homelab-theme", theme);
});

// Initialize app
document.addEventListener("DOMContentLoaded", function () {
  loadConfiguration();
  loadServices();
  loadDockerServices();
  setupEventListeners();
});

// Load configuration
async function loadConfiguration() {
  try {
    const response = await fetch("/api/config");
    config = await response.json();
    console.log("Loaded configuration:", config); // Log the configuration

    // Parse publicDomains if it's a string
    if (typeof config.publicDomains === "string") {
      try {
        config.publicDomains = JSON.parse(config.publicDomains); // Parse the string into an array
      } catch (e) {
        console.error("Error parsing publicDomains:", e);
        config.publicDomains = []; // Fallback to an empty array if parsing fails
      }
    } else if (!Array.isArray(config.publicDomains)) {
      config.publicDomains = []; // Ensure it's an array
    }

    updateConfigUI();
  } catch (error) {
    console.error("Error loading configuration:", error);
  }
}

// Update configuration UI
function updateConfigUI() {
  // Update public domains
  const container = document.getElementById("publicDomainsContainer");
  container.innerHTML = "";
  config.publicDomains.forEach((domain, index) => {
    const div = document.createElement("div");
    div.className = "flex items-center gap-2";
    div.innerHTML = `
            <input type="text" value="${domain}" data-index="${index}" class="flex-1 p-2 border rounded-lg domain-input">
            <button onclick="removeDomain(${index})" class="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
            </button>
          `;
    container.appendChild(div);
  });

  // Update base inputs
  document.getElementById("tailscaleBaseInput").value = config.tailscaleHost;
  document.getElementById("localhostBaseInput").value = config.localHost;

  // Update domain selects
  updateDomainSelects();
}

// Update domain select options
function updateDomainSelects() {
  const selects = ["domainSelect", "publicDomainSelect"];
  selects.forEach((selectId) => {
    const select = document.getElementById(selectId);
    select.innerHTML = '<option value="">Select domain...</option>';
    config.publicDomains.forEach((domain) => {
      const option = document.createElement("option");
      option.value = domain;
      option.textContent = domain;
      select.appendChild(option);
    });
  });
}

// Add public domain
document
  .getElementById("addPublicDomainBtn")
  .addEventListener("click", function () {
    config.publicDomains.push("");
    updateConfigUI();
  });

// Remove domain
function removeDomain(index) {
  config.publicDomains.splice(index, 1);
  updateConfigUI();
}

// Save configuration
document
  .getElementById("saveConfigBtn")
  .addEventListener("click", async function () {
    // Update config from inputs
    config.publicDomains = Array.from(
      document.querySelectorAll(".domain-input")
    )
      .map((input) => input.value)
      .filter((v) => v.trim());
    config.tailscaleHost = document.getElementById("tailscaleBaseInput").value;
    config.localHost = document.getElementById("localhostBaseInput").value;
    try {
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      alert("Configuration saved successfully!");
      updateConfigUI();
    } catch (error) {
      console.error("Error saving configuration:", error);
      alert("Error saving configuration");
    }
  });

// Load services
async function loadServices() {
  try {
    const response = await fetch("/api/services");
    const services = await response.json();
    const tbody = document.getElementById("serviceTableBody");
    tbody.innerHTML = "";

    services.forEach((service) => {
      const row = document.createElement("tr");
      row.className = "border-b hover:bg-gray-50 dark:hover:bg-gray-700";

      const publicUrl = service.publicUrl;
      // service.publicDomain && service.subdomain
      //   ? `https://${service.subdomain}.${service.publicDomain}`
      //   : "-";
      const tailscaleUrl = service.tailscaleUrl;
      // config.tailscaleHost && service.port
      //   ? `${config.tailscaleHost}:${service.port}`
      //   : "-";
      const localUrl = service.localUrl;
      // config.localHost && service.port
      //   ? `${config.localHost}:${service.port}`
      //   : "-";

      row.innerHTML = `
        <td class="py-4 px-6">
          ${
            service.icon
              ? `<img src="${service.icon}" alt="Icon" class="w-10 h-10 rounded">`
              : ""
          }
        </td>
        <td class="py-4 px-6 font-medium">${service.serviceName}</td>
        <td class="py-4 px-6">
          ${
            publicUrl !== "-"
              ? `<a href="${publicUrl}" class="text-blue-500 hover:underline" target="_blank">${publicUrl}</a>`
              : publicUrl
          }
        </td>
        <td class="py-4 px-6">
          ${
            tailscaleUrl !== "-"
              ? `<a href="${tailscaleUrl}" class="text-blue-500 hover:underline" target="_blank">${tailscaleUrl}</a>`
              : tailscaleUrl
          }
        </td>
        <td class="py-4 px-6">
          ${
            localUrl !== "-"
              ? `<a href="${localUrl}" class="text-blue-500 hover:underline" target="_blank">${localUrl}</a>`
              : localUrl
          }
        </td>
        <td class="py-4 px-6">
          <div class="flex gap-2">
            <button onclick="editService(${
              service.id
            })" class="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600">Edit</button>
            <button onclick="deleteService(${
              service.id
            })" class="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600">Delete</button>
          </div>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error("Error loading services:", error);
  }
}

// Load Docker services
async function loadDockerServices() {
  try {
    const response = await fetch("/api/docker/containers");
    const projects = await response.json();
    const tbody = document.getElementById("dockerServiceTableBody");
    const select = document.getElementById("dockerServiceSelect");

    tbody.innerHTML = "";
    select.innerHTML = '<option value="">Choose a service...</option>';

    Object.entries(projects).forEach(([projectName, projectData]) => {
      // Project header row
      const projectRow = document.createElement("tr");
      projectRow.className = "bg-gray-100 dark:bg-gray-600";
      projectRow.innerHTML = `
              <td class="py-3 px-6 font-bold" colspan="5">${projectName} (${projectData.containerCount} containers)</td>
            `;
      tbody.appendChild(projectRow);

      // Service rows
      Object.entries(projectData.services).forEach(
        ([serviceName, serviceData]) => {
          serviceData.containers.forEach((container) => {
            const ports = container.ports
              .map(
                (p) =>
                  `${p.ip || "localhost"}:${p.public || p.private}/${p.type}`
              )
              .join(", ");

            const row = document.createElement("tr");
            row.className = "border-b hover:bg-gray-50 dark:hover:bg-gray-700";
            row.innerHTML = `
                  <td class="py-3 px-6 pl-12">${projectName}</td>
                  <td class="py-3 px-6">${container.name}</td>
                  <td class="py-3 px-6">
                    <span class="px-2 py-1 rounded-full text-xs ${
                      container.state === "running"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }">
                      ${container.state}
                    </span>
                  </td>
                  <td class="py-3 px-6">${ports || "-"}</td>
                  <td class="py-3 px-6">
                    <button onclick="selectDockerService('${projectName}', '${serviceName}', '${
              container.ports[0]?.public || container.ports[0]?.private || ""
            }')" 
                            class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
                      Select
                    </button>
                  </td>
                `;
            tbody.appendChild(row);

            // Add to select dropdown
            const option = document.createElement("option");
            option.value = JSON.stringify({
              project: projectName,
              service: serviceName,
              port:
                container.ports[0]?.public || container.ports[0]?.private || "",
            });
            option.textContent = `${projectName} - ${serviceName}`;
            select.appendChild(option);
          });
        }
      );
    });
  } catch (error) {
    console.error("Error loading Docker services:", error);
  }
}

// Select Docker service
function selectDockerService(project, service, port) {
  document.getElementById("dockerServiceSelect").value = JSON.stringify({
    project,
    service,
    port,
  });
  document.getElementById("subdomainInput").value = service;

  // Scroll to quick add section
  document
    .getElementById("dockerServiceSelect")
    .scrollIntoView({ behavior: "smooth" });
}

// Docker service selection change
document
  .getElementById("dockerServiceSelect")
  .addEventListener("change", function () {
    if (this.value) {
      const data = JSON.parse(this.value);
      document.getElementById("subdomainInput").value = data.service;
    }
  });

document
  .getElementById("quickAddBtn")
  .addEventListener("click", async function () {
    const dockerData = document.getElementById("dockerServiceSelect").value;
    const domain = document.getElementById("domainSelect").value;
    const subdomain = document.getElementById("subdomainInput").value;

    if (!dockerData || !domain || !subdomain) {
      alert("Please fill all fields");
      return;
    }

    const data = JSON.parse(dockerData);
    const serviceData = {
      serviceName: `${data.project} - ${data.service}`,
      icon: `https://cdn.jsdelivr.net/gh/selfhst/icons/png/${data.service}.png`,
      publicUrl: `https://${subdomain}.${domain}`, // Construct public URL
      tailscaleUrl: `${config.tailscaleHost}:${data.port}`, // Construct Tailscale URL
      localUrl: `${config.localHost}:${data.port}`, // Construct local URL
    };

    try {
      await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serviceData),
      });
      loadServices();
      // Reset form
      document.getElementById("dockerServiceSelect").value = "";
      document.getElementById("domainSelect").value = "";
      document.getElementById("subdomainInput").value = "";
    } catch (error) {
      console.error("Error adding service:", error);
      alert("Error adding service");
    }
  });

// Setup event listeners
function setupEventListeners() {
  // Search functionality
  document.getElementById("searchInput").addEventListener("input", function () {
    const searchTerm = this.value.toLowerCase();
    const rows = document.querySelectorAll("#serviceTableBody tr");
    rows.forEach((row) => {
      const serviceName = row.cells[1]?.textContent.toLowerCase() || "";
      row.style.display = serviceName.includes(searchTerm) ? "" : "none";
    });
  });

  // Icon input normalization
  document.getElementById("iconInput").addEventListener("blur", function () {
    const value = this.value.trim();
    if (value && !value.startsWith("http")) {
      this.value = `https://cdn.jsdelivr.net/gh/selfhst/icons/png/${value}.png`;
    }
  });

  // Add service
  document
    .getElementById("addServiceBtn")
    .addEventListener("click", async function () {
      const serviceData = {
        serviceName: document.getElementById("serviceNameInput").value,
        icon: document.getElementById("iconInput").value,
        publicDomain: document.getElementById("publicDomainSelect").value,
        subdomain: document.getElementById("subdomainManualInput").value,
        externalPort: document.getElementById("portInput").value,
      };

      try {
        await fetch("/api/services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(serviceData),
        });
        loadServices();
        clearForm();
      } catch (error) {
        console.error("Error adding service:", error);
        alert("Error adding service");
      }
    });

  // Update service
  document
    .getElementById("updateServiceBtn")
    .addEventListener("click", async function () {
      const serviceData = {
        serviceName: document.getElementById("serviceNameInput").value,
        icon: document.getElementById("iconInput").value,
        publicDomain: document.getElementById("publicDomainSelect").value,
        subdomain: document.getElementById("subdomainManualInput").value,
        port: document.getElementById("portInput").value,
      };

      try {
        await fetch(`/api/services/${selectedId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(serviceData),
        });
        loadServices();
        clearForm();
      } catch (error) {
        console.error("Error updating service:", error);
        alert("Error updating service");
      }
    });

  // Cancel edit
  document.getElementById("cancelBtn").addEventListener("click", clearForm);
}

// Edit service
async function editService(id) {
  try {
    const response = await fetch(`/api/services/${id}`);
    const service = await response.json();

    selectedId = id;
    document.getElementById("serviceNameInput").value = service.serviceName;
    document.getElementById("iconInput").value = service.icon;
    document.getElementById("publicDomainSelect").value = service.publicDomain;
    document.getElementById("subdomainManualInput").value = service.subdomain;
    document.getElementById("portInput").value = service.port;

    document.getElementById("formTitle").textContent = "Edit Service";
    document.getElementById("addServiceBtn").classList.add("hidden");
    document.getElementById("updateServiceBtn").classList.remove("hidden");

    // Scroll to form
    document.getElementById("formTitle").scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    console.error("Error loading service:", error);
  }
}

// Delete service
async function deleteService(id) {
  if (confirm("Are you sure you want to delete this service?")) {
    try {
      await fetch(`/api/services/${id}`, { method: "DELETE" });
      loadServices();
    } catch (error) {
      console.error("Error deleting service:", error);
      alert("Error deleting service");
    }
  }
}

// Clear form
function clearForm() {
  document.getElementById("serviceNameInput").value = "";
  document.getElementById("iconInput").value = "";
  document.getElementById("publicDomainSelect").value = "";
  document.getElementById("subdomainManualInput").value = "";
  document.getElementById("portInput").value = "";

  selectedId = null;
  document.getElementById("formTitle").textContent = "Add New Service";
  document.getElementById("addServiceBtn").classList.remove("hidden");
  document.getElementById("updateServiceBtn").classList.add("hidden");
}

// Auto-refresh Docker services every 30 seconds
setInterval(loadDockerServices, 30000);
