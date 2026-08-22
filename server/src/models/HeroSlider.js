import mongoose from 'mongoose';

const heroSliderSchema = new mongoose.Schema({
  image: { type: String, required: true },
  alt: { type: String, required: true },
  eyebrow: { type: String },
  heading: { type: String, required: true },
  sub: { type: String },
  ctaLabel: { type: String, required: true },
  ctaHref: { type: String, required: true }
}, { timestamps: true });

const HeroSlider = mongoose.model('HeroSlider', heroSliderSchema);
export default HeroSlider;
