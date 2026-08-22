// server/src/controllers/customOrderController.js
import nodemailer from 'nodemailer';
import { processImage } from '../services/media.js';
import { isStorageConfigured } from '../services/storage.js';

export const submitOrder = async (req, res) => {
  try {
    const { name, email, phone, artType, size, description, budget, deadline } = req.body;
    const attachment = req.file;

    if (!name || !email || !artType || !size || !description) {
      return res.status(400).json({ message: 'Missing required fields.' });
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
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
      <p><strong>Art Type:</strong> ${artType}</p>
      <p><strong>Size:</strong> ${size}</p>
      <p><strong>Budget:</strong> ${budget || 'Not specified'}</p>
      <p><strong>Deadline:</strong> ${deadline || 'Not specified'}</p>
      <hr />
      <p><strong>Description:</strong></p>
      <p>${(description || '').replace(/\n/g, '<br />')}</p>
    `;

    const mail = await transporter.sendMail({
      from: `"${name}" <${process.env.EMAIL_USER}>`,
      replyTo: email,
      to: 'contact@codewithjay.in',
      subject: `Custom Art Request  ${name}`,
      html,
      attachments: attachment ? [{
        filename: attachment.originalname,
        content: attachment.buffer
      }] : [],
    });

    return res.status(200).json({ message: 'Request submitted successfully.', referenceUrl });
  } catch (err) {
    console.error('submitOrder error:', err);
    return res.status(500).json({ message: 'Failed to submit request. Please try again.' });
  }
};
