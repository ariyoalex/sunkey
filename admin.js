// API Configuration
const API_URL = 'https://v2.hireboothub.com/spin-win-api/api.php';

// Rate Limiting Configuration
const RATE_LIMIT = {
    maxAttempts: 5,
    timeWindow: 60000, // 1 minute
    attempts: {},

    checkLimit(key) {
        const now = Date.now();
        if (!this.attempts[key]) {
            this.attempts[key] = [];
        }

        // Clean old attempts
        this.attempts[key] = this.attempts[key].filter(time => now - time < this.timeWindow);

        if (this.attempts[key].length >= this.maxAttempts) {
            return false;
        }

        this.attempts[key].push(now);
        return true;
    }
};

// Utility: Make API calls
async function apiCall(action, data = {}, method = 'GET') {
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (method === 'POST') {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(`${API_URL}?action=${action}`, options);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Request failed');
        }

        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Prize Manager
class PrizeManager {
    static async getPrizes() {
        try {
            // Fetch prizes from API server
            const result = await apiCall('get-prizes');
            return result;
        } catch (error) {
            console.error('Error loading prizes from API:', error);
            return this.getDefaultPrizes();
        }
    }

    static getDefaultPrizes() {
        return {
            prizes: [{
                    id: 1,
                    name: '1 Roll-On',
                    color: '#28a745',
                    image: '🎁',
                    emoji: '🎁',
                    minPrice: 0,
                    maxPrice: 50000
                },
                {
                    id: 2,
                    name: '1 Wig Stand',
                    color: '#17a2b8',
                    image: '🎪',
                    emoji: '🎪',
                    minPrice: 50000,
                    maxPrice: 100000
                },
                {
                    id: 3,
                    name: 'Quality Cloth',
                    color: '#ffc107',
                    image: '👗',
                    emoji: '👗',
                    minPrice: 100000,
                    maxPrice: 150000
                },
                {
                    id: 4,
                    name: 'Hair Dryer + Hair Kits',
                    color: '#dc3545',
                    image: '💇',
                    emoji: '💇',
                    minPrice: 150000,
                    maxPrice: 300000
                }
            ]
        };
    }

    static async savePrizes(prizes) {
        try {
            // Save prizes to API server
            return await apiCall('save-prizes', prizes, 'POST');
        } catch (error) {
            console.error('Error saving prizes:', error);
            throw error;
        }
    }

    static async addPrize(prizeData) {
        const prizesData = await this.getPrizes();
        const newId = prizesData.prizes.length > 0 ?
            Math.max(...prizesData.prizes.map(p => p.id)) + 1 :
            1;

        const newPrize = {
            id: newId,
            ...prizeData
        };

        prizesData.prizes.push(newPrize);
        await this.savePrizes(prizesData);
        return newPrize;
    }

    static async removePrize(id) {
        const prizesData = await this.getPrizes();
        prizesData.prizes = prizesData.prizes.filter(p => p.id !== id);
        await this.savePrizes(prizesData);
    }
}

// Campaign Manager
class CampaignManager {
    static async getCampaign() {
        const result = await apiCall('campaign');
        return result;
    }

    static async updateCampaign(startDate, endDate, whatsappNumber) {
        return await apiCall('campaign', { startDate, endDate, whatsappNumber }, 'POST');
    }

    static formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

// Customer Manager
class CustomerManager {
    static async addCustomer(code, amount, name = '', phone = '') {
        return await apiCall('add-customer', { code, amount, name, phone }, 'POST');
    }

    static async getCustomers() {
        const result = await apiCall('customers');
        return result.customers;
    }

    static async removeCustomer(code) {
        return await apiCall('remove-customer', { code }, 'POST');
    }
}

// Records Manager
class RecordsManager {
    static async getRecords() {
        const result = await apiCall('records');
        return result.records;
    }

    static exportRecords(records) {
        if (records.length === 0) {
            UIManager.showAlert('No records to export', 'warning');
            return;
        }

        const headers = ['Code', 'Phone', 'Amount', 'Prize Won', 'Spin Time'];
        const rows = records.map(r => [
            r.code,
            r.phone,
            `₦${r.amount.toLocaleString()}`,
            r.prize,
            r.time
        ]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `spin_records_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }
}

// UI Manager
class UIManager {
    static showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3`;
        alertDiv.style.zIndex = '9999';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(alertDiv);

        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }

    static async updateCustomerList() {
        try {
            const customers = await CustomerManager.getCustomers();
            const tbody = document.getElementById('customerList');

            if (customers.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No customers added yet</td></tr>';
                return;
            }

            tbody.innerHTML = customers.map(customer => `
                <tr>
                    <td><strong>${customer.code}</strong></td>
                    <td>₦${customer.amount.toLocaleString()}</td>
                    <td>
                        <span style="background: ${customer.prizeColor}; color: white; padding: 5px 10px; border-radius: 5px;">
                            ${customer.prizeEmoji} ${customer.prize}
                        </span>
                    </td>
                    <td>
                        <span class="badge ${customer.hasSpun ? 'bg-success' : 'bg-warning'}">
                            ${customer.hasSpun ? 'Claimed' : 'Pending'}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-danger btn-sm" onclick="adminApp.removeCustomer('${customer.code}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            UIManager.showAlert('Error loading customers: ' + error.message, 'danger');
        }
    }

    static async updateRecordsList() {
        try {
            const records = await RecordsManager.getRecords();
            const tbody = document.getElementById('recordsList');

            if (records.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No spin records yet</td></tr>';
                return;
            }

            tbody.innerHTML = records.map(record => `
                <tr>
                    <td><strong>${record.code}</strong></td>
                    <td>₦${record.amount.toLocaleString()}</td>
                    <td>${record.prize}</td>
                    <td>${record.time}</td>
                </tr>
            `).join('');
        } catch (error) {
            UIManager.showAlert('Error loading records: ' + error.message, 'danger');
        }
    }

    static async updateCampaignDisplay() {
        try {
            const result = await CampaignManager.getCampaign();
            const campaign = result.campaign;
            const isActive = result.isActive;
            const display = document.getElementById('currentCampaign');

            display.innerHTML = `
                <div class="alert ${isActive ? 'alert-success' : 'alert-warning'}">
                    <h5><i class="bi bi-calendar-range"></i> Current Campaign Status</h5>
                    <p class="mb-0">
                        <strong>Start Date:</strong> ${CampaignManager.formatDate(campaign.startDate)}<br>
                        <strong>End Date:</strong> ${CampaignManager.formatDate(campaign.endDate)}<br>
                        <strong>WhatsApp:</strong> ${campaign.whatsappNumber}<br>
                        <strong>Status:</strong> ${isActive ?
                '<span class="badge bg-success">Active</span>' :
                '<span class="badge bg-danger">Inactive</span>'}
                    </p>
                </div>
            `;
        } catch (error) {
            UIManager.showAlert('Error loading campaign: ' + error.message, 'danger');
        }
    }

    static async updatePrizesList() {
        try {
            const prizesData = await PrizeManager.getPrizes();
            const container = document.getElementById('prizesList');

            if (prizesData.prizes.length === 0) {
                container.innerHTML = '<p class="text-center text-muted">No prizes added yet</p>';
                return;
            }

            container.innerHTML = prizesData.prizes.map(prize => `
                <div class="col-md-6 col-lg-4">
                    <div class="card h-100">
                        <div class="card-body" style="border-left: 5px solid ${prize.color}">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h5 class="card-title mb-0">${prize.name}</h5>
                                <button class="btn btn-danger btn-sm" onclick="adminApp.removePrize(${prize.id})">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                            <div class="mb-2">
                                <span class="badge" style="background: ${prize.color}">
                                    ${prize.emoji} ${prize.name}
                                </span>
                            </div>
                            <p class="card-text mb-1">
                                <strong>Price Range:</strong> ₦${prize.minPrice.toLocaleString()} - ₦${prize.maxPrice.toLocaleString()}
                            </p>
                            <p class="card-text mb-0">
                                <strong>Color:</strong>
                                <span class="badge" style="background: ${prize.color}">${prize.color}</span>
                            </p>
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            UIManager.showAlert('Error loading prizes: ' + error.message, 'danger');
        }
    }
}

// Main Admin Application
class AdminApp {
    constructor() {
        this.init();
    }

    async init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Admin login
        document.getElementById('adminLoginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAdminLogin();
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.handleLogout();
        });

        // Customer form
        document.getElementById('adminForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddCustomer();
        });

        // Prize form
        document.getElementById('prizeForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddPrize();
        });

        // Campaign form
        document.getElementById('campaignForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleUpdateCampaign();
        });

        // Export records
        document.getElementById('exportBtn').addEventListener('click', async () => {
            const records = await RecordsManager.getRecords();
            RecordsManager.exportRecords(records);
        });
    }

    async handleAdminLogin() {
        const username = document.getElementById('adminUsername').value;
        const password = document.getElementById('adminPassword').value;
        const loginBtn = document.querySelector('#adminLoginForm button[type="submit"]');

        // Rate limiting
        if (!RATE_LIMIT.checkLimit('admin_login')) {
            UIManager.showAlert('Too many login attempts. Please try again later.', 'danger');
            return;
        }

        try {
            // Show spinner
            const originalHTML = loginBtn.innerHTML;
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Logging in...';

            await apiCall('login', { username, password }, 'POST');
            sessionStorage.setItem('adminLoggedIn', 'true');

            this.showAdminPanel();
            UIManager.showAlert('Login successful!', 'success');

            // Reset button
            loginBtn.disabled = false;
            loginBtn.innerHTML = originalHTML;
        } catch (error) {
            UIManager.showAlert(error.message || 'Invalid credentials!', 'danger');
            // Reset button
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Login';
        }
    }

    handleLogout() {
        sessionStorage.removeItem('adminLoggedIn');
        document.getElementById('loginSection').classList.remove('d-none');
        document.getElementById('adminPanel').classList.add('d-none');
        UIManager.showAlert('Logged out successfully!', 'info');
    }

    async showAdminPanel() {
        document.getElementById('loginSection').classList.add('d-none');
        document.getElementById('adminPanel').classList.remove('d-none');

        await UIManager.updateCustomerList();
        await UIManager.updateRecordsList();
        await UIManager.updateCampaignDisplay();
        await UIManager.updatePrizesList();

        const result = await CampaignManager.getCampaign();
        document.getElementById('startDate').value = result.campaign.startDate;
        document.getElementById('endDate').value = result.campaign.endDate;
        document.getElementById('whatsappNumber').value = result.campaign.whatsappNumber;
    }

    async handleAddCustomer() {
        const code = document.getElementById('adminCode').value.trim();
        const amount = parseInt(document.getElementById('adminAmount').value);
        const name = document.getElementById('customerName').value.trim();
        const phone = document.getElementById('customerPhone').value.trim();
        const submitBtn = document.querySelector('#adminForm button[type="submit"]');

        if (!/^\d{4}$/.test(code)) {
            UIManager.showAlert('Please enter a valid 4-digit code!', 'warning');
            return;
        }

        try {
            // Show spinner
            const originalHTML = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Saving...';

            await CustomerManager.addCustomer(code, amount, name, phone);
            UIManager.showAlert('Customer added successfully!', 'success');
            document.getElementById('adminForm').reset();
            await UIManager.updateCustomerList();

            // Reset button
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalHTML;
        } catch (error) {
            UIManager.showAlert(error.message || 'Error adding customer', 'danger');
            // Reset button
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-plus-circle"></i> Save Customer';
        }
    }

    async handleAddPrize() {
        const name = document.getElementById('prizeName').value.trim();
        const color = document.getElementById('prizeColor').value;
        const image = document.getElementById('prizeImage').value.trim();
        const emoji = document.getElementById('prizeEmoji').value.trim() || image;
        const minPrice = parseInt(document.getElementById('prizeMinPrice').value);
        const maxPrice = parseInt(document.getElementById('prizeMaxPrice').value);
        const submitBtn = document.querySelector('#prizeForm button[type="submit"]');

        if (minPrice >= maxPrice) {
            UIManager.showAlert('Minimum price must be less than maximum price!', 'warning');
            return;
        }

        try {
            // Show spinner
            const originalHTML = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Saving...';

            await PrizeManager.addPrize({
                name,
                color,
                image,
                emoji,
                minPrice,
                maxPrice
            });

            UIManager.showAlert('Prize added successfully!', 'success');
            document.getElementById('prizeForm').reset();
            await UIManager.updatePrizesList();

            // Reset button
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalHTML;
        } catch (error) {
            UIManager.showAlert(error.message || 'Error adding prize', 'danger');
            // Reset button
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-save"></i> Add Prize';
        }
    }

    async removePrize(id) {
        if (confirm('Are you sure you want to remove this prize?')) {
            try {
                await PrizeManager.removePrize(id);
                UIManager.showAlert('Prize removed successfully!', 'success');
                await UIManager.updatePrizesList();
            } catch (error) {
                UIManager.showAlert(error.message || 'Error removing prize', 'danger');
            }
        }
    }

    async removeCustomer(code) {
        if (confirm('Are you sure you want to remove this customer?')) {
            try {
                await CustomerManager.removeCustomer(code);
                UIManager.showAlert('Customer removed successfully!', 'success');
                await UIManager.updateCustomerList();
            } catch (error) {
                UIManager.showAlert(error.message || 'Error removing customer', 'danger');
            }
        }
    }

    async handleUpdateCampaign() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const whatsappNumber = document.getElementById('whatsappNumber').value;
        const submitBtn = document.querySelector('#campaignForm button[type="submit"]');

        if (new Date(startDate) > new Date(endDate)) {
            UIManager.showAlert('Start date must be before end date!', 'warning');
            return;
        }

        try {
            // Show spinner
            const originalHTML = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Updating...';

            await CampaignManager.updateCampaign(startDate, endDate, whatsappNumber);
            await UIManager.updateCampaignDisplay();
            UIManager.showAlert('Campaign updated successfully!', 'success');

            // Reset button
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalHTML;
        } catch (error) {
            UIManager.showAlert(error.message || 'Error updating campaign', 'danger');
            // Reset button
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-check-circle"></i> Update Campaign';
        }
    }
}

// Initialize app
let adminApp;
document.addEventListener('DOMContentLoaded', () => {
    adminApp = new AdminApp();

    // Check if already logged in
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        adminApp.showAdminPanel();
    }
});