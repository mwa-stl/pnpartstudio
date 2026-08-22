import Testimonial from '../models/Testimonial.js';

export async function createTestimonial(req, res) {
  try {
    const { name, city, rating, review, imageUrl } = req.body;
    if (!name || !city || !rating || !review || !imageUrl) {
      return res.status(400).json({ success: false, error: 'All fields are required.' });
    }
    const testimonial = await Testimonial.create({ name, city, rating, review, imageUrl });
    res.status(201).json({ success: true, testimonial });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to create testimonial', message: e.message });
  }
}

export async function getTestimonials(req, res) {
  try {
    const testimonials = await Testimonial.find().sort({ createdAt: -1 });
    res.json({ success: true, testimonials });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to fetch testimonials', message: e.message });
  }
}

export async function updateTestimonial(req, res) {
  try {
    const { id } = req.params;
    const { name, city, rating, review, imageUrl } = req.body;
    const testimonial = await Testimonial.findByIdAndUpdate(
      id, { name, city, rating, review, imageUrl }, { new: true, runValidators: true }
    );
    if (!testimonial)
      return res.status(404).json({ success: false, error: 'Testimonial not found' });
    res.json({ success: true, testimonial });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to update testimonial', message: e.message });
  }
}

// Optional: deleteTestimonial
export async function deleteTestimonial(req, res) {
  try {
    const { id } = req.params;
    const testimonial = await Testimonial.findByIdAndDelete(id);
    if (!testimonial)
      return res.status(404).json({ success: false, error: 'Testimonial not found' });
    res.json({ success: true, message: "Deleted" });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to delete testimonial', message: e.message });
  }
}
