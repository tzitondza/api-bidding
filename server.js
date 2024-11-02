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

const generateIDCode = () => {
  // Generate a random number between 1000000000 and 2147483647
  return Math.floor(1000000000 + Math.random() * 1147483647);
};

const generateRefRefCode = () => {
  return Math.random().toString(36).substr(2, 10).toUpperCase(); // Simple random code generation with uppercase letters
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

// New table user registration endpoint
app.post("/userRegistrationNew", async (req, res) => {
  const { username, email, password, phone, referal_email } = req.body;

  const user_id = generateIDCode();
  const referral_reference = generateRefRefCode();
  let reference_code = "";

  try {
    // Check if the email or username already exists
    const checkUserQuery =
      "SELECT * FROM userss WHERE user_id = $1 OR email = $2";
    const checkUserResult = await pool.query(checkUserQuery, [user_id, email]);

    if (checkUserResult.rows.length > 0) {
      // If a user with the same email or username is found, return an error
      return res.status(400).json({ error: "Email or user id already exists" });
    }

    // Check if the referral email exists and get the referral_reference
    const referralQuery =
      "SELECT referral_reference FROM userss WHERE email = $1";
    const referralResult = await pool.query(referralQuery, [referal_email]);

    if (referralResult.rows.length === 0) {
      // If the referral email does not exist, return an error
      return res.status(400).json({ error: "Referral email does not exist" });
    } else {
      // Get the referral_reference from the result
      reference_code = referralResult.rows[0].referral_reference;
    }

    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user into the database with the hashed password and referral email
    const insertUserQuery =
      "INSERT INTO userss (user_id, name, email, phone, password, referred_by, referral_reference, crypto_address, balance) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *";
    const result = await pool.query(insertUserQuery, [
      user_id,
      username,
      email,
      phone,
      hashedPassword,
      reference_code,
      referral_reference,
      "NULL",
      0,
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error inserting data:", error);
    res.status(500).json({ error: "Database insertion error" });
  }
});

// End of new table user registration endpoint

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

app.post("/userRegistrationRefNew", async (req, res) => {
  const { username, email, password, phone, referralCode } = req.body;
  const user_id = generateIDCode();
  const referral_reference = generateRefRefCode();
  let reference_code = "";

  try {
    // Check if the email or username already exists
    const checkUserQuery =
      "SELECT * FROM userss WHERE user_id = $1 OR email = $2";
    const checkUserResult = await pool.query(checkUserQuery, [user_id, email]);

    if (checkUserResult.rows.length > 0) {
      // If a user with the same email or username is found, return an error
      return res
        .status(400)
        .json({ error: "Email or username already exists" });
    }

    // Check if the referral code exists and get the associated email
    const referralQuery =
      "SELECT email FROM referrals WHERE referral_code = $1";
    const referralResult = await pool.query(referralQuery, [referralCode]);

    if (referralResult.rows.length === 0) {
      // If the referral code does not exist, return an error
      return res.status(400).json({ error: "Referral code does not exist" });
    }

    const referralEmail = referralResult.rows[0].email;

    // Now check the referral_reference using the referralEmail
    const userReferralQuery =
      "SELECT referral_reference FROM userss WHERE email = $1";
    const userReferralResult = await pool.query(userReferralQuery, [
      referralEmail,
    ]);

    if (userReferralResult.rows.length === 0) {
      // If the referral email does not exist in userss, return an error
      return res.status(400).json({ error: "Referral does not exist" });
    } else {
      // Get the referral_reference from the result
      reference_code = userReferralResult.rows[0].referral_reference;
    }

    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user into the database with the hashed password and referralCode
    const result = await pool.query(
      "INSERT INTO userss (user_id, name, email, phone, password, referred_by, referral_reference, crypto_address, balance) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *",
      [
        user_id,
        username,
        email,
        phone,
        hashedPassword,
        reference_code,
        referral_reference,
        "NULL",
        0,
      ]
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

app.post("/userLoginNew", async (req, res) => {
  const { email, password } = req.body;
  console.log("FROM SERVER.....", email, password);

  try {
    // Query the user by username
    const result = await pool.query("SELECT * FROM userss WHERE email = $1", [
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
        id: user.user_id,
        username: user.name,
        email: user.email,
        phone: user.phone,
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
      "UPDATE userss SET name = $1, phone = $2 WHERE user_id = $3 RETURNING *",
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

app.put("/updatePassword/:id", async (req, res) => {
  const { id } = req.params;
  const { current, newPassword } = req.body;
  console.log("Updating Paasword");

  try {
    const userResult = await pool.query(
      "SELECT password FROM userss WHERE user_id = $1",
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
      "UPDATE userss SET password = $1 WHERE user_id = $2 RETURNING *",
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
      html: `
        <html>
          <head>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                border: 1px solid #ddd;
                border-radius: 5px;
              }
              h1 {
                color: #4a4a4a;
              }
              .btn {
                display: inline-block;
                padding: 10px 20px;
                background-color: #007bff;
                color: #ffffff;
                text-decoration: none;
                border-radius: 5px;
              }
              .footer {
                margin-top: 20px;
                font-size: 0.8em;
                color: #888;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Password Reset Request</h1>
              <p>Hello,</p>
              <p>We received a request to reset your password. If you didn't make this request, you can ignore this email.</p>
              <p>To reset your password, please click the button below:</p>
              <p>
                <a href="${resetLink}" class="btn">Reset Password</a>
              </p>
              <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
              <p>${resetLink}</p>
              <p>This link will expire in 1 hour for security reasons.</p>
              <p>If you have any questions, please don't hesitate to contact our support team.</p>
              <div class="footer">
                <p>Best regards,<br>Auction Team</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    res.status(200).json({ message: "Reset link sent" });
  } catch (error) {
    console.error("Error sending reset link:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/resetPassword/:token", async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

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
      "SELECT name, email, phone, balance FROM userss WHERE user_id = $1",
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
      res.status(500).json({ error: "Failed to save banking details" });
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

  console.log(`email ........pay.....:`, email);

  try {
    const result = await pool.query(
      "SELECT erc20_address, verification_layer FROM payment_verification WHERE email = $1",
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

app.put("/updateUserEmail", async (req, res) => {
  const { email } = req.body;
  const token = crypto.randomBytes(20).toString("hex");

  try {
    const userResult = await pool.query(
      "SELECT email FROM userss WHERE user_id = $1",
      [email]
    );

    if (userResult.rowCount === 0) {
      console.log("User not found for user_id:", email);
      return res.status(404).json({ error: "User not found" });
    }

    const userEmail = userResult.rows[0].email;

    const result = await pool.query(
      `INSERT INTO email_verifications (email, email_code, email_verification_status) 
         VALUES ($1, $2, FALSE) RETURNING *`,
      [userEmail, token]
    );

    if (result.rowCount === 0) {
      console.log("User not found for email:", userEmail);
      return res.status(404).json({ error: "User not found" });
    }

    console.log("Email code updated successfully");

    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: "tzitondza@gmail.com",
        pass: "betv haka nufm ugbn",
      },
    });

    const verificationLink = `https://biding-7201c.web.app/verify-email?token=${token}`;

    console.log("Sending verification email to:", userEmail);
    await transporter.sendMail({
      to: userEmail,
      subject: "Verify Your Email for Auction",
      html: `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #4CAF50; color: white; padding: 10px; text-align: center; }
              .content { padding: 20px; background-color: #f9f9f9; }
              .button { display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; }
              .footer { margin-top: 20px; font-size: 12px; color: #888; text-align: center; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Email Verification</h1>
              </div>
              <div class="content">
                <h2>Welcome to Auction!</h2>
                <p>Thank you for signing up. To complete your registration and start auctioning, please verify your email address.</p>
                <p style="text-align: center;">
                  <a href="${verificationLink}" class="button">Verify Your Email</a>
                </p>
                <p>If the button above doesn't work, you can also copy and paste the following link into your browser:</p>
                <p>${verificationLink}</p>
                <p>This link will expire in 24 hours for security reasons.</p>
              </div>
              <div class="footer">
                <p>If you didn't create an account on Auction, please ignore this email.</p>
                <p>&copy; 2024 Auction. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Verification email sent successfully");
    res.json({ message: "Verification email sent!" });
  } catch (error) {
    console.error("Error in updateUserEmail:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
});

app.get("/verify-email", async (req, res) => {
  const { token } = req.query; // Extract token from query string

  try {
    // Find user with the given token
    const result = await pool.query(
      "UPDATE email_verifications SET email_verification_status = TRUE WHERE email_code = $1 RETURNING *",
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
  const { userId } = req.body; // Destructure userId from req.body
  console.log("Received userIdzxcvbn:", userId); // Correct logging
  try {
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const userResult = await pool.query(
      "SELECT email FROM userss WHERE user_id = $1",
      [userId]
    );

    if (userResult.rowCount === 0) {
      console.log("User not found for user_id:", email);
      return res.status(404).json({ error: "User not found" });
    }

    const userEmail = userResult.rows[0].email;

    const result = await pool.query(
      "SELECT email_verification_status FROM email_verifications WHERE email = $1 ORDER BY created_at DESC LIMIT 1",
      [userEmail]
    );
    // console.log("Results.....", result);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No email verification found" });
    }

    const emailVerified = result.rows[0].email_verification_status;
    console.log("email status.....", emailVerified);
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

//     const email = "tzitondza.com";
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
  const { email, amount } = req.body;

  const paymentReference = uuidv4();
  const auctionCode = uuidv4().substring(0, 8).toUpperCase();
  // const auctionSlot = Math.floor(Math.random() * 4) + 1;
  const auctionSlot = 2;

  const query = `
    INSERT INTO auction_table (user_email, auction_slot, joining_amount, amount_to_be_paid, payment_reference,joining_reference, timestamp)
    VALUES ($1, $2, $3, $4, $5,$6, NOW())
  `;
  const values = [
    email,
    auctionSlot,
    amount,
    amount,
    paymentReference,
    auctionCode,
  ];

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

// pp.post("/api/join-auction", async (req, res) => {
//   const { email, amount } = req.body;

//   const auctionCode = uuidv4().substring(0, 8).toUpperCase();
//   const auctionSlot = Math.floor(Math.random() * 4) + 1;

//   const query = `
//     INSERT INTO users_auctions (user_id, auction_id, join_amount, auction_slot)
//     VALUES ($1, $2, $3, $4)
//   `;
//   const values = [email, auctionCode, amount, auctionSlot];

//   try {
//     await pool.query(query, values);

//     res.status(200).json({
//       message: "Successfully joined the auction",
//       paymentReference: auction_id,
//     });
//   } catch (error) {
//     console.error("Error inserting into users_auctions:", error);
//     res.status(500).json({ error: "Error joining auction" });
//   }
// });

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

// app.get("/api/people-to-pay", async (req, res) => {
//   const { amount, email } = req.query;
//   const targetAmount = parseInt(amount);

//   console.log(`email:`, email);
//   console.log(`amount:`, amount);

//   // Define a percentage range for the total (e.g., ±5%)
//   const rangePercentage = 0.05; // 5% range
//   const minAmount = targetAmount * (1 - rangePercentage);
//   const maxAmount = targetAmount * (1 + rangePercentage);

//   console.log(`Target amount: ${targetAmount}`);
//   console.log(`Allowed range: Min = ${minAmount}, Max = ${maxAmount}`);
//   console.log(`Excluding user with email: ${email}`);

//   // Query to select people to pay, excluding the current user
//   const query = `
//     SELECT id, user_email, amount_to_be_paid
//     FROM auction_table
//     WHERE user_email != $1 -- Exclude the current user's email
//     ORDER BY amount_to_be_paid DESC;
//   `;

//   try {
//     // Fetch all people from the auction_table excluding the current user
//     const result = await pool.query(query, [email]);

//     console.log(`Number of people found: ${result.rows.length}`);
//     console.log(`People fetched from auction_table:`, result.rows);

//     const people = result.rows;

//     if (people.length < 3) {
//       console.log("Not enough people available for payment.");
//       return res
//         .status(404)
//         .json({ error: "Not enough people available for payment." });
//     }

//     // Function to find combinations of 3 people whose total is within the allowed range
//     const findMatchingCombination = (people, minAmount, maxAmount) => {
//       console.log("Searching for combinations...");
//       for (let i = 0; i < people.length - 2; i++) {
//         for (let j = i + 1; j < people.length - 1; j++) {
//           for (let k = j + 1; k < people.length; k++) {
//             // Convert `amount_to_be_paid` to numbers and sum them
//             const sum =
//               Number(people[i].amount_to_be_paid) +
//               Number(people[j].amount_to_be_paid) +
//               Number(people[k].amount_to_be_paid);

//             // Log the details of the current combination and sum
//             console.log(
//               `Trying combination: [${people[i].id}, ${people[j].id}, ${people[k].id}] - Total: ${sum}`
//             );

//             // Check if the sum is within the allowed range
//             if (sum >= minAmount && sum <= maxAmount) {
//               console.log(
//                 `Matching combination found: [${people[i].id}, ${people[j].id}, ${people[k].id}] with sum = ${sum}`
//               );
//               return [people[i], people[j], people[k]]; // Return the matching combination
//             }
//           }
//         }
//       }
//       console.log("No matching combination found.");
//       return null; // No combination found
//     };

//     // Try to find 3 people whose amounts sum up to within the allowed range
//     const matchingPeople = findMatchingCombination(
//       people,
//       minAmount,
//       maxAmount
//     );

//     if (!matchingPeople) {
//       console.log("No matching people found within the range.");
//       return res
//         .status(404)
//         .json({ error: "No matching people found within the given range." });
//     }

//     console.log("Selected people:", matchingPeople);
//     res.status(200).json(matchingPeople); // Return the selected people
//   } catch (error) {
//     console.error("Error fetching people from auction_table:", error);
//     res.status(500).json({ error: "Failed to fetch people" });
//   }
// });

app.get("/api/people-to-pay", async (req, res) => {
  const { email } = req.query;

  console.log(`Excluding user with email: ${email}`);

  // Query to select all people, excluding the current user, and including their ERC20 address if available
  const query = `
    SELECT at.id, at.user_email, at.amount_to_be_paid, at.auction_slot, at.joining_amount, 
           at.payment_reference, at.joining_reference, at.timestamp, pv.erc20_address
    FROM auction_table at
    LEFT JOIN payment_verification pv ON at.user_email = pv.email
    WHERE at.user_email != $1
    ORDER BY at.amount_to_be_paid DESC;
  `;

  try {
    // Fetch all people from the auction_table excluding the current user
    const result = await pool.query(query, [email]);

    console.log(`Number of people found: ${result.rows.length}`);

    if (result.rows.length === 0) {
      console.log("No other users found in the auction table.");
      return res
        .status(404)
        .json({ error: "No other users found in the auction." });
    }

    // Filter out users without an ERC20 address
    const filteredUsers = result.rows.filter((user) => user.erc20_address);

    console.log(
      `Number of users with ERC20 addresses: ${filteredUsers.length}`
    );

    if (filteredUsers.length === 0) {
      return res
        .status(404)
        .json({ error: "No users found with verified payment details." });
    }

    console.log("Returning users from auction_table with ERC20 addresses");
    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error fetching people from auction_table:", error);
    res.status(500).json({ error: "Failed to fetch people" });
  }
});

app.get("/api/joining-fee", async (req, res) => {
  const { email, auctionId } = req.query;

  console.log(
    `Fetching joining fee for email: ${email}, auctionId: ${auctionId}`
  );

  try {
    // Fetch the joining fee from the database
    const result = await pool.query(
      "SELECT joining_amount FROM auction_table WHERE auction_slot = $1 AND user_email = $2 ORDER BY timestamp DESC LIMIT 1",
      [auctionId, email]
    );

    console.log(`Query result:`, result.rows);

    if (result.rows.length > 0) {
      const fee = result.rows[0].joining_amount;
      console.log(`Joining fee found: ${fee}`);
      res.json({ fee: fee });
    } else {
      console.log(
        `No joining fee found for email: ${email}, auctionId: ${auctionId}`
      );
      res.status(404).json({ error: "Joining fee not found for this auction" });
    }
  } catch (error) {
    console.error("Error fetching joining fee:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/user-address", async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const result = await pool.query(
      "SELECT erc20_address FROM payment_verification WHERE email = $1",
      [email]
    );

    if (result.rows.length > 0) {
      res.json({ address: result.rows[0].erc20_address });
    } else {
      res.status(404).json({ error: "Address not found for this user" });
    }
  } catch (error) {
    console.error("Error fetching user address:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// app.post("/submitCrypto", async (req, res) => {
//   console.log("Received submitCrypto request:", req.body);

//   const { username, cryptoAddress, amount, usdtAddress } = req.body;

//   if (!username || !cryptoAddress || !amount || !usdtAddress) {
//     console.log("Missing required fields:", {
//       username,
//       cryptoAddress,
//       amount,
//       usdtAddress,
//     });
//     return res.status(400).json({ message: "All fields are required." });
//   }

//   try {
//     // Insert into Postgres database
//     const query = `INSERT INTO Transactionss (username, cryptoAddress, amount, usdtAddress)
//                    VALUES ($1, $2, $3, $4) RETURNING *`;
//     const values = [username, cryptoAddress, amount, usdtAddress];

//     console.log("Executing query:", query);
//     console.log("Query values:", values);

//     const result = await pool.query(query, values);

//     console.log("Transaction recorded successfully:", result.rows[0]);

//     res.status(200).json({
//       message: "Transaction recorded successfully",
//       transaction: result.rows[0],
//     });
//   } catch (error) {
//     console.error("Error inserting transaction:", error);

//     // More detailed error handling
//     if (error.code === "23505") {
//       // Unique constraint violation
//       return res
//         .status(409)
//         .json({ message: "Duplicate transaction detected." });
//     } else if (error.code === "23503") {
//       // Foreign key constraint violation
//       return res
//         .status(400)
//         .json({ message: "Invalid reference in transaction." });
//     } else if (error.code === "22P02") {
//       // Invalid text representation
//       return res
//         .status(400)
//         .json({ message: "Invalid data format in transaction." });
//     }

//     res
//       .status(500)
//       .json({ message: "Internal server error", error: error.message });
//   }
// });

app.post("/submitCrypto", async (req, res) => {
  console.log("Received submitCrypto request:", req.body);

  const { username, cryptoAddress, amount, usdtAddress, transactionHash } =
    req.body;

  if (
    !username ||
    !cryptoAddress ||
    !amount ||
    !usdtAddress ||
    !transactionHash
  ) {
    console.log("Missing required fields:", {
      username,
      cryptoAddress,
      amount,
      usdtAddress,
      transactionHash,
    });
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    // Insert into Postgres database, including transactionHash
    const query = `INSERT INTO Transactionss (username, cryptoAddress, amount, usdtAddress, transactionHash) 
                   VALUES ($1, $2, $3, $4, $5) RETURNING *`;
    const values = [
      username,
      cryptoAddress,
      amount,
      usdtAddress,
      transactionHash,
    ];

    console.log("Executing query:", query);
    console.log("Query values:", values);

    const result = await pool.query(query, values);

    console.log("Transaction recorded successfully:", result.rows[0]);

    res.status(200).json({
      message: "Transaction recorded successfully",
      transaction: result.rows[0],
    });
  } catch (error) {
    console.error("Error inserting transaction:", error);

    // More detailed error handling
    if (error.code === "23505") {
      return res
        .status(409)
        .json({ message: "Duplicate transaction detected." });
    } else if (error.code === "23503") {
      return res
        .status(400)
        .json({ message: "Invalid reference in transaction." });
    } else if (error.code === "22P02") {
      return res
        .status(400)
        .json({ message: "Invalid data format in transaction." });
    }

    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});

// Get user joined data
app.get("/api/check-user-joined", async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    // Query to get all relevant data for the user from the auction_table
    const result = await pool.query(
      "SELECT user_email, joining_amount, auction_slot, amount_to_be_paid FROM auction_table WHERE user_email = $1",
      [email]
    );

    if (result.rows.length > 0) {
      // User has joined the auction, return all relevant data
      res.json({ hasJoined: true, data: result.rows[0] }); // Return the first row of data
    } else {
      // User has not joined the auction
      res.json({ hasJoined: false });
    }
  } catch (error) {
    console.error("Error checking if user has joined:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// app.post("/api/insert-transaction", async (req, res) => {
//   const { email, address, amount, transaction_hash, crptoaddress } = req.body;

//   // Validate input
//   if (!email || !address || !transaction_hash) {
//     return res.status(400).json({ error: "Missing required fields" });
//   }

//   try {
//     // Insert the transaction into the database
//     const query = `
//             INSERT INTO transactionss (username, usdtaddress, amount, transactionhash, cryptoaddress, createdat, updatedat)
//             VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
//             RETURNING *;
//         `;
//     const values = [email, address, amount, transaction_hash, crptoaddress];

//     const result = await pool.query(query, values);
//     const insertedTransaction = result.rows[0];

//     // Update the auction_table to subtract the amount paid
//     const updateQuery = `
//             UPDATE auction_table
//             SET amount_to_be_paid = amount_to_be_paid - $1
//             WHERE user_email = $2
//             RETURNING *;
//         `;
//     const updateValues = [amount, email];

//     await pool.query(updateQuery, updateValues);

//     // Respond with the inserted transaction
//     res.status(201).json(insertedTransaction);
//   } catch (error) {
//     console.error("Error inserting transaction:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

app.post("/api/insert-transaction", async (req, res) => {
  const { email, address, amount, transaction_hash, crptoaddress } = req.body;

  // Validate input
  if (!email || !address || !transaction_hash) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Insert the transaction into the database
    const query = `
            INSERT INTO transactionss (username, usdtaddress, amount, transactionhash, cryptoaddress, createdat, updatedat)
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            RETURNING *;
        `;
    const values = [email, address, amount, transaction_hash, crptoaddress];

    const result = await pool.query(query, values);
    const insertedTransaction = result.rows[0];

    // Update the auction_table to subtract the amount paid
    const updateQuery = `
            UPDATE auction_table
            SET amount_to_be_paid = amount_to_be_paid - $1
            WHERE user_email = $2
            RETURNING amount_to_be_paid; 
        `;
    const updateValues = [amount, email];

    const updateResult = await pool.query(updateQuery, updateValues);
    const updatedAmountToBePaid = updateResult.rows[0].amount_to_be_paid;

    // Respond with the inserted transaction and updated amount
    res.status(201).json({
      transaction: insertedTransaction,
      updatedAmountToBePaid: updatedAmountToBePaid,
    });
  } catch (error) {
    console.error("Error inserting transaction:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/total-paid", async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const query = `
            SELECT SUM(amount) AS total_paid, 
                   MAX(usdtaddress) AS usdtaddress  -- Get the first usdtaddress (or use another aggregation method)
            FROM transactionss
            WHERE username = $1;
        `;
    const values = [email];

    const result = await pool.query(query, values);
    const totalPaid = result.rows[0]?.total_paid || 0; // Default to 0 if no records found
    const usdtaddress = result.rows[0]?.usdtaddress || null; // Default to null if no address found

    res.status(200).json({ totalPaid, usdtaddress });
  } catch (error) {
    console.error("Error fetching total paid:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
