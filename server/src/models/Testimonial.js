import mongoose from 'mongoose';

const testimonialSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  city:     { type: String, required: true, trim: true },
  rating:   { type: Number, required: true, min: 1, max: 5 },
  review:   { type: String, required: true, trim: true },
  imageUrl: { type: String, required: true, trim: true },
  createdAt:{ type: Date, default: Date.now }
});

export default mongoose.model('Testimonial', testimonialSchema);
