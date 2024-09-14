let selectedRow = null;
let selectedId = null;

const BACKEND_URL = 'homelab-dashboard-back';

// Retrieve data when the page loads
document.addEventListener('DOMContentLoaded', function() {
    loadTableData();
});

// Add new service to table
document.getElementById('addServiceBtn').addEventListener('click', function() {
    const icon = document.getElementById('iconInput').value;
    const serviceName = document.getElementById('serviceNameInput').value;
    const cloudflareLink = document.getElementById('cloudflareLinkInput').value;
    const tailscaleLink = document.getElementById('tailscaleLinkInput').value;
    const localhostLink = document.getElementById('localhostLinkInput').value;

    insertNewRow(icon, serviceName, cloudflareLink, tailscaleLink, localhostLink);
    clearForm();
});

// Add a new row
function insertNewRow(icon, serviceName, cloudflareLink, tailscaleLink, localhostLink) {
    fetch(`http://${BACKEND_URL}:3000/api/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ icon, serviceName, cloudflareLink, tailscaleLink, localhostLink })
    })
    .then(response => response.json())
    .then(() => loadTableData());
}

// Load table data
function loadTableData() {
    fetch(`http://${BACKEND_URL}:3000/api/services`)
    .then(response => response.json())
    .then(services => {
        const tableBody = document.querySelector('#serviceTable tbody');
        tableBody.innerHTML = '';

        services.forEach(service => {
            const row = `
                <tr>
                    <td><img src="${service.icon}" alt="Icon" width="30" height="30"></td>
                    <td>${service.serviceName}</td>
                    <td><a href="${service.cloudflareLink}" target="_blank">${service.cloudflareLink}</a></td>
                    <td><a href="${service.tailscaleLink}" target="_blank">${service.tailscaleLink}</a></td>
                    <td><a href="${service.localhostLink}" target="_blank">${service.localhostLink}</a></td>
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
    fetch(`http://${BACKEND_URL}:3000/api/services/${id}`)
    .then(response => response.json())
    .then(service => {
        document.getElementById('iconInput').value = service.icon;
        document.getElementById('serviceNameInput').value = service.serviceName;
        document.getElementById('cloudflareLinkInput').value = service.cloudflareLink;
        document.getElementById('tailscaleLinkInput').value = service.tailscaleLink;
        document.getElementById('localhostLinkInput').value = service.localhostLink;

        document.getElementById('addServiceBtn').style.display = 'none';
        document.getElementById('updateServiceBtn').style.display = 'inline';
        document.getElementById('form-title').innerText = 'Edit Service';
    });
}

// Update service
document.getElementById('updateServiceBtn').addEventListener('click', function() {
    const icon = document.getElementById('iconInput').value;
    const serviceName = document.getElementById('serviceNameInput').value;
    const cloudflareLink = document.getElementById('cloudflareLinkInput').value;
    const tailscaleLink = document.getElementById('tailscaleLinkInput').value;
    const localhostLink = document.getElementById('localhostLinkInput').value;

    fetch(`http://${BACKEND_URL}:3000/api/services/${selectedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ icon, serviceName, cloudflareLink, tailscaleLink, localhostLink })
    })
    .then(() => {
        loadTableData();
        clearForm();
    });
});

// Remove Service
function deleteRow(id) {
    fetch(`http://${BACKEND_URL}:3000/api/services/${id}`, {
        method: 'DELETE'
    })
    .then(() => loadTableData());
}

// Clean the form
function clearForm() {
    document.getElementById('iconInput').value = '';
    document.getElementById('serviceNameInput').value = '';
    document.getElementById('cloudflareLinkInput').value = '';
    document.getElementById('tailscaleLinkInput').value = '';
    document.getElementById('localhostLinkInput').value = '';

    selectedRow = null;
    selectedId = null;

    document.getElementById('addServiceBtn').style.display = 'inline';
    document.getElementById('updateServiceBtn').style.display = 'none';
    document.getElementById('form-title').innerText = 'Add New Service';
}