import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

/**
 * Wrap an image in a fixed-height, overflow-hidden box and it drifts against
 * the scroll direction. `speed` is travel as a fraction of its own height
 * (0.1 subtle, 0.35 dramatic).
 */
const ParallaxLayer = ({ children, speed = 0.18, className = "", style = {}, ...rest }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [`${-speed * 100}%`, `${speed * 100}%`]);

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`} style={style} {...rest}>
      <motion.div style={{ y }} className="absolute inset-0 h-[140%] -top-[20%] will-change-transform">
        {children}
      </motion.div>
    </div>
  );
};

export default ParallaxLayer;
