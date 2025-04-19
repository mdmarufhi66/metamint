document.addEventListener('DOMContentLoaded', () => {
    const tg = window.Telegram.WebApp;

    // --- Basic Setup & State ---
    let currentEnergy = 100;
    let maxEnergy = 100;
    let energyRegenRate = 10; // Per hour
    let lastEnergyUpdate = Date.now();
    let dailyBonusAvailable = false; // Assume needs checking
    let dailyBonusClaimed = false; // Assume needs checking

    // --- Element References ---
    const energyDisplay = document.getElementById('header-energy');
    const energyBarFill = document.getElementById('energy-bar-fill');
    const actionHubButton = document.getElementById('action-hub-button');
    const dailyLoginModal = document.getElementById('daily-login-modal');
    const claimDailyBonusButton = document.getElementById('claim-daily-bonus-button');
    const dailyLoginPrompt = document.getElementById('daily-login-prompt');
    const genericModal = document.getElementById('generic-modal');

    // --- Logging Utility (Optional) ---
    function logNeon(message) {
        console.log(`[NeonCore] ${message}`);
        // Add to a debug console if you implement one
    }

    // --- Telegram WebApp Integration ---
    try {
        tg.ready();
        tg.expand();
        logNeon("Telegram WebApp SDK Ready.");
        // Set user info if available
        if (tg.initDataUnsafe?.user) {
            document.getElementById('username-header').textContent = tg.initDataUnsafe.user.first_name || 'Player';
            logNeon(`User: ${tg.initDataUnsafe.user.username || tg.initDataUnsafe.user.id}`);
            // Fetch real avatar URL if possible
        } else {
             document.getElementById('username-header').textContent = 'Guest';
        }
        // You could potentially adjust theme variables based on tg.themeParams
        // e.g., :root { --bg-color: tg.themeParams.bg_color || '#050a18'; }
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
        const energyToRegen = (elapsedSeconds / 3600) * energyRegenRate; // Energy per second

        if (currentEnergy < maxEnergy) {
            currentEnergy = Math.min(maxEnergy, currentEnergy + energyToRegen);
            updateEnergyDisplay();
        }
        lastEnergyUpdate = now;
    }

    // Start energy regeneration timer
    setInterval(regenerateEnergy, 5000); // Check every 5 seconds

    function consumeEnergy(amount) {
        if (currentEnergy >= amount) {
            currentEnergy -= amount;
            lastEnergyUpdate = Date.now(); // Reset timer immediately after consumption
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
    const dashboardButton = document.querySelector('.nav-button-neon[data-target="page-dashboard"]'); // Hidden home button

    function setActivePage(targetId) {
        logNeon(`Navigating to: ${targetId}`);
        pageSections.forEach(section => section.classList.remove('active'));
        navButtons.forEach(button => button.classList.remove('active'));

        const targetSection = document.getElementById(targetId);
        const targetButton = document.querySelector(`.nav-button-neon[data-target="${targetId}"]`);

        if (targetSection) targetSection.classList.add('active');
        if (targetButton) targetButton.classList.add('active');
        // If navigating away from dashboard, make dashboard button inactive
        if(targetId !== 'page-dashboard' && dashboardButton) dashboardButton.classList.remove('active');
         // Special case: If target is dashboard, activate its hidden button
         else if (targetId === 'page-dashboard' && dashboardButton) dashboardButton.classList.add('active');


        if (mainContent) mainContent.scrollTop = 0;
        loadPageData(targetId); // Load data for the new page
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
            // Example Action: Consume energy, grant gems (Tap-to-earn style)
            const energyCostPerTap = 1;
            const gemsPerTap = 2; // This could be affected by upgrades
            if (consumeEnergy(energyCostPerTap)) {
                // Grant resources - update backend and frontend
                const currentGems = parseInt(document.getElementById('header-gems').textContent || '0');
                updateGemsDisplay(currentGems + gemsPerTap); // Update UI immediately

                // Add visual feedback
                showFloatingText(`+${gemsPerTap}`, actionHubButton);

                // TODO: Send update to backend API
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
                     // Optionally load data specific to the tab
                    loadTabData(tab.dataset.tab);
                });
            });
        });
    }
    setupTabs('#page-tasks'); // Setup tabs in Tasks section
    setupTabs('#page-boost'); // Setup tabs in Boost section
    setupTabs('#page-social'); // Setup tabs in Social section

    function loadTabData(tabName) {
        logNeon(`Loading data for tab: ${tabName}`);
        switch(tabName) {
            case 'quests': fetchQuests(); break;
            case 'achievements': fetchAchievements(); break;
            case 'upgrades': fetchUpgrades(); break;
            case 'chests': fetchChests(); break;
            case 'frens': fetchFrens(); break;
            case 'leaderboard': fetchLeaderboard(); break; // Load default leaderboard
        }
    }

    // --- Modal Logic ---
    function setupModal(modalElement) {
         if (!modalElement) return;
         const closeButton = modalElement.querySelector('.modal-close-neon');
         closeButton?.addEventListener('click', () => closeModal(modalElement));
         // Close on backdrop click
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

     // Setup standard modals
     setupModal(dailyLoginModal);
     setupModal(genericModal);

     // --- Daily Login Bonus Logic ---
     function checkDailyLoginStatus() {
         logNeon("Checking daily login status...");
         // TODO: API call to check if bonus is available and not claimed
         setTimeout(() => { // Simulate API call
             const isAvailable = !dailyBonusClaimed; // Replace with actual server check
             dailyBonusAvailable = isAvailable;
             if (isAvailable) {
                 logNeon("Daily bonus available.");
                 if (dailyLoginPrompt) dailyLoginPrompt.style.display = 'block';
                  // Optionally open the modal automatically if desired
                 // openModal(dailyLoginModal);
                 // Set the reward amount in the modal
                 // document.getElementById('daily-reward-amount').innerHTML = `+100 <img src="assets/icons/neon_gem.png" class="inline-icon">`;
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
              // TODO: API call to claim the bonus
             setTimeout(() => { // Simulate API call
                 // On success:
                 logNeon("Daily bonus claimed successfully!");
                 dailyBonusClaimed = true;
                 dailyBonusAvailable = false; // Mark as unavailable for today
                 closeModal(dailyLoginModal);
                 if (dailyLoginPrompt) dailyLoginPrompt.style.display = 'none';
                 // Update user's gem balance
                 const rewardAmount = 100; // Get actual reward from server/modal
                 const currentGems = parseInt(document.getElementById('header-gems').textContent || '0');
                 updateGemsDisplay(currentGems + rewardAmount);
                 // Show confirmation
                 tg.showPopup({ title: 'Success!', message: `You claimed ${rewardAmount} gems!`, buttons: [{ type: 'ok' }] });
                 // Add to activity feed
                 addActivity("🎁 Daily bonus claimed!", 'success');

             }, 300);
         });
     }


    // --- Placeholder Data Loading Functions ---
    function updateGemsDisplay(newAmount) {
         document.getElementById('header-gems').textContent = newAmount;
         // Update wallet display if needed
         const walletGems = document.getElementById('wallet-detail-gems');
         if (walletGems) walletGems.textContent = newAmount;
         const walletSummaryGems = document.getElementById('wallet-summary-gems');
         if (walletSummaryGems) walletSummaryGems.textContent = newAmount;
    }

    function fetchInitialData() {
        logNeon("Fetching initial user data...");
        // API Call to get gems, energy, level, upgrades, etc.
        setTimeout(() => { // Simulate API call
            updateGemsDisplay(500); // Example gems
            currentEnergy = 80; // Example energy
            maxEnergy = 120; // Example max energy (maybe from upgrades)
            energyRegenRate = 12; // Example regen rate
            lastEnergyUpdate = Date.now();
            updateEnergyDisplay();

            document.getElementById('dash-level').textContent = '3';
            document.getElementById('dash-frens').textContent = '5';
            document.getElementById('dash-rate').innerHTML = `~${calculateRate()} <img src="assets/icons/neon_gem.png" class="inline-icon" alt="Gems">`;

             // Check daily login after getting initial data
             checkDailyLoginStatus();

            logNeon("Initial data loaded (simulated).");
        }, 400);
    }

     function calculateRate() {
         // Placeholder: Calculate based on upgrades, level, etc.
         return 15; // Example rate
     }

    function fetchQuests() { logNeon("Fetching Quests..."); /* API Call */ }
    function fetchAchievements() { logNeon("Fetching Achievements..."); /* API Call */ }
    function fetchUpgrades() { logNeon("Fetching Upgrades..."); /* API Call */ }
    function fetchChests() { logNeon("Fetching Chests..."); /* API Call */ }
    function fetchFrens() { logNeon("Fetching Frens..."); /* API Call */ }
    function fetchLeaderboard() {
        const type = document.getElementById('leaderboard-type')?.value || 'gems_total';
        logNeon(`Workspaceing Leaderboard (${type})...`); /* API Call */
    }
    function fetchWalletData() { logNeon("Fetching Wallet Data..."); /* API Call */ }
    function fetchActivityFeed() { logNeon("Fetching Activity Feed..."); /* API Call */
        // Example: Populate activity feed
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
        // Add icon based on type?
        let icon = '';
         if (type === 'success') icon = '✅ ';
         else if (type === 'info') icon = 'ℹ️ ';
         else if (type === 'reward') icon = '🎁 ';
         else if (type === 'error') icon = '❌ ';
         else if (type === 'energy') icon = '⚡ ';

        item.innerHTML = `${icon}${message}`;
        list.prepend(item); // Add to top
        // Limit number of items shown?
        while (list.children.length > 5) {
             list.removeChild(list.lastChild);
        }
    }


    // --- Load data based on the active page ---
    function loadPageData(pageId) {
        switch(pageId) {
            case 'page-dashboard':
                 fetchActivityFeed(); // Refresh activity on dashboard view
                 // Other dashboard specific data?
                break;
            case 'page-tasks':
                 // Load data for the currently active tab within Tasks
                 const activeTaskTab = document.querySelector('#page-tasks .tab-button-neon.active')?.dataset.tab;
                 if (activeTaskTab) loadTabData(activeTaskTab); else loadTabData('quests'); // Default
                break;
             case 'page-boost':
                 const activeBoostTab = document.querySelector('#page-boost .tab-button-neon.active')?.dataset.tab;
                 if (activeBoostTab) loadTabData(activeBoostTab); else loadTabData('upgrades'); // Default
                break;
            case 'page-social':
                 const activeSocialTab = document.querySelector('#page-social .tab-button-neon.active')?.dataset.tab;
                 if (activeSocialTab) loadTabData(activeSocialTab); else loadTabData('frens'); // Default
                break;
            case 'page-wallet':
                fetchWalletData();
                break;
        }
    }

     // Add listener for leaderboard type change
     const leaderboardSelect = document.getElementById('leaderboard-type');
     if (leaderboardSelect) {
         leaderboardSelect.addEventListener('change', fetchLeaderboard);
     }

    // --- Wallet Connection (Placeholder) ---
     const connectWalletButton = document.getElementById('connect-wallet-button-neon');
     const walletStatusElement = document.getElementById('wallet-status-neon');
     let isWalletConnected = false; // Keep track of connection state

     if (connectWalletButton && walletStatusElement) {
         connectWalletButton.addEventListener('click', () => {
             if (isWalletConnected) {
                 logNeon("Disconnecting Wallet (Simulated)...");
                 // TODO: Add actual disconnect logic via wallet library
                 isWalletConnected = false;
                 updateWalletStatusUI(null); // Update UI
             } else {
                 logNeon("Connecting Wallet (Simulated)...");
                 // TODO: Trigger wallet connection (e.g., TON Connect UI)
                 // On success callback from wallet library:
                 setTimeout(() => { // Simulate connection success
                     const fakeAddress = 'EQA...xyz'; // Replace with actual address from wallet
                     isWalletConnected = true;
                     updateWalletStatusUI(fakeAddress); // Update UI
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
             connectWalletButton.classList.add('connected'); // Add class if needed for styling
             walletStatusElement.textContent = `Connected: ${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
             walletStatusElement.className = 'wallet-status-neon connected';
             // Enable withdraw buttons
              withdrawButtons.forEach(btn => btn.disabled = false);
         } else {
             connectWalletButton.textContent = 'Connect Wallet';
             connectWalletButton.classList.remove('connected');
             walletStatusElement.textContent = 'Not Connected';
             walletStatusElement.className = 'wallet-status-neon disconnected';
              // Disable withdraw buttons
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
        floatEl.style.transform = 'translate(-50%, -100%)'; // Center above element
        floatEl.style.color = 'var(--neon-gold)';
        floatEl.style.fontSize = '1.2rem';
        floatEl.style.fontWeight = 'bold';
        floatEl.style.textShadow = '0 0 5px black';
        floatEl.style.pointerEvents = 'none';
        floatEl.style.opacity = '1';
        floatEl.style.transition = 'transform 1s ease-out, opacity 1s ease-out';
        document.body.appendChild(floatEl);

        // Animate upwards and fade out
        requestAnimationFrame(() => {
            floatEl.style.transform = 'translate(-50%, -180%)'; // Move further up
            floatEl.style.opacity = '0';
        });

        // Remove element after animation
        setTimeout(() => {
            floatEl.remove();
        }, 1000);
    }

    // --- Initial Load ---
    fetchInitialData(); // Load user state first
    setActivePage('page-dashboard'); // Set initial page to dashboard
    updateWalletStatusUI(null); // Set initial wallet UI state


}); // End DOMContentLoaded
