// Base URL for your Flask API
const API_BASE_URL = 'http://127.0.0.1:5000/api';

// Global variables for pagination and cached data
let currentPage = {
    patients: 1,
    doctors: 1,
    appointments: 1,
    bills: 1,
    medicalRecords: 1,
    departments: 1,
    staff: 1,
    insuranceProviders: 1,
    testTypes: 1,
    patientTests: 1,
    inventoryItems: 1
};

const itemsPerPage = 10;

// Cached data from backend (to avoid excessive API calls for dropdowns/charts)
let cachedPatients = [];
let cachedDoctors = [];
let cachedAppointments = [];
let cachedBills = [];
let cachedMedicalRecords = [];
let cachedDepartments = [];
let cachedStaff = [];
let cachedInsuranceProviders = [];
let cachedTestTypes = [];
let cachedPatientTests = [];
let cachedInventoryItems = [];

// Chart instances for destruction and recreation
let currentDashboardCharts = {};
let currentPatientCharts = {};
let currentDoctorCharts = {};
let currentAppointmentCharts = {};
let currentBillingCharts = {};
let currentMedicalRecordCharts = {};
let currentReportCharts = {};

// DOM Elements (for common use)
const darkModeToggle = document.getElementById('darkModeToggle');

// Removed erroneous 'document' assignment here.
// document="C:\\Users\\DELL-IN\\Desktop\\Kanhaiya Bhatt\\KMS\\your_project_folder\\templates\\index.html" // REMOVED THIS LINE

darkModeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  // Re-render charts on dark mode change to update colors
  updateChartsOnThemeChange();
});

const hideMenuBtn = document.getElementById('hideMenuBtn');
const sidebar = document.getElementById('sidebar');
const mainContent = document.getElementById('mainContent');
const hospitalNameModal = document.getElementById('hospitalNameModal');
const allSections = document.querySelectorAll('.management-section');
const dashboardSection = document.getElementById('dashboard-section');

// --- Utility Functions ---

/**
 * Fetches data from the API.
 * @param {string} endpoint - The API endpoint.
 * @returns {Promise<Array|Object>} - The JSON response data.
 */
async function fetchData(endpoint) {
    try {
        const response = await fetch(`${API_BASE_URL}/${endpoint}`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Fetch error:', error);
        alert(`Error fetching data: ${error.message}`);
        return null;
    }
}

/**
 * Sends data to the API (POST, PUT, DELETE).
 * @param {string} endpoint - The API endpoint.
 * @param {string} method - HTTP method (POST, PUT, DELETE).
 * @param {Object} data - The data to send (for POST/PUT).
 * @returns {Promise<Object>} - The JSON response data.
 */
async function sendData(endpoint, method, data = null) {
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: data ? JSON.stringify(data) : null,
        };
        const response = await fetch(`${API_BASE_URL}/${endpoint}`, options);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Send data error:', error);
        alert(`Error: ${error.message}`);
        return null;
    }
}

/**
 * Paginates an array of data.
 * @param {Array} data - The array to paginate.
 * @param {number} page - The current page number.
 * @param {number} perPage - Items per page.
 * @returns {Array} - The paginated subset of data.
 */
function paginate(data, page, perPage) {
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return data.slice(start, end);
}

/**
 * Renders pagination controls for a given table.
 * @param {string} elementId - The ID of the pagination container.
 * @param {number} totalItems - Total number of items.
 * @param {string} type - The type of data (e.g., 'patients', 'doctors').
 */
function renderPagination(elementId, totalItems, type) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const pagination = document.getElementById(elementId);
    pagination.innerHTML = '';

    if (totalPages <= 1) return;

    const prevLi = document.createElement('li');
    prevLi.className = 'page-item';
    prevLi.innerHTML = `<a class="page-link" href="#" onclick="changePage('${type}', ${currentPage[type] - 1})">&laquo;</a>`;
    prevLi.classList.toggle('disabled', currentPage[type] === 1);
    pagination.appendChild(prevLi);

    let startPage = Math.max(1, currentPage[type] - 2);
    let endPage = Math.min(totalPages, currentPage[type] + 2);

    if (endPage - startPage < 4) {
        if (startPage === 1) {
            endPage = Math.min(totalPages, startPage + 4);
        } else if (endPage === totalPages) {
            startPage = Math.max(1, totalPages - 4);
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const li = document.createElement('li');
        li.className = 'page-item';
        li.innerHTML = `<a class="page-link ${currentPage[type] === i ? 'active' : ''}" href="#" onclick="changePage('${type}', ${i})">${i}</a>`;
        pagination.appendChild(li);
    }

    const nextLi = document.createElement('li');
    nextLi.className = 'page-item';
    nextLi.innerHTML = `<a class="page-link" href="#" onclick="changePage('${type}', ${currentPage[type] + 1})">&raquo;</a>`;
    nextLi.classList.toggle('disabled', currentPage[type] === totalPages);
    pagination.appendChild(nextLi);
}

/**
 * Changes the current page for a specific data type and re-renders the table.
 * @param {string} type - The type of data.
 * @param {number} page - The page number to change to.
 */
async function changePage(type, page) {
    let data;
    switch (type) {
        case 'patients': data = cachedPatients; break;
        case 'doctors': data = cachedDoctors; break;
        case 'appointments': data = cachedAppointments; break;
        case 'bills': data = cachedBills; break;
        case 'medicalRecords': data = cachedMedicalRecords; break;
        case 'departments': data = cachedDepartments; break;
        case 'staff': data = cachedStaff; break;
        case 'insuranceProviders': data = cachedInsuranceProviders; break;
        case 'testTypes': data = cachedTestTypes; break;
        case 'patientTests': data = cachedPatientTests; break;
        case 'inventoryItems': data = cachedInventoryItems; break;
        default: return;
    }

    const totalPages = Math.ceil(data.length / itemsPerPage);

    if (page < 1 || page > totalPages) return;

    currentPage[type] = page;

    switch (type) {
        case 'patients': renderPatientsTable(data); break;
        case 'doctors': renderDoctorsTable(data); break;
        case 'appointments': renderAppointmentsTable(data); break;
        case 'bills': renderBillsTable(data); break;
        case 'medicalRecords': renderMedicalRecordsTable(data); break;
        case 'departments': renderDepartmentsTable(data); break;
        case 'staff': renderStaffTable(data); break;
        case 'insuranceProviders': renderInsuranceProvidersTable(data); break;
        case 'testTypes': renderTestTypesTable(data); break;
        case 'patientTests': renderPatientTestsTable(data); break;
        case 'inventoryItems': renderInventoryTable(data); break;
    }
}

/**
 * Creates or updates a Chart.js chart.
 * @param {string} canvasId - The ID of the canvas element.
 * @param {string} type - The chart type (e.g., 'bar', 'pie', 'line').
 * @param {string} label - The label for the dataset.
 * @param {Array<string>} labels - Array of labels for the x-axis or segments.
 * @param {Array<number>} data - Array of data values.
 * @param {Object} chartCache - The global object to store chart instances (e.g., currentPatientCharts).
 */
function createChart(canvasId, type, label, labels, data, chartCache) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) {
        console.warn(`Canvas element with ID '${canvasId}' not found.`);
        return;
    }
    const chartContext = ctx.getContext('2d');

    if (chartCache[canvasId]) {
        chartCache[canvasId].destroy();
    }

    const backgroundColors = [
        'rgba(54, 162, 235, 0.7)', 'rgba(255, 99, 132, 0.7)', 'rgba(75, 192, 192, 0.7)',
        'rgba(255, 159, 64, 0.7)', 'rgba(153, 102, 255, 0.7)', 'rgba(255, 206, 86, 0.7)',
        'rgba(201, 203, 207, 0.7)', 'rgba(231, 76, 60, 0.7)', 'rgba(46, 204, 113, 0.7)',
        'rgba(147, 112, 219, 0.7)', 'rgba(255, 192, 203, 0.7)', 'rgba(0, 128, 128, 0.7)'
    ];
    const borderColors = backgroundColors.map(color => color.replace('0.7', '1'));

    const isDarkMode = document.body.classList.contains('dark-mode');
    const textColor = isDarkMode ? '#f5f5f5' : '#333';
    const gridColor = isDarkMode ? 'rgba(200, 200, 200, 0.1)' : 'rgba(0, 0, 0, 0.1)';

    const chartData = {
        labels: labels,
        datasets: [{
            label: label,
            data: data,
            backgroundColor: (type === 'pie' || type === 'doughnut') ?
                backgroundColors.slice(0, labels.length) :
                'rgba(54, 162, 235, 0.7)',
            borderColor: (type === 'pie' || type === 'doughnut') ?
                borderColors.slice(0, labels.length) :
                'rgba(54, 162, 235, 1)',
            borderWidth: 1,
            fill: false,
            tension: 0.4
        }]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: (type === 'pie' || type === 'doughnut') ? 'bottom' : 'top',
                labels: {
                    color: textColor
                }
            },
            title: {
                display: true,
                text: label,
                color: textColor
            }
        },
        scales: {
            x: {
                ticks: { color: textColor },
                grid: { color: gridColor }
            },
            y: {
                ticks: { color: textColor },
                grid: { color: gridColor }
            }
        }
    };

    const newChart = new Chart(chartContext, {
        type: type,
        data: chartData,
        options: chartOptions
    });
    chartCache[canvasId] = newChart;
}

/**
 * Formats a date string to a more readable format.
 * @param {string} dateStr - The date string (e.g., 'YYYY-MM-DD').
 * @returns {string} - Formatted date.
 */
function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Formats a time string to a more readable format.
 * @param {string} timeStr - The time string (e.g., 'HH:MM:SS').
 * @returns {string} - Formatted time.
 */
function formatTime(timeStr) {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
}

/**
 * Truncates text to a specified maximum length and adds '...' if longer.
 * @param {string} text - The text to truncate.
 * @param {number} maxLength - The maximum length.
 * @returns {string} - Truncated text.
 */
function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

/**
 * Returns a CSS class based on the status for styling badges.
 * @param {string} status - The status string.
 * @returns {string} - The corresponding CSS class name.
 */
function getStatusClass(status) {
    if (!status) return '';
    return status.toLowerCase().replace(/ /g, '-');
}

/**
 * Renders search results in a table.
 * @param {string} tableBodyId - ID of the table body element.
 * @param {Array<Object>} results - Array of search results.
 * @param {string} type - Type of data (e.g., 'patient', 'doctor').
 */
function renderSearchResults(tableBodyId, results, type) {
    const tableBody = document.getElementById(tableBodyId);
    tableBody.innerHTML = '';
    const noResultsMessage = document.getElementById(`no${type.charAt(0).toUpperCase() + type.slice(1)}SearchResults`);
    const resultsContainer = document.getElementById(`search${type.charAt(0).toUpperCase() + type.slice(1)}Results`);

    if (results.length === 0) {
        noResultsMessage.style.display = 'block';
        resultsContainer.style.display = 'block';
    } else {
        noResultsMessage.style.display = 'none';
        results.forEach(item => {
            const row = document.createElement('tr');
            let innerHTML = ''; // Initialize as empty string
            if (type === 'patient') {
                innerHTML = `
                    <td>${item.patient_id}</td>
                    <td>${item.name}</td>
                    <td>${item.age}</td>
                    <td>${item.gender}</td>
                    <td>${item.phone || ''}</td>
                    <td>${item.blood_type || ''}</td>
                    <td>
                        <button class="btn btn-primary" onclick="viewPatientDetails(${item.patient_id})"><i class="fas fa-eye"></i> View</button>
                    </td>
                `;
            } else if (type === 'doctor') {
                innerHTML = `
                    <td>${item.doctor_id}</td>
                    <td>${item.name}</td>
                    <td>${item.specialization}</td>
                    <td>${item.department_name || ''}</td>
                    <td>$${item.consultation_fee.toFixed(2)}</td>
                    <td>
                        <button class="btn btn-primary" onclick="viewDoctorDetails(${item.doctor_id})"><i class="fas fa-eye"></i> View</button>
                    </td>
                `;
            } else if (type === 'appointment') {
                innerHTML = `
                    <td>${item.appointment_id}</td>
                    <td>${item.patient_name}</td>
                    <td>${item.doctor_name}</td>
                    <td>${formatDate(item.date)}</td>
                    <td>${formatTime(item.time)}</td>
                    <td><span class="status-badge status-${getStatusClass(item.status)}">${item.status}</span></td>
                    <td>
                        <button class="btn btn-primary" onclick="viewAppointmentDetails(${item.appointment_id})"><i class="fas fa-eye"></i> View</button>
                    </td>
                `;
            } else if (type === 'bill') {
                innerHTML = `
                    <td>${item.invoice_number}</td>
                    <td>${item.patient_name}</td>
                    <td>${formatDate(item.date)}</td>
                    <td>$${item.amount.toFixed(2)}</td>
                    <td><span class="status-badge status-${getStatusClass(item.status)}">${item.status}</span></td>
                    <td>
                        <button class="btn btn-primary" onclick="viewBillDetails(${item.bill_id})"><i class="fas fa-eye"></i> View</button>
                    </td>
                `;
            } else if (type === 'medicalRecord') {
                innerHTML = `
                    <td>${item.record_id}</td>
                    <td>${item.patient_name}</td>
                    <td>${item.doctor_name || 'N/A'}</td>
                    <td>${truncateText(item.diagnosis, 30)}</td>
                    <td>${formatDate(item.date)}</td>
                    <td>
                        <button class="btn btn-primary" onclick="viewMedicalRecordDetails(${item.record_id})"><i class="fas fa-eye"></i> View</button>
                    </td>
                `;
            }
            row.innerHTML = innerHTML;
            tableBody.appendChild(row);
        });
        resultsContainer.style.display = 'block';
    }
}

// --- Common UI/Navigation Logic ---

document.addEventListener('DOMContentLoaded', async function () {
    // Initial data load for dropdowns etc.
    await preloadAllData();

    // Set hospital name
    if (!localStorage.getItem('hospitalName')) {
        hospitalNameModal.style.display = 'block';
    } else {
        document.getElementById('hospitalName').textContent = localStorage.getItem('hospitalName');
    }

    // Dark mode toggle
    if (localStorage.getItem('darkMode') === 'enabled') {
        document.body.classList.add('dark-mode');
        darkModeToggle.checked = true;
    }

    // Show dashboard by default
    showDashboard();

    // Event listener for medical record follow-up checkbox
    const medicalRecordFollowUpRequired = document.getElementById('medicalRecordFollowUpRequired');
    const medicalRecordFollowUpDateGroup = document.getElementById('medicalRecordFollowUpDateGroup');
    if (medicalRecordFollowUpRequired) {
        medicalRecordFollowUpRequired.addEventListener('change', function() {
            if (this.checked) {
                medicalRecordFollowUpDateGroup.style.display = 'block';
            } else {
                medicalRecordFollowUpDateGroup.style.display = 'none';
                document.getElementById('medicalRecordFollowUpDate').value = '';
            }
        });
    }

    const updateMedicalRecordFollowUpRequired = document.getElementById('updateMedicalRecordFollowUpRequired');
    const updateMedicalRecordFollowUpDateGroup = document.getElementById('updateMedicalRecordFollowUpDateGroup');
    if (updateMedicalRecordFollowUpRequired) {
        updateMedicalRecordFollowUpRequired.addEventListener('change', function() {
            if (this.checked) {
                updateMedicalRecordFollowUpDateGroup.style.display = 'block';
            } else {
                updateMedicalRecordFollowUpDateGroup.style.display = 'none';
                document.getElementById('updateMedicalRecordFollowUpDate').value = '';
            }
        });
    }
});

hideMenuBtn.addEventListener('click', function () {
    sidebar.classList.toggle('collapsed');
    mainContent.classList.toggle('expanded');
});

darkModeToggle.addEventListener('change', function () {
    if (this.checked) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('darkMode', 'enabled');
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('darkMode', 'disabled');
    }
    // Update all charts colors on mode change
    updateChartsOnThemeChange();
});

function updateChartsOnThemeChange() {
    // Destroy all existing charts
    Object.values(currentDashboardCharts).forEach(chart => chart.destroy());
    Object.values(currentPatientCharts).forEach(chart => chart.destroy());
    Object.values(currentDoctorCharts).forEach(chart => chart.destroy());
    Object.values(currentAppointmentCharts).forEach(chart => chart.destroy());
    Object.values(currentBillingCharts).forEach(chart => chart.destroy());
    Object.values(currentMedicalRecordCharts).forEach(chart => chart.destroy());
    Object.values(currentReportCharts).forEach(chart => chart.destroy());

    // Re-render current active charts
    const activeSection = document.querySelector('.management-section.active');
    if (activeSection) {
        const sectionId = activeSection.id;
        if (sectionId === 'dashboard-section') {
            updateDashboardCharts();
        } else if (sectionId === 'patient-management') {
            renderPatientCharts(cachedPatients);
        } else if (sectionId === 'doctor-management') {
            renderDoctorCharts(cachedDoctors);
        } else if (sectionId === 'appointment-management') {
            renderAppointmentCharts(cachedAppointments);
        } else if (sectionId === 'billing-management') {
            renderBillingCharts(cachedBills);
        } else if (sectionId === 'medical-records') {
            renderMedicalRecordCharts(cachedMedicalRecords);
        } else if (sectionId === 'reports-analytics') {
            // Re-render specific report if active
            const activeReport = document.querySelector('#reports-analytics .card:not(.hidden-section)');
            if (activeReport) {
                const reportId = activeReport.id;
                if (reportId === 'financial-reports') renderFinancialReports();
                if (reportId === 'operational-reports') renderOperationalReports();
                if (reportId === 'doctor-performance-reports') renderDoctorPerformanceReports();
                if (reportId === 'patient-statistics-reports') renderPatientStatisticsReports();
            }
        }
    }
}


