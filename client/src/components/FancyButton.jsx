import React from "react";
import { Link } from "react-router-dom";
import "../styles/fancy-button.css";

/**
 * The system button. Square, mono-lettered, with a vermillion wipe that
 * rises from the base on hover.
 *
 * Variants are applied via className: `fancy-sm`, `fancy-lg`,
 * `fancy-outline`, `fancy-invert` (for ink backgrounds).
 * `invert` prop kept for backwards compatibility with existing call sites.
 */
const FancyButton = ({
  to,
  children,
  className = "",
  as = "button",
  type = "button",
  disabled = false,
  invert = false,
  ...rest
}) => {
  const classes = `fancy${invert ? " fancy-invert" : ""} ${className}`.trim();

  // The label sits above the wipe layer; the span keeps stacking predictable.
  const content = <span className="fancy-label">{children}</span>;

  if (to) {
    return (
      <Link
        to={to}
        className={classes}
        aria-disabled={disabled ? "true" : undefined}
        tabIndex={disabled ? -1 : undefined}
        {...rest}
      >
        {content}
      </Link>
    );
  }

  const Comp = as === "a" ? "a" : "button";
  return (
    <Comp
      type={Comp === "button" ? type : undefined}
      className={classes}
      disabled={Comp === "button" ? disabled : undefined}
      aria-disabled={disabled ? "true" : undefined}
      tabIndex={disabled ? -1 : undefined}
      {...rest}
    >
      {content}
    </Comp>
  );
};

export default FancyButton;
