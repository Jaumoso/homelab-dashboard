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
  const cloudflareLink = document.getElementById("cloudflareLinkInput").value;
  const tailscaleLink = document.getElementById("tailscaleLinkInput").value;
  const localhostLink = document.getElementById("localhostLinkInput").value;

  insertNewRow(icon, serviceName, cloudflareLink, tailscaleLink, localhostLink);
  clearForm();
});

// Add a new row
function insertNewRow(
  icon,
  serviceName,
  cloudflareLink,
  tailscaleLink,
  localhostLink
) {
  fetch("/services", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      icon,
      serviceName,
      cloudflareLink,
      tailscaleLink,
      localhostLink,
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

      services.forEach((service) => {
        const row = `
                <tr>
                    <td><img src="${service.icon}" alt="Icon" width="30" height="30"></td>
                    <td>${service.serviceName}</td>
                    <td><a href="${service.cloudflareLink}" class="serviceUrl" target="_blank">${service.cloudflareLink}</a></td>
                    <td><a href="${service.tailscaleLink}" class="serviceUrl" target="_blank">${service.tailscaleLink}</a></td>
                    <td><a href="${service.localhostLink}" class="serviceUrl" target="_blank">${service.localhostLink}</a></td>
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
      document.getElementById("cloudflareLinkInput").value =
        service.cloudflareLink;
      document.getElementById("tailscaleLinkInput").value =
        service.tailscaleLink;
      document.getElementById("localhostLinkInput").value =
        service.localhostLink;

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
    const cloudflareLink = document.getElementById("cloudflareLinkInput").value;
    const tailscaleLink = document.getElementById("tailscaleLinkInput").value;
    const localhostLink = document.getElementById("localhostLinkInput").value;

    fetch(`/services/${selectedId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        icon,
        serviceName,
        cloudflareLink,
        tailscaleLink,
        localhostLink,
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
  document.getElementById("cloudflareLinkInput").value = "";
  document.getElementById("tailscaleLinkInput").value = "";
  document.getElementById("localhostLinkInput").value = "";

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
              <td>${ports || "-"}</td>
              <td><button class="button" data-service='${JSON.stringify({
                icon: `https://cdn.jsdelivr.net/gh/selfhst/icons/png/${serviceName}.png`,
                serviceName: serviceName,
                cloudflareLink: "",
                tailscaleLink: "",
                localhostLink: ports ? `http://${ports.split(", ")[0]}` : "",
              })}'>Use this</button></td>
            `;
              dockerTableBody.appendChild(dockerRow);
            });
          }
        );
      });

      // Prefill form on click
      dockerTableBody.addEventListener("click", function (e) {
        if (e.target && e.target.matches("button[data-service]")) {
          const data = JSON.parse(e.target.getAttribute("data-service"));

          document.getElementById("iconInput").value = data.icon;
          document.getElementById("serviceNameInput").value = data.serviceName;
          document.getElementById("cloudflareLinkInput").value =
            data.cloudflareLink;
          document.getElementById("tailscaleLinkInput").value =
            data.tailscaleLink;
          document.getElementById("localhostLinkInput").value =
            data.localhostLink;
        }
      });
    })
    .catch((error) => {
      console.error("Error fetching Docker data:", error);
    });
});