function saveHospitalName() {
    const name = document.getElementById('hospitalNameInput').value;
    if (name) {
        localStorage.setItem('hospitalName', name);
        document.getElementById('hospitalName').textContent = name;
        closeHospitalNameModal();
    }
}

function closeHospitalNameModal() {
    hospitalNameModal.style.display = 'none';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function hideAllSections() {
    allSections.forEach(section => {
        section.classList.remove('active');
    });
}

function updateNavActive(activeId) {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('onclick')?.includes(activeId)) {
            link.classList.add('active');
        }
    });
}

function logout() {
    if (confirm('Are you sure you want to exit?')) {
        alert('Exiting Hospital Management System. Goodbye!');
        // In a real web app, you might clear session data or redirect to a login page.
        // window.close() might not work in all modern browsers due to security policies.
    }
}

/**
 * Hides all forms/lists within a specific management section.
 * @param {string} sectionId - The ID of the management section (e.g., 'patient-management').
 */
function hideAllSubSections(sectionId) {
    document.querySelectorAll(`#${sectionId} .card.hidden-section`).forEach(el => el.style.display = 'none');
    document.querySelector(`#${sectionId} .visualization-container`)?.classList.add('hidden-section');
    document.querySelector(`#${sectionId} .table-responsive`)?.parentElement?.classList.add('hidden-section'); // Hides lists
}

// --- Preload Data Function ---
async function preloadAllData() {
    cachedPatients = await fetchData('patients') || [];
    cachedDoctors = await fetchData('doctors') || [];
    cachedAppointments = await fetchData('appointments') || [];
    cachedDepartments = await fetchData('departments') || [];
    cachedBills = await fetchData('bills') || [];
    cachedMedicalRecords = await fetchData('records') || [];
    cachedStaff = await fetchData('staff') || [];
    cachedInsuranceProviders = await fetchData('insurance') || [];
    cachedTestTypes = await fetchData('tests/types') || [];
    cachedPatientTests = await fetchData('tests/patients') || [];
    cachedInventoryItems = await fetchData('inventory') || [];

    // Populate dropdowns once data is loaded
    populatePatientDropdown('appointmentPatient');
    populatePatientDropdown('updateAppointmentPatient');
    populatePatientDropdown('billPatient');
    populatePatientDropdown('medicalRecordPatient');
    populatePatientDropdown('patientTestPatient');

    populateDoctorDropdown('appointmentDoctor');
    populateDoctorDropdown('updateAppointmentDoctor');
    populateDoctorDropdown('medicalRecordDoctor');
    populateDoctorDropdown('patientTestDoctor');

    populateDepartmentDropdown('doctorDepartment');
    populateDepartmentDropdown('updateDoctorDepartment');
    populateDepartmentDropdown('staffDepartment');
    populateDepartmentDropdown('updateStaffDepartment');

    populateAppointmentDropdown('billAppointment');

    populateTestTypeDropdown('patientTestType');
}

// --- DASHBOARD FUNCTIONS ---

async function showDashboard() {
    hideAllSections();
    dashboardSection.classList.add('active');
    updateNavActive('dashboard');
    await updateDashboardMetrics();
    updateDashboardCharts();
}

async function updateDashboardMetrics() {
    const patients = await fetchData('patients');
    const doctors = await fetchData('doctors');
    const todayAppointments = await fetchData('reports/today-appointments');
    const pendingBills = await fetchData('bills'); // Fetch all to filter client-side

    document.getElementById('totalPatients').textContent = patients ? patients.length : 0;
    document.getElementById('totalDoctors').textContent = doctors ? doctors.length : 0;
    document.getElementById('todaysAppointments').textContent = todayAppointments ? todayAppointments.length : 0;
    document.getElementById('pendingBills').textContent = pendingBills ? pendingBills.filter(bill => bill.status === 'Unpaid' || bill.status === 'Overdue').length : 0;
}

async function updateDashboardCharts() {
    // Clear existing dashboard charts
    Object.values(currentDashboardCharts).forEach(chart => chart.destroy());
    currentDashboardCharts = {};

    // Appointments Trend (Daily)
    const appointmentsData = await fetchData('appointments');
    if (appointmentsData) {
        const dailyAppointments = {};
        const today = new Date();
        for (let i = 6; i >= 0; i--) { // Last 7 days
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            dailyAppointments[dateStr] = 0;
        }

        appointmentsData.forEach(app => {
            const appDate = app.date.split('T')[0]; // Ensure date format matches
            if (dailyAppointments.hasOwnProperty(appDate)) {
                dailyAppointments[appDate]++;
            }
        });

        const labels = Object.keys(dailyAppointments).map(d => new Date(d).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }));
        const data = Object.values(dailyAppointments);
        createChart('appointmentsChart', 'line', 'Appointments Trend (Last 7 Days)', labels, data, currentDashboardCharts);
    }

    // Revenue Trend (Daily)
    const billsData = await fetchData('bills');
    if (billsData) {
        const dailyRevenue = {};
        const today = new Date();
        for (let i = 6; i >= 0; i--) { // Last 7 days
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            dailyRevenue[dateStr] = 0;
        }

        billsData.filter(bill => bill.status === 'Paid').forEach(bill => {
            const billDate = bill.date.split('T')[0];
            if (dailyRevenue.hasOwnProperty(billDate)) {
                dailyRevenue[billDate] += parseFloat(bill.amount);
            }
        });

        const labels = Object.keys(dailyRevenue).map(d => new Date(d).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }));
        const data = Object.values(dailyRevenue);
        createChart('revenueChart', 'line', 'Revenue Trend (Last 7 Days)', labels, data, currentDashboardCharts);
    }
}

async function changeDashboardTimePeriod(type, period) {
    const selectorId = type === 'appointments' ? 'appointmentsTimeSelector' : 'revenueTimeSelector';
    document.getElementById(selectorId).querySelectorAll('button').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase().includes(period)) {
            btn.classList.add('active');
        }
    });

    if (type === 'appointments') {
        const appointmentsData = await fetchData('appointments');
        if (appointmentsData) {
            let aggregatedData = {};
            const now = new Date();

            if (period === 'daily') {
                for (let i = 6; i >= 0; i--) { // Last 7 days
                    const date = new Date(now);
                    date.setDate(now.getDate() - i);
                    aggregatedData[date.toISOString().split('T')[0]] = 0;
                }
                appointmentsData.forEach(app => {
                    const appDate = app.date.split('T')[0];
                    if (aggregatedData.hasOwnProperty(appDate)) {
                        aggregatedData[appDate]++;
                    }
                });
                const labels = Object.keys(aggregatedData).map(d => new Date(d).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }));
                const data = Object.values(aggregatedData);
                createChart('appointmentsChart', 'line', 'Appointments Trend (Daily)', labels, data, currentDashboardCharts);
            } else if (period === 'weekly') {
                // For simplicity, generate random data for weekly/monthly for now
                // In a real app, you'd aggregate database data by week/month
                const labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
                const data = labels.map(() => Math.floor(Math.random() * 100) + 50);
                createChart('appointmentsChart', 'bar', 'Appointments Trend (Weekly)', labels, data, currentDashboardCharts);
            } else if (period === 'monthly') {
                const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']; // Example months
                const data = labels.map(() => Math.floor(Math.random() * 300) + 100);
                createChart('appointmentsChart', 'bar', 'Appointments Trend (Monthly)', labels, data, currentDashboardCharts);
            }
        }
    } else { // Revenue
        const billsData = await fetchData('bills');
        if (billsData) {
            let aggregatedData = {};
            const now = new Date();

            if (period === 'daily') {
                for (let i = 6; i >= 0; i--) { // Last 7 days
                    const date = new Date(now);
                    date.setDate(now.getDate() - i);
                    aggregatedData[date.toISOString().split('T')[0]] = 0;
                }
                billsData.filter(bill => bill.status === 'Paid').forEach(bill => {
                    const billDate = bill.date.split('T')[0];
                    if (aggregatedData.hasOwnProperty(billDate)) {
                        aggregatedData[billDate] += parseFloat(bill.amount);
                    }
                });
                const labels = Object.keys(aggregatedData).map(d => new Date(d).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }));
                const data = Object.values(aggregatedData);
                createChart('revenueChart', 'line', 'Revenue Trend (Daily)', labels, data, currentDashboardCharts);
            } else if (period === 'weekly') {
                const labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
                const data = labels.map(() => Math.floor(Math.random() * 5000) + 2000);
                createChart('revenueChart', 'bar', 'Revenue Trend (Weekly)', labels, data, currentDashboardCharts);
            } else if (period === 'monthly') {
                const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
                const data = labels.map(() => Math.floor(Math.random() * 10000) + 5000);
                createChart('revenueChart', 'bar', 'Revenue Trend (Monthly)', labels, data, currentDashboardCharts);
            }
        }
    }
}

// Function to handle showing management sections and updating nav links
function showSection(sectionId) {
    hideAllSections(); // Hide all management sections first
    hideAllSubSections(sectionId); // Hide all sub-sections within the target management section
    document.getElementById(sectionId).classList.add('active'); // Show the target management section

    // Update active state of navigation links
    updateNavActive(sectionId);

    // Specific actions for each section when shown
    if (sectionId === 'patient-management') {
        showAllPatients(); // Default to showing all patients when entering patient management
    } else if (sectionId === 'doctor-management') {
        showAllDoctors(); // Default to showing all doctors
    } else if (sectionId === 'appointment-management') {
        showAllAppointments(); // Default to showing all appointments
    } else if (sectionId === 'billing-management') {
        showAllBills(); // Default to showing all bills
    } else if (sectionId === 'medical-records') {
        showAllMedicalRecords(); // Default to showing all medical records
    } else if (sectionId === 'department-management') {
        showAllDepartments();
    } else if (sectionId === 'staff-management') {
        showAllStaff();
    } else if (sectionId === 'insurance-management') {
        showAllInsuranceProviders();
    } else if (sectionId === 'test-management') {
        showAllPatientTests(); // Default to patient tests
    } else if (sectionId === 'inventory-management') {
        showAllInventory();
    } else if (sectionId === 'reports-analytics') {
        showFinancialReports(); // Default to showing financial reports
    }
}


// --- PATIENT MANAGEMENT ---

function showPatientForm(type) {
    hideAllSubSections('patient-management');
    document.getElementById(`${type}-patient-form`).style.display = 'block';
    if (type === 'add') {
        document.getElementById('patientForm').reset();
    } else {
        document.getElementById('updatePatientForm').classList.add('hidden-section'); // Hide form until patient loaded
        document.getElementById('updatePatientId').value = ''; // Clear previous ID
    }
}
function hidePatientForm(type) {
    document.getElementById(`${type}-patient-form`).style.display = 'none';
}


function showAllPatients() {
    hideAllSubSections('patient-management');
    renderPatientsTable(cachedPatients);
    renderPatientCharts(cachedPatients);
    document.getElementById('patient-list').style.display = 'block';
    document.getElementById('patient-visualizations').classList.remove('hidden-section');
}

function showPatientSearch() {
    hideAllSubSections('patient-management');
    document.getElementById('search-patient-form').style.display = 'block';
    document.getElementById('searchPatientQuery').value = ''; // Clear previous query
    document.getElementById('searchPatientResults').classList.add('hidden-section'); // Hide results until search
}

function showPatientDelete() {
    hideAllSubSections('patient-management');
    document.getElementById('delete-patient-form').style.display = 'block';
    document.getElementById('deletePatientId').value = ''; // Clear previous ID
}

async function addPatient() {
    const patientData = {
        name: document.getElementById('patientName').value,
        age: parseInt(document.getElementById('patientAge').value),
        gender: document.getElementById('patientGender').value,
        phone: document.getElementById('patientPhone').value || null,
        email: document.getElementById('patientEmail').value || null,
        address: document.getElementById('patientAddress').value || null,
        blood_type: document.getElementById('patientBloodType').value || null,
        medical_history: document.getElementById('patientMedicalHistory').value || null,
        allergies: document.getElementById('patientAllergies').value || null,
        disease: null // Not collected in this form
    };

    const result = await sendData('patients', 'POST', patientData);
    if (result) {
        alert(result.message);
        document.getElementById('patientForm').reset();
        cachedPatients = await fetchData('patients') || []; // Refresh cache
        showAllPatients();
        await updateDashboardMetrics();
    }
}

async function loadPatientForUpdate() {
    const patientId = document.getElementById('updatePatientId').value;
    if (!patientId) {
        alert('Please enter a Patient ID.');
        return;
    }
    const patient = await fetchData(`patients/${patientId}`);
    if (patient) {
        document.getElementById('updatePatientName').value = patient.name;
        document.getElementById('updatePatientAge').value = patient.age;
        document.getElementById('updatePatientGender').value = patient.gender;
        document.getElementById('updatePatientPhone').value = patient.phone || '';
        document.getElementById('updatePatientEmail').value = patient.email || '';
        document.getElementById('updatePatientAddress').value = patient.address || '';
        document.getElementById('updatePatientBloodType').value = patient.blood_type || '';
        document.getElementById('updatePatientMedicalHistory').value = patient.medical_history || '';
        document.getElementById('updatePatientAllergies').value = patient.allergies || '';
        document.getElementById('updatePatientForm').classList.remove('hidden-section');
    } else {
        document.getElementById('updatePatientForm').classList.add('hidden-section');
        alert('Patient not found!');
    }
}

async function updatePatient() {
    const patientId = document.getElementById('updatePatientId').value;
    const patientData = {
        name: document.getElementById('updatePatientName').value,
        age: parseInt(document.getElementById('updatePatientAge').value),
        gender: document.getElementById('updatePatientGender').value,
        phone: document.getElementById('updatePatientPhone').value || null,
        email: document.getElementById('updatePatientEmail').value || null,
        address: document.getElementById('updatePatientAddress').value || null,
        blood_type: document.getElementById('updatePatientBloodType').value || null,
        medical_history: document.getElementById('updatePatientMedicalHistory').value || null,
        allergies: document.getElementById('updatePatientAllergies').value || null
    };

    const result = await sendData(`patients/${patientId}`, 'PUT', patientData);
    if (result) {
        alert(result.message);
        document.getElementById('updatePatientForm').reset();
        document.getElementById('updatePatientForm').classList.add('hidden-section');
        document.getElementById('updatePatientId').value = '';
        cachedPatients = await fetchData('patients') || []; // Refresh cache
        showAllPatients();
    }
}

async function confirmDeletePatient() {
    const patientId = document.getElementById('deletePatientId').value;
    if (!patientId) {
        alert('Please enter a Patient ID to delete.');
        return;
    }
    if (confirm(`Are you sure you want to delete patient with ID ${patientId}? This action cannot be undone.`)) {
        const result = await sendData(`patients/${patientId}`, 'DELETE');
        if (result) {
            alert(result.message);
            document.getElementById('deletePatientId').value = '';
            cachedPatients = await fetchData('patients') || []; // Refresh cache
            showAllPatients();
            await updateDashboardMetrics();
        }
    }
}

