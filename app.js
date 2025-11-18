// API Configuration - Point to your backend server
const API_URL = 'https://v2.hireboothub.com/spin-win-api/api.php';

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

// Campaign Manager
class CampaignManager {
    static async getCampaign() {
        const result = await apiCall('campaign');
        return result;
    }

    static async updateCampaign(startDate, endDate, whatsappNumber) {
        return await apiCall('campaign', { startDate, endDate, whatsappNumber }, 'POST');
    }

    static async updateBanner() {
        const result = await this.getCampaign();
        const banner = document.getElementById('campaignStatus');
        const campaign = result.campaign;
        const isActive = result.isActive;

        if (isActive) {
            banner.className = 'campaign-banner active';
            banner.innerHTML = `
                <i class="bi bi-calendar-check"></i>
                Campaign Active! Valid from ${this.formatDate(campaign.startDate)} to ${this.formatDate(campaign.endDate)}
            `;
        } else {
            banner.className = 'campaign-banner inactive';
            banner.innerHTML = `
                <i class="bi bi-x-circle"></i>
                Sales Campaign Ended!
                <span style="margin-left: 15px;">|</span>
                <a href="https://wa.me/${campaign.whatsappNumber}?text=Hello%20Sunkey%20Beauty%20Gallery,%20I%20want%20to%20buy%20wigs"
                   target="_blank"
                   style="color: white; text-decoration: underline; margin-left: 10px;">
                   <i class="bi bi-whatsapp"></i> Chat us on WhatsApp to buy wigs
                </a>
            `;
        }

        return isActive;
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

    static async verifyCode(code) {
        return await apiCall('verify-code', { code }, 'POST');
    }

    static async recordSpin(code) {
        return await apiCall('record-spin', { code }, 'POST');
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

// Prize Manager
class PrizeManager {
    static async getPrizes() {
        try {
            // Fetch prizes from API server
            const result = await apiCall('get-prizes');
            return result;
        } catch (error) {
            console.error('Error loading prizes from API:', error);
            // Fallback to default prizes if API fails
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
}

// Wheel Animation Class
class SpinWheel {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.currentRotation = 0;
        this.isSpinning = false;
        this.segments = [];
    }

    async setSegments(prize) {
        const prizesData = await PrizeManager.getPrizes();
        const prizes = prizesData.prizes.map(p => ({
            name: p.name,
            color: p.color
        }));

        // Create 8 segments with winning segment first
        this.segments = [];
        const segmentCount = 8;

        for (let i = 0; i < segmentCount; i++) {
            if (i === 0) {
                const winPrize = prizes.find(p => p.name === prize.prize);
                this.segments.push({
                    name: prize.prize,
                    color: winPrize ? winPrize.color : '#28a745',
                    isWin: true
                });
            } else {
                const randomPrize = prizes[Math.floor(Math.random() * prizes.length)];
                this.segments.push({
                    name: randomPrize.name,
                    color: randomPrize.color,
                    isWin: false
                });
            }
        }
    }

    draw() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 10;
        const segmentAngle = (2 * Math.PI) / this.segments.length;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        this.ctx.rotate(this.currentRotation);

        this.segments.forEach((segment, i) => {
            const startAngle = i * segmentAngle;
            const endAngle = startAngle + segmentAngle;

            this.ctx.beginPath();
            this.ctx.arc(0, 0, radius, startAngle, endAngle);
            this.ctx.lineTo(0, 0);
            this.ctx.fillStyle = segment.color;
            this.ctx.fill();
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();

            this.ctx.save();
            this.ctx.rotate(startAngle + segmentAngle / 2);
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 14px Arial';
            this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
            this.ctx.shadowBlur = 3;

            const words = segment.name.split(' ');
            const lineHeight = 18;
            let y = radius * 0.6;

            words.forEach((word, index) => {
                this.ctx.fillText(word, radius * 0.7, y + (index * lineHeight));
            });

            this.ctx.restore();
        });

        this.ctx.beginPath();
        this.ctx.arc(0, 0, 40, 0, 2 * Math.PI);
        this.ctx.fillStyle = '#fff';
        this.ctx.fill();
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        this.ctx.restore();
    }

    spin(onComplete) {
        if (this.isSpinning) return;

        this.isSpinning = true;
        const spinButton = document.getElementById('spinButton');
        spinButton.disabled = true;
        spinButton.innerHTML = '<i class="bi bi-hourglass-split"></i> SPINNING...';

        const segmentAngle = (2 * Math.PI) / this.segments.length;
        const minSpins = 5;
        const maxSpins = 8;
        const spins = minSpins + Math.random() * (maxSpins - minSpins);

        const targetAngle = segmentAngle / 2;
        const totalRotation = (spins * 2 * Math.PI) + targetAngle;

        const duration = 5000;
        const startTime = Date.now();
        const startRotation = this.currentRotation;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const easeOut = 1 - Math.pow(1 - progress, 3);

            this.currentRotation = startRotation + (totalRotation * easeOut);
            this.draw();

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.isSpinning = false;
                this.currentRotation = this.currentRotation % (2 * Math.PI);

                const winningSegment = this.segments[0];

                setTimeout(() => {
                    onComplete(winningSegment);
                }, 500);
            }
        };

        animate();
    }
}

// UI Manager
class UIManager {
    static showSection(sectionId) {
        ['customerInterface', 'spinInterface'].forEach(id => {
            document.getElementById(id).classList.add('d-none');
        });
        document.getElementById(sectionId).classList.remove('d-none');
    }

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

