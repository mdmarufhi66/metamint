Document.addEventListener('DOMContentLoaded', () => {
    const tg = window.Telegram.WebApp;

    // --- Basic Setup & State ---
    let currentEnergy = 100;
    let maxEnergy = 100;
    let energyRegenRate = 10; // Per hour
    let lastEnergyUpdate = Date.now();
    let dailyBonusAvailable = false;
    let dailyBonusClaimed = false;
    // Add other state variables here as needed (e.g., gems, level, frens, etc.)

    // --- Element References ---
    const energyDisplay = document.getElementById('header-energy');
    const energyBarFill = document.getElementById('energy-bar-fill');
    const actionHubButton = document.getElementById('action-hub-button');
    const dailyLoginModal = document.getElementById('daily-login-modal');
    const claimDailyBonusButton = document.getElementById('claim-daily-bonus-button');
    const dailyLoginPrompt = document.getElementById('daily-login-prompt');
    const genericModal = document.getElementById('generic-modal');
    const userAvatarHeader = document.getElementById('user-avatar-header'); // Reference to the avatar element

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

        // Apply Telegram theme colors
        if (tg.themeParams.bg_color) {
            document.documentElement.style.setProperty('--bg-color', tg.themeParams.bg_color);
            // You can apply other theme parameters similarly
            // document.documentElement.style.setProperty('--text-color', tg.themeParams.text_color);
            // document.documentElement.style.setProperty('--hint-color', tg.themeParams.hint_color);
            // document.documentElement.style.setProperty('--link-color', tg.themeParams.link_color);
            // document.documentElement.style.setProperty('--button-color', tg.themeParams.button_color);
            // document.documentElement.style.setProperty('--button-text-color', tg.themeParams.button_text_color);
        }

        // Get and display user info
        if (tg.initDataUnsafe?.user) {
            const user = tg.initDataUnsafe.user;

            // Update username
            document.getElementById('username-header').textContent = user.first_name || 'Player';
            logNeon(`User: ${user.username || user.id}, First Name: ${user.first_name}`);

            // Update avatar if photo_url is available
            if (userAvatarHeader && user.photo_url) {
                logNeon(`Using user avatar URL: ${user.photo_url}`);
                userAvatarHeader.src = user.photo_url;
            } else {
                logNeon("User photo_url not available or avatar element not found, using default avatar from HTML.");
                // The default src="assets/avatars/avatar_default.png" in your HTML
                // will automatically be used if user.photo_url is not available.
            }

        } else {
            document.getElementById('username-header').textContent = 'Guest';
            logNeon("Telegram user data not available.");
        }
    } catch (error) {
        logNeon(`Error initializing Telegram SDK: ${error}`);
        // Fallback UI elements should handle cases where SDK fails
        if (document.getElementById('username-header').textContent === '') {
             document.getElementById('username-header').textContent = 'Error User';
        }
         if (userAvatarHeader) {
            // Ensure default avatar is shown if SDK fails
            userAvatarHeader.src = 'assets/avatars/avatar_default.png';
        }
    }

    // --- Energy System ---
    function updateEnergyDisplay() {
        if (energyDisplay && energyBarFill) {
            // Ensure energy doesn't exceed max for display but allow regeneration beyond visually
            const displayValue = `${Math.floor(Math.min(currentEnergy, maxEnergy))}/${maxEnergy}`;
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
            currentEnergy = Math.min(maxEnergy, currentEnergy + energyToRegen); // Cap at max for state
            updateEnergyDisplay();
            // Optional: Save lastEnergyUpdate and currentEnergy to local storage or backend
            // localStorage.setItem('lastEnergyUpdate', now);
            // localStorage.setItem('currentEnergy', currentEnergy);
        }
        lastEnergyUpdate = now;
    }

    // Regenerate energy every 5 seconds
    setInterval(regenerateEnergy, 5000);

    function consumeEnergy(amount) {
        if (currentEnergy >= amount) {
            currentEnergy -= amount;
            lastEnergyUpdate = Date.now(); // Update last regen time after consumption
            updateEnergyDisplay();
            logNeon(`Consumed ${amount} energy. Remaining: ${currentEnergy}`);
            // Optional: Save energy state
            // localStorage.setItem('currentEnergy', currentEnergy);
            // localStorage.setItem('lastEnergyUpdate', lastEnergyUpdate);
            return true;
        } else {
            logNeon(`Not enough energy. Required: ${amount}, Available: ${currentEnergy}`);
            tg.showPopup({
                title: 'Insufficient Energy',
                message: `You need ${amount} energy for this action.`,
                buttons: [{ type: 'ok' }]
            });
            return false;
        }
    }

    // --- Navigation Logic ---
    const navButtons = document.querySelectorAll('.bottom-nav-neon .nav-button-neon');
    const pageSections = document.querySelectorAll('.main-content-neon .page-section-neon');
    const mainContent = document.querySelector('.main-content-neon');
    // Keep a reference to the dashboard button to handle its active state specifically
    const dashboardButton = document.querySelector('.nav-button-neon[data-target="page-dashboard"]');

    function setActivePage(targetId) {
        logNeon(`Navigating to: ${targetId}`);

        // Remove active class from all pages and buttons
        pageSections.forEach(section => section.classList.remove('active'));
        navButtons.forEach(button => button.classList.remove('active'));

        // Add active class to the target page and button
        const targetSection = document.getElementById(targetId);
        const targetButton = document.querySelector(`.nav-button-neon[data-target="${targetId}"]`);

        if (targetSection) targetSection.classList.add('active');
        if (targetButton) targetButton.classList.add('active');

        // Special handling for the dashboard button's active state
        // (If the action hub is clicked, dashboard might need deactivation)
        // This part might need adjustment based on action hub behavior
        // The current logic correctly sets the clicked nav button active
        // if (targetId !== 'page-dashboard' && dashboardButton) dashboardButton.classList.remove('active');
        // else if (targetId === 'page-dashboard' && dashboardButton) dashboardButton.classList.add('active');


        // Scroll main content to top
        if (mainContent) mainContent.scrollTop = 0;

        // Load data for the new page
        loadPageData(targetId);
    }

    // Add click listeners to nav buttons
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
            const gemsPerTap = 2; // Example reward

            if (consumeEnergy(energyCostPerTap)) {
                // Action successful - grant reward
                const currentGems = parseInt(document.getElementById('header-gems').textContent || '0');
                updateGemsDisplay(currentGems + gemsPerTap);
                showFloatingText(`+${gemsPerTap}`, actionHubButton); // Show floating text reward
                logNeon(`Granted ${gemsPerTap} gems.`);

                // Optional: Add activity feed entry
                addActivity(`⚡ Tapped the Core! Gained ${gemsPerTap} gems.`, 'energy');

                // Optional: Trigger haptic feedback
                 if (tg.HapticFeedback) {
                     tg.HapticFeedback.impactOccurred('light');
                 }

            } else {
                // Not enough energy - consumeEnergy already shows a popup
                logNeon("Action failed: Not enough energy.");
                 if (tg.HapticFeedback) {
                     tg.HapticFeedback.notificationOccurred('error');
                 }
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
                    const targetPaneId = `tab-content-${tab.dataset.tab}`; // e.g., 'tab-content-quests'

                    // Remove active class from all tabs and panes in this container
                    tabs.forEach(t => t.classList.remove('active'));
                    panes.forEach(p => p.classList.remove('active'));

                    // Add active class to the clicked tab and its corresponding pane
                    tab.classList.add('active');
                    const targetPane = container.querySelector(`#${targetPaneId}`);
                    if (targetPane) targetPane.classList.add('active');

                    logNeon(`Switched to tab: ${tab.dataset.tab}`);

                    // Load data specific to this tab
                    loadTabData(tab.dataset.tab);
                });
            });

             // Trigger click on the first tab by default if none are active
             if (tabs.length > 0 && !container.querySelector('.tab-button-neon.active')) {
                 tabs[0].click();
             }
        });
    }

    // Setup tabs for specific sections
    setupTabs('#page-tasks');
    setupTabs('#page-boost');
    setupTabs('#page-social');

    function loadTabData(tabName) {
        logNeon(`Loading data for tab: ${tabName}`);
        // This is where you'd call functions to fetch and populate data
        // for the specific tab (e.g., fetch list of quests, upgrades, frens).
        // These are placeholder calls for now.
        switch(tabName) {
            case 'quests': fetchQuests(); break;
            case 'achievements': fetchAchievements(); break;
            case 'upgrades': fetchUpgrades(); break;
            case 'chests': fetchChests(); break;
            case 'frens': fetchFrens(); break;
            case 'leaderboard': fetchLeaderboard(); break;
             // Add more cases for other tabs if needed
        }
    }

    // --- Modal Logic ---
    function setupModal(modalElement) {
        if (!modalElement) return; // Exit if modal element doesn't exist
        const closeButton = modalElement.querySelector('.modal-close-neon');

        // Add click listener to the close button
        closeButton?.addEventListener('click', () => closeModal(modalElement)); // Use optional chaining

        // Add click listener to the modal overlay to close when clicking outside content
        modalElement.addEventListener('click', (event) => {
            if (event.target === modalElement) { // Check if the click was directly on the modal backdrop
                closeModal(modalElement);
            }
        });
    }

    function openModal(modalElement) {
        if (modalElement) {
            modalElement.style.display = 'flex'; // Or 'block', depending on desired layout
            logNeon(`Opened modal: #${modalElement.id}`);
            // Optional: Disable background scrolling
            // document.body.style.overflow = 'hidden';
        }
    }

    function closeModal(modalElement) {
        if (modalElement) {
            modalElement.style.display = 'none';
            logNeon(`Closed modal: #${modalElement.id}`);
            // Optional: Re-enable background scrolling
            // document.body.style.overflow = '';
        }
    }

    // Setup the modals
    setupModal(dailyLoginModal);
    setupModal(genericModal); // Setup generic modal as well

    // --- Daily Login Bonus Logic ---
    function checkDailyLoginStatus() {
        logNeon("Checking daily login status...");
        // Simulate checking daily login status (e.g., from a cookie, local storage, or backend)
        // For this example, we use a simple timeout and state variable
        setTimeout(() => {
            // Replace this with actual logic to determine if bonus is claimable today
            const isAvailable = !dailyBonusClaimed; // Simple check: available if not claimed yet

            dailyBonusAvailable = isAvailable;

            if (isAvailable) {
                logNeon("Daily bonus available.");
                if (dailyLoginPrompt) dailyLoginPrompt.style.display = 'block'; // Show the prompt button
            } else {
                logNeon("Daily bonus not available or already claimed.");
                if (dailyLoginPrompt) dailyLoginPrompt.style.display = 'none'; // Hide the prompt button
            }
        }, 500); // Simulate a network request delay
    }

    // Add click listener to the dashboard daily login prompt button
    if (dailyLoginPrompt) {
        dailyLoginPrompt.addEventListener('click', () => {
            if (dailyBonusAvailable) { // Only open if available
                openModal(dailyLoginModal);
            }
        });
    }

    // Add click listener to the "Claim Now" button inside the daily login modal
    if (claimDailyBonusButton) {
        claimDailyBonusButton.addEventListener('click', () => {
            logNeon("Attempting to claim daily bonus...");
            // Simulate claiming the bonus (e.g., sending request to backend)
            setTimeout(() => {
                logNeon("Daily bonus claimed successfully (simulated)!");

                // Update state
                dailyBonusClaimed = true;
                dailyBonusAvailable = false; // Once claimed, it's no longer available today

                // Close modal and hide prompt
                closeModal(dailyLoginModal);
                if (dailyLoginPrompt) dailyLoginPrompt.style.display = 'none';

                // Grant reward
                const rewardAmount = 100; // Example reward amount
                const currentGems = parseInt(document.getElementById('header-gems').textContent || '0');
                updateGemsDisplay(currentGems + rewardAmount); // Update gem display

                // Show success feedback (Telegram popup)
                tg.showPopup({
                    title: 'Success!',
                    message: `You claimed ${rewardAmount} gems!`,
                    buttons: [{ type: 'ok' }]
                });

                // Add activity feed entry
                addActivity("🎁 Daily bonus claimed!", 'reward'); // Use 'reward' type for icon

                // Optional: Trigger haptic feedback
                 if (tg.HapticFeedback) {
                     tg.HapticFeedback.notificationOccurred('success');
                 }

                // Optional: Save claimed status to prevent claiming again today
                // localStorage.setItem('lastDailyClaimDate', new Date().toDateString());

            }, 300); // Simulate network delay
        });
    }

    // --- Placeholder Data Loading Functions ---
    // These functions simulate fetching data and should be replaced
    // with actual API calls in a real application.

    function updateGemsDisplay(newAmount) {
        // Update gem count in header
        const headerGems = document.getElementById('header-gems');
        if (headerGems) headerGems.textContent = newAmount;

        // Update gem count in wallet section details
        const walletDetailGems = document.getElementById('wallet-detail-gems');
        if (walletDetailGems) walletDetailGems.textContent = newAmount;

        // Update gem count in wallet summary
        const walletSummaryGems = document.getElementById('wallet-summary-gems');
        if (walletSummaryGems) walletSummaryGems.textContent = newAmount;

        // Note: Wallet total value might need recalculation here if gems contribute to it
        // updateWalletTotalValue(); // You would need to implement this
    }

    function fetchInitialData() {
        logNeon("Fetching initial user data...");
        // Simulate fetching user data from a backend or local storage
        setTimeout(() => {
            // Example: Set initial values
            updateGemsDisplay(500); // User starts with 500 gems
            currentEnergy = 80; // User starts with 80 energy
            maxEnergy = 120; // Max energy can also be fetched
            energyRegenRate = 12; // Regeneration rate can be fetched
            lastEnergyUpdate = Date.now(); // Set initial last update time

            // Update energy display immediately after fetching
            updateEnergyDisplay();

            // Update dashboard stats
            document.getElementById('dash-level').textContent = '3'; // Example level
            document.getElementById('dash-frens').textContent = '5'; // Example frens count
            // Update earnings rate (replace calculateRate with actual logic)
            document.getElementById('dash-rate').innerHTML = `~${calculateRate()} <img src="assets/icons/neon_gem.png" class="inline-icon" alt="Gems">`;

            // Check daily login status after initial data is loaded
            checkDailyLoginStatus();

            logNeon("Initial data loaded (simulated).");
        }, 400); // Simulate network delay
    }

    function calculateRate() {
        // This is a placeholder. Implement actual earnings rate calculation
        // based on upgrades, frens, level, etc.
        return 15; // Example base rate
    }

    // Placeholder functions for loading data for specific tabs/sections
    function fetchQuests() { logNeon("Fetching Quests..."); /* Add actual fetch logic */ }
    function fetchAchievements() { logNeon("Fetching Achievements..."); /* Add actual fetch logic */ }
    function fetchUpgrades() { logNeon("Fetching Upgrades..."); /* Add actual fetch logic */ }
    function fetchChests() { logNeon("Fetching Chests..."); /* Add actual fetch logic */ }
    function fetchFrens() { logNeon("Fetching Frens..."); /* Add actual fetch logic */ }

    function fetchLeaderboard() {
        const type = document.getElementById('leaderboard-type')?.value || 'gems_total';
        logNeon(`Workspaceing Leaderboard (${type})...`);
        // Add actual fetch logic based on 'type'
        // Update leaderboard-list-neon element
    }

    function fetchWalletData() {
        logNeon("Fetching Wallet Data...");
        // Fetch USDT, TON balances, transaction history etc.
        // Update wallet-summary-usdt, wallet-summary-ton, wallet-detail-usdt, etc.
        // Update transaction-list-neon
        // updateWalletTotalValue(); // Recalculate total value
    }

    function fetchActivityFeed() {
        logNeon("Fetching Activity Feed...");
        // Simulate fetching recent activities
        setTimeout(() => {
            // Add some example activities
            // Clear current list first if fetching fresh data
             const list = document.getElementById('activity-list');
             if (list) list.innerHTML = ''; // Clear existing items

            addActivity("⚡ Energy refilled to max!", 'energy');
            addActivity("✅ Quest 'Daily Check-in' completed!", 'success');
            addActivity("🏆 Reached Level 3!", 'info');
            addActivity("➕ Invited a new fren!", 'info');
            addActivity("✨ Opened a Bronze Chest!", 'reward');


            if (list && list.children.length === 0) {
                 const placeholder = document.createElement('li');
                 placeholder.classList.add('activity-item', 'placeholder');
                 placeholder.textContent = 'No recent activity.';
                 list.appendChild(placeholder);
            }


        }, 1000); // Simulate network delay
    }

    function addActivity(message, type = 'info') {
        const list = document.getElementById('activity-list');
        if (!list) return;

        // Remove placeholder if present
        const placeholder = list.querySelector('.placeholder');
        if (placeholder) placeholder.remove();

        const item = document.createElement('li');
        item.classList.add('activity-item');
        // Add specific class for styling based on type
        item.classList.add(`activity-type-${type}`);

        let icon = '';
        // Choose icon based on type
        if (type === 'success') icon = '✅ ';
        else if (type === 'info') icon = 'ℹ️ ';
        else if (type === 'reward') icon = '🎁 ';
        else if (type === 'error') icon = '❌ ';
        else if (type === 'energy') icon = '⚡ '; // Use energy icon for energy events
        // Add more icon types as needed

        item.innerHTML = `${icon}${message} <span class="activity-time">${new Date().toLocaleTimeString()}</span>`; // Add timestamp

        // Add new item to the top
        list.prepend(item);

        // Keep only the last few activities (e.g., 5)
        while (list.children.length > 5) {
            list.removeChild(list.lastChild);
        }
    }


    // --- Load data based on the active page ---
    // This function is called by setActivePage
    function loadPageData(pageId) {
        switch(pageId) {
            case 'page-dashboard':
                fetchActivityFeed();
                // You might also want to refetch key dashboard stats here
                break;
            case 'page-tasks':
                // Load data for the currently active tab within tasks
                const activeTaskTab = document.querySelector('#page-tasks .tab-button-neon.active')?.dataset.tab;
                if (activeTaskTab) loadTabData(activeTaskTab);
                // Note: setupTabs now auto-clicks the first tab if none are active,
                // which will call loadTabData('quests') initially for this page.
                break;
            case 'page-boost':
                 const activeBoostTab = document.querySelector('#page-boost .tab-button-neon.active')?.dataset.tab;
                if (activeBoostTab) loadTabData(activeBoostTab);
                // Auto-click handled by setupTabs
                break;
            case 'page-social':
                 const activeSocialTab = document.querySelector('#page-social .tab-button-neon.active')?.dataset.tab;
                if (activeSocialTab) loadTabData(activeSocialTab);
                // Auto-click handled by setupTabs
                break;
            case 'page-wallet':
                fetchWalletData();
                break;
            // Add cases for other top-level pages if you add more
        }
    }

    // Listener for the leaderboard type dropdown
    const leaderboardSelect = document.getElementById('leaderboard-type');
    if (leaderboardSelect) {
        leaderboardSelect.addEventListener('change', fetchLeaderboard);
    }


    // --- Wallet Connection ---
    const connectWalletButton = document.getElementById('connect-wallet-button-neon');
    const walletStatusElement = document.getElementById('wallet-status-neon');
    let isWalletConnected = false; // State variable for wallet connection

    if (connectWalletButton && walletStatusElement) {
        connectWalletButton.addEventListener('click', () => {
            if (isWalletConnected) {
                // Simulate Disconnecting
                logNeon("Disconnecting Wallet (Simulated)...");
                isWalletConnected = false;
                updateWalletStatusUI(null); // Call with null to show disconnected state
                tg.showPopup({ title: 'Disconnected', message: 'Wallet disconnected.', buttons: [{ type: 'ok' }] });
                 if (tg.HapticFeedback) {
                     tg.HapticFeedback.notificationOccurred('warning');
                 }

            } else {
                // Simulate Connecting
                logNeon("Connecting Wallet (Simulated)...");
                 // Optional: Show a loading indicator
                 // connectWalletButton.textContent = 'Connecting...';
                 // connectWalletButton.disabled = true;

                setTimeout(() => {
                    const fakeAddress = 'EQA123abcDEF456ghiJKL789mnoPQR012stuVWX345yzAB'; // Example fake TON address
                    isWalletConnected = true;
                    updateWalletStatusUI(fakeAddress);
                    logNeon(`Wallet connected: ${fakeAddress}`);
                    tg.showPopup({ title: 'Connected', message: `Wallet connected:\n${fakeAddress.substring(0, 6)}...${fakeAddress.substring(fakeAddress.length - 4)}`, buttons: [{ type: 'ok' }] });
                     if (tg.HapticFeedback) {
                         tg.HapticFeedback.notificationOccurred('success');
                     }

                     // Optional: Hide loading indicator
                     // connectWalletButton.disabled = false;

                }, 1000); // Simulate connection delay
            }
        });
    }

    function updateWalletStatusUI(address) {
        if (!walletStatusElement || !connectWalletButton) return;

        // Get all withdraw buttons
        const withdrawButtons = document.querySelectorAll('.withdraw-btn-neon');

        if (isWalletConnected && address) {
            // Update UI for connected state
            connectWalletButton.textContent = 'Disconnect Wallet';
            connectWalletButton.classList.add('connected'); // Add a class for styling
            connectWalletButton.classList.remove('disconnected');
            walletStatusElement.textContent = `Connected: ${address.substring(0, 6)}...${address.substring(address.length - 4)}`; // Show truncated address
            walletStatusElement.className = 'wallet-status-neon connected'; // Update class for styling
            withdrawButtons.forEach(btn => btn.disabled = false); // Enable withdraw buttons
        } else {
            // Update UI for disconnected state
            connectWalletButton.textContent = 'Connect Wallet';
            connectWalletButton.classList.remove('connected');
            connectWalletButton.classList.add('disconnected'); // Add a class for styling
            walletStatusElement.textContent = 'Not Connected';
            walletStatusElement.className = 'wallet-status-neon disconnected'; // Update class for styling
            withdrawButtons.forEach(btn => btn.disabled = true); // Disable withdraw buttons
        }
    }

    // --- Floating Text Effect ---
    function showFloatingText(text, element) {
        // Ensure the element exists
        if (!element) return;

        const floatEl = document.createElement('div');
        floatEl.textContent = text;

        // Get the position of the element relative to the viewport
        const rect = element.getBoundingClientRect();

        // Style the floating element
        floatEl.style.position = 'fixed'; // Use fixed to position relative to viewport
        floatEl.style.left = `${rect.left + rect.width / 2}px`;
        floatEl.style.top = `${rect.top}px`; // Start slightly above the element
        floatEl.style.transform = 'translate(-50%, -50%)'; // Center horizontally
        floatEl.style.color = 'var(--neon-gold, yellow)'; // Use CSS variable, fallback to yellow
        floatEl.style.fontSize = '1.5rem'; // Make it slightly larger
        floatEl.style.fontWeight = 'bold';
        floatEl.style.textShadow = '0 0 5px black, 0 0 10px var(--neon-gold-glow, rgba(255,255,0,0.5))'; // Add glow
        floatEl.style.pointerEvents = 'none'; // Make it ignore mouse events
        floatEl.style.opacity = '1';
        floatEl.style.zIndex = 1000; // Ensure it's above other content
        floatEl.style.transition = 'transform 1s ease-out, opacity 1s ease-out'; // Smooth animation

        document.body.appendChild(floatEl);

        // Trigger the animation after a short delay to allow rendering
        requestAnimationFrame(() => {
             requestAnimationFrame(() => { // Double rAF for guaranteed transition start
                 floatEl.style.transform = 'translate(-50%, -150%)'; // Move further up
                 floatEl.style.opacity = '0'; // Fade out
             });
        });


        // Remove the element after the animation finishes
        setTimeout(() => {
            floatEl.remove();
        }, 1000); // Match the transition duration
    }


    // --- Initial Load ---
    // This runs once when the DOM is ready
    fetchInitialData(); // Load initial user data and stats
    setActivePage('page-dashboard'); // Set dashboard as the initial active page
    updateWalletStatusUI(null); // Ensure wallet status is initialized correctly (disconnected by default)

    // Optional: Add event listener for Telegram theme changes if needed
    // tg.onEvent('themeChanged', () => {
    //     if (tg.themeParams.bg_color) {
    //         document.documentElement.style.setProperty('--bg-color', tg.themeParams.bg_color);
    //     }
    //     // Apply other theme parameters
    // });
});