function renderPatientsTable(patients) {
    const tableBody = document.getElementById('patientsTableBody');
    tableBody.innerHTML = '';
    const paginatedPatients = paginate(patients, currentPage.patients, itemsPerPage);
    if (paginatedPatients.length === 0) {
        document.getElementById('noPatientsMessage').style.display = 'block';
    } else {
        document.getElementById('noPatientsMessage').style.display = 'none';
        paginatedPatients.forEach(patient => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${patient.patient_id}</td>
                <td>${patient.name}</td>
                <td>${patient.age}</td>
                <td>${patient.gender}</td>
                <td>${patient.phone || ''}</td>
                <td>${patient.blood_type || ''}</td>
                <td>
                    <button class="btn btn-primary" onclick="viewPatientDetails(${patient.patient_id})"><i class="fas fa-eye"></i> View</button>
                    <button class="btn btn-success" onclick="editPatient(${patient.patient_id})"><i class="fas fa-edit"></i> Edit</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }
    renderPagination('patientPagination', patients.length, 'patients');
}

function renderPatientCharts(patients) {
    // Destroy existing charts if any
    Object.values(currentPatientCharts).forEach(chart => chart.destroy());
    currentPatientCharts = {};

    if (patients.length === 0) {
        document.getElementById('patient-visualizations').classList.add('hidden-section');
        return;
    }

    document.getElementById('patient-visualizations').classList.remove('hidden-section'); // Ensure charts container is visible

    const genderCounts = patients.reduce((acc, p) => {
        acc[p.gender] = (acc[p.gender] || 0) + 1;
        return acc;
    }, {});
    createChart('patientGenderChart', 'pie', 'Patient Gender Distribution', Object.keys(genderCounts), Object.values(genderCounts), currentPatientCharts);

    const ageGroups = { '0-18': 0, '19-35': 0, '36-50': 0, '51+': 0 };
    patients.forEach(p => {
        if (p.age <= 18) ageGroups['0-18']++; else if (p.age <= 35) ageGroups['19-35']++; else if (p.age <= 50) ageGroups['36-50']++; else ageGroups['51+']++;
    });
    createChart('patientAgeDistributionChart', 'bar', 'Patient Age Distribution', Object.keys(ageGroups), Object.values(ageGroups), currentPatientCharts);

    const bloodTypeCounts = patients.reduce((acc, p) => {
        if (p.blood_type) {
            acc[p.blood_type] = (acc[p.blood_type] || 0) + 1;
        }
        return acc;
    }, {});
    createChart('patientBloodTypeChart', 'doughnut', 'Patient Blood Type', Object.keys(bloodTypeCounts), Object.values(bloodTypeCounts), currentPatientCharts);

    // Assuming 'created_at' for registration date, adjust if your schema uses a different column
    const registrationTrend = patients.reduce((acc, p) => {
        const date = p.registrationDate ? p.registrationDate.split(' ')[0] : 'Unknown'; // Extract date part from 'YYYY-MM-DD HH:MM:SS'
        if (date !== 'Unknown') {
            acc[date] = (acc[date] || 0) + 1;
        }
        return acc;
    }, {});
    const sortedDates = Object.keys(registrationTrend).sort();
    createChart('patientRegistrationTrendChart', 'line', 'Patient Registrations Over Time', sortedDates, sortedDates.map(d => registrationTrend[d]), currentPatientCharts);
}

async function viewPatientDetails(id) {
    const patient = await fetchData(`patients/${id}`);
    if (patient) {
        const content = `
            <p><strong>Name:</strong> ${patient.name}</p>
            <p><strong>Age:</strong> ${patient.age}</p>
            <p><strong>Gender:</strong> ${patient.gender}</p>
            <p><strong>Phone:</strong> ${patient.phone || 'N/A'}</p>
            <p><strong>Email:</strong> ${patient.email || 'N/A'}</p>
            <p><strong>Address:</strong> ${patient.address || 'N/A'}</p>
            <p><strong>Blood Type:</strong> ${patient.blood_type || 'N/A'}</p>
            <p><strong>Medical History:</strong> ${patient.medical_history || 'N/A'}</p>
            <p><strong>Allergies:</strong> ${patient.allergies || 'N/A'}</p>
            <p><strong>Disease:</strong> ${patient.disease || 'N/A'}</p>
            <p><strong>Insurance Provider ID:</strong> ${patient.insurance_provider_id || 'N/A'}</p>
            <p><strong>Policy Number:</strong> ${patient.insurance_policy_number || 'N/A'}</p>
            <p><strong>Primary Physician:</strong> ${patient.primary_physician || 'N/A'}</p>
            <p><strong>Emergency Contact:</strong> ${patient.emergency_contact || 'N/A'}</p>
            <p><strong>Emergency Phone:</strong> ${patient.emergency_phone || 'N/A'}</p>
        `;
        document.getElementById('patientDetailsContent').innerHTML = content;
        document.getElementById('patientDetailsModal').style.display = 'block';
    }
}

function editPatient(id) {
    closeModal('patientDetailsModal');
    showPatientForm('update');
    document.getElementById('updatePatientId').value = id;
    loadPatientForUpdate();
}

async function searchPatient() {
    const query = document.getElementById('searchPatientQuery').value.toLowerCase();
    const results = cachedPatients.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.patient_id.toString().includes(query) ||
        (p.phone && p.phone.includes(query)) ||
        (p.disease && p.disease.toLowerCase().includes(query))
    );
    renderSearchResults('searchPatientResultsBody', results, 'patient');
}

async function exportPatients() {
    // Direct link to the Flask API endpoint for CSV export
    window.open(`${API_BASE_URL}/patients/export/csv`, '_blank');
    alert('Exporting patient data as CSV. Please check your downloads.');
}


// --- DOCTOR MANAGEMENT ---

function showDoctorForm(type) {
    hideAllSubSections('doctor-management');
    document.getElementById(`${type}-doctor-form`).style.display = 'block';
    populateDepartmentDropdown(`${type === 'add' ? 'doctor' : 'updateDoctor'}Department`);
    if (type === 'add') {
        document.getElementById('doctorForm').reset();
    } else {
        document.getElementById('updateDoctorForm').classList.add('hidden-section');
        document.getElementById('updateDoctorId').value = '';
    }
}
function hideDoctorForm(type) {
    document.getElementById(`${type}-doctor-form`).style.display = 'none';
}

function showAllDoctors() {
    hideAllSubSections('doctor-management');
    renderDoctorsTable(cachedDoctors);
    renderDoctorCharts(cachedDoctors);
    document.getElementById('doctor-list').style.display = 'block';
    document.getElementById('doctor-visualizations').classList.remove('hidden-section');
}

function showDoctorSearch() {
    hideAllSubSections('doctor-management');
    document.getElementById('search-doctor-form').style.display = 'block';
    document.getElementById('searchDoctorQuery').value = '';
    document.getElementById('searchDoctorResults').classList.add('hidden-section');
}

function showDoctorDelete() {
    hideAllSubSections('doctor-management');
    document.getElementById('delete-doctor-form').style.display = 'block';
    document.getElementById('deleteDoctorId').value = '';
}

async function addDoctor() {
    const doctorData = {
        name: document.getElementById('doctorName').value,
        specialization: document.getElementById('doctorSpecialization').value,
        department_id: parseInt(document.getElementById('doctorDepartment').value) || null,
        qualification: document.getElementById('doctorQualification').value || null,
        years_of_experience: parseInt(document.getElementById('doctorExperience').value) || null,
        consultation_fee: parseFloat(document.getElementById('doctorFee').value),
        phone: document.getElementById('doctorPhone').value || null,
        email: document.getElementById('doctorEmail').value || null,
        availability: document.getElementById('doctorAvailability').value || null,
        bio: document.getElementById('doctorBio').value || null
    };

    const result = await sendData('doctors', 'POST', doctorData);
    if (result) {
        alert(result.message);
        document.getElementById('doctorForm').reset();
        cachedDoctors = await fetchData('doctors') || []; // Refresh cache
        showAllDoctors();
        await updateDashboardMetrics();
    }
}

async function loadDoctorForUpdate() {
    const doctorId = document.getElementById('updateDoctorId').value;
    if (!doctorId) {
        alert('Please enter a Doctor ID.');
        return;
    }
    const doctor = await fetchData(`doctors/${doctorId}`);
    if (doctor) {
        document.getElementById('updateDoctorName').value = doctor.name;
        document.getElementById('updateDoctorSpecialization').value = doctor.specialization;
        document.getElementById('updateDoctorDepartment').value = doctor.department_id || '';
        document.getElementById('updateDoctorQualification').value = doctor.qualification || '';
        document.getElementById('updateDoctorExperience').value = doctor.experience || ''; // Changed from years_of_experience based on API response
        document.getElementById('updateDoctorFee').value = doctor.fee; // Changed from consultation_fee based on API response
        document.getElementById('updateDoctorPhone').value = doctor.phone || '';
        document.getElementById('updateDoctorEmail').value = doctor.email || '';
        document.getElementById('updateDoctorAvailability').value = doctor.availability || '';
        document.getElementById('updateDoctorBio').value = doctor.bio || '';
        document.getElementById('updateDoctorForm').classList.remove('hidden-section');
    } else {
        document.getElementById('updateDoctorForm').classList.add('hidden-section');
        alert('Doctor not found!');
    }
}

async function updateDoctor() {
    const doctorId = document.getElementById('updateDoctorId').value;
    const doctorData = {
        name: document.getElementById('updateDoctorName').value,
        specialization: document.getElementById('updateDoctorSpecialization').value,
        department_id: parseInt(document.getElementById('updateDoctorDepartment').value) || null,
        qualification: document.getElementById('updateDoctorQualification').value || null,
        years_of_experience: parseInt(document.getElementById('updateDoctorExperience').value) || null,
        consultation_fee: parseFloat(document.getElementById('updateDoctorFee').value),
        phone: document.getElementById('updateDoctorPhone').value || null,
        email: document.getElementById('updateDoctorEmail').value || null,
        availability: document.getElementById('updateDoctorAvailability').value || null,
        bio: document.getElementById('updateDoctorBio').value || null
    };

    const result = await sendData(`doctors/${doctorId}`, 'PUT', doctorData);
    if (result) {
        alert(result.message);
        document.getElementById('updateDoctorForm').reset();
        document.getElementById('updateDoctorForm').classList.add('hidden-section');
        document.getElementById('updateDoctorId').value = '';
        cachedDoctors = await fetchData('doctors') || [];
        showAllDoctors();
    }
}

async function confirmDeleteDoctor() {
    const doctorId = document.getElementById('deleteDoctorId').value;
    if (!doctorId) {
        alert('Please enter a Doctor ID to delete.');
        return;
    }
    if (confirm(`Are you sure you want to delete doctor with ID ${doctorId}? This action cannot be undone.`)) {
        const result = await sendData(`doctors/${doctorId}`, 'DELETE');
        if (result) {
            alert(result.message);
            document.getElementById('deleteDoctorId').value = '';
            cachedDoctors = await fetchData('doctors') || [];
            showAllDoctors();
            await updateDashboardMetrics();
        }
    }
}

