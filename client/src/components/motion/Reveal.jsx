import React from "react";
import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1];

const OFFSETS = {
  up: { x: 0, y: 24 },
  down: { x: 0, y: -24 },
  left: { x: 24, y: 0 },
  right: { x: -24, y: 0 },
  none: { x: 0, y: 0 },
};

/**
 * Scroll-reveal wrapper. Replaces the repeated
 * initial/whileInView/viewport boilerplate across every page.
 */
const Reveal = ({
  children,
  as = "div",
  direction = "up",
  distance,
  delay = 0,
  duration = 0.75,
  once = true,
  amount = 0.2,
  className = "",
  ...rest
}) => {
  const Comp = motion[as] || motion.div;
  const base = OFFSETS[direction] || OFFSETS.up;
  const x = distance != null
    ? (direction === "left" ? distance : direction === "right" ? -distance : 0)
    : base.x;
  const y = distance != null
    ? (direction === "up" ? distance : direction === "down" ? -distance : 0)
    : base.y;

  return (
    <Comp
      initial={{ opacity: 0, x, y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration, delay, ease: EASE }}
      className={className}
      {...rest}
    >
      {children}
    </Comp>
  );
};

/**
 * The signature entrance of this design system: text rises out from behind
 * a hard mask edge, like a poster being pulled up into view. Pass an array
 * of lines, or a single string.
 */
export const RevealLines = ({
  lines,
  as: Tag = "h2",
  className = "",
  delay = 0,
  stagger = 0.08,
  duration = 0.9,
}) => {
  const list = Array.isArray(lines) ? lines : [lines];
  return (
    <Tag className={className}>
      {list.map((line, i) => (
        <span className="reveal-mask" key={i}>
          {/*
            Animates on mount rather than on scroll. A viewport-gated version
            leaves the line parked below the mask and therefore invisible —
            whenever the intersection check doesn't fire (above-the-fold
            headings, smooth-scroll containers, reduced-motion). Headings must
            never be able to end up blank, so entry is unconditional.
          */}
          <motion.span
            initial={{ y: "115%" }}
            animate={{ y: "0%" }}
            transition={{ duration, delay: delay + i * stagger, ease: EASE }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
};

export default Reveal;
