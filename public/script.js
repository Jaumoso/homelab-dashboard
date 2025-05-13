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

// DOCKER CONTAINER SUGGESTIONS
document.addEventListener("DOMContentLoaded", function () {
  const serviceInput = document.getElementById("serviceInput");
  const suggestions = document.getElementById("suggestions");

  // Función para mostrar las sugerencias
  function showSuggestions(services) {
    suggestions.innerHTML = ""; // Limpiar las sugerencias anteriores
    if (services.length === 0) {
      suggestions.style.display = "none";
      return;
    }
    services.forEach((service) => {
      const div = document.createElement("div");
      div.textContent = service;
      suggestions.appendChild(div);
    });
    suggestions.style.display = "block";
  }

  // Cargar contenedores al cargar la página
  fetch("/docker/containers")
    .then((response) => response.json())
    .then((data) => {
      showSuggestions(data); // Mostrar las sugerencias de contenedores automáticamente
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
    });

  // Filtrar sugerencias mientras se escribe
  serviceInput.addEventListener("input", function () {
    const query = serviceInput.value.toLowerCase();

    if (query.length === 0) {
      suggestions.style.display = "none";
      return;
    }

    // Hacer una solicitud al servidor para obtener los contenedores
    fetch("/docker/containers")
      .then((response) => response.json())
      .then((data) => {
        const filteredServices = data.filter((service) =>
          service.toLowerCase().includes(query)
        );
        showSuggestions(filteredServices);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
      });
  });

  // Manejar el clic en una sugerencia
  suggestions.addEventListener("click", function (event) {
    if (event.target && event.target.nodeName === "DIV") {
      serviceInput.value = event.target.textContent;
      suggestions.style.display = "none";
    }
  });

  // Cerrar las sugerencias si se hace clic fuera del input o la lista
  document.addEventListener("click", function (e) {
    if (!e.target.closest("#serviceInput, #suggestions")) {
      suggestions.style.display = "none";
    }
  });
});
