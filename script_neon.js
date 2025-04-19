document.addEventListener('DOMContentLoaded', () => {
 const tg = window.Telegram.WebApp;

 // --- Basic Setup & State ---
 let currentEnergy = 100;
 let maxEnergy = 100;
 let energyRegenRate = 10; // Per hour
 let lastEnergyUpdate = Date.now();
 let dailyBonusAvailable = false;
 let dailyBonusClaimed = false;

 // --- Element References ---
 const energyDisplay = document.getElementById('header-energy');
 const energyBarFill = document.getElementById('energy-bar-fill');
 const actionHubButton = document.getElementById('action-hub-button');
 const dailyLoginModal = document.getElementById('daily-login-modal');
 const claimDailyBonusButton = document.getElementById('claim-daily-bonus-button');
 const dailyLoginPrompt = document.getElementById('daily-login-prompt');
 const genericModal = document.getElementById('generic-modal');

 // --- Logging Utility ---
 function logNeon(message) {
 console.log(`[NeonCore] ${message}`);
 }

 // --- Telegram WebApp Integration ---
 try {
 tg.ready();
 tg.expand();
 tg.disableVerticalSwipes(); // Prevent pull-to-refresh
 logNeon("Telegram WebApp SDK Ready.");
 if (tg.themeParams.bg_color) {
 document.documentElement.style.setProperty('--bg-color', tg.themeParams.bg_color);
 }
 if (tg.initDataUnsafe?.user) {
 document.getElementById('username-header').textContent = tg.initDataUnsafe.user.first_name || 'Player';
 logNeon(`User: ${tg.initDataUnsafe.user.username || tg.initDataUnsafe.user.id}`);
 } else {
 document.getElementById('username-header').textContent = 'Guest';
 }
 } catch (error) {
 logNeon(`Error initializing Telegram SDK: ${error}`);
 }

 // --- Energy System ---
 function updateEnergyDisplay() {
 if (energyDisplay && energyBarFill) {
 const displayValue = `${Math.floor(currentEnergy)}/${maxEnergy}`;
 energyDisplay.textContent = displayValue;
 const percentage = Math.min(100, (currentEnergy / maxEnergy) * 100);
 energyBarFill.style.width = `${percentage}%`;
 }
 }

 function regenerateEnergy() {
 const now = Date.now();
 const elapsedSeconds = (now - lastEnergyUpdate) / 1000;
 const energyToRegen = (elapsedSeconds / 3600) * energyRegenRate;

 if (currentEnergy < maxEnergy) {
 currentEnergy = Math.min(maxEnergy, currentEnergy + energyToRegen);
 updateEnergyDisplay();
 }
 lastEnergyUpdate = now;
 }

 setInterval(regenerateEnergy, 5000);

 function consumeEnergy(amount) {
 if (currentEnergy >= amount) {
 currentEnergy -= amount;
 lastEnergyUpdate = Date.now();
 updateEnergyDisplay();
 logNeon(`Consumed ${amount} energy. Remaining: ${currentEnergy}`);
 return true;
 } else {
 logNeon(`Not enough energy. Required: ${amount}, Available: ${currentEnergy}`);
 tg.showPopup({ title: 'Insufficient Energy', message: `You need ${amount} energy for this action.`, buttons: [{ type: 'ok' }] });
 return false;
 }
 }

 // --- Navigation Logic ---
 const navButtons = document.querySelectorAll('.bottom-nav-neon .nav-button-neon');
 const pageSections = document.querySelectorAll('.main-content-neon .page-section-neon');
 const mainContent = document.querySelector('.main-content-neon');
 const dashboardButton = document.querySelector('.nav-button-neon[data-target="page-dashboard"]');

 function setActivePage(targetId) {
 logNeon(`Navigating to: ${targetId}`);
 pageSections.forEach(section => section.classList.remove('active'));
 navButtons.forEach(button => button.classList.remove('active'));

 const targetSection = document.getElementById(targetId);
 const targetButton = document.querySelector(`.nav-button-neon[data-target="${targetId}"]`);

 if (targetSection) targetSection.classList.add('active');
 if (targetButton) targetButton.classList.add('active');
 if (targetId !== 'page-dashboard' && dashboardButton) dashboardButton.classList.remove('active');
 else if (targetId === 'page-dashboard' && dashboardButton) dashboardButton.classList.add('active');

 if (mainContent) mainContent.scrollTop = 0;
 loadPageData(targetId);
 }

 navButtons.forEach(button => {
 button.addEventListener('click', () => {
 const targetPageId = button.dataset.target;
 if (targetPageId) setActivePage(targetPageId);
 });
 });

 // --- Action Hub Button ---
 if (actionHubButton) {
 actionHubButton.addEventListener('click', () => {
 logNeon("Action Hub button clicked!");
 const energyCostPerTap = 1;
 const gemsPerTap = 2;
 if (consumeEnergy(energyCostPerTap)) {
 const currentGems = parseInt(document.getElementById('header-gems').textContent || '0');
 updateGemsDisplay(currentGems + gemsPerTap);
 showFloatingText(`+${gemsPerTap}`, actionHubButton);
 logNeon(`Granted ${gemsPerTap} gems.`);
 }
 });
 }

 // --- Tab Switching Logic ---
 function setupTabs(containerSelector) {
 const tabContainers = document.querySelectorAll(containerSelector);
 tabContainers.forEach(container => {
 const tabs = container.querySelectorAll('.tabs-neon .tab-button-neon');
 const panes = container.querySelectorAll('.tab-pane-neon');

 tabs.forEach(tab => {
 tab.addEventListener('click', () => {
 const targetPaneId = `tab-content-${tab.dataset.tab}`;

 tabs.forEach(t => t.classList.remove('active'));
 panes.forEach(p => p.classList.remove('active'));

 tab.classList.add('active');
 const targetPane = container.querySelector(`#${targetPaneId}`);
 if (targetPane) targetPane.classList.add('active');

 logNeon(`Switched to tab: ${tab.dataset.tab}`);
 loadTabData(tab.dataset.tab);
 });
 });
 });
 }
 setupTabs('#page-tasks');
 setupTabs('#page-boost');
 setupTabs('#page-social');

 function loadTabData(tabName) {
 logNeon(`Loading data for tab: ${tabName}`);
 switch(tabName) {
 case 'quests': fetchQuests(); break;
 case 'achievements': fetchAchievements(); break;
 case 'upgrades': fetchUpgrades(); break;
 case 'chests': fetchChests(); break;
 case 'frens': fetchFrens(); break;
 case 'leaderboard': fetchLeaderboard(); break;
 }
 }

 // --- Modal Logic ---
 function setupModal(modalElement) {
 if (!modalElement) return;
 const closeButton = modalElement.querySelector('.modal-close-neon');
 closeButton?.addEventListener('click', () => closeModal(modalElement));
 modalElement.addEventListener('click', (event) => {
 if (event.target === modalElement) {
 closeModal(modalElement);
 }
 });
 }

 function openModal(modalElement) {
 if (modalElement) {
 modalElement.style.display = 'flex';
 logNeon(`Opened modal: #${modalElement.id}`);
 }
 }
 function closeModal(modalElement) {
 if (modalElement) {
 modalElement.style.display = 'none';
 logNeon(`Closed modal: #${modalElement.id}`);
 }
 }

 setupModal(dailyLoginModal);
 setupModal(genericModal);

 // --- Daily Login Bonus Logic ---
 function checkDailyLoginStatus() {
 logNeon("Checking daily login status...");
 setTimeout(() => {
 const isAvailable = !dailyBonusClaimed;
 dailyBonusAvailable = isAvailable;
 if (isAvailable) {
 logNeon("Daily bonus available.");
 if (dailyLoginPrompt) dailyLoginPrompt.style.display = 'block';
 } else {
 logNeon("Daily bonus not available or already claimed.");
 if (dailyLoginPrompt) dailyLoginPrompt.style.display = 'none';
 }
 }, 500);
 }

 if (dailyLoginPrompt) {
 dailyLoginPrompt.addEventListener('click', () => openModal(dailyLoginModal));
 }

 if (claimDailyBonusButton) {
 claimDailyBonusButton.addEventListener('click', () => {
 logNeon("Attempting to claim daily bonus...");
 setTimeout(() => {
 logNeon("Daily bonus claimed successfully!");
 dailyBonusClaimed = true;
 dailyBonusAvailable = false;
 closeModal(dailyLoginModal);
 if (dailyLoginPrompt) dailyLoginPrompt.style.display = 'none';
 const rewardAmount = 100;
 const currentGems = parseInt(document.getElementById('header-gems').textContent || '0');
 updateGemsDisplay(currentGems + rewardAmount);
 tg.showPopup({ title: 'Success!', message: `You claimed ${rewardAmount} gems!`, buttons: [{ type: 'ok' }] });
 addActivity("🎁 Daily bonus claimed!", 'success');
 }, 300);
 });
 }

 // --- Placeholder Data Loading Functions ---
 function updateGemsDisplay(newAmount) {
 document.getElementById('header-gems').textContent = newAmount;
 const walletGems = document.getElementById('wallet-detail-gems');
 if (walletGems) walletGems.textContent = newAmount;
 const walletSummaryGems = document.getElementById('wallet-summary-gems');
 if (walletSummaryGems) walletSummaryGems.textContent = newAmount;
 }

 function fetchInitialData() {
 logNeon("Fetching initial user data...");
 setTimeout(() => {
 updateGemsDisplay(500);
 currentEnergy = 80;
 maxEnergy = 120;
 energyRegenRate = 12;
 lastEnergyUpdate = Date.now();
 updateEnergyDisplay();

 document.getElementById('dash-level').textContent = '3';
 document.getElementById('dash-frens').textContent = '5';
 document.getElementById('dash-rate').innerHTML = `~${calculateRate()} <img src="assets/icons/neon_gem.png" class="inline-icon" alt="Gems">`;

 checkDailyLoginStatus();

 logNeon("Initial data loaded (simulated).");
 }, 400);
 }

 function calculateRate() {
 return 15;
 }

 function fetchQuests() { logNeon("Fetching Quests..."); }
 function fetchAchievements() { logNeon("Fetching Achievements..."); }
 function fetchUpgrades() { logNeon("Fetching Upgrades..."); }
 function fetchChests() { logNeon("Fetching Chests..."); }
 function fetchFrens() { logNeon("Fetching Frens..."); }
 function fetchLeaderboard() {
 const type = document.getElementById('leaderboard-type')?.value || 'gems_total';
 logNeon(`Fetching Leaderboard (${type})...`);
 }
 function fetchWalletData() { logNeon("Fetching Wallet Data..."); }
 function fetchActivityFeed() {
 logNeon("Fetching Activity Feed...");
 setTimeout(() => {
 addActivity("⚡ Energy refilled!", 'info');
 addActivity("✅ Quest 'Daily Check-in' done", 'success');
 }, 1000);
 }

 function addActivity(message, type = 'info') {
 const list = document.getElementById('activity-list');
 if (!list) return;
 const placeholder = list.querySelector('.placeholder');
 if (placeholder) placeholder.remove();

 const item = document.createElement('li');
 item.classList.add('activity-item');
 let icon = '';
 if (type === 'success') icon = '✅ ';
 else if (type === 'info') icon = 'ℹ️ ';
 else if (type === 'reward') icon = '🎁 ';
 else if (type === 'error') icon = '❌ ';
 else if (type === 'energy') icon = '⚡ ';

 item.innerHTML = `${icon}${message}`;
 list.prepend(item);
 while (list.children.length > 5) {
 list.removeChild(list.lastChild);
 }
 }

 // --- Load data based on the active page ---
 function loadPageData(pageId) {
 switch(pageId) {
 case 'page-dashboard':
 fetchActivityFeed();
 break;
 case 'page-tasks':
 const activeTaskTab = document.querySelector('#page-tasks .tab-button-neon.active')?.dataset.tab;
 if (activeTaskTab) loadTabData(activeTaskTab); else loadTabData('quests');
 break;
 case 'page-boost':
 const activeBoostTab = document.querySelector('#page-boost .tab-button-neon.active')?.dataset.tab;
 if (activeBoostTab) loadTabData(activeBoostTab); else loadTabData('upgrades');
 break;
 case 'page-social':
 const activeSocialTab = document.querySelector('#page-social .tab-button-neon.active')?.dataset.tab;
 if (activeSocialTab) loadTabData(activeSocialTab); else loadTabData('frens');
 break;
 case 'page-wallet':
 fetchWalletData();
 break;
 }
 }

 const leaderboardSelect = document.getElementById('leaderboard-type');
 if (leaderboardSelect) {
 leaderboardSelect.addEventListener('change', fetchLeaderboard);
 }

 // --- Wallet Connection ---
 const connectWalletButton = document.getElementById('connect-wallet-button-neon');
 const walletStatusElement = document.getElementById('wallet-status-neon');
 let isWalletConnected = false;

 if (connectWalletButton && walletStatusElement) {
 connectWalletButton.addEventListener('click', () => {
 if (isWalletConnected) {
 logNeon("Disconnecting Wallet (Simulated)...");
 isWalletConnected = false;
 updateWalletStatusUI(null);
 } else {
 logNeon("Connecting Wallet (Simulated)...");
 setTimeout(() => {
 const fakeAddress = 'EQA...xyz';
 isWalletConnected = true;
 updateWalletStatusUI(fakeAddress);
 logNeon(`Wallet connected: ${fakeAddress}`);
 }, 1000);
 }
 });
 }

 function updateWalletStatusUI(address) {
 if (!walletStatusElement || !connectWalletButton) return;
 const withdrawButtons = document.querySelectorAll('.withdraw-btn-neon');

 if (isWalletConnected && address) {
 connectWalletButton.textContent = 'Disconnect Wallet';
 connectWalletButton.classList.add('connected');
 walletStatusElement.textContent = `Connected: ${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
 walletStatusElement.className = 'wallet-status-neon connected';
 withdrawButtons.forEach(btn => btn.disabled = false);
 } else {
 connectWalletButton.textContent = 'Connect Wallet';
 connectWalletButton.classList.remove('connected');
 walletStatusElement.textContent = 'Not Connected';
 walletStatusElement.className = 'wallet-status-neon disconnected';
 withdrawButtons.forEach(btn => btn.disabled = true);
 }
 }

 // --- Floating Text Effect ---
 function showFloatingText(text, element) {
 const floatEl = document.createElement('div');
 floatEl.textContent = text;
 floatEl.style.position = 'absolute';
 floatEl.style.left = `${element.offsetLeft + element.offsetWidth / 2}px`;
 floatEl.style.top = `${element.offsetTop}px`;
 floatEl.style.transform = 'translate(-50%, -100%)';
 floatEl.style.color = 'var(--neon-gold)';
 floatEl.style.fontSize = '1.2rem';
 floatEl.style.fontWeight = 'bold';
 floatEl.style.textShadow = '0 0 5px black';
 floatEl .style.pointerEvents = 'none';
 floatEl.style.opacity = '1';
 floatEl.style.transition = 'transform 1s ease-out, opacity 1s ease-out';
 document.body.appendChild(floatEl);

 requestAnimationFrame(() => {
 floatEl.style.transform = 'translate(-50%, -180%)';
 floatEl.style.opacity = '0';
 });

 setTimeout(() => {
 floatEl.remove();
 }, 1000);
 }

 // --- Initial Load ---
 fetchInitialData();
 setActivePage('page-dashboard');
 updateWalletStatusUI(null);
});