function renderDoctorsTable(doctors) {
    const tableBody = document.getElementById('doctorsTableBody');
    tableBody.innerHTML = '';
    const paginatedDoctors = paginate(doctors, currentPage.doctors, itemsPerPage);
    if (paginatedDoctors.length === 0) {
        document.getElementById('noDoctorsMessage').style.display = 'block';
    } else {
        document.getElementById('noDoctorsMessage').style.display = 'none';
        paginatedDoctors.forEach(doctor => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${doctor.doctor_id}</td>
                <td>${doctor.name}</td>
                <td>${doctor.specialization}</td>
                <td>${doctor.departmentName || 'N/A'}</td>
                <td>$${(doctor.fee || 0).toFixed(2)}</td>
                <td>${doctor.availability || 'N/A'}</td>
                <td>
                    <button class="btn btn-primary" onclick="viewDoctorDetails(${doctor.doctor_id})"><i class="fas fa-eye"></i> View</button>
                    <button class="btn btn-success" onclick="editDoctor(${doctor.doctor_id})"><i class="fas fa-edit"></i> Edit</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }
    renderPagination('doctorPagination', doctors.length, 'doctors');
}

function renderDoctorCharts(doctors) {
    Object.values(currentDoctorCharts).forEach(chart => chart.destroy());
    currentDoctorCharts = {};

    if (doctors.length === 0) {
        document.getElementById('doctor-visualizations').classList.add('hidden-section');
        return;
    }
    document.getElementById('doctor-visualizations').classList.remove('hidden-section');


    const specializationCounts = doctors.reduce((acc, d) => {
        acc[d.specialization] = (acc[d.specialization] || 0) + 1;
        return acc;
    }, {});
    createChart('doctorSpecializationChart', 'pie', 'Doctor Specializations', Object.keys(specializationCounts), Object.values(specializationCounts), currentDoctorCharts);

    const departmentCounts = doctors.reduce((acc, d) => {
        const deptName = d.departmentName || 'Unassigned';
        acc[deptName] = (acc[deptName] || 0) + 1;
        return acc;
    }, {});
    createChart('doctorDepartmentChart', 'bar', 'Doctors by Department', Object.keys(departmentCounts), Object.values(departmentCounts), currentDoctorCharts);

    const feeData = doctors.map(d => d.fee); // Changed from consultation_fee
    if (feeData.length > 0) {
        const feeLabels = ['< $100', '$100-$200', '> $200'];
        const feeCounts = [
            feeData.filter(f => f < 100).length,
            feeData.filter(f => f >= 100 && f <= 200).length,
            feeData.filter(f => f > 200).length
        ];
        createChart('doctorFeeDistributionChart', 'bar', 'Consultation Fee Distribution', feeLabels, feeCounts, currentDoctorCharts);
    } else {
         // Clear previous chart if no data
        const canvas = document.getElementById('doctorFeeDistributionChart');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas
        }
    }


    const experienceData = doctors.map(d => d.experience); // Changed from years_of_experience
    if (experienceData.length > 0) {
        const experienceLabels = ['0-5', '6-10', '11-20', '20+'];
        const experienceCounts = [
            experienceData.filter(e => e >= 0 && e <= 5).length,
            experienceData.filter(e => e > 5 && e <= 10).length,
            experienceData.filter(e => e > 10 && e <= 20).length,
            experienceData.filter(e => e > 20).length
        ];
        createChart('doctorExperienceChart', 'bar', 'Years of Experience', experienceLabels, experienceCounts, currentDoctorCharts);
    } else {
        const canvas = document.getElementById('doctorExperienceChart');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
}

async function viewDoctorDetails(id) {
    const doctor = await fetchData(`doctors/${id}`);
    if (doctor) {
        const content = `
            <p><strong>Name:</strong> ${doctor.name}</p>
            <p><strong>Specialization:</strong> ${doctor.specialization}</p>
            <p><strong>Department:</strong> ${doctor.department_name || 'N/A'}</p>
            <p><strong>Qualification:</strong> ${doctor.qualification || 'N/A'}</p>
            <p><strong>Years of Experience:</strong> ${doctor.experience || 'N/A'}</p>
            <p><strong>Consultation Fee:</strong> $${(doctor.fee || 0).toFixed(2)}</p>
            <p><strong>Phone:</strong> ${doctor.phone || 'N/A'}</p>
            <p><strong>Email:</strong> ${doctor.email || 'N/A'}</p>
            <p><strong>Availability:</strong> ${doctor.availability || 'N/A'}</p>
            <p><strong>Bio:</strong> ${doctor.bio || 'N/A'}</p>
        `;
        document.getElementById('doctorDetailsContent').innerHTML = content;
        document.getElementById('doctorDetailsModal').style.display = 'block';
    }
}

function editDoctor(id) {
    closeModal('doctorDetailsModal');
    showDoctorForm('update');
    document.getElementById('updateDoctorId').value = id;
    loadDoctorForUpdate();
}

async function searchDoctor() {
    const query = document.getElementById('searchDoctorQuery').value.toLowerCase();
    const results = cachedDoctors.filter(d =>
        d.name.toLowerCase().includes(query) ||
        d.specialization.toLowerCase().includes(query) ||
        (d.departmentName && d.departmentName.toLowerCase().includes(query)) ||
        d.doctor_id.toString().includes(query)
    );
    renderSearchResults('searchDoctorResultsBody', results, 'doctor');
}

async function exportDoctors() {
    window.open(`${API_BASE_URL}/doctors/export/csv`, '_blank');
    alert('Exporting doctor data as CSV. Please check your downloads.');
}

// --- APPOINTMENT MANAGEMENT ---

function showAppointmentForm(type) {
    hideAllSubSections('appointment-management');
    document.getElementById(`${type}-appointment-form`).style.display = 'block';
    populatePatientDropdown(`${type === 'add' ? 'appointment' : 'updateAppointment'}Patient`);
    populateDoctorDropdown(`${type === 'add' ? 'appointment' : 'updateAppointment'}Doctor`);
    if (type === 'add') {
        document.getElementById('appointmentForm').reset();
        // Set default date to today
        document.getElementById('appointmentDate').valueAsDate = new Date();
    } else {
        document.getElementById('updateAppointmentForm').classList.add('hidden-section');
        document.getElementById('updateAppointmentId').value = '';
    }
}
function hideAppointmentForm(type) {
    document.getElementById(`${type}-appointment-form`).style.display = 'none';
}

async function showAllAppointments() {
    hideAllSubSections('appointment-management');
    renderAppointmentsTable(cachedAppointments);
    renderAppointmentCharts(cachedAppointments);
    document.getElementById('appointment-list').style.display = 'block';
    document.getElementById('appointment-visualizations').classList.remove('hidden-section');
}

function showAppointmentSearch() {
    hideAllSubSections('appointment-management');
    document.getElementById('search-appointment-form').style.display = 'block';
    document.getElementById('searchAppointmentQuery').value = '';
    document.getElementById('searchAppointmentResults').classList.add('hidden-section');
}

function showAppointmentCancel() {
    hideAllSubSections('appointment-management');
    document.getElementById('cancel-appointment-form').style.display = 'block';
    document.getElementById('cancelAppointmentId').value = '';
}

async function addAppointment() {
    const appointmentData = {
        patient_id: parseInt(document.getElementById('appointmentPatient').value),
        doctor_id: parseInt(document.getElementById('appointmentDoctor').value),
        date: document.getElementById('appointmentDate').value,
        time: document.getElementById('appointmentTime').value,
        reason: document.getElementById('appointmentReason').value || null,
        status: document.getElementById('appointmentStatus').value,
        duration: 30, // Default duration, can be made configurable
        notes: null // Not collected in form
    };

    const result = await sendData('appointments', 'POST', appointmentData);
    if (result) {
        alert(result.message + ` Invoice: ${result.invoice_number}`);
        document.getElementById('appointmentForm').reset();
        cachedAppointments = await fetchData('appointments') || [];
        showAllAppointments();
        await updateDashboardMetrics();
    }
}

async function loadAppointmentForUpdate() {
    const appointmentId = document.getElementById('updateAppointmentId').value;
    if (!appointmentId) {
        alert('Please enter an Appointment ID.');
        return;
    }
    const appointment = await fetchData(`appointments/${appointmentId}`);
    if (appointment) {
        document.getElementById('updateAppointmentPatient').value = appointment.patient_id;
        document.getElementById('updateAppointmentDoctor').value = appointment.doctor_id;
        document.getElementById('updateAppointmentDate').value = appointment.date;
        document.getElementById('updateAppointmentTime').value = appointment.time;
        document.getElementById('updateAppointmentStatus').value = appointment.status;
        document.getElementById('updateAppointmentForm').classList.remove('hidden-section');
    } else {
        document.getElementById('updateAppointmentForm').classList.add('hidden-section');
        alert('Appointment not found!');
    }
}

async function updateAppointment() {
    const appointmentId = document.getElementById('updateAppointmentId').value;
    const appointmentData = {
        patient_id: parseInt(document.getElementById('updateAppointmentPatient').value),
        doctor_id: parseInt(document.getElementById('updateAppointmentDoctor').value),
        date: document.getElementById('updateAppointmentDate').value,
        time: document.getElementById('updateAppointmentTime').value,
        status: document.getElementById('updateAppointmentStatus').value,
        // Only update fields allowed by API: date, time, duration, reason, notes, status
        // For simplicity, directly mapping to status and date/time fields only
        // You might need to fetch the original record to retain other fields if not updated
    };

    const result = await sendData(`appointments/${appointmentId}`, 'PUT', appointmentData);
    if (result) {
        alert(result.message);
        document.getElementById('updateAppointmentForm').reset();
        document.getElementById('updateAppointmentForm').classList.add('hidden-section');
        document.getElementById('updateAppointmentId').value = '';
        cachedAppointments = await fetchData('appointments') || [];
        showAllAppointments();
    }
}

async function confirmCancelAppointment() {
    const appointmentId = document.getElementById('cancelAppointmentId').value;
    if (!appointmentId) {
        alert('Please enter an Appointment ID to cancel.');
        return;
    }
    if (confirm(`Are you sure you want to cancel appointment with ID ${appointmentId}?`)) {
        const result = await sendData(`appointments/${appointmentId}`, 'PUT', { status: 'Cancelled' });
        if (result) {
            alert(result.message);
            document.getElementById('cancelAppointmentId').value = '';
            cachedAppointments = await fetchData('appointments') || [];
            showAllAppointments();
            await updateDashboardMetrics();
        }
    }
}

function renderAppointmentsTable(appointments) {
    const tableBody = document.getElementById('appointmentsTableBody');
    tableBody.innerHTML = '';
    const paginatedAppointments = paginate(appointments, currentPage.appointments, itemsPerPage);
    if (paginatedAppointments.length === 0) {
        document.getElementById('noAppointmentsMessage').style.display = 'block';
    } else {
        document.getElementById('noAppointmentsMessage').style.display = 'none';
        paginatedAppointments.forEach(app => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${app.id}</td>
                <td>${app.patientName}</td>
                <td>${app.doctorName}</td>
                <td>${formatDate(app.date)}</td>
                <td>${formatTime(app.time)}</td>
                <td><span class="status-badge status-${getStatusClass(app.status)}">${app.status}</span></td>
                <td>
                    <button class="btn btn-primary" onclick="viewAppointmentDetails(${app.id})"><i class="fas fa-eye"></i> View</button>
                    <button class="btn btn-success" onclick="editAppointment(${app.id})"><i class="fas fa-edit"></i> Edit</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }
    renderPagination('appointmentPagination', appointments.length, 'appointments');
}

function renderAppointmentCharts(appointments) {
    Object.values(currentAppointmentCharts).forEach(chart => chart.destroy());
    currentAppointmentCharts = {};

    if (appointments.length === 0) {
        document.getElementById('appointment-visualizations').classList.add('hidden-section');
        return;
    }
    document.getElementById('appointment-visualizations').classList.remove('hidden-section');


    const statusCounts = appointments.reduce((acc, a) => {
        acc[a.status] = (acc[a.status] || 0) + 1;
        return acc;
    }, {});
    createChart('appointmentStatusChart', 'pie', 'Appointment Status Distribution', Object.keys(statusCounts), Object.values(statusCounts), currentAppointmentCharts);

    const doctorCounts = appointments.reduce((acc, a) => {
        acc[a.doctorName] = (acc[a.doctorName] || 0) + 1;
        return acc;
    }, {});
    const sortedDoctorCounts = Object.entries(doctorCounts).sort(([, a], [, b]) => b - a).slice(0, 5); // Top 5 doctors
    createChart('doctorAppointmentChart', 'bar', 'Top 5 Doctors by Appointments', sortedDoctorCounts.map(d => d[0]), sortedDoctorCounts.map(d => d[1]), currentAppointmentCharts);

    const reasonCounts = appointments.reduce((acc, a) => {
        const reason = a.reason || 'Not Specified';
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
    }, {});
    const sortedReasonCounts = Object.entries(reasonCounts).sort(([, a], [, b]) => b - a).slice(0, 5); // Top 5 reasons
    createChart('appointmentReasonChart', 'doughnut', 'Top 5 Appointment Reasons', sortedReasonCounts.map(r => r[0]), sortedReasonCounts.map(r => r[1]), currentAppointmentCharts);

    const appointmentTrend = appointments.reduce((acc, a) => {
        const date = a.date.split(' ')[0]; // Assuming date comes as 'YYYY-MM-DD HH:MM:SS'
        acc[date] = (acc[date] || 0) + 1;
        return acc;
    }, {});
    const sortedDates = Object.keys(appointmentTrend).sort();
    createChart('appointmentTrendChart', 'line', 'Appointment Trend Over Time', sortedDates, sortedDates.map(d => appointmentTrend[d]), currentAppointmentCharts);
}

async function viewAppointmentDetails(id) {
    const app = await fetchData(`appointments/${id}`);
    if (app) {
        const content = `
            <p><strong>Patient:</strong> ${app.patient_name}</p>
            <p><strong>Doctor:</strong> ${app.doctor_name}</p>
            <p><strong>Date:</strong> ${formatDate(app.date)}</p>
            <p><strong>Time:</strong> ${formatTime(app.time)}</p>
            <p><strong>Duration:</strong> ${app.duration || 'N/A'} minutes</p>
            <p><strong>Status:</strong> <span class="status-badge status-${getStatusClass(app.status)}">${app.status}</span></p>
            <p><strong>Reason:</strong> ${app.reason || 'N/A'}</p>
            <p><strong>Notes:</strong> ${app.notes || 'N/A'}</p>
        `;
        document.getElementById('appointmentDetailsContent').innerHTML = content;
        document.getElementById('appointmentDetailsModal').style.display = 'block';
    }
}

function editAppointment(id) {
    closeModal('appointmentDetailsModal');
    showAppointmentForm('update');
    document.getElementById('updateAppointmentId').value = id;
    loadAppointmentForUpdate();
}

async function searchAppointment() {
    const query = document.getElementById('searchAppointmentQuery').value.toLowerCase();
    const results = cachedAppointments.filter(a =>
        a.patientName.toLowerCase().includes(query) ||
        a.doctorName.toLowerCase().includes(query) ||
        a.date.includes(query) ||
        a.id.toString().includes(query)
    );
    renderSearchResults('searchAppointmentResultsBody', results, 'appointment');
}

async function exportAppointments() {
    window.open(`${API_BASE_URL}/appointments/export/csv`, '_blank');
    alert('Exporting appointment data as CSV. Please check your downloads.');
}

// --- BILLING MANAGEMENT ---

function showBillingForm(type) {
    hideAllSubSections('billing-management');
    document.getElementById(`${type}-bill-form`).style.display = 'block';
    populatePatientDropdown('billPatient');
    populateAppointmentDropdown('billAppointment');
    if (type === 'add') {
        document.getElementById('billForm').reset();
        document.getElementById('billDate').valueAsDate = new Date(); // Default to today
        const today = new Date();
        const dueDate = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
        document.getElementById('billDueDate').valueAsDate = dueDate; // Default due date to 30 days later
    } else {
        document.getElementById('updateBillForm').classList.add('hidden-section');
        document.getElementById('updateBillId').value = '';
    }
}
function hideBillingForm(type) {
    document.getElementById(`${type}-bill-form`).style.display = 'none';
}

async function showAllBills() {
    hideAllSubSections('billing-management');
    renderBillsTable(cachedBills);
    renderBillingCharts(cachedBills);
    document.getElementById('bill-list').style.display = 'block';
    document.getElementById('billing-visualizations').classList.remove('hidden-section');
}

function showBillingSearch() {
    hideAllSubSections('billing-management');
    document.getElementById('search-bill-form').style.display = 'block';
    document.getElementById('searchBillQuery').value = '';
    document.getElementById('searchBillResults').classList.add('hidden-section');
}

async function addBill() {
    const patientId = parseInt(document.getElementById('billPatient').value);
    const appointmentId = document.getElementById('billAppointment').value ? parseInt(document.getElementById('billAppointment').value) : null;
    
    // Find associated doctor ID from appointment or default to null
    const appointment = cachedAppointments.find(app => app.id === appointmentId);
    const doctorId = appointment ? appointment.doctor_id : null;

    // Parse items from JSON textarea
    let itemsArray = [];
    const itemsJson = document.getElementById('billItems').value;
    if (itemsJson) {
        try {
            itemsArray = JSON.parse(itemsJson);
            if (!Array.isArray(itemsArray)) {
                throw new Error('Items must be a JSON array.');
            }
        } catch (e) {
            alert('Invalid JSON format for items. Please use a valid JSON array (e.g., [{"description": "Consultation", "amount": 100}])');
            console.error('JSON parse error for items:', e);
            return;
        }
    }

    const billData = {
        patient_id: patientId,
        doctor_id: doctorId,
        appointment_id: appointmentId,
        amount: parseFloat(document.getElementById('billAmount').value),
        tax: parseFloat(document.getElementById('billTax').value || 0),
        discount: parseFloat(document.getElementById('billDiscount').value || 0),
        date: document.getElementById('billDate').value,
        due_date: document.getElementById('billDueDate').value,
        status: document.getElementById('billStatus').value,
        payment_method: document.getElementById('billPaymentMethod').value || null,
        items: itemsArray // Send as parsed array
    };

    const result = await sendData('bills', 'POST', billData);
    if (result) {
        alert(result.message + (result.invoice_number ? ` Invoice: ${result.invoice_number}` : ''));
        document.getElementById('billForm').reset();
        cachedBills = await fetchData('bills') || [];
        showAllBills();
        await updateDashboardMetrics();
    }
}

async function loadBillForUpdate() {
    const billId = document.getElementById('updateBillId').value;
    if (!billId) {
        alert('Please enter a Bill ID.');
        return;
    }
    const bill = await fetchData(`bills/${billId}`);
    if (bill) {
        document.getElementById('updateBillStatus').value = bill.status;
        document.getElementById('updateBillPaymentMethod').value = bill.payment_method || '';
        document.getElementById('updateBillAmount').value = bill.amount; // Use the actual amount
        document.getElementById('updateBillTax').value = bill.tax || 0;
        document.getElementById('updateBillDiscount').value = bill.discount || 0;
        document.getElementById('updateBillItems').value = bill.items ? JSON.stringify(bill.items, null, 2) : ''; // Display formatted JSON
        document.getElementById('updateBillForm').classList.remove('hidden-section');
    } else {
        document.getElementById('updateBillForm').classList.add('hidden-section');
        alert('Bill not found!');
    }
}

async function updateBill() {
    const billId = document.getElementById('updateBillId').value;
    let itemsArray = [];
    const itemsJson = document.getElementById('updateBillItems').value;
    if (itemsJson) {
        try {
            itemsArray = JSON.parse(itemsJson);
            if (!Array.isArray(itemsArray)) {
                throw new Error('Items must be a JSON array.');
            }
        } catch (e) {
            alert('Invalid JSON format for items. Please use a valid JSON array (e.g., [{"description": "Consultation", "amount": 100}])');
            console.error('JSON parse error for items:', e);
            return;
        }
    }

    const billData = {
        status: document.getElementById('updateBillStatus').value,
        payment_method: document.getElementById('updateBillPaymentMethod').value || null,
        amount: parseFloat(document.getElementById('updateBillAmount').value),
        tax: parseFloat(document.getElementById('updateBillTax').value || 0),
        discount: parseFloat(document.getElementById('updateBillDiscount').value || 0),
        items: itemsArray
    };

    const result = await sendData(`bills/${billId}`, 'PUT', billData);
    if (result) {
        alert(result.message);
        document.getElementById('updateBillForm').reset();
        document.getElementById('updateBillForm').classList.add('hidden-section');
        document.getElementById('updateBillId').value = '';
        cachedBills = await fetchData('bills') || [];
        showAllBills();
        await updateDashboardMetrics();
    }
}

function renderBillsTable(bills) {
    const tableBody = document.getElementById('billsTableBody');
    tableBody.innerHTML = '';
    const paginatedBills = paginate(bills, currentPage.bills, itemsPerPage);
    if (paginatedBills.length === 0) {
        document.getElementById('noBillsMessage').style.display = 'block';
    } else {
        document.getElementById('noBillsMessage').style.display = 'none';
        paginatedBills.forEach(bill => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${bill.invoiceNumber}</td>
                <td>${bill.patientName}</td>
                <td>${formatDate(bill.date)}</td>
                <td>$${(bill.amount || 0).toFixed(2)}</td>
                <td><span class="status-badge status-${getStatusClass(bill.status)}">${bill.status}</span></td>
                <td>
                    <button class="btn btn-primary" onclick="viewBillDetails(${bill.id})"><i class="fas fa-eye"></i> View</button>
                    <button class="btn btn-success" onclick="editBill(${bill.id})"><i class="fas fa-edit"></i> Edit</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }
    renderPagination('billPagination', bills.length, 'bills');
}

function renderBillingCharts(bills) {
    Object.values(currentBillingCharts).forEach(chart => chart.destroy());
    currentBillingCharts = {};

    if (bills.length === 0) {
        document.getElementById('billing-visualizations').classList.add('hidden-section');
        return;
    }
    document.getElementById('billing-visualizations').classList.remove('hidden-section');


    const statusCounts = bills.reduce((acc, b) => {
        acc[b.status] = (acc[b.status] || 0) + 1;
        return acc;
    }, {});
    createChart('billingStatusChart', 'pie', 'Bill Status Distribution', Object.keys(statusCounts), Object.values(statusCounts), currentBillingCharts);

    const paymentMethodCounts = bills.filter(b => b.status === 'Paid').reduce((acc, b) => {
        const method = b.paymentMethod || 'Unknown';
        acc[method] = (acc[method] || 0) + 1;
        return acc;
    }, {});
    createChart('paymentMethodChart', 'doughnut', 'Paid Bills by Payment Method', Object.keys(paymentMethodCounts), Object.values(paymentMethodCounts), currentBillingCharts);

    const revenueTrend = bills.reduce((acc, b) => {
        const date = b.date.split(' ')[0]; // Assuming date comes as 'YYYY-MM-DD HH:MM:SS'
        acc[date] = (acc[date] || 0) + parseFloat(b.amount);
        return acc;
    }, {});
    const sortedDates = Object.keys(revenueTrend).sort();
    createChart('revenueTrendChart', 'line', 'Revenue Trend Over Time', sortedDates, sortedDates.map(d => revenueTrend[d]), currentBillingCharts);

    const outstandingBills = bills.filter(b => b.status !== 'Paid').reduce((acc, b) => acc + parseFloat(b.amount), 0);
    const paidBills = bills.filter(b => b.status === 'Paid').reduce((acc, b) => acc + parseFloat(b.amount), 0);
    createChart('outstandingBillsChart', 'bar', 'Outstanding vs Paid Bills', ['Outstanding', 'Paid'], [outstandingBills, paidBills], currentBillingCharts);
}

async function viewBillDetails(id) {
    const bill = await fetchData(`bills/${id}`);
    if (bill) {
        const content = `
            <p><strong>Invoice #:</strong> ${bill.invoice_number}</p>
            <p><strong>Patient:</strong> ${bill.patient_name}</p>
            <p><strong>Doctor:</strong> ${bill.doctor_name || 'N/A'}</p>
            <p><strong>Appointment ID:</strong> ${bill.appointment_id || 'N/A'}</p>
            <p><strong>Date:</strong> ${formatDate(bill.date)}</p>
            <p><strong>Due Date:</strong> ${formatDate(bill.due_date)}</p>
            <p><strong>Amount:</strong> $${bill.amount.toFixed(2)}</p>
            <p><strong>Tax:</strong> $${bill.tax.toFixed(2)}</p>
            <p><strong>Discount:</strong> $${bill.discount.toFixed(2)}</p>
            <p><strong>Total Amount:</strong> $${(bill.total_amount || (bill.amount + bill.tax - bill.discount)).toFixed(2)}</p>
            <p><strong>Status:</strong> <span class="status-badge status-${getStatusClass(bill.status)}">${bill.status}</span></p>
            <p><strong>Payment Method:</strong> ${bill.payment_method || 'N/A'}</p>
            <p><strong>Payment Details:</strong> ${bill.payment_details || 'N/A'}</p>
            <p><strong>Items:</strong> ${Array.isArray(bill.items) ? bill.items.map(item => `${item.description} ($${item.amount.toFixed(2)})`).join(', ') : 'N/A'}</p>
        `;
        document.getElementById('billDetailsContent').innerHTML = content;
        document.getElementById('billDetailsModal').style.display = 'block';
    }
}

function editBill(id) {
    closeModal('billDetailsModal');
    showBillingForm('update');
    document.getElementById('updateBillId').value = id;
    loadBillForUpdate();
}

async function searchBill() {
    const query = document.getElementById('searchBillQuery').value.toLowerCase();
    const results = cachedBills.filter(b =>
        b.patientName.toLowerCase().includes(query) ||
        b.invoiceNumber.toLowerCase().includes(query) ||
        b.status.toLowerCase().includes(query) ||
        b.id.toString().includes(query)
    );
    renderSearchResults('searchBillResultsBody', results, 'bill');
}

async function exportBills() {
    window.open(`${API_BASE_URL}/bills/export/csv`, '_blank');
    alert('Exporting bills data as CSV. Please check your downloads.');
}

// --- MEDICAL RECORDS MANAGEMENT ---

function showMedicalRecordForm(type) {
    hideAllSubSections('medical-records');
    document.getElementById(`${type}-medical-record-form`).style.display = 'block';
    populatePatientDropdown('medicalRecordPatient');
    populateDoctorDropdown('medicalRecordDoctor');
    if (type === 'add') {
        document.getElementById('medicalRecordForm').reset();
        document.getElementById('medicalRecordDate').valueAsDate = new Date();
        document.getElementById('medicalRecordFollowUpRequired').checked = false;
        document.getElementById('medicalRecordFollowUpDateGroup').style.display = 'none';
    } else {
        document.getElementById('updateMedicalRecordForm').classList.add('hidden-section');
        document.getElementById('updateMedicalRecordId').value = '';
    }
}
function hideMedicalRecordForm(type) {
    document.getElementById(`${type}-medical-record-form`).style.display = 'none';
}


async function showAllMedicalRecords() {
    hideAllSubSections('medical-records');
    renderMedicalRecordsTable(cachedMedicalRecords);
    renderMedicalRecordCharts(cachedMedicalRecords);
    document.getElementById('medical-records-list').style.display = 'block';
    document.getElementById('medical-records-visualizations').classList.remove('hidden-section');
}

function showMedicalRecordSearch() {
    hideAllSubSections('medical-records');
    document.getElementById('search-medical-record-form').style.display = 'block';
    document.getElementById('searchMedicalRecordQuery').value = '';
    document.getElementById('searchMedicalRecordResults').classList.add('hidden-section');
}

async function addMedicalRecord() {
    const followUpRequired = document.getElementById('medicalRecordFollowUpRequired').checked;
    const medicalRecordData = {
        patient_id: parseInt(document.getElementById('medicalRecordPatient').value),
        doctor_id: parseInt(document.getElementById('medicalRecordDoctor').value) || null,
        date: document.getElementById('medicalRecordDate').value,
        diagnosis: document.getElementById('medicalRecordDiagnosis').value,
        treatment: document.getElementById('medicalRecordTreatment').value || null,
        prescription: document.getElementById('medicalRecordPrescription').value || null,
        notes: document.getElementById('medicalRecordNotes').value || null,
        visit_type: document.getElementById('medicalRecordVisitType').value || null,
        follow_up_required: followUpRequired,
        follow_up_date: followUpRequired ? document.getElementById('medicalRecordFollowUpDate').value : null,
        symptoms: document.getElementById('medicalRecordSymptoms').value || null,
        tests_ordered: document.getElementById('medicalRecordTestsOrdered').value || null,
        test_results: document.getElementById('medicalRecordTestResults').value || null
    };

    const result = await sendData('records', 'POST', medicalRecordData);
    if (result) {
        alert(result.message);
        document.getElementById('medicalRecordForm').reset();
        cachedMedicalRecords = await fetchData('records') || [];
        showAllMedicalRecords();
    }
}

async function loadMedicalRecordForUpdate() {
    const recordId = document.getElementById('updateMedicalRecordId').value;
    if (!recordId) {
        alert('Please enter a Record ID.');
        return;
    }
    const record = await fetchData(`records/${recordId}`);
    if (record) {
        // Assume patient and doctor dropdowns are already populated
        document.getElementById('updateMedicalRecordPatientName').value = cachedPatients.find(p => p.patient_id === record.patient_id)?.name || 'N/A';
        document.getElementById('updateMedicalRecordDoctorName').value = cachedDoctors.find(d => d.doctor_id === record.doctor_id)?.name || 'N/A';
        document.getElementById('updateMedicalRecordDate').value = record.date;
        document.getElementById('updateMedicalRecordDiagnosis').value = record.diagnosis;
        document.getElementById('updateMedicalRecordTreatment').value = record.treatment || '';
        document.getElementById('updateMedicalRecordPrescription').value = record.prescription || '';
        document.getElementById('updateMedicalRecordNotes').value = record.notes || '';
        document.getElementById('updateMedicalRecordVisitType').value = record.visit_type || '';
        document.getElementById('updateMedicalRecordSymptoms').value = record.symptoms || '';
        document.getElementById('updateMedicalRecordTestsOrdered').value = record.tests_ordered || '';
        document.getElementById('updateMedicalRecordTestResults').value = record.test_results || '';


        const followUpRequiredCheckbox = document.getElementById('updateMedicalRecordFollowUpRequired');
        const followUpDateGroup = document.getElementById('updateMedicalRecordFollowUpDateGroup');
        followUpRequiredCheckbox.checked = record.follow_up_required;
        if (record.follow_up_required) {
            followUpDateGroup.style.display = 'block';
            document.getElementById('updateMedicalRecordFollowUpDate').value = record.follow_up_date || '';
        } else {
            followUpDateGroup.style.display = 'none';
            document.getElementById('updateMedicalRecordFollowUpDate').value = '';
        }

        document.getElementById('updateMedicalRecordForm').classList.remove('hidden-section');
    } else {
        document.getElementById('updateMedicalRecordForm').classList.add('hidden-section');
        alert('Medical record not found!');
    }
}

async function updateMedicalRecord() {
    const recordId = document.getElementById('updateMedicalRecordId').value;
    const followUpRequired = document.getElementById('updateMedicalRecordFollowUpRequired').checked;

    const recordData = {
        // patient_id: parseInt(document.getElementById('updateMedicalRecordPatient').value), // Patient ID should not typically change
        // doctor_id: parseInt(document.getElementById('updateMedicalRecordDoctor').value) || null, // Not updating patient/doctor from form here
        date: document.getElementById('updateMedicalRecordDate').value,
        diagnosis: document.getElementById('updateMedicalRecordDiagnosis').value,
        treatment: document.getElementById('updateMedicalRecordTreatment').value || null,
        prescription: document.getElementById('updateMedicalRecordPrescription').value || null,
        notes: document.getElementById('updateMedicalRecordNotes').value || null,
        visit_type: document.getElementById('updateMedicalRecordVisitType').value || null,
        symptoms: document.getElementById('updateMedicalRecordSymptoms').value || null,
        tests_ordered: document.getElementById('updateMedicalRecordTestsOrdered').value || null,
        test_results: document.getElementById('updateMedicalRecordTestResults').value || null,
        follow_up_required: followUpRequired,
        follow_up_date: followUpRequired ? document.getElementById('updateMedicalRecordFollowUpDate').value : null,
    };

    const result = await sendData(`records/${recordId}`, 'PUT', recordData);
    if (result) {
        alert(result.message);
        document.getElementById('updateMedicalRecordForm').reset();
        document.getElementById('updateMedicalRecordForm').classList.add('hidden-section');
        document.getElementById('updateMedicalRecordId').value = '';
        cachedMedicalRecords = await fetchData('records') || [];
        showAllMedicalRecords();
    }
}

function renderMedicalRecordsTable(records) {
    const tableBody = document.getElementById('medicalRecordsTableBody');
    tableBody.innerHTML = '';
    const paginatedRecords = paginate(records, currentPage.medicalRecords, itemsPerPage);
    if (paginatedRecords.length === 0) {
        document.getElementById('noMedicalRecordsMessage').style.display = 'block';
    } else {
        document.getElementById('noMedicalRecordsMessage').style.display = 'none';
        paginatedRecords.forEach(rec => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${rec.id}</td>
                <td>${rec.patientName}</td>
                <td>${rec.doctorName || 'N/A'}</td>
                <td>${truncateText(rec.diagnosis, 30)}</td>
                <td>${formatDate(rec.date)}</td>
                <td>
                    <button class="btn btn-primary" onclick="viewMedicalRecordDetails(${rec.id})"><i class="fas fa-eye"></i> View</button>
                    <button class="btn btn-success" onclick="editMedicalRecord(${rec.id})"><i class="fas fa-edit"></i> Edit</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }
    renderPagination('medicalRecordPagination', records.length, 'medicalRecords');
}

function renderMedicalRecordCharts(records) {
    Object.values(currentMedicalRecordCharts).forEach(chart => chart.destroy());
    currentMedicalRecordCharts = {};

    if (records.length === 0) {
        document.getElementById('medical-records-visualizations').classList.add('hidden-section');
        return;
    }
    document.getElementById('medical-records-visualizations').classList.remove('hidden-section');


    const diagnosisCounts = records.reduce((acc, r) => {
        const diag = r.diagnosis ? r.diagnosis.split(',')[0].trim() : 'Unknown';
        acc[diag] = (acc[diag] || 0) + 1;
        return acc;
    }, {});
    const sortedDiagnoses = Object.entries(diagnosisCounts).sort(([, a], [, b]) => b - a).slice(0, 5);
    createChart('diagnosisChart', 'bar', 'Top 5 Diagnoses', sortedDiagnoses.map(d => d[0]), sortedDiagnoses.map(d => d[1]), currentMedicalRecordCharts);

    const treatmentCounts = records.reduce((acc, r) => {
        const treat = r.treatment ? r.treatment.split(',')[0].trim() : 'Unknown';
        acc[treat] = (acc[treat] || 0) + 1;
        return acc;
    }, {});
    const sortedTreatments = Object.entries(treatmentCounts).sort(([, a], [, b]) => b - a).slice(0, 5);
    createChart('treatmentChart', 'pie', 'Top 5 Treatments', sortedTreatments.map(t => t[0]), sortedTreatments.map(t => t[1]), currentMedicalRecordCharts);

    const prescriptionTrend = records.filter(r => r.prescription).reduce((acc, r) => {
        const date = r.date.split(' ')[0]; // Assuming date format 'YYYY-MM-DD HH:MM:SS'
        acc[date] = (acc[date] || 0) + 1; // Count prescriptions per day
        return acc;
    }, {});
    const sortedPrescriptionDates = Object.keys(prescriptionTrend).sort();
    createChart('prescriptionTrendChart', 'line', 'Prescription Trend Over Time', sortedPrescriptionDates, sortedPrescriptionDates.map(d => prescriptionTrend[d]), currentMedicalRecordCharts);

    // This chart uses cachedPatients.disease, ensure it aligns with backend data structure
    const patientConditions = cachedPatients.filter(p => p.disease).reduce((acc, p) => {
        const condition = p.disease.split(',')[0].trim();
        acc[condition] = (acc[condition] || 0) + 1;
        return acc;
    }, {});
    const sortedPatientConditions = Object.entries(patientConditions).sort(([, a], [, b]) => b - a).slice(0, 5);
    createChart('patientConditionChart', 'doughnut', 'Top Patient Conditions (from Patient Data)', sortedPatientConditions.map(c => c[0]), sortedPatientConditions.map(c => c[1]), currentMedicalRecordCharts);
}

async function viewMedicalRecordDetails(id) {
    const record = await fetchData(`records/${id}`);
    if (record) {
        const content = `
            <p><strong>Patient:</strong> ${record.patient_name}</p>
            <p><strong>Doctor:</strong> ${record.doctor_name || 'N/A'}</p>
            <p><strong>Date:</strong> ${formatDate(record.date)}</p>
            <p><strong>Visit Type:</strong> ${record.visit_type || 'N/A'}</p>
            <p><strong>Diagnosis:</strong> ${record.diagnosis}</p>
            <p><strong>Symptoms:</strong> ${record.symptoms || 'N/A'}</p>
            <p><strong>Treatment:</strong> ${record.treatment || 'N/A'}</p>
            <p><strong>Prescription:</strong> ${record.prescription || 'N/A'}</p>
            <p><strong>Tests Ordered:</strong> ${record.tests_ordered || 'N/A'}</p>
            <p><strong>Test Results:</strong> ${record.test_results || 'N/A'}</p>
            <p><strong>Notes:</strong> ${record.notes || 'N/A'}</p>
            <p><strong>Follow-up Required:</strong> ${record.follow_up_required ? 'Yes' : 'No'}</p>
            <p><strong>Follow-up Date:</strong> ${record.follow_up_date ? formatDate(record.follow_up_date) : 'N/A'}</p>
        `;
        document.getElementById('medicalRecordDetailsContent').innerHTML = content;
        document.getElementById('medicalRecordDetailsModal').style.display = 'block';
    }
}

function editMedicalRecord(id) {
    closeModal('medicalRecordDetailsModal');
    showMedicalRecordForm('update');
    document.getElementById('updateMedicalRecordId').value = id;
    loadMedicalRecordForUpdate();
}

async function searchMedicalRecord() {
    const query = document.getElementById('searchMedicalRecordQuery').value.toLowerCase();
    const results = cachedMedicalRecords.filter(r =>
        r.patientName.toLowerCase().includes(query) ||
        (r.doctorName && r.doctorName.toLowerCase().includes(query)) ||
        r.diagnosis.toLowerCase().includes(query) ||
        r.id.toString().includes(query)
    );
    renderSearchResults('searchMedicalRecordResultsBody', results, 'medicalRecord');
}

async function exportMedicalRecords() {
    window.open(`${API_BASE_URL}/records/export/csv`, '_blank');
    alert('Exporting medical records data as CSV. Please check your downloads.');
}

// --- REPORTS & ANALYTICS ---

function showFinancialReports() {
    hideAllReportSections();
    document.getElementById('financial-reports').style.display = 'block';
    renderFinancialReports();
}
function showOperationalReports() {
    hideAllReportSections();
    document.getElementById('operational-reports').style.display = 'block';
    renderOperationalReports();
}
function showDoctorPerformance() {
    hideAllReportSections();
    document.getElementById('doctor-performance-reports').style.display = 'block';
    renderDoctorPerformanceReports();
}
function showPatientStatistics() {
    hideAllReportSections();
    document.getElementById('patient-statistics-reports').style.display = 'block';
    renderPatientStatisticsReports();
}
function hideAllReportSections() {
    document.querySelectorAll('#reports-analytics .card').forEach(el => el.style.display = 'none'); // Adjust to select all report cards
    // document.getElementById('financial-reports').style.display = 'none'; // Ensure all are hidden
    // document.getElementById('operational-reports').style.display = 'none';
    // document.getElementById('doctor-performance-reports').style.display = 'none';
    // document.getElementById('patient-statistics-reports').style.display = 'none';
}

async function renderFinancialReports() {
    // Destroy existing report charts
    Object.values(currentReportCharts).forEach(chart => chart.destroy());
    currentReportCharts = {};

    const bills = await fetchData('bills');
    if (!bills || bills.length === 0) {
        console.warn("No billing data for financial reports.");
        document.getElementById('financial-reports').querySelector('.visualization-container').classList.add('hidden-section');
        return;
    }
    document.getElementById('financial-reports').querySelector('.visualization-container').classList.remove('hidden-section');


    // Aggregate monthly revenue
    const monthlyRevenueData = bills.reduce((acc, bill) => {
        if (bill.status === 'Paid' && bill.date) {
            const date = new Date(bill.date);
            const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            acc[monthYear] = (acc[monthYear] || 0) + parseFloat(bill.amount);
        }
        return acc;
    }, {});

    const sortedMonths = Object.keys(monthlyRevenueData).sort();
    const monthlyLabels = sortedMonths.map(my => new Date(my).toLocaleString('en-US', { month: 'short', year: 'numeric' }));
    const monthlyData = sortedMonths.map(my => monthlyRevenueData[my]);
    createChart('monthlyRevenueChart', 'bar', 'Monthly Revenue', monthlyLabels, monthlyData, currentReportCharts);

    // Dummy data for expense and profit breakdown (as backend doesn't provide it)
    const expenseCategories = ['Salaries', 'Medicines', 'Equipment', 'Facilities', 'Administration'];
    const expenseData = expenseCategories.map(() => Math.floor(Math.random() * 50000) + 10000);
    createChart('expenseBreakdownChart', 'pie', 'Expense Breakdown', expenseCategories, expenseData, currentReportCharts);

    const profitData = monthlyData.map(rev => rev - (Math.random() * 0.4 + 0.5) * (expenseData.reduce((a, b) => a + b, 0) / monthlyData.length)); // Simulate profit
    createChart('profitTrendChart', 'line', 'Profit Trend', monthlyLabels, profitData, currentReportCharts);

    // Dummy data for department revenue (can be derived from doctors' departments if available)
    const departments = cachedDepartments.map(d => d.name);
    const departmentRevenueData = departments.map(() => Math.floor(Math.random() * 50000) + 20000);
    createChart('departmentRevenueChart', 'bar', 'Department Revenue', departments, departmentRevenueData, currentReportCharts);
}

async function renderOperationalReports() {
    Object.values(currentReportCharts).forEach(chart => chart.destroy());
    currentReportCharts = {};

    const appointments = await fetchData('appointments');
    const staffData = await fetchData('staff'); // Not directly used in charts here, but good to have
    const medicalRecords = await fetchData('records'); // Not directly used in charts here, but good to have


    if (!appointments || appointments.length === 0) {
        console.warn("No appointment data for operational reports.");
        document.getElementById('operational-reports').querySelector('.visualization-container').classList.add('hidden-section');
        return;
    }
    document.getElementById('operational-reports').querySelector('.visualization-container').classList.remove('hidden-section');


    // Weekly Patient Flow (Appointments by Day of Week)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weeklyFlow = appointments.reduce((acc, app) => {
        const dayOfWeek = new Date(app.date).getDay();
        acc[dayNames[dayOfWeek]] = (acc[dayNames[dayOfWeek]] || 0) + 1;
        return acc;
    }, {});
    const sortedDays = dayNames.filter(day => weeklyFlow[day] !== undefined);
    const flowData = sortedDays.map(day => weeklyFlow[day]);
    createChart('patientFlowChart', 'line', 'Weekly Patient Flow (Appointments)', sortedDays, flowData, currentReportCharts);

    // Resource Utilization (Dummy Data - requires actual resource tracking)
    const resources = ['Beds Occupied', 'Operating Rooms Used', 'Lab Tests Performed', 'Radiology Scans'];
    const utilizationData = resources.map(() => Math.floor(Math.random() * 80) + 20); // Random percentage
    createChart('resourceUtilizationChart', 'bar', 'Resource Utilization (%)', resources, utilizationData, currentReportCharts);

    // Staff Performance (Appointments Handled by Staff Role - simplified)
    const staffPerformance = appointments.reduce((acc, app) => {
        // Use cachedDoctors and app.doctor_id to get specialization
        const doctor = cachedDoctors.find(d => d.doctor_id === app.doctor_id);
        const role = doctor ? doctor.specialization : 'Unknown'; // Using specialization as a proxy for staff role here
        acc[role] = (acc[role] || 0) + 1;
        return acc;
    }, {});
    const staffLabels = Object.keys(staffPerformance);
    const staffDataValues = Object.values(staffPerformance);
    createChart('staffPerformanceChart', 'bar', 'Appointments by Doctor Specialization', staffLabels, staffDataValues, currentReportCharts);

    // Operational Efficiency (Appointment Completion Rate)
    const completedApps = appointments.filter(app => app.status === 'Completed').length;
    const cancelledApps = appointments.filter(app => app.status === 'Cancelled' || app.status === 'No-Show').length;
    const totalApps = appointments.length;

    const completionRate = totalApps > 0 ? (completedApps / totalApps) * 100 : 0;
    const cancellationRate = totalApps > 0 ? (cancelledApps / totalApps) * 100 : 0;
    const efficiencyLabels = ['Completion Rate', 'Cancellation Rate'];
    const efficiencyValues = [completionRate, cancellationRate];
    createChart('operationalEfficiencyChart', 'doughnut', 'Appointment Efficiency', efficiencyLabels, efficiencyValues, currentReportCharts);
}

async function renderDoctorPerformanceReports() {
    Object.values(currentReportCharts).forEach(chart => chart.destroy());
    currentReportCharts = {};

    const doctors = await fetchData('doctors');
    const appointments = await fetchData('appointments');
    const bills = await fetchData('bills');

    if (!doctors || doctors.length === 0) {
        console.warn("No doctor data for performance reports.");
        document.getElementById('doctor-performance-reports').querySelector('.visualization-container').classList.add('hidden-section');
        return;
    }
    document.getElementById('doctor-performance-reports').querySelector('.visualization-container').classList.remove('hidden-section');


    const doctorPerformanceData = doctors.map(doctor => {
        const doctorAppointments = appointments.filter(app => app.doctor_id === doctor.doctor_id);
        const totalAppointments = doctorAppointments.length;
        const completedAppointments = doctorAppointments.filter(app => app.status === 'Completed').length;

        // Assuming bill.doctor_id from API matches doctor.doctor_id
        const doctorBills = bills.filter(bill => bill.doctor_id === doctor.doctor_id);
        const totalRevenue = doctorBills.reduce((sum, bill) => sum + parseFloat(bill.amount), 0);

        return {
            name: doctor.name,
            specialization: doctor.specialization,
            totalAppointments: totalAppointments,
            completedAppointments: completedAppointments,
            completionRate: totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0,
            totalRevenue: totalRevenue,
            // Dummy satisfaction score for now
            satisfactionScore: Math.floor(Math.random() * 20) + 80
        };
    });

    doctorPerformanceData.sort((a, b) => b.totalAppointments - a.totalAppointments);
    const topDoctorsByAppointments = doctorPerformanceData.slice(0, 5);
    createChart('doctorAppointmentVolumeChart', 'bar', 'Top 5 Doctors by Appointment Volume',
        topDoctorsByAppointments.map(d => d.name), topDoctorsByAppointments.map(d => d.totalAppointments), currentReportCharts);

    doctorPerformanceData.sort((a, b) => b.totalRevenue - a.totalRevenue);
    const topDoctorsByRevenue = doctorPerformanceData.slice(0, 5);
    createChart('doctorRevenueChart', 'bar', 'Top 5 Doctors by Revenue Generated',
        topDoctorsByRevenue.map(d => d.name), topDoctorsByRevenue.map(d => d.totalRevenue), currentReportCharts);

    doctorPerformanceData.sort((a, b) => b.satisfactionScore - a.satisfactionScore);
    const topDoctorsBySatisfaction = doctorPerformanceData.slice(0, 5);
    createChart('doctorPatientSatisfactionChart', 'bar', 'Top 5 Doctors by Patient Satisfaction',
        topDoctorsBySatisfaction.map(d => d.name), topDoctorsBySatisfaction.map(d => d.satisfactionScore), currentReportCharts);
}

async function renderPatientStatisticsReports() {
    Object.values(currentReportCharts).forEach(chart => chart.destroy());
    currentReportCharts = {};

    const patients = await fetchData('patients');
    const appointments = await fetchData('appointments');

    if (!patients || patients.length === 0) {
        console.warn("No patient data for statistics reports.");
        document.getElementById('patient-statistics-reports').querySelector('.visualization-container').classList.add('hidden-section');
        return;
    }
    document.getElementById('patient-statistics-reports').querySelector('.visualization-container').classList.remove('hidden-section');


    // Patient Age Distribution
    const ageGroups = { '0-18': 0, '19-35': 0, '36-50': 0, '51-65': 0, '65+': 0 };
    patients.forEach(p => {
        if (p.age <= 18) ageGroups['0-18']++;
        else if (p.age <= 35) ageGroups['19-35']++;
        else if (p.age <= 50) ageGroups['36-50']++;
        else if (p.age <= 65) ageGroups['51-65']++;
        else ageGroups['65+']++;
    });
    createChart('patientAgeDistributionReportChart', 'bar', 'Patient Age Distribution',
        Object.keys(ageGroups), Object.values(ageGroups), currentReportCharts);

    // Patient Gender Distribution
    const genderCounts = patients.reduce((acc, p) => {
        acc[p.gender] = (acc[p.gender] || 0) + 1;
        return acc;
    }, {});
    createChart('patientGenderDistributionChart', 'pie', 'Patient Gender Distribution',
        Object.keys(genderCounts), Object.values(genderCounts), currentReportCharts);

    // Patient Visit Frequency (Top 5 Patients by Appointments)
    const patientAppointmentCounts = appointments.reduce((acc, app) => {
        acc[app.patientName] = (acc[app.patientName] || 0) + 1;
        return acc;
    }, {});
    const sortedPatientVisits = Object.entries(patientAppointmentCounts).sort(([, a], [, b]) => b - a).slice(0, 5);
    createChart('patientVisitsChart', 'bar', 'Top 5 Patients by Appointments',
        sortedPatientVisits.map(pv => pv[0]), sortedPatientVisits.map(pv => pv[1]), currentReportCharts);
}

// --- DEPARTMENT MANAGEMENT ---

function showDepartmentForm(type) {
    hideAllSubSections('department-management');
    document.getElementById(`${type}-department-form`).style.display = 'block';
    if (type === 'add') {
        document.getElementById('add-department-form').reset();
    } else {
        document.getElementById('updateDepartmentForm').classList.add('hidden-section');
        document.getElementById('updateDepartmentId').value = '';
    }
}
function hideDepartmentForm(type) {
    document.getElementById(`${type}-department-form`).style.display = 'none';
}


async function showAllDepartments() {
    hideAllSubSections('department-management');
    renderDepartmentsTable(cachedDepartments);
    document.getElementById('department-list').style.display = 'block';
}

async function addDepartment() {
    const departmentData = {
        name: document.getElementById('departmentName').value,
        head_of_department: document.getElementById('departmentHead').value || null, // Added to form
        phone: document.getElementById('departmentPhone').value || null, // Added to form
        email: document.getElementById('departmentEmail').value || null, // Added to form
        description: document.getElementById('departmentDescription').value || null // Added to form
    };
    const result = await sendData('departments', 'POST', departmentData);
    if (result) {
        alert(result.message);
        document.getElementById('departmentForm').reset(); // Reset the form after successful submission
        cachedDepartments = await fetchData('departments') || [];
        showAllDepartments();
    }
}

async function updateDepartment() {
    const departmentId = document.getElementById('updateDepartmentId').value;
    if (!departmentId) {
        alert('Please enter a Department ID.');
        return;
    }
    const departmentData = {
        name: document.getElementById('updateDepartmentName').value,
        head_of_department: document.getElementById('updateDepartmentHead').value || null,
        phone: document.getElementById('updateDepartmentPhone').value || null,
        email: document.getElementById('updateDepartmentEmail').value || null,
        description: document.getElementById('updateDepartmentDescription').value || null
    };

    // Ensure that at least the name is provided for update
    if (!departmentData.name && !departmentData.head_of_department && !departmentData.phone && !departmentData.email && !departmentData.description) {
        alert('Please enter at least one field to update.');
        return;
    }

    const result = await sendData(`departments/${departmentId}`, 'PUT', departmentData);
    if (result) {
        alert(result.message);
        document.getElementById('updateDepartmentForm').reset();
        document.getElementById('updateDepartmentForm').classList.add('hidden-section');
        document.getElementById('updateDepartmentId').value = '';
        cachedDepartments = await fetchData('departments') || [];
        showAllDepartments();
    }
}

async function confirmDeleteDepartment() {
    const departmentId = document.getElementById('deleteDepartmentId').value;
    if (!departmentId) {
        alert('Please enter a Department ID to delete.');
        return;
    }
    if (confirm(`Are you sure you want to delete department with ID ${departmentId}?`)) {
        const result = await sendData(`departments/${departmentId}`, 'DELETE');
        if (result) {
            alert(result.message);
            document.getElementById('deleteDepartmentId').value = '';
            cachedDepartments = await fetchData('departments') || [];
            showAllDepartments();
        }
    }
}

function renderDepartmentsTable(departments) {
    const tableBody = document.getElementById('departmentsTableBody');
    tableBody.innerHTML = '';
    const paginatedDepartments = paginate(departments, currentPage.departments, itemsPerPage);
    if (paginatedDepartments.length === 0) {
        document.getElementById('noDepartmentsMessage').style.display = 'block';
    } else {
        document.getElementById('noDepartmentsMessage').style.display = 'none';
        paginatedDepartments.forEach(dept => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${dept.id}</td>
                <td>${dept.name}</td>
                <td>${dept.head_of_department || 'N/A'}</td>
                <td>${dept.phone || 'N/A'}</td>
                <td>${dept.email || 'N/A'}</td>
                <td>
                    <button class="btn btn-success" onclick="editDepartment(${dept.id})"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn btn-danger" onclick="deleteDepartmentConfirm(${dept.id})"><i class="fas fa-trash"></i> Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }
    renderPagination('departmentPagination', departments.length, 'departments');
}

async function loadDepartmentForUpdate() {
    const departmentId = document.getElementById('updateDepartmentId').value;
    if (!departmentId) {
        alert('Please enter a Department ID.');
        return;
    }
    const department = await fetchData(`departments/${departmentId}`);
    if (department) {
        document.getElementById('updateDepartmentName').value = department.name;
        document.getElementById('updateDepartmentHead').value = department.head_of_department || '';
        document.getElementById('updateDepartmentPhone').value = department.phone || '';
        document.getElementById('updateDepartmentEmail').value = department.email || '';
        document.getElementById('updateDepartmentDescription').value = department.description || '';
        document.getElementById('updateDepartmentForm').classList.remove('hidden-section');
    } else {
        document.getElementById('updateDepartmentForm').classList.add('hidden-section');
        alert('Department not found!');
    }
}

function editDepartment(id) {
    showDepartmentForm('update');
    document.getElementById('updateDepartmentId').value = id;
    loadDepartmentForUpdate();
}

function deleteDepartmentConfirm(id) {
    document.getElementById('deleteDepartmentId').value = id;
    confirmDeleteDepartment();
}

// --- STAFF MANAGEMENT ---

function showStaffForm(type) {
    hideAllSubSections('staff-management');
    document.getElementById(`${type}-staff-form`).style.display = 'block';
    populateDepartmentDropdown(`${type === 'add' ? 'staff' : 'updateStaff'}Department`);
    if (type === 'add') {
        document.getElementById('staffForm').reset();
        document.getElementById('staffHireDate').valueAsDate = new Date(); // Default hire date
    } else {
        document.getElementById('updateStaffForm').classList.add('hidden-section');
        document.getElementById('updateStaffId').value = '';
    }
}
function hideStaffForm(type) {
    document.getElementById(`${type}-staff-form`).style.display = 'none';
}


async function showAllStaff() {
    hideAllSubSections('staff-management');
    renderStaffTable(cachedStaff);
    document.getElementById('staff-list').style.display = 'block';
}

function showStaffDelete() {
    hideAllSubSections('staff-management');
    document.getElementById('delete-staff-form').style.display = 'block';
    document.getElementById('deleteStaffId').value = '';
}

async function addStaff() {
    const staffData = {
        name: document.getElementById('staffName').value,
        role: document.getElementById('staffRole').value,
        department_id: parseInt(document.getElementById('staffDepartment').value) || null,
        phone: document.getElementById('staffPhone').value || null,
        email: document.getElementById('staffEmail').value || null,
        address: document.getElementById('staffAddress').value || null,
        hire_date: document.getElementById('staffHireDate').value || new Date().toISOString().split('T')[0] // Default to today
    };

    const result = await sendData('staff', 'POST', staffData);
    if (result) {
        alert(result.message);
        document.getElementById('staffForm').reset();
        cachedStaff = await fetchData('staff') || [];
        showAllStaff();
    }
}

async function loadStaffForUpdate() {
    const staffId = document.getElementById('updateStaffId').value;
    if (!staffId) {
        alert('Please enter a Staff ID.');
        return;
    }
    const staffMember = await fetchData(`staff/${staffId}`);
    if (staffMember) {
        document.getElementById('updateStaffName').value = staffMember.name;
        document.getElementById('updateStaffRole').value = staffMember.role;
        document.getElementById('updateStaffDepartment').value = staffMember.department_id || '';
        document.getElementById('updateStaffPhone').value = staffMember.phone || '';
        document.getElementById('updateStaffEmail').value = staffMember.email || '';
        document.getElementById('updateStaffAddress').value = staffMember.address || '';
        // Assuming hire_date is part of API response, add it to the update form if needed
        // document.getElementById('updateStaffHireDate').value = staffMember.hire_date || '';
        document.getElementById('updateStaffForm').classList.remove('hidden-section');
    } else {
        document.getElementById('updateStaffForm').classList.add('hidden-section');
        alert('Staff member not found!');
    }
}

async function updateStaff() {
    const staffId = document.getElementById('updateStaffId').value;
    const staffData = {
        name: document.getElementById('updateStaffName').value,
        role: document.getElementById('updateStaffRole').value,
        department_id: parseInt(document.getElementById('updateStaffDepartment').value) || null,
        phone: document.getElementById('updateStaffPhone').value || null,
        email: document.getElementById('updateStaffEmail').value || null,
        address: document.getElementById('updateStaffAddress').value || null,
        // hire_date: document.getElementById('updateStaffHireDate').value || null // Add if you include it in the form
    };

    const result = await sendData(`staff/${staffId}`, 'PUT', staffData);
    if (result) {
        alert(result.message);
        document.getElementById('updateStaffForm').reset();
        document.getElementById('updateStaffForm').classList.add('hidden-section');
        document.getElementById('updateStaffId').value = '';
        cachedStaff = await fetchData('staff') || [];
        showAllStaff();
    }
}

async function confirmDeleteStaff() {
    const staffId = document.getElementById('deleteStaffId').value;
    if (!staffId) {
        alert('Please enter a Staff ID to delete.');
        return;
    }
    if (confirm(`Are you sure you want to delete staff member with ID ${staffId}?`)) {
        const result = await sendData(`staff/${staffId}`, 'DELETE');
        if (result) {
            alert(result.message);
            document.getElementById('deleteStaffId').value = '';
            cachedStaff = await fetchData('staff') || [];
            showAllStaff();
        }
    }
}

function renderStaffTable(staffMembers) {
    const tableBody = document.getElementById('staffTableBody');
    tableBody.innerHTML = '';
    const paginatedStaff = paginate(staffMembers, currentPage.staff, itemsPerPage);
    if (paginatedStaff.length === 0) {
        document.getElementById('noStaffMessage').style.display = 'block';
    } else {
        document.getElementById('noStaffMessage').style.display = 'none';
        paginatedStaff.forEach(staff => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${staff.id}</td>
                <td>${staff.name}</td>
                <td>${staff.role}</td>
                <td>${staff.departmentName || 'N/A'}</td>
                <td>${staff.phone || 'N/A'}</td>
                <td>${staff.email || 'N/A'}</td>
                <td>
                    <button class="btn btn-primary" onclick="viewStaffDetails(${staff.id})"><i class="fas fa-eye"></i> View</button>
                    <button class="btn btn-success" onclick="editStaff(${staff.id})"><i class="fas fa-edit"></i> Edit</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }
    renderPagination('staffPagination', staffMembers.length, 'staff');
}

async function viewStaffDetails(id) {
    const staffMember = await fetchData(`staff/${id}`);
    if (staffMember) {
        const content = `
            <p><strong>Name:</strong> ${staffMember.name}</p>
            <p><strong>Role:</strong> ${staffMember.role}</p>
            <p><strong>Department:</strong> ${staffMember.department_name || 'N/A'}</p>
            <p><strong>Phone:</strong> ${staffMember.phone || 'N/A'}</p>
            <p><strong>Email:</strong> ${staffMember.email || 'N/A'}</p>
            <p><strong>Address:</strong> ${staffMember.address || 'N/A'}</p>
            <p><strong>Hire Date:</strong> ${formatDate(staffMember.hire_date) || 'N/A'}</p>
        `;
        document.getElementById('staffDetailsContent').innerHTML = content;
        document.getElementById('staffDetailsModal').style.display = 'block';
    }
}

function editStaff(id) {
    showStaffForm('update');
    document.getElementById('updateStaffId').value = id;
    loadStaffForUpdate();
}

// --- INSURANCE MANAGEMENT ---

function showInsuranceForm(type) {
    hideAllSubSections('insurance-management');
    document.getElementById(`${type}-insurance-form`).style.display = 'block';
    if (type === 'add') {
        document.getElementById('insuranceProviderForm').reset();
    } else {
        document.getElementById('updateInsuranceProviderForm').classList.add('hidden-section');
        document.getElementById('updateInsuranceProviderId').value = '';
    }
}
function hideInsuranceForm(type) {
    document.getElementById(`${type}-insurance-form`).style.display = 'none';
}


async function showAllInsuranceProviders() {
    hideAllSubSections('insurance-management');
    renderInsuranceProvidersTable(cachedInsuranceProviders);
    document.getElementById('insurance-list').style.display = 'block';
}

function showInsuranceDelete() {
    hideAllSubSections('insurance-management');
    document.getElementById('delete-insurance-form').style.display = 'block';
    document.getElementById('deleteInsuranceProviderId').value = '';
}

async function addInsuranceProvider() {
    const providerData = {
        name: document.getElementById('insuranceProviderName').value,
        contact_person: document.getElementById('insuranceContactPerson').value || null,
        phone: document.getElementById('insurancePhone').value || null,
        email: document.getElementById('insuranceEmail').value || null,
        address: document.getElementById('insuranceAddress').value || null,
        website: document.getElementById('insuranceWebsite').value || null
    };

    const result = await sendData('insurance', 'POST', providerData);
    if (result) {
        alert(result.message);
        document.getElementById('insuranceProviderForm').reset();
        cachedInsuranceProviders = await fetchData('insurance') || [];
        showAllInsuranceProviders();
    }
}

async function loadInsuranceProviderForUpdate() {
    const providerId = document.getElementById('updateInsuranceProviderId').value;
    if (!providerId) {
        alert('Please enter a Provider ID.');
        return;
    }
    const provider = await fetchData(`insurance/${providerId}`);
    if (provider) {
        document.getElementById('updateInsuranceProviderName').value = provider.name;
        document.getElementById('updateInsuranceContactPerson').value = provider.contact_person || '';
        document.getElementById('updateInsurancePhone').value = provider.phone || '';
        document.getElementById('updateInsuranceEmail').value = provider.email || '';
        document.getElementById('updateInsuranceAddress').value = provider.address || '';
        document.getElementById('updateInsuranceWebsite').value = provider.website || '';
        document.getElementById('updateInsuranceProviderForm').classList.remove('hidden-section');
    } else {
        document.getElementById('updateInsuranceProviderForm').classList.add('hidden-section');
        alert('Insurance provider not found!');
    }
}

async function updateInsuranceProvider() {
    const providerId = document.getElementById('updateInsuranceProviderId').value;
    const providerData = {
        name: document.getElementById('updateInsuranceProviderName').value,
        contact_person: document.getElementById('updateInsuranceContactPerson').value || null,
        phone: document.getElementById('updateInsurancePhone').value || null,
        email: document.getElementById('updateInsuranceEmail').value || null,
        address: document.getElementById('updateInsuranceAddress').value || null,
        website: document.getElementById('updateInsuranceWebsite').value || null
    };

    const result = await sendData(`insurance/${providerId}`, 'PUT', providerData);
    if (result) {
        alert(result.message);
        document.getElementById('updateInsuranceProviderForm').reset();
        document.getElementById('updateInsuranceProviderForm').classList.add('hidden-section');
        document.getElementById('updateInsuranceProviderId').value = '';
        cachedInsuranceProviders = await fetchData('insurance') || [];
        showAllInsuranceProviders();
    }
}

async function confirmDeleteInsuranceProvider() {
    const providerId = document.getElementById('deleteInsuranceProviderId').value;
    if (!providerId) {
        alert('Please enter a Provider ID to delete.');
        return;
    }
    if (confirm(`Are you sure you want to delete insurance provider with ID ${providerId}?`)) {
        const result = await sendData(`insurance/${providerId}`, 'DELETE');
        if (result) {
            alert(result.message);
            document.getElementById('deleteInsuranceProviderId').value = '';
            cachedInsuranceProviders = await fetchData('insurance') || [];
            showAllInsuranceProviders();
        }
    }
}

function renderInsuranceProvidersTable(providers) {
    const tableBody = document.getElementById('insuranceProvidersTableBody');
    tableBody.innerHTML = '';
    const paginatedProviders = paginate(providers, currentPage.insuranceProviders, itemsPerPage);
    if (paginatedProviders.length === 0) {
        document.getElementById('noInsuranceProvidersMessage').style.display = 'block';
    } else {
        document.getElementById('noInsuranceProvidersMessage').style.display = 'none';
        paginatedProviders.forEach(provider => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${provider.id}</td>
                <td>${provider.name}</td>
                <td>${provider.contact || 'N/A'}</td>
                <td>${provider.phone || 'N/A'}</td>
                <td>${provider.email || 'N/A'}</td>
                <td>
                    <button class="btn btn-primary" onclick="viewInsuranceProviderDetails(${provider.id})"><i class="fas fa-eye"></i> View</button>
                    <button class="btn btn-success" onclick="editInsuranceProvider(${provider.id})"><i class="fas fa-edit"></i> Edit</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }
    renderPagination('insuranceProvidersPagination', providers.length, 'insuranceProviders');
}

async function viewInsuranceProviderDetails(id) {
    const provider = await fetchData(`insurance/${id}`);
    if (provider) {
        const content = `
            <p><strong>Name:</strong> ${provider.name}</p>
            <p><strong>Contact Person:</strong> ${provider.contact_person || 'N/A'}</p>
            <p><strong>Phone:</strong> ${provider.phone || 'N/A'}</p>
            <p><strong>Email:</strong> ${provider.email || 'N/A'}</p>
            <p><strong>Address:</strong> ${provider.address || 'N/A'}</p>
            <p><strong>Website:</strong> ${provider.website || 'N/A'}</p>
        `;
        document.getElementById('insuranceDetailsContent').innerHTML = content;
        document.getElementById('insuranceDetailsModal').style.display = 'block';
    }
}

function editInsuranceProvider(id) {
    showInsuranceForm('update');
    document.getElementById('updateInsuranceProviderId').value = id;
    loadInsuranceProviderForUpdate();
}

// --- TEST MANAGEMENT ---

function showTestForm(type) {
    hideAllSubSections('test-management');
    if (type === 'add') {
        document.getElementById(`add-test-type-form`).style.display = 'block';
        document.getElementById('testTypeForm').reset();
    } else if (type === 'order') {
        document.getElementById(`order-patient-test-form`).style.display = 'block';
        document.getElementById('patientTestOrderForm').reset();
        document.getElementById('patientTestDateOrdered').valueAsDate = new Date();
    } else if (type === 'update') {
        document.getElementById(`update-patient-test-form`).style.display = 'block';
        document.getElementById('updatePatientTestForm').classList.add('hidden-section');
        document.getElementById('updatePatientTestId').value = '';
    } else if (type === 'update-type') { // For updating test types
        document.getElementById(`update-test-type-form`).style.display = 'block';
        document.getElementById('updateTestTypeForm').classList.add('hidden-section');
        document.getElementById('updateTestTypeId').value = '';
    }
    // Populate dropdowns regardless of type, as they might be needed
    populatePatientDropdown('patientTestPatient');
    populateDoctorDropdown('patientTestDoctor');
    populateTestTypeDropdown('patientTestType');
}

function hideTestForm(type) {
    if (type === 'add') {
        document.getElementById('add-test-type-form').style.display = 'none';
    } else if (type === 'order') {
        document.getElementById('order-patient-test-form').style.display = 'none';
    } else if (type === 'update') {
        document.getElementById('update-patient-test-form').style.display = 'none';
    } else if (type === 'update-type') {
        document.getElementById('update-test-type-form').style.display = 'none';
    }
}

function showTestTypeForm(type) {
    hideAllSubSections('test-management');
    document.getElementById(`${type}-test-type-form`).style.display = 'block';
    if (type === 'add') {
        document.getElementById('testTypeForm').reset();
    } else if (type === 'update') {
        document.getElementById('updateTestTypeForm').classList.add('hidden-section');
        document.getElementById('updateTestTypeId').value = '';
    }
}

function hideTestTypeForm(type) {
    document.getElementById(`${type}-test-type-form`).style.display = 'none';
}

function showPatientTestForm(type) {
    hideAllSubSections('test-management');
    document.getElementById(`${type}-patient-test-form`).style.display = 'block';
    populatePatientDropdown('patientTestPatient');
    populateDoctorDropdown('patientTestDoctor');
    populateTestTypeDropdown('patientTestType');
    if (type === 'order') {
        document.getElementById('patientTestOrderForm').reset();
        document.getElementById('patientTestDateOrdered').valueAsDate = new Date();
    } else if (type === 'update') {
        document.getElementById('updatePatientTestForm').classList.add('hidden-section');
        document.getElementById('updatePatientTestId').value = '';
    }
}

function hidePatientTestForm(type) {
    document.getElementById(`${type}-patient-test-form`).style.display = 'none';
}


async function showAllPatientTests() {
    hideAllSubSections('test-management');
    renderPatientTestsTable(cachedPatientTests);
    document.getElementById('patient-test-list').style.display = 'block';
}

async function showAllTestTypes() {
    hideAllSubSections('test-management');
    renderTestTypesTable(cachedTestTypes);
    document.getElementById('test-type-list').style.display = 'block';
}

async function addTestType() {
    const testTypeData = {
        name: document.getElementById('testTypeName').value,
        cost: parseFloat(document.getElementById('testTypeCost').value),
        description: document.getElementById('testTypeDescription').value || null,
        preparation_instructions: document.getElementById('testTypePreparation').value || null, // Added to form
        turnaround_time: document.getElementById('testTypeTurnaround').value || null // Added to form
    };

    const result = await sendData('tests/types', 'POST', testTypeData);
    if (result) {
        alert(result.message);
        document.getElementById('testTypeForm').reset();
        cachedTestTypes = await fetchData('tests/types') || [];
        showAllTestTypes();
        populateTestTypeDropdown('patientTestType'); // Update dropdowns
    }
}

async function orderPatientTest() {
    const patientTestData = {
        patient_id: parseInt(document.getElementById('patientTestPatient').value),
        doctor_id: parseInt(document.getElementById('patientTestDoctor').value) || null,
        test_id: parseInt(document.getElementById('patientTestType').value),
        date_ordered: document.getElementById('patientTestDateOrdered').value || new Date().toISOString().split('T')[0],
        status: 'Ordered',
        notes: document.getElementById('patientTestNotes').value || null
    };

    const result = await sendData('tests/patients', 'POST', patientTestData);
    if (result) {
        alert(result.message);
        document.getElementById('patientTestOrderForm').reset();
        cachedPatientTests = await fetchData('tests/patients') || [];
        showAllPatientTests();
    }
}

async function loadPatientTestForUpdate() {
    const patientTestId = document.getElementById('updatePatientTestId').value;
    if (!patientTestId) {
        alert('Please enter a Patient Test ID.');
        return;
    }
    const patientTest = await fetchData(`tests/patients/${patientTestId}`);
    if (patientTest) {
        document.getElementById('updatePatientTestPatientName').value = patientTest.patient_name; // Display patient name
        document.getElementById('updatePatientTestTestName').value = patientTest.test_name; // Display test type name
        document.getElementById('updatePatientTestDateOrdered').value = patientTest.date_ordered; // Display order date
        document.getElementById('updatePatientTestDateCompleted').value = patientTest.date_completed || '';
        document.getElementById('updatePatientTestResults').value = patientTest.results || '';
        document.getElementById('updatePatientTestStatus').value = patientTest.status;
        document.getElementById('updatePatientTestNotes').value = patientTest.notes || '';
        document.getElementById('updatePatientTestForm').classList.remove('hidden-section');
    } else {
        document.getElementById('updatePatientTestForm').classList.add('hidden-section');
        alert('Patient test not found!');
    }
}

async function updatePatientTest() {
    const patientTestId = document.getElementById('updatePatientTestId').value;
    const patientTestData = {
        date_completed: document.getElementById('updatePatientTestDateCompleted').value || null,
        results: document.getElementById('updatePatientTestResults').value || null,
        status: document.getElementById('updatePatientTestStatus').value,
        notes: document.getElementById('updatePatientTestNotes').value || null
    };

    const result = await sendData(`tests/patients/${patientTestId}`, 'PUT', patientTestData);
    if (result) {
        alert(result.message);
        document.getElementById('updatePatientTestForm').reset();
        document.getElementById('updatePatientTestForm').classList.add('hidden-section');
        document.getElementById('updatePatientTestId').value = '';
        cachedPatientTests = await fetchData('tests/patients') || [];
        showAllPatientTests();
    }
}

function renderTestTypesTable(testTypes) {
    const tableBody = document.getElementById('testTypesTableBody');
    tableBody.innerHTML = '';
    if (testTypes.length === 0) {
        document.getElementById('noTestTypesMessage').style.display = 'block';
    } else {
        document.getElementById('noTestTypesMessage').style.display = 'none';
        testTypes.forEach(test => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${test.id}</td>
                <td>${test.name}</td>
                <td>$${(test.cost || 0).toFixed(2)}</td>
                <td>${truncateText(test.description || '', 50)}</td>
                <td>
                    <button class="btn btn-primary" onclick="viewTestTypeDetails(${test.id})"><i class="fas fa-eye"></i> View</button>
                    <button class="btn btn-success" onclick="editTestType(${test.id})"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn btn-danger" onclick="deleteTestType(${test.id})"><i class="fas fa-trash"></i> Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }
    // No pagination for test types list as it's typically short
}

function renderPatientTestsTable(patientTests) {
    const tableBody = document.getElementById('patientTestsTableBody');
    tableBody.innerHTML = '';
    const paginatedTests = paginate(patientTests, currentPage.patientTests, itemsPerPage);
    if (paginatedTests.length === 0) {
        document.getElementById('noPatientTestsMessage').style.display = 'block';
    } else {
        document.getElementById('noPatientTestsMessage').style.display = 'none';
        paginatedTests.forEach(test => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${test.id}</td>
                <td>${test.patientName}</td>
                <td>${test.testName}</td>
                <td>${test.doctorName || 'N/A'}</td>
                <td>${formatDate(test.dateOrdered)}</td>
                <td><span class="status-badge status-${getStatusClass(test.status)}">${test.status}</span></td>
                <td>
                    <button class="btn btn-primary" onclick="viewPatientTestDetails(${test.id})"><i class="fas fa-eye"></i> View</button>
                    <button class="btn btn-success" onclick="editPatientTest(${test.id})"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn btn-danger" onclick="deletePatientTest(${test.id})"><i class="fas fa-trash"></i> Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }
    renderPagination('patientTestsPagination', patientTests.length, 'patientTests');
}

async function viewTestTypeDetails(id) {
    const testType = await fetchData(`tests/types/${id}`);
    if (testType) {
        const content = `
            <p><strong>Name:</strong> ${testType.name}</p>
            <p><strong>Cost:</strong> $${testType.cost.toFixed(2)}</p>
            <p><strong>Description:</strong> ${testType.description || 'N/A'}</p>
            <p><strong>Preparation Instructions:</strong> ${testType.preparation_instructions || 'N/A'}</p>
            <p><strong>Turnaround Time:</strong> ${testType.turnaround_time || 'N/A'}</p>
        `;
        document.getElementById('testDetailsContent').innerHTML = content;
        document.getElementById('testDetailsModal').style.display = 'block';
    }
}

async function editTestType(id) {
    // This now correctly opens the update test type form
    closeModal('testDetailsModal');
    showTestTypeForm('update'); // Use the specific test type update form
    document.getElementById('updateTestTypeId').value = id;
    loadTestTypeForUpdate();
}

async function loadTestTypeForUpdate() {
    const testTypeId = document.getElementById('updateTestTypeId').value;
    if (!testTypeId) {
        alert('Please enter a Test Type ID.');
        return;
    }
    const testType = await fetchData(`tests/types/${testTypeId}`);
    if (testType) {
        document.getElementById('updateTestTypeName').value = testType.name;
        document.getElementById('updateTestTypeCost').value = testType.cost;
        document.getElementById('updateTestTypeDescription').value = testType.description || '';
        document.getElementById('updateTestTypePreparation').value = testType.preparation_instructions || '';
        document.getElementById('updateTestTypeTurnaround').value = testType.turnaround_time || '';
        document.getElementById('updateTestTypeForm').classList.remove('hidden-section');
    } else {
        document.getElementById('updateTestTypeForm').classList.add('hidden-section');
        alert('Test Type not found!');
    }
}

async function updateTestType() {
    const testTypeId = document.getElementById('updateTestTypeId').value;
    const testTypeData = {
        name: document.getElementById('updateTestTypeName').value,
        cost: parseFloat(document.getElementById('updateTestTypeCost').value),
        description: document.getElementById('updateTestTypeDescription').value || null,
        preparation_instructions: document.getElementById('updateTestTypePreparation').value || null,
        turnaround_time: document.getElementById('updateTestTypeTurnaround').value || null
    };

    const result = await sendData(`tests/types/${testTypeId}`, 'PUT', testTypeData);
    if (result) {
        alert(result.message);
        document.getElementById('updateTestTypeForm').reset();
        document.getElementById('updateTestTypeForm').classList.add('hidden-section');
        document.getElementById('updateTestTypeId').value = '';
        cachedTestTypes = await fetchData('tests/types') || [];
        showAllTestTypes();
        populateTestTypeDropdown('patientTestType');
    }
}


function showTestTypeDelete() {
    hideAllSubSections('test-management');
    document.getElementById('delete-test-type-form').style.display = 'block';
    document.getElementById('deleteTestTypeId').value = '';
}

async function confirmDeleteTestType() {
    const testTypeId = document.getElementById('deleteTestTypeId').value;
    if (!testTypeId) {
        alert('Please enter a Test Type ID to delete.');
        return;
    }
    if (confirm(`Are you sure you want to delete test type with ID ${testTypeId}? This will also affect associated patient tests.`)) {
        const result = await sendData(`tests/types/${testTypeId}`, 'DELETE');
        if (result) {
            alert(result.message);
            document.getElementById('deleteTestTypeId').value = '';
            cachedTestTypes = await fetchData('tests/types') || [];
            cachedPatientTests = await fetchData('tests/patients') || []; // Patient tests might change
            showAllTestTypes();
            populateTestTypeDropdown('patientTestType');
        }
    }
}

async function viewPatientTestDetails(id) {
    const patientTest = await fetchData(`tests/patients/${id}`);
    if (patientTest) {
        const content = `
            <p><strong>Patient:</strong> ${patientTest.patient_name}</p>
            <p><strong>Doctor:</strong> ${patientTest.doctor_name || 'N/A'}</p>
            <p><strong>Test Type:</strong> ${patientTest.test_name}</p>
            <p><strong>Date Ordered:</strong> ${formatDate(patientTest.date_ordered)}</p>
            <p><strong>Date Completed:</strong> ${patientTest.date_completed ? formatDate(patientTest.date_completed) : 'N/A'}</p>
            <p><strong>Status:</strong> <span class="status-badge status-${getStatusClass(patientTest.status)}">${patientTest.status}</span></p>
            <p><strong>Results:</strong> ${patientTest.results || 'N/A'}</p>
            <p><strong>Notes:</strong> ${patientTest.notes || 'N/A'}</p>
        `;
        document.getElementById('patientTestDetailsContent').innerHTML = content; // Using the specific patientTestDetailsModal
        document.getElementById('patientTestDetailsModal').style.display = 'block';
    }
}

function editPatientTest(id) {
    closeModal('patientTestDetailsModal');
    showPatientTestForm('update');
    document.getElementById('updatePatientTestId').value = id;
    loadPatientTestForUpdate();
}

function showPatientTestDelete() {
    hideAllSubSections('test-management');
    document.getElementById('delete-patient-test-form').style.display = 'block';
    document.getElementById('deletePatientTestId').value = '';
}

async function confirmDeletePatientTest() {
    const patientTestId = document.getElementById('deletePatientTestId').value;
    if (!patientTestId) {
        alert('Please enter a Patient Test ID to delete.');
        return;
    }
    if (confirm(`Are you sure you want to delete patient test record with ID ${patientTestId}?`)) {
        const result = await sendData(`tests/patients/${patientTestId}`, 'DELETE');
        if (result) {
            alert(result.message);
            document.getElementById('deletePatientTestId').value = '';
            cachedPatientTests = await fetchData('tests/patients') || [];
            showAllPatientTests();
        }
    }
}


// --- INVENTORY MANAGEMENT ---

function showInventoryForm(type) {
    hideAllSubSections('inventory-management');
    document.getElementById(`${type}-inventory-form`).style.display = 'block';
    if (type === 'add') {
        document.getElementById('inventoryItemForm').reset();
        document.getElementById('inventoryItemLastRestocked').valueAsDate = new Date();
    } else {
        document.getElementById('updateInventoryItemForm').classList.add('hidden-section');
        document.getElementById('updateInventoryItemId').value = '';
    }
}
function hideInventoryForm(type) {
    document.getElementById(`${type}-inventory-form`).style.display = 'none';
}


async function showAllInventory() {
    hideAllSubSections('inventory-management');
    renderInventoryTable(cachedInventoryItems);
    document.getElementById('inventory-list').style.display = 'block';
}

async function showLowStockItems() {
    hideAllSubSections('inventory-management');
    const lowStock = await fetchData('reports/low-stock');
    if (lowStock) {
        const tableBody = document.getElementById('inventoryTableBody'); // Re-using main table
        tableBody.innerHTML = '';
        if (lowStock.length === 0) {
            document.getElementById('noInventoryMessage').style.display = 'block';
            document.getElementById('noInventoryMessage').textContent = 'No low stock items found.';
        } else {
            document.getElementById('noInventoryMessage').style.display = 'none';
            lowStock.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.id}</td>
                    <td>${item.name}</td>
                    <td>${item.category}</td>
                    <td><span class="status-badge status-danger">${item.quantity}</span></td>
                    <td>${item.unit}</td>
                    <td>$${(item.price || 0).toFixed(2)}</td>
                    <td>${item.supplier || 'N/A'}</td>
                    <td>
                        <button class="btn btn-primary" onclick="viewInventoryItemDetails(${item.id})"><i class="fas fa-eye"></i> View</button>
                        <button class="btn btn-success" onclick="editInventoryItem(${item.id})"><i class="fas fa-edit"></i> Edit</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }
        document.getElementById('inventory-list').style.display = 'block';
        document.getElementById('inventoryPagination').innerHTML = ''; // No pagination for filtered view
    }
}

function showInventoryDelete() {
    hideAllSubSections('inventory-management');
    document.getElementById('delete-inventory-form').style.display = 'block';
    document.getElementById('deleteInventoryItemId').value = '';
}

async function addInventoryItem() {
    const inventoryData = {
        name: document.getElementById('inventoryItemName').value,
        category: document.getElementById('inventoryItemCategory').value,
        quantity: parseInt(document.getElementById('inventoryItemQuantity').value),
        unit: document.getElementById('inventoryItemUnit').value,
        price: parseFloat(document.getElementById('inventoryItemPrice').value),
        supplier: document.getElementById('inventoryItemSupplier').value || null,
        expiry_date: document.getElementById('inventoryItemExpiryDate').value || null,
        threshold: parseInt(document.getElementById('inventoryItemThreshold').value) || null,
        last_restocked: document.getElementById('inventoryItemLastRestocked').value || new Date().toISOString().split('T')[0],
        location: document.getElementById('inventoryItemLocation').value || null, // Assuming you add this to your form
        description: document.getElementById('inventoryItemDescription').value || null
    };

    const result = await sendData('inventory', 'POST', inventoryData);
    if (result) {
        alert(result.message);
        document.getElementById('inventoryItemForm').reset();
        cachedInventoryItems = await fetchData('inventory') || [];
        showAllInventory();
    }
}

async function loadInventoryItemForUpdate() {
    const itemId = document.getElementById('updateInventoryItemId').value;
    if (!itemId) {
        alert('Please enter an Item ID.');
        return;
    }
    const item = await fetchData(`inventory/${itemId}`);
    if (item) {
        document.getElementById('updateInventoryItemName').value = item.name;
        document.getElementById('updateInventoryItemCategory').value = item.category;
        document.getElementById('updateInventoryItemQuantity').value = item.quantity;
        document.getElementById('updateInventoryItemUnit').value = item.unit;
        document.getElementById('updateInventoryItemPrice').value = item.price;
        document.getElementById('updateInventoryItemSupplier').value = item.supplier || '';
        document.getElementById('updateInventoryItemExpiryDate').value = item.expiry_date || '';
        document.getElementById('updateInventoryItemThreshold').value = item.threshold || '';
        document.getElementById('updateInventoryItemLastRestocked').value = item.last_restocked || '';
        document.getElementById('updateInventoryItemLocation').value = item.location || ''; // Assuming you add this to your form
        document.getElementById('updateInventoryItemDescription').value = item.description || '';
        document.getElementById('updateInventoryItemForm').classList.remove('hidden-section');
    } else {
        document.getElementById('updateInventoryItemForm').classList.add('hidden-section');
        alert('Inventory item not found!');
    }
}

async function updateInventoryItem() {
    const itemId = document.getElementById('updateInventoryItemId').value;
    const inventoryData = {
        name: document.getElementById('updateInventoryItemName').value,
        category: document.getElementById('updateInventoryItemCategory').value,
        quantity: parseInt(document.getElementById('updateInventoryItemQuantity').value),
        unit: document.getElementById('updateInventoryItemUnit').value,
        price: parseFloat(document.getElementById('updateInventoryItemPrice').value),
        supplier: document.getElementById('updateInventoryItemSupplier').value || null,
        expiry_date: document.getElementById('updateInventoryItemExpiryDate').value || null,
        threshold: parseInt(document.getElementById('updateInventoryItemThreshold').value) || null,
        last_restocked: document.getElementById('updateInventoryItemLastRestocked').value || null,
        location: document.getElementById('updateInventoryItemLocation').value || null,
        description: document.getElementById('updateInventoryItemDescription').value || null
    };

    const result = await sendData(`inventory/${itemId}`, 'PUT', inventoryData);
    if (result) {
        alert(result.message);
        document.getElementById('updateInventoryItemForm').reset();
        document.getElementById('updateInventoryItemForm').classList.add('hidden-section');
        document.getElementById('updateInventoryItemId').value = '';
        cachedInventoryItems = await fetchData('inventory') || [];
        showAllInventory();
    }
}

async function confirmDeleteInventoryItem() {
    const itemId = document.getElementById('deleteInventoryItemId').value;
    if (!itemId) {
        alert('Please enter an Item ID to delete.');
        return;
    }
    if (confirm(`Are you sure you want to delete inventory item with ID ${itemId}?`)) {
        const result = await sendData(`inventory/${itemId}`, 'DELETE');
        if (result) {
            alert(result.message);
            document.getElementById('deleteInventoryItemId').value = '';
            cachedInventoryItems = await fetchData('inventory') || [];
            showAllInventory();
        }
    }
}

function renderInventoryTable(items) {
    const tableBody = document.getElementById('inventoryTableBody');
    tableBody.innerHTML = '';
    const paginatedItems = paginate(items, currentPage.inventoryItems, itemsPerPage);
    if (paginatedItems.length === 0) {
        document.getElementById('noInventoryMessage').style.display = 'block';
        document.getElementById('noInventoryMessage').textContent = 'No inventory items found.';
    } else {
        document.getElementById('noInventoryMessage').style.display = 'none';
        paginatedItems.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.id}</td>
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td><span class="status-badge status-${item.quantity <= item.threshold ? 'danger' : 'success'}">${item.quantity}</span></td>
                <td>${item.unit}</td>
                <td>$${(item.price || 0).toFixed(2)}</td>
                <td>${item.supplier || 'N/A'}</td>
                <td>${item.expiryDate ? formatDate(item.expiryDate) : 'N/A'}</td>
                <td>
                    <button class="btn btn-primary" onclick="viewInventoryItemDetails(${item.id})"><i class="fas fa-eye"></i> View</button>
                    <button class="btn btn-success" onclick="editInventoryItem(${item.id})"><i class="fas fa-edit"></i> Edit</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }
    renderPagination('inventoryPagination', items.length, 'inventoryItems');
}

async function viewInventoryItemDetails(id) {
    const item = await fetchData(`inventory/${id}`);
    if (item) {
        const content = `
            <p><strong>Name:</strong> ${item.name}</p>
            <p><strong>Category:</strong> ${item.category}</p>
            <p><strong>Description:</strong> ${item.description || 'N/A'}</p>
            <p><strong>Quantity:</strong> ${item.quantity} ${item.unit}</p>
            <p><strong>Price:</strong> $${item.price.toFixed(2)}</p>
            <p><strong>Supplier:</strong> ${item.supplier || 'N/A'}</p>
            <p><strong>Expiry Date:</strong> ${item.expiry_date ? formatDate(item.expiry_date) : 'N/A'}</p>
            <p><strong>Threshold:</strong> ${item.threshold || 'N/A'}</p>
            <p><strong>Last Restocked:</strong> ${item.last_restocked ? formatDate(item.last_restocked) : 'N/A'}</p>
            <p><strong>Location:</strong> ${item.location || 'N/A'}</p>
        `;
        document.getElementById('inventoryDetailsContent').innerHTML = content;
        document.getElementById('inventoryDetailsModal').style.display = 'block';
    }
}

function editInventoryItem(id) {
    showInventoryForm('update');
    document.getElementById('updateInventoryItemId').value = id;
    loadInventoryItemForUpdate();
}

// --- Dropdown Population Functions ---

function populatePatientDropdown(selectId) {
    const selectElement = document.getElementById(selectId);
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">Select Patient</option>';
    cachedPatients.forEach(patient => {
        const option = document.createElement('option');
        option.value = patient.patient_id;
        option.textContent = `${patient.name} (ID: ${patient.patient_id})`;
        selectElement.appendChild(option);
    });
}

function populateDoctorDropdown(selectId) {
    const selectElement = document.getElementById(selectId);
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">Select Doctor</option>';
    cachedDoctors.forEach(doctor => {
        const option = document.createElement('option');
        option.value = doctor.doctor_id;
        option.textContent = `Dr. ${doctor.name} (${doctor.specialization})`;
        selectElement.appendChild(option);
    });
}

function populateDepartmentDropdown(selectId) {
    const selectElement = document.getElementById(selectId);
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">Select Department</option>';
    cachedDepartments.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept.id;
        option.textContent = dept.name;
        selectElement.appendChild(option);
    });
}

function populateAppointmentDropdown(selectId) {
    const selectElement = document.getElementById(selectId);
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">Select Appointment (Optional)</option>'; // Mark as optional
    cachedAppointments.forEach(app => {
        const option = document.createElement('option');
        option.value = app.id;
        option.textContent = `Appt ID: ${app.id} - ${app.patientName} with Dr. ${app.doctorName} on ${formatDate(app.date)}`;
        selectElement.appendChild(option);
    });
}

function populateTestTypeDropdown(selectId) {
    const selectElement = document.getElementById(selectId);
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">Select Test Type</option>';
    cachedTestTypes.forEach(testType => {
        const option = document.createElement('option');
        option.value = testType.id;
        option.textContent = `${testType.name} ($${(testType.cost || 0).toFixed(2)})`;
        selectElement.appendChild(option);
    });
}