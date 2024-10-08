const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { Pool } = require("pg");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
// const twilio = require("twilio");
// const accountSid = "a4e54f640c6c841da563049b4989c6c9";
// const authToken = "AC47f8d91a5aa4ce2f338fc17c25b892a9";
// const client = new twilio(accountSid, authToken);

const app = express();
const port = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// const upload = multer({ dest: "uploads/" });

// PostgreSQL pool setup
// const pool = new Pool({
//   host: "localhost",
//   user: "lindelwa",
//   password: "@76494594tzi!",
//   database: "biding",
//   port: 5432,
// });

// const pool = new Pool({
//   host: "pg-2c334ff-hkwezwe-854b.h.aivencloud.com",
//   user: "avnadmin",
//   password: "AVNS_X91lzsB2QtUsyCavEpb",
//   database: "defaultdb",
//   port: 15473,
// });

const pool = new Pool({
  host: "freedb-tzitondza-36bb.h.aivencloud.com", // Aiven hostname
  user: "avnadmin", // Aiven username
  password: "AVNS_N9A39n3jyM_lSyf6gij", // Aiven password
  database: "defaultdb", // Aiven database name
  port: 25808, // Default PostgreSQL port
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync("./ca.pem").toString(), // Path to Aiven CA certificate
  },
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Directory where files will be saved
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // File naming
  },
});

const upload = multer({ storage: multer.memoryStorage() });

const generateReferralCode = () => {
  return Math.random().toString(36).substr(2, 10); // Simple random code generation
};

const token = crypto.randomBytes(20).toString("hex");

// const sendVerificationLink = (phoneNumber, verificationLink) => {
//   client.messages
//     .create({
//       body: `Click the link to verify your phone: ${verificationLink}`, // SMS message with the verification link
//       from: "+your_twilio_phone_number", // Your Twilio phone number
//       to: phoneNumber, // Recipient's phone number
//     })
//     .then((message) =>
//       console.log(`Verification SMS sent! Message SID: ${message.sid}`)
//     )
//     .catch((error) => console.error("Error sending SMS:", error));
// };

// User registration endpoint
// app.post("/userRegistration", async (req, res) => {
//   const { username, email, password, phone } = req.body;

//   try {
//     // Hash the password before storing it
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // Insert the new user into the database with the hashed password
//     const result = await pool.query(
//       "INSERT INTO users (username, email, password, phone) VALUES ($1, $2, $3, $4) RETURNING *",
//       [username, email, hashedPassword, phone]
//     );

//     res.status(201).json(result.rows[0]);
//   } catch (error) {
//     console.error("Error inserting data:", error);
//     res.status(500).json({ error: "Database insertion error" });
//   }
// });

// app.post("/userRegistration", async (req, res) => {
//   const { username, email, password, phone, referal_email } = req.body;

//   try {
//     // Hash the password before storing it
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // Insert the new user into the database with the hashed password and referralCode
//     const result = await pool.query(
//       "INSERT INTO users (username, email, password, phone, referral_code) VALUES ($1, $2, $3, $4, $5) RETURNING *",
//       [username, email, hashedPassword, phone, referal_email]
//     );

//     res.status(201).json(result.rows[0]);
//   } catch (error) {
//     console.error("Error inserting data:", error);
//     res.status(500).json({ error: "Database insertion error" });
//   }
// });

