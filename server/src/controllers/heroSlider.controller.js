import HeroSlider from '../models/HeroSlider.js';

// GET ALL
export const listHeroSlides = async (req, res) => {
  const slides = await HeroSlider.find().sort({ createdAt: 1 });
  res.json(slides);
};

// CREATE
export const createHeroSlide = async (req, res) => {
  try {
    const { image, alt, eyebrow, heading, sub, ctaLabel, ctaHref } = req.body;
    if (!image || !alt || !heading || !ctaLabel || !ctaHref)
      return res.status(400).json({ message: 'Missing required fields' });
    const slide = await HeroSlider.create({ image, alt, eyebrow, heading, sub, ctaLabel, ctaHref });
    res.status(201).json(slide);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

// PATCH (update)
export const updateHeroSlide = async (req, res) => {
  try {
    const { image, alt, eyebrow, heading, sub, ctaLabel, ctaHref } = req.body;
    const slide = await HeroSlider.findByIdAndUpdate(
      req.params.id,
      { image, alt, eyebrow, heading, sub, ctaLabel, ctaHref },
      { new: true }
    );
    if (!slide) return res.status(404).json({ message: 'Slide not found' });
    res.json(slide);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

// DELETE
export const deleteHeroSlide = async (req, res) => {
  const slide = await HeroSlider.findByIdAndDelete(req.params.id);
  if (!slide) return res.status(404).json({ message: 'Slide not found' });
  res.json({ message: 'Slide deleted' });
};
