const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();

// In the middleware section
app.use(cors({
    origin: '*', // Allow ALL domains (easiest for testing)
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express.json());

// Email Configuration
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your SMTP provider
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Endpoint to send notification
app.post('/api/notify', async (req, res) => {
  const { employerEmail, jobTitle, candidateName, resumeUrl } = req.body;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: employerEmail,
    subject: `New Application for ${jobTitle}`,
    text: `Hello,\n\n${candidateName} has applied for ${jobTitle}.\n\nView Resume: ${resumeUrl}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).send({ message: 'Email sent successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to send email' });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
