// src/controllers/contactController.js
import nodemailer from 'nodemailer';

export const submitContact = async (req, res) => {
  try {
    const { name, email, subject, message, customOrder, phone } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    // SMTP configuration (Gmail or any SMTP)
    // For Gmail: enable 2FA and use an App Password for EMAIL_PASS. [Docs]
    const host = process.env.EMAIL_HOST || 'smtp.hostinger.com';
    const port = Number(process.env.EMAIL_PORT || 465);        // 587 (STARTTLS) recommended
    const secure = String(process.env.EMAIL_SECURE || 'false').toLowerCase() === 'true'; // true typically used with port 465
    const user = process.env.EMAIL_USER;                       // e.g. your-email@gmail.com
    const pass = process.env.EMAIL_PASS;                       // App Password or SMTP password
    const to   = process.env.CONTACT_TO || 'contact@pnpartstudio.com'; // recipient inbox

    if (!user || !pass) {
      return res.status(500).json({ message: 'Email service is not configured.' });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure, // true for 465, false for 587 (uses STARTTLS)
      auth: { user, pass },
    });

    const html = `
      <h3>New Contact Form Submission</h3>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
      <p><strong>Custom Order:</strong> ${customOrder ? 'Yes' : 'No'}</p>
      <hr/>
      <p>${(message || '').replace(/\n/g, '<br/>')}</p>
    `;

    await transporter.sendMail({
      from: `"${name}" <${user}>`,                 // authenticated sender
      to,                                          // recipient inbox
      replyTo: email,                              // replies go to requester
      subject: subject ? `Contact: ${subject}` : `New contact from ${name}`,
      html,
    });

    return res.status(200).json({ message: 'Message received.' });
  } catch (err) {
    // Log server-side for diagnostics
    console.error('submitContact error:', err);
    return res.status(500).json({ message: 'Failed to submit message.' });
  }
};