    static createConfetti() {
        const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 2 + 's';
            confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
            document.body.appendChild(confetti);

            setTimeout(() => confetti.remove(), 5000);
        }
    }
}

// Main Application
class SpinWinApp {
    constructor() {
        this.wheel = null;
        this.currentCustomer = null;
        this.init();
    }

    async init() {
        try {
            // Update campaign banner
            const isActive = await CampaignManager.updateBanner();

            // Setup event listeners
            this.setupEventListeners();

            // Load and display prizes dynamically
            await this.loadPrizeCategories();

            // Show welcome modal
            this.showWelcomeModal();

            // Check if campaign is active
            if (!isActive) {
                const result = await CampaignManager.getCampaign();
                document.getElementById('entrySection').innerHTML = `
                    <div class="alert alert-danger text-center">
                        <h4><i class="bi bi-x-circle"></i> Campaign Ended</h4>
                        <p>The spin and win campaign is not currently active.</p>
                        <a href="https://wa.me/${result.campaign.whatsappNumber}?text=Hello%20Sunkey%20Beauty%20Gallery,%20I%20want%20to%20buy%20wigs"
                           target="_blank"
                           class="btn btn-success mt-3">
                           <i class="bi bi-whatsapp"></i> Chat us on WhatsApp
                        </a>
                    </div>
                `;
            }
        } catch (error) {
            UIManager.showAlert('Error initializing app: ' + error.message, 'danger');
        }
    }

    async loadPrizeCategories() {
        try {
            const prizesData = await PrizeManager.getPrizes();
            const container = document.querySelector('.row.g-3');

            if (container && prizesData.prizes.length > 0) {
                container.innerHTML = prizesData.prizes.map(prize => `
                    <div class="col-md-6">
                        <div class="prize-info">
                            <div class="mb-2" style="font-size: 3rem;">${prize.emoji || prize.image}</div>
                            <p class="mb-0 mt-2 fw-bold">${prize.name}</p>
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Error loading prize categories:', error);
        }
    }

    showWelcomeModal() {
        // Always show the modal on every visit
        const modal = new bootstrap.Modal(document.getElementById('welcomeModal'));
        modal.show();
    }

    setupEventListeners() {
        // Customer entry
        document.getElementById('entryForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCustomerEntry();
        });

        // Screenshot button
        document.getElementById('screenshotBtn').addEventListener('click', () => {
            UIManager.showAlert('Take a screenshot now and show it to our sales representative!', 'info');
        });
    }

    async handleCustomerEntry() {
        const code = document.getElementById('customerCode').value.trim();
        const submitBtn = document.querySelector('#entryForm button[type="submit"]');

        if (!/^\d{4}$/.test(code)) {
            UIManager.showAlert('Please enter a valid 4-digit code!', 'warning');
            return;
        }

        try {
            // Show spinner
            const originalHTML = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Loading...';

            const result = await CustomerManager.verifyCode(code);
            this.currentCustomer = result.customer;
            this.showSpinWheel();
        } catch (error) {
            UIManager.showAlert(error.message || 'Invalid code!', 'danger');
            // Reset button
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-arrow-right-circle"></i> Continue to Spin';
        }
    }

    async showSpinWheel() {
        UIManager.showSection('spinInterface');
        document.getElementById('displayCode').textContent = this.currentCustomer.code;

        this.wheel = new SpinWheel('wheelCanvas');
        await this.wheel.setSegments(this.currentCustomer);
        this.wheel.draw();

        const spinButton = document.getElementById('spinButton');
        spinButton.onclick = () => this.handleSpin();
    }

    handleSpin() {
        this.wheel.spin((prize) => {
            this.showResult();
        });
    }

    async showResult() {
        try {
            // Record spin
            await CustomerManager.recordSpin(this.currentCustomer.code);

            // Show result
            const resultSection = document.getElementById('resultSection');
            const prizeImage = document.getElementById('prizeImage');
            const prizeName = document.getElementById('prizeName');
            const spinTime = document.getElementById('spinTime');

            prizeImage.src = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><text x='50%' y='50%' font-size='120' text-anchor='middle' dy='.3em'>${this.currentCustomer.prizeEmoji}</text></svg>`;
            prizeImage.alt = this.currentCustomer.prize;

            prizeName.textContent = this.currentCustomer.prize;
            spinTime.textContent = new Date().toLocaleString();

            resultSection.classList.remove('d-none');
            UIManager.createConfetti();
            resultSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (error) {
            UIManager.showAlert('Error recording spin: ' + error.message, 'danger');
        }
    }

}

// Offline detection
window.addEventListener('offline', () => {
    window.location.href = 'offline.html';
});

window.addEventListener('online', () => {
    console.log('Connection restored');
});

// Initialize app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new SpinWinApp();
});