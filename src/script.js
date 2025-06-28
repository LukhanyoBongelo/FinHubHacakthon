// Global state
let campaigns = [];
let walletBalance = 0;
let transactions = [];
let isWalletConnected = false;

const INTERLEDGER_CONFIG = {
    endpoint: 'hhttp://localhost:3001/api', // FinhubX Interledger endpoint
    apiKey: '7f403879-359a-4c1c-b168-2ee6543bdd03',
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    loadSampleCampaigns();
    setupEventListeners();
});

function initializeApp() {
    // Load saved data from localStorage
    const savedCampaigns = localStorage.getItem('crowdfund_campaigns');
    const savedBalance = localStorage.getItem('wallet_balance');
    const savedTransactions = localStorage.getItem('transactions');
    
    if (savedCampaigns) {
        campaigns = JSON.parse(savedCampaigns);
    }
    
    if (savedBalance) {
        walletBalance = parseFloat(savedBalance);
        updateWalletDisplay();
    }
    
    if (savedTransactions) {
        transactions = JSON.parse(savedTransactions);
        updateTransactionHistory();
    }
}

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = e.target.getAttribute('href').substring(1);
            scrollToSection(target);
        });
    });

    // Wallet connection
    document.getElementById('connect-wallet').addEventListener('click', connectWallet);
    
    // Campaign form
    document.getElementById('campaign-form').addEventListener('submit', createCampaign);
    
    // Wallet actions
    document.getElementById('add-funds').addEventListener('click', addFunds);
    document.getElementById('withdraw-funds').addEventListener('click', withdrawFunds);
    
    // Modal controls
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', closeModal);
    });
    
    // Payment processing
    document.getElementById('process-payment').addEventListener('click', processPayment);
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal();
        }
    });
}

function loadSampleCampaigns() {
    if (campaigns.length === 0) {
        campaigns = [
            {
                id: 1,
                title: "Revolutionary Solar Panel Technology",
                description: "Developing next-generation solar panels with 40% higher efficiency using quantum dot technology.",
                goal: 50000,
                raised: 32500,
                duration: 45,
                category: "technology",
                creator: "Dr. Sarah Chen",
                paymentPointer: "$ilp.interledger-test.dev/sima",
                supporters: 127,
                createdAt: new Date().toISOString()
            },
            {
                id: 2,
                title: "Community Art Center",
                description: "Building a community art center to provide free art classes and workshops for underprivileged children.",
                goal: 25000,
                raised: 18750,
                duration: 30,
                category: "social",
                creator: "Maria Rodriguez",
                paymentPointer: "$ilp.interledger-test.dev/sima",
                supporters: 89,
                createdAt: new Date().toISOString()
            },
            {
                id: 3,
                title: "Eco-Friendly Food Packaging",
                description: "Creating biodegradable food packaging from agricultural waste to reduce plastic pollution.",
                goal: 75000,
                raised: 45000,
                duration: 60,
                category: "business",
                creator: "Green Innovations Ltd",
                paymentPointer: "$ilp.interledger-test.dev/sima",
                supporters: 203,
                createdAt: new Date().toISOString()
            }
        ];
        saveCampaigns();
    }
    renderCampaigns();
}

function renderCampaigns() {
    const grid = document.getElementById('campaigns-grid');
    grid.innerHTML = '';
    
    campaigns.forEach(campaign => {
        const progressPercentage = Math.min((campaign.raised / campaign.goal) * 100, 100);
        const daysLeft = Math.max(0, campaign.duration - Math.floor((new Date() - new Date(campaign.createdAt)) / (1000 * 60 * 60 * 24)));
        
        const campaignCard = document.createElement('div');
        campaignCard.className = 'campaign-card';
        campaignCard.innerHTML = `
            <div class="campaign-image">
                <i class="fas fa-lightbulb"></i>
            </div>
            <div class="campaign-content">
                <h3 class="campaign-title">${campaign.title}</h3>
                <p class="campaign-description">${campaign.description.substring(0, 100)}...</p>
                <div class="campaign-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progressPercentage}%"></div>
                    </div>
                    <div class="campaign-stats">
                        <span>$${campaign.raised.toLocaleString()} raised</span>
                        <span>${daysLeft} days left</span>
                    </div>
                </div>
                <div class="campaign-actions">
                    <button class="btn-primary" onclick="supportCampaign(${campaign.id})">Support</button>
                    <button class="btn-secondary" onclick="viewCampaign(${campaign.id})">View Details</button>
                </div>
            </div>
        `;
        
        grid.appendChild(campaignCard);
    });
}

function createCampaign(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const campaign = {
        id: Date.now(),
        title: document.getElementById('title').value,
        description: document.getElementById('description').value,
        goal: parseFloat(document.getElementById('goal').value),
        raised: 0,
        duration: parseInt(document.getElementById('duration').value),
        category: document.getElementById('category').value,
        creator: "You",
        paymentPointer: document.getElementById('payment-pointer').value,
        supporters: 0,
        createdAt: new Date().toISOString()
    };
    
    campaigns.unshift(campaign);
    saveCampaigns();
    renderCampaigns();
    
    // Reset form
    e.target.reset();
    
    showMessage('Campaign created successfully!', 'success');
    scrollToSection('campaigns');
}

function supportCampaign(campaignId) {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return;
    
    if (!isWalletConnected) {
        showMessage('Please connect your wallet first', 'error');
        return;
    }
    
    // Store current campaign for payment
    window.currentCampaign = campaign;
    
    // Show payment modal
    document.getElementById('payment-modal').style.display = 'block';
}

function viewCampaign(campaignId) {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return;
    
    const progressPercentage = Math.min((campaign.raised / campaign.goal) * 100, 100);
    const daysLeft = Math.max(0, campaign.duration - Math.floor((new Date() - new Date(campaign.createdAt)) / (1000 * 60 * 60 * 24)));
    
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <h2>${campaign.title}</h2>
        <div class="campaign-image" style="height: 250px; margin: 20px 0;">
            <i class="fas fa-lightbulb"></i>
        </div>
        <p><strong>Creator:</strong> ${campaign.creator}</p>
        <p><strong>Category:</strong> ${campaign.category}</p>
        <p><strong>Description:</strong></p>
        <p>${campaign.description}</p>
        <div class="campaign-progress" style="margin: 30px 0;">
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progressPercentage}%"></div>
            </div>
            <div class="campaign-stats">
                <span>$${campaign.raised.toLocaleString()} of $${campaign.goal.toLocaleString()}</span>
                <span>${campaign.supporters} supporters</span>
                <span>${daysLeft} days left</span>
            </div>
        </div>
        <div style="text-align: center; margin-top: 30px;">
            <button class="btn-primary" onclick="supportCampaign(${campaign.id}); closeModal();">Support This Campaign</button>
        </div>
    `;
    
    document.getElementById('campaign-modal').style.display = 'block';
}

async function processPayment() {
    const amount = parseFloat(document.getElementById('payment-amount').value);
    const supporterName = document.getElementById('supporter-name').value || 'Anonymous';
    const message = document.getElementById('support-message').value;
    
    if (!amount || amount <= 0) {
        showMessage('Please enter a valid amount', 'error');
        return;
    }
    
    if (amount > walletBalance) {
        showMessage('Insufficient funds in wallet', 'error');
        return;
    }
    
    const campaign = window.currentCampaign;
    if (!campaign) return;
    
    // Show loading state
    const button = document.getElementById('process-payment');
    const originalText = button.textContent;
    button.innerHTML = '<span class="loading"></span> Processing...';
    button.disabled = true;
    
    try {
        // Simulate Interledger payment
        await interledgerClient.sendPayment(campaign.paymentPointer, amount, `Support for ${campaign.title}`);
        //await simulateInterledgerPayment(campaign.paymentPointer, amount)
        
        // Update campaign
        const campaignIndex = campaigns.findIndex(c => c.id === campaign.id);
        campaigns[campaignIndex].raised += amount;
        campaigns[campaignIndex].supporters += 1;
        
        // Update wallet
        walletBalance -= amount;
        
        // Add transaction
        const transaction = {
            id: Date.now(),
            type: 'payment',
            amount: -amount,
            description: `Supported: ${campaign.title}`,
            timestamp: new Date().toISOString(),
            supporter: supporterName,
            message: message
        };
        
        transactions.unshift(transaction);
        
        // Save data
        saveCampaigns();
        saveWalletData();
        
        // Update UI
        renderCampaigns();
        updateWalletDisplay();
        updateTransactionHistory();
        
        // Close modal and show success
        closeModal();
        showMessage(`Successfully sent $${amount} to ${campaign.title}!`, 'success');
        
        // Reset form
        document.getElementById('payment-amount').value = '';
        document.getElementById('supporter-name').value = '';
        document.getElementById('support-message').value = '';
        
    } catch (error) {
        console.error('Payment failed:', error);
        showMessage('Payment failed. Please try again.', 'error');
    } finally {
        button.textContent = originalText;
        button.disabled = false;
    }
}

async function simulateInterledgerPayment(paymentPointer, amount) {
    // Simulate Interledger payment process
    // In a real implementation, this would use the actual Interledger protocol
    
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // Simulate 95% success rate
            if (Math.random() > 0.05) {
                console.log(`Interledger payment sent: $${amount} to ${paymentPointer}`);
                resolve();
            } else {
                reject(new Error('Payment failed'));
            }
        }, 2000); // Simulate network delay
    });
}

function connectWallet() {
    if (isWalletConnected) {
        // Disconnect wallet
        isWalletConnected = false;
        document.getElementById('connect-wallet').textContent = 'Connect Wallet';
        showMessage('Wallet disconnected', 'success');
    } else {
        // Simulate wallet connection
        isWalletConnected = true;
        document.getElementById('connect-wallet').textContent = 'Disconnect';
        
        // Add some initial funds for demo
        if (walletBalance === 0) {
            walletBalance = 1000;
            updateWalletDisplay();
            saveWalletData();
        }
        
        showMessage('Wallet connected successfully!', 'success');
    }
}

function addFunds() {
    if (!isWalletConnected) {
        showMessage('Please connect your wallet first', 'error');
        return;
    }
    
    const amount = prompt('Enter amount to add:');
    if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
        walletBalance += parseFloat(amount);
        
        const transaction = {
            id: Date.now(),
            type: 'deposit',
            amount: parseFloat(amount),
            description: 'Funds added to wallet',
            timestamp: new Date().toISOString()
        };
        
        transactions.unshift(transaction);
        updateWalletDisplay();
        updateTransactionHistory();
        saveWalletData();
        
        showMessage(`$${amount} added to wallet`, 'success');
    }
}

function withdrawFunds() {
    if (!isWalletConnected) {
        showMessage('Please connect your wallet first', 'error');
        return;
    }
    
    const amount = prompt('Enter amount to withdraw:');
    if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
        if (parseFloat(amount) > walletBalance) {
            showMessage('Insufficient funds', 'error');
            return;
        }
        
        walletBalance -= parseFloat(amount);
        
        const transaction = {
            id: Date.now(),
            type: 'withdrawal',
            amount: -parseFloat(amount),
            description: 'Funds withdrawn from wallet',
            timestamp: new Date().toISOString()
        };
        
        transactions.unshift(transaction);
        updateWalletDisplay();
        updateTransactionHistory();
        saveWalletData();
        
        showMessage(`$${amount} withdrawn from wallet`, 'success');
    }
}

function updateWalletDisplay() {
    const balanceElements = document.querySelectorAll('#wallet-balance, #wallet-display');
    balanceElements.forEach(element => {
        element.textContent = `$${walletBalance.toFixed(2)}`;
    });
}

function updateTransactionHistory() {
    const transactionsList = document.getElementById('transactions-list');
    
    if (transactions.length === 0) {
        transactionsList.innerHTML = '<p class="no-transactions">No transactions yet</p>';
        return;
    }
    
    transactionsList.innerHTML = transactions.map(transaction => `
        <div class="transaction-item">
            <div>
                <strong>${transaction.description}</strong>
                <br>
                <small>${new Date(transaction.timestamp).toLocaleString()}</small>
            </div>
            <div style="text-align: right;">
                <span style="color: ${transaction.amount > 0 ? '#28a745' : '#dc3545'}; font-weight: bold;">
                    ${transaction.amount > 0 ? '+' : ''}$${Math.abs(transaction.amount).toFixed(2)}
                </span>
            </div>
        </div>
    `).join('');
}

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

function showMessage(text, type) {
    // Remove existing messages
    document.querySelectorAll('.message').forEach(msg => msg.remove());
    
    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.textContent = text;
    
    document.body.appendChild(message);
    
    setTimeout(() => {
        message.remove();
    }, 5000);
}

function saveCampaigns() {
    localStorage.setItem('crowdfund_campaigns', JSON.stringify(campaigns));
}

function saveWalletData() {
    localStorage.setItem('wallet_balance', walletBalance.toString());
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

// Interledger Integration Functions
class InterledgerPayment {
    constructor(config) {
        this.endpoint = config.endpoint;
        this.apiKey = config.apiKey;
    }
    
    async sendPayment(paymentPointer, amount, memo = '') {
        try {
        // Step 1: Create quote
        const quoteRes = await fetch(`${this.endpoint}/create-quote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                destination: paymentPointer,
                amount: amount,
                currency: 'USD',
                memo: memo
            })
        });

        const quote = await quoteRes.json();
        if (!quote.id) throw new Error('Failed to create quote');

        // Step 2: Authorize outgoing payment
        const authRes = await fetch(`${this.endpoint}/outgoing-payment-auth`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                quoteId: quote.id
            })
        });

        const auth = await authRes.json();
        if (!auth.grant) throw new Error('Failed to authorize outgoing payment');

        // Step 3: Create outgoing payment
        const paymentRes = await fetch(`${this.endpoint}/outgoing-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                quoteId: quote.id,
                grant: auth.grant
            })
        });

        const payment = await paymentRes.json();
        if (!payment.id) throw new Error('Outgoing payment failed');

        console.log('Payment sent successfully:', payment);
        return payment;

    } catch (error) {
        console.error('Error in sendPayment:', error);
        throw new Error(error.message || 'Payment failed');
    }
}
    
    async simulateAPICall(endpoint, data) {
        // Simulate network delay and response
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (Math.random() > 0.1) { // 90% success rate
                    resolve({
                        success: true,
                        transactionId: 'tx_' + Date.now(),
                        amount: data.amount,
                        destination: data.destination,
                        timestamp: data.timestamp
                    });
                } else {
                    reject(new Error('Network error'));
                }
            }, 1000 + Math.random() * 2000); // 1-3 second delay
        });
    }
}

// Initialize Interledger client
const interledgerClient = new InterledgerPayment(INTERLEDGER_CONFIG);
