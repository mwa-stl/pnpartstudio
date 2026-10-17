// src/controllers/contactController.js
import nodemailer from 'nodemailer';
import { escapeHtml, escapeHtmlMultiline, headerSafe } from '../lib/escape.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export const submitContact = async (req, res) => {
  try {
    const body = req.body || {};
    const name = text(body.name, 120);
    const email = text(body.email, 254);
    const subject = text(body.subject, 150);
    const message = text(body.message, 5000);
    const phone = text(body.phone, 30);
    const customOrder = Boolean(body.customOrder);

    if (!name || !email || !message) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
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

    // Everything below came from a stranger: escape it before it goes into
    // HTML, and keep it out of mail headers unless it is stripped of newlines.
    const html = `
      <h3>New Contact Form Submission</h3>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(phone) || 'N/A'}</p>
      <p><strong>Custom Order:</strong> ${customOrder ? 'Yes' : 'No'}</p>
      <hr/>
      <p>${escapeHtmlMultiline(message)}</p>
    `;

    await transporter.sendMail({
      from: `"${headerSafe(name)}" <${user}>`,     // authenticated sender
      to,                                          // recipient inbox
      replyTo: email,                              // replies go to requester
      subject: subject ? `Contact: ${headerSafe(subject, 150)}` : `New contact from ${headerSafe(name)}`,
      html,
    });

    return res.status(200).json({ message: 'Message received.' });
  } catch (err) {
    // Log server-side for diagnostics
    console.error('submitContact error:', err);
    return res.status(500).json({ message: 'Failed to submit message.' });
  }
};