app.post("/userRegistration", async (req, res) => {
  const { username, email, password, phone, referal_email } = req.body;

  try {
    // Check if the email or username already exists
    const checkUserQuery =
      "SELECT * FROM users WHERE email = $1 OR username = $2";
    const checkUserResult = await pool.query(checkUserQuery, [email, username]);

    if (checkUserResult.rows.length > 0) {
      // If a user with the same email or username is found, return an error
      return res
        .status(400)
        .json({ error: "Email or username already exists" });
    }

    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user into the database with the hashed password and referral email
    const insertUserQuery =
      "INSERT INTO users (username, email, password, phone, referral_code) VALUES ($1, $2, $3, $4, $5) RETURNING *";
    const result = await pool.query(insertUserQuery, [
      username,
      email,
      hashedPassword,
      phone,
      referal_email,
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error inserting data:", error);
    res.status(500).json({ error: "Database insertion error" });
  }
});

app.post("/userRegistrationRef", async (req, res) => {
  const { username, email, password, phone, referralCode } = req.body;

  try {
    // Check if the email or username already exists
    const checkUserQuery =
      "SELECT * FROM users WHERE email = $1 OR username = $2";
    const checkUserResult = await pool.query(checkUserQuery, [email, username]);

    if (checkUserResult.rows.length > 0) {
      // If a user with the same email or username is found, return an error
      return res
        .status(400)
        .json({ error: "Email or username already exists" });
    }

    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user into the database with the hashed password and referralCode
    const result = await pool.query(
      "INSERT INTO users (username, email, password, phone, referral_code) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [username, email, hashedPassword, phone, referralCode]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error inserting data:", error);
    res.status(500).json({ error: "Database insertion error" });
  }
});

app.post("/userLogin", async (req, res) => {
  const { email, password } = req.body;
  console.log("FROM SERVER.....", email, password);

  try {
    // Query the user by username
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "User not found" });
    }

    const user = result.rows[0];
    console.log("Stored hashed password:", user.password);

    // Compare the provided password with the stored hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password match result:", isMatch);

    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // If credentials are valid
    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        address_type: user.address_type,
        address: user.address,
      },
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all users endpoint
app.get("/getUsers", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, username, email FROM users");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete user endpoint
app.delete("/deleteUser/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update user endpoint
app.put("/updateUser/:id", async (req, res) => {
  const { id } = req.params;
  const { username, phone } = req.body;

  try {
    const result = await pool.query(
      "UPDATE users SET username = $1, phone = $2 WHERE email = $3 RETURNING *",
      [username, phone, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// app.put("/updatePassword/:id", async (req, res) => {
//   const { id } = req.params;
//   const { current, newPassword } = req.body;

//   console.log("Data receval", current, newPassword);

//   try {
//     // Fetch the user from the database by ID
//     const userResult = await pool.query(
//       "SELECT password FROM users WHERE email = $1",
//       [id]
//     );

//     if (userResult.rowCount === 0) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     const user = userResult.rows[0];

//     // Compare the provided current password with the stored hashed password
//     const isMatch = await bcrypt.compare(current, user.password);

//     if (!isMatch) {
//       return res.status(400).json({ error: "Current password is incorrect" });
//     }

//     // Hash the new password
//     const hashedNewPassword = await bcrypt.hash(newPassword, 10);

//     // Update the password in the database
//     const updateResult = await pool.query(
//       "UPDATE users SET password = $1 WHERE email = $2 RETURNING *",
//       [hashedNewPassword, id]
//     );

//     res.json({ message: "Password updated successfully" });
//   } catch (error) {
//     console.error("Error updating password:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

app.put("/updatePassword/:id", async (req, res) => {
  const { id } = req.params;
  const { current, newPassword } = req.body;

  try {
    const userResult = await pool.query(
      "SELECT password FROM users WHERE email = $1",
      [id]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userResult.rows[0];

    const isMatch = await bcrypt.compare(current, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    const updateResult = await pool.query(
      "UPDATE users SET password = $1 WHERE email = $2 RETURNING *",
      [hashedNewPassword, id]
    );

    if (updateResult.rowCount === 0) {
      console.log("Failed to update password");
      return res.status(500).json({ error: "Failed to update password" });
    }

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Setup email transporter (configure with your email provider)
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: "tzitondza@gmail.com",
    pass: "betv haka nufm ugbn",
  },
});

app.post("/sendResetLink", async (req, res) => {
  const { email } = req.body;

  try {
    // Check if the email exists
    const result = await pool.query("SELECT id FROM users WHERE email = $1", [
      email,
    ]);

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Email not registered" });
    }

    const userId = result.rows[0].id;
    const token = crypto.randomBytes(20).toString("hex");
    console.log("I reach here...", token, userId);
    // Store the token in the database with an expiration time
    await pool.query(
      "INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '1 hour')",
      [userId, token]
    );

    // Send email with reset link
    const resetLink = `https://biding-7201c.web.app/reset?token=${token}`;
    await transporter.sendMail({
      to: email,
      subject: "Password Reset",
      text: `You requested a password reset. Click the link to reset your password: ${resetLink}`,
    });

    res.status(200).json({ message: "Reset link sent" });
  } catch (error) {
    console.error("Error sending reset link:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// app.post("/resetPassword", async (req, res) => {
//   const { token, password } = req.body;
//   console.log("I reach here.....", token, password);

//   try {
//     // Validate token
//     const result = await pool.query(
//       "SELECT user_id FROM password_resets WHERE token = $1 AND expires_at > NOW()",
//       [token]
//     );

//     if (result.rows.length === 0) {
//       return res.status(400).json({ error: "Invalid or expired token" });
//     }

//     const userId = result.rows[0].user_id;

//     // Hash the new password
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // Update user's password
//     await pool.query("UPDATE users SET password = $1 WHERE id = $2", [
//       hashedPassword,
//       userId,
//     ]);

//     // Delete the token
//     await pool.query("DELETE FROM password_resets WHERE token = $1", [token]);

//     res.status(200).json({ message: "Password reset successfully" });
//   } catch (error) {
//     console.error("Error resetting password:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

app.post("/resetPassword", async (req, res) => {
  const { password, token } = req.body;

  console.log("I reach here.....trying to reset password", token, password);

  try {
    // Validate token
    const result = await pool.query(
      "SELECT user_id FROM password_resets WHERE token = $1 AND expires_at > NOW()",
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    const userId = result.rows[0].user_id;

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user's password
    await pool.query("UPDATE users SET password = $1 WHERE id = $2", [
      hashedPassword,
      userId,
    ]);

    // Delete the token
    await pool.query("DELETE FROM password_resets WHERE token = $1", [token]);

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/userProfile", async (req, res) => {
  const { userId } = req.body; // Extract userId from request body

  try {
    const result = await pool.query(
      "SELECT username, email, phone FROM users WHERE email = $1",
      [userId]
    );

    // if (!result.referral_code) {
    //   const newReferralCode = generateReferralCode();
    //   await pool.query("UPDATE users SET referral_code = $1 WHERE email = $2", [
    //     newReferralCode,
    //     userId,
    //   ]);
    //   result.referral_code = newReferralCode; // Update the response
    // }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching user profile:", error); // Added error logging
    res.status(500).json({ message: "Error fetching user profile" });
  }
});

app.post("/generateReferral", async (req, res) => {
  const { email } = req.body; // Get the user's email from the request body

  try {
    const referralCode = generateReferralCode(); // Generate the referral code
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // Set expiration to 5 minutes from now
    // const expiresAt = new Date(Date.now() + 10 * 1000); // Set expiration to 10 seconds from now

    // Insert the referral into the database
    await pool.query(
      `INSERT INTO referrals (email, referral_code, expires_at) 
       VALUES ($1, $2, $3)`,
      [email, referralCode, expiresAt]
    );

    // Respond with the generated referral code
    res.status(201).json({ referralCode });
  } catch (error) {
    console.error("Error generating referral:", error);
    res.status(500).json({ message: "Error generating referral" });
  }
});

app.get("/referral/:code", async (req, res) => {
  const { code } = req.params;

  try {
    const result = await pool.query(
      "SELECT * FROM referrals WHERE referral_code = $1",
      [code]
    );

    const referral = result.rows[0];

    if (!referral) {
      return res.status(404).send("Invalid referral code.");
    }

    // Check if the link has expired
    const now = new Date();
    if (now > new Date(referral.expires_at)) {
      return res.status(410).send("Referral link has expired.");
    }

    // Check if the link has already been used
    if (referral.is_used) {
      return res.status(400).send("Referral link has already been used.");
    }

    // Redirect to the login page with the referral code
    res.redirect(`/login?referral=${code}`);
  } catch (error) {
    console.error("Error processing referral:", error);
    res.status(500).send("Internal server error.");
  }
});

// app.post("/saveReferral", async (req, res) => {
//   const { email, referralCode } = req.body;

//   if (!email || !referralCode) {
//     return res.status(400).json({ message: "Missing email or referral code" });
//   }

//   try {
//     // Find the referral
//     const result = await pool.query(
//       "SELECT * FROM referrals WHERE referral_code = $1",
//       [referralCode]
//     );

//     const referral = result.rows[0];

//     // Check if the link has expired
//     const now = new Date();
//     if (now > new Date(referral.expires_at)) {
//       return res.status(410).json({ message: "Referral link has expired." });
//     }

//     // Check if the link has already been used
//     if (referral.is_used) {
//       return res
//         .status(400)
//         .json({ message: "Referral link has already been used." });
//     }

//     // Update the referral with the referred email and mark it as used
//     await pool.query(
//       "UPDATE referrals SET referred_email = $1, is_used = TRUE WHERE referral_code = $2",
//       [email, referralCode]
//     );

//     res.status(200).json({ message: "Referral completed successfully" });
//   } catch (error) {
//     console.error("Error saving referral:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });

app.post("/saveReferral", async (req, res) => {
  const { email, referralCode } = req.body;

  if (!email || !referralCode) {
    return res.status(400).json({ message: "Missing email or referral code" });
  }

  try {
    // Find the referral by referral code
    const result = await pool.query(
      "SELECT * FROM referrals WHERE referral_code = $1",
      [referralCode]
    );

    const referral = result.rows[0];

    // Check if the referral exists
    if (!referral) {
      return res.status(404).json({ message: "Referral not found." });
    }

    // Check if the link has expired
    const now = new Date();
    if (now > new Date(referral.expires_at)) {
      return res.status(410).json({ message: "Referral link has expired." });
    }

    // Check if the referral link has already been used
    if (referral.is_used) {
      return res
        .status(400)
        .json({ message: "Referral link has already been used." });
    }

    // Check if the email has already been referred
    const emailCheck = await pool.query(
      "SELECT * FROM referrals WHERE referred_email = $1",
      [email]
    );

    if (emailCheck.rows.length > 0) {
      return res
        .status(400)
        .json({ message: "Email has already been referred." });
    }

    // Update the referral with the referred email and mark it as used
    await pool.query(
      "UPDATE referrals SET referred_email = $1, is_used = TRUE WHERE referral_code = $2",
      [email, referralCode]
    );

    res.status(200).json({ message: "Referral completed successfully" });
  } catch (error) {
    console.error("Error saving referral:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/checkReferral", async (req, res) => {
  const { referralCode } = req.body;

  try {
    const result = await pool.query(
      "SELECT expires_at FROM referrals WHERE referral_code = $1",
      [referralCode]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ expired: true, message: "Invalid referral code" });
    }

    const expiresAt = new Date(result.rows[0].expires_at);
    const now = new Date();

    if (now > expiresAt) {
      return res.json({ expired: true });
    }

    res.json({ expired: false });
  } catch (error) {
    console.error("Error checking referral code:", error);
    res
      .status(500)
      .json({ expired: true, message: "Error checking referral code" });
  }
});

// server.js or routes/transactions.js
// app.post("/transactionHistory", async (req, res) => {
//   const { userId } = req.body; // Extract userId from request body
//   console.log("get here.....", userId); // Debug logging to check if userId is received

//   try {
//     const result = await pool.query(
//       "SELECT * FROM transactions WHERE user_id = $1",
//       [userId]
//     );
//     res.json(result.rows);
//   } catch (error) {
//     console.error("Error fetching transaction history:", error); // Added error logging
//     res.status(500).json({ message: "Error fetching transaction history" });
//   }
// });

app.post("/uploadDocument", upload.single("document"), async (req, res) => {
  const { documentType, userId } = req.body;
  const file = req.file;

  if (!file || !documentType || !userId) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO documents (user_id, document_type, status, upload_date, file) VALUES ($1, $2, $3, $4, $5)",
      [userId, documentType, "uploaded", new Date(), file.path]
    );
    res.json({ message: "Document uploaded successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error uploading document" });
  }
});

// app.post("/getDocuments", async (req, res) => {
//   const { userId } = req.body;

//   if (!userId) {
//     return res.status(400).json({ message: "User ID is required" });
//   }

//   try {
//     // Query to fetch document statuses
//     const result = await pool.query(
//       `SELECT
//          document_type AS "documentType",
//          status AS "status"
//        FROM documents
//        WHERE user_id = $1`,
//       [userId]
//     );

//     // Transform the result into a structure similar to your client code
//     const documents = result.rows.reduce((acc, row) => {
//       acc[row.documentType] = row.status;
//       return acc;
//     }, {});

//     // Default statuses to 'missing' if not present
//     const allDocTypes = ["idDocument", "cardDocument", "photoVerification"];
//     allDocTypes.forEach((docType) => {
//       if (!documents[docType]) {
//         documents[docType] = "missing";
//       }
//     });

//     // Respond with document statuses
//     res.json(documents);
//   } catch (error) {
//     console.error("Error fetching document statuses:", error);
//     res.status(500).json({ message: "Error fetching document statuses" });
//   }
// });

app.post("/getDocuments", async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    const result = await pool.query(
      `SELECT 
         document_type AS "documentType",
         status AS "status"
       FROM documents
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "No documents found for this user" });
    }

    const documents = result.rows.reduce((acc, row) => {
      acc[row.documentType] = { status: row.status };
      return acc;
    }, {});

    res.json(documents);
  } catch (error) {
    console.error("Error fetching document statuses:", error);
    res.status(500).json({ message: "Error fetching document statuses" });
  }
});

// app.post("/saveBankingDetails", async (req, res) => {
//   const { cardNumber, cardHolder, expirationDate, cvv, email } = req.body;

//   try {
//     // Insert banking details into the database
//     const result = await pool.query(
//       "INSERT INTO banking_details (email, card_number, card_holder, expiration_date, cvv) VALUES ($1, $2, $3, $4, $5)",
//       [email, cardNumber, cardHolder, expirationDate, cvv]
//     );

//     res.status(200).json({ message: "Banking details saved successfully" });
//   } catch (err) {
//     console.error("Error saving banking details:", err);
//     res.status(500).json({ message: "Failed to save banking details" });
//   }
// });

app.post(
  "/saveBankingDetails",
  upload.single("bankStatement"),
  async (req, res) => {
    const { email, erc20_address, verification_layer } = req.body;
    const verification_status = false;

    console.log(`erc20_address:`, erc20_address);
    console.log(`verification_layer:`, verification_layer);
    console.log(`email:`, email);

    try {
      // Insert banking details into the database
      await pool.query(
        `INSERT INTO payment_verification (erc20_address, verification_layer, email, verification_status) 
       VALUES ($1, $2, $3, $4)`,
        [erc20_address, verification_layer, email, verification_status]
      );

      res.status(200).json({ message: "Banking details saved successfully" });
    } catch (err) {
      console.error("Error saving banking details:", err);
      res.status(500).json({ message: "Failed to save banking details" });
    }
  }
);

app.post("/savePaymentDetails", async (req, res) => {
  // Check the incoming request body
  console.log("Request Body:", req.body);

  const { erc20_address, verification_layer, email } = req.body;
  const verification_status = false; // Default verification status

  console.log(`erc20_address:`, erc20_address);
  console.log(`verification_layer:`, verification_layer);
  console.log(`email:`, email);

  try {
    // Insert payment details into the database
    await pool.query(
      `INSERT INTO payment_verification (erc20_address, verification_layer, email, verification_status) 
       VALUES ($1, $2, $3, $4)`,
      [erc20_address, verification_layer, email, verification_status]
    );

    res.status(200).json({ message: "Payment details saved successfully" });
  } catch (err) {
    console.error("Error saving payment details:", err);
    res.status(500).json({ message: "Failed to save payment details" });
  }
});

app.get("/getBankingDetails", async (req, res) => {
  const { email } = req.query;

  try {
    const result = await pool.query(
      "SELECT account_number, bank_name, account_holder FROM banking_details WHERE email = $1",
      [email]
    );

    if (result.rows.length > 0) {
      res.json({
        bankingDetails: result.rows[0],
        verificationStatus: result.rows[0].verification_status,
      });
    } else {
      res.json({ bankingDetails: null, verificationStatus: "" });
    }
  } catch (err) {
    console.error("Error fetching banking details:", err);
    res.status(500).send("Internal Server Error");
  }
});

//get all users admin
app.get("/usersAdmin", async (req, res) => {
  try {
    const users = await pool.query("SELECT * FROM users");
    res.json(users.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Verify user
app.put("/usersAdmin/verify/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "UPDATE users SET is_verified = TRUE, verification_date = NOW() WHERE id = $1 RETURNING *",
      [id]
    );
    res.json(result.rows[0]); // Send back the updated user data
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Delete user
app.delete("/usersAdmin/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM users WHERE id = $1", [id]);
    res.json({ message: "User deleted" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// API to get auction slots
app.get("/auction-slots", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM auction_slots");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching auction slots:", error);
    res.status(500).send("Server error");
  }
});

// Update user endpoint
// app.put('/updateUserEmail', async (req, res) => {
//     const { email } = req.body; // Extract email from request body
//     const token = crypto.randomBytes(20).toString('hex'); // Generate random token

//     try {
//         // Update user status and token in the database
//         const result = await pool.query(
//             'UPDATE users SET email_code = $1 WHERE email = $2 RETURNING *',
//             [token, email]
//         );

//         if (result.rowCount === 0) {
//             return res.status(404).json({ error: 'User not found' });
//         }

//         // Setup email transporter
//         const transporter = nodemailer.createTransport({
//             service: "Gmail",
//             auth: {
//                 user: "khanyadlamini22@gmail.com",  // Your email
//                 pass: "giak jrxb qlnl kyhy",        // Your app-specific password
//             },
//         });

//         // Generate a link with the token
//         const getLink = `http://${token}`;  // Replace with actual link in production

//         // Send email with the verification link
//         await transporter.sendMail({
//             to: email,
//             subject: 'Email Verification: Auctions',
//             text: `Click the link to verify your email at Auctions: ${getLink}`,
//         });

//         // Respond with a success message
//         res.json({ message: 'Verification email sent!' });
//     } catch (error) {
//         console.error('Error updating user:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });

app.put("/updateUserEmail", async (req, res) => {
  const { email } = req.body; // Extract email from request body
  const token = crypto.randomBytes(20).toString("hex"); // Generate random token

  try {
    // Update user email_code in the database
    const result = await pool.query(
      "UPDATE users SET email_code = $1 WHERE email = $2 RETURNING *",
      [token, email]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Setup email transporter
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: "tzitondza@gmail.com", // Your email
        pass: "betv haka nufm ugbn", // Your app-specific password
      },
    });

    // Generate a link with the token
    const verificationLink = `http://localhost:5173/verify-email?token=${token}`; // Replace with your actual domain

    // Send email with the verification link
    await transporter.sendMail({
      to: email,
      subject: "Email Verification: Auctions",
      text: `Click the link to verify your email on Acution: ${verificationLink}`,
    });

    // Respond with a success message
    res.json({ message: "Verification email sent!" });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/verify-email", async (req, res) => {
  const { token } = req.query; // Extract token from query string

  try {
    // Find user with the given token
    const result = await pool.query(
      "UPDATE users SET email_verification_status = TRUE WHERE email_code = $1 RETURNING *",
      [token]
    );

    if (result.rowCount === 0) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    // Respond with a success message
    // res.redirect("http://localhost:5173/verification-success");
    res.status(200).send("Email successfully verified. You can now log in.");
  } catch (error) {
    console.error("Error verifying email:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/get-email-status", async (req, res) => {
  try {
    const { userId } = req.body; // Destructure userId from req.body
    console.log("Received userId:", userId); // Correct logging

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const result = await pool.query(
      "SELECT email_verification_status FROM users WHERE email = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const emailVerified = result.rows[0].email_verification_status;
    res.json({ status: emailVerified ? "verified" : "pending" });
  } catch (error) {
    console.error("Error fetching status:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// app.post("/api/initiate-payment", async (req, res) => {
//   const { email, amount } = req.body;

//   try {
//     // Make request to third-party payment service (e.g., Luna) to generate payment URL
//     // Assuming the payment service API requires `amount` and a callback URL

//     const paymentUrl = `https://third-party-payment.com/pay?amount=${amount}&callback_url=https://your-app.com/payment-callback`;

//     // Send the payment URL to the frontend to redirect the user
//     res.json({ paymentUrl });
//   } catch (error) {
//     res.status(500).json({ error: "Payment initiation failed" });
//   }
// });

// Handle the payment callback from third-party service
// router.get('/payment-callback', async (req, res) => {
//   const { paymentStatus, paymentReference, amount } = req.query;

//   if (paymentStatus === 'success') {

//     const email = "user@example.com";
//     const auctionSlot = "auction-id";

//     const query = `
//       INSERT INTO auction_table (user_email, auction_slot, joining_amount, amount_to_be_paid, payment_reference, timestamp)
//       VALUES ($1, $2, $3, $4, $5, NOW())
//     `;
//     const values = [email, auctionSlot, amount, amount, paymentReference];

//     try {
//       await db.query(query, values);
//       res.redirect(`/auction-success?ref=${paymentReference}`);
//     } catch (error) {
//       console.error('Error inserting into auction table:', error);
//       res.redirect(`/auction-failure?error=database`);
//     }
//   } else {
//     res.redirect(`/auction-failure?error=payment_failed`);
//   }
// });

app.post("/api/join-auction", async (req, res) => {
  const { email, amount, auctionSlot } = req.body;

  const paymentReference = uuidv4();

  const query = `
    INSERT INTO auction_table (user_email, auction_slot, joining_amount, amount_to_be_paid, payment_reference, timestamp)
    VALUES ($1, $2, $3, $4, $5, NOW())
  `;
  const values = [email, auctionSlot, amount, amount, paymentReference];

  try {
    await pool.query(query, values);

    res.status(200).json({
      message: "Successfully joined the auction",
      paymentReference: paymentReference,
    });
  } catch (error) {
    console.error("Error inserting into auction_table:", error);
    res.status(500).json({ error: "Error joining auction" });
  }
});

// app.get("/api/people-to-pay", async (req, res) => {
//   const { amount } = req.query;

//   // Fetch all people with prices from auction_table
//   const query = `SELECT * FROM auction_table WHERE amount_to_be_paid <= $1 ORDER BY amount_to_be_paid DESC`;
//   try {
//     const result = await pool.query(query, [amount]);
//     res.status(200).json(result.rows);
//   } catch (error) {
//     console.error("Error fetching people from auction_table:", error);
//     res.status(500).json({ error: "Failed to fetch people" });
//   }
// });

app.get("/api/people-to-pay", async (req, res) => {
  const { amount, email } = req.query;
  const targetAmount = parseInt(amount);

  console.log(`email:`, email);
  console.log(`amount:`, amount);

  // Define a percentage range for the total (e.g., ±5%)
  const rangePercentage = 0.05; // 5% range
  const minAmount = targetAmount * (1 - rangePercentage);
  const maxAmount = targetAmount * (1 + rangePercentage);

  console.log(`Target amount: ${targetAmount}`);
  console.log(`Allowed range: Min = ${minAmount}, Max = ${maxAmount}`);
  console.log(`Excluding user with email: ${email}`);

  // Query to select people to pay, excluding the current user
  const query = `
    SELECT id, user_email, amount_to_be_paid 
    FROM auction_table
    WHERE user_email != $1 -- Exclude the current user's email
    ORDER BY amount_to_be_paid DESC;
  `;

  try {
    // Fetch all people from the auction_table excluding the current user
    const result = await pool.query(query, [email]);

    console.log(`Number of people found: ${result.rows.length}`);
    console.log(`People fetched from auction_table:`, result.rows);

    const people = result.rows;

    if (people.length < 3) {
      console.log("Not enough people available for payment.");
      return res
        .status(404)
        .json({ error: "Not enough people available for payment." });
    }

    // Function to find combinations of 3 people whose total is within the allowed range
    const findMatchingCombination = (people, minAmount, maxAmount) => {
      console.log("Searching for combinations...");
      for (let i = 0; i < people.length - 2; i++) {
        for (let j = i + 1; j < people.length - 1; j++) {
          for (let k = j + 1; k < people.length; k++) {
            // Convert `amount_to_be_paid` to numbers and sum them
            const sum =
              Number(people[i].amount_to_be_paid) +
              Number(people[j].amount_to_be_paid) +
              Number(people[k].amount_to_be_paid);

            // Log the details of the current combination and sum
            console.log(
              `Trying combination: [${people[i].id}, ${people[j].id}, ${people[k].id}] - Total: ${sum}`
            );

            // Check if the sum is within the allowed range
            if (sum >= minAmount && sum <= maxAmount) {
              console.log(
                `Matching combination found: [${people[i].id}, ${people[j].id}, ${people[k].id}] with sum = ${sum}`
              );
              return [people[i], people[j], people[k]]; // Return the matching combination
            }
          }
        }
      }
      console.log("No matching combination found.");
      return null; // No combination found
    };

    // Try to find 3 people whose amounts sum up to within the allowed range
    const matchingPeople = findMatchingCombination(
      people,
      minAmount,
      maxAmount
    );

    if (!matchingPeople) {
      console.log("No matching people found within the range.");
      return res
        .status(404)
        .json({ error: "No matching people found within the given range." });
    }

    console.log("Selected people:", matchingPeople);
    res.status(200).json(matchingPeople); // Return the selected people
  } catch (error) {
    console.error("Error fetching people from auction_table:", error);
    res.status(500).json({ error: "Failed to fetch people" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
