// server/src/controllers/customOrderController.js
import nodemailer from 'nodemailer';
import { processImage } from '../services/media.js';
import { isStorageConfigured } from '../services/storage.js';
import { escapeHtml, escapeHtmlMultiline, headerSafe } from '../lib/escape.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export const submitOrder = async (req, res) => {
  try {
    const body = req.body || {};
    const name = text(body.name, 120);
    const email = text(body.email, 254);
    const phone = text(body.phone, 30);
    const artType = text(body.artType, 120);
    const size = text(body.size, 120);
    const description = text(body.description, 5000);
    const budget = text(body.budget, 80);
    const deadline = text(body.deadline, 80);
    const attachment = req.file;

    if (!name || !email || !artType || !size || !description) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,     // e.g. smtp.gmail.com
      port: Number(process.env.EMAIL_PORT || 587),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,   // SMTP user
        pass: process.env.EMAIL_PASS,   // SMTP password / app password
      },
    });

    /* The reference image goes to the bucket as WebP, not just onto an email.
       An emailed attachment is gone the moment the message is deleted, and a
       commission brief is worth keeping. The email carries the link too, and
       the attachment stays as a fallback if the bucket is not configured. */
    let referenceUrl = '';
    if (attachment && isStorageConfigured() && /^image\//i.test(attachment.mimetype || '')) {
      try {
        const stored = await processImage(attachment.buffer, {
          folder: 'enquiries',
          originalName: attachment.originalname,
        });
        referenceUrl = stored.url;
      } catch (e) {
        // Never lose the enquiry over a failed upload — the attachment still rides along.
        console.error('Custom order reference upload failed:', e?.message);
      }
    }

    const html = `
      <h2>New Custom Art Commission Request</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(phone) || 'Not provided'}</p>
      <p><strong>Art Type:</strong> ${escapeHtml(artType)}</p>
      <p><strong>Size:</strong> ${escapeHtml(size)}</p>
      <p><strong>Budget:</strong> ${escapeHtml(budget) || 'Not specified'}</p>
      <p><strong>Deadline:</strong> ${escapeHtml(deadline) || 'Not specified'}</p>
      <hr />
      <p><strong>Description:</strong></p>
      <p>${escapeHtmlMultiline(description)}</p>
    `;

    await transporter.sendMail({
      from: `"${headerSafe(name)}" <${process.env.EMAIL_USER}>`,
      replyTo: email,
      to: process.env.CONTACT_TO || 'contact@codewithjay.in',
      subject: `Custom Art Request  ${headerSafe(name)}`,
      html,
      attachments: attachment ? [{
        filename: headerSafe(attachment.originalname, 100) || 'reference',
        content: attachment.buffer
      }] : [],
    });

    return res.status(200).json({ message: 'Request submitted successfully.', referenceUrl });
  } catch (err) {
    console.error('submitOrder error:', err);
    return res.status(500).json({ message: 'Failed to submit request. Please try again.' });
  }
};
