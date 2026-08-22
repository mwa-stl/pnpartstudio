import React, { useState } from "react";
import Select from "./Select.jsx";
import { CLIENT_ROUTES, isKnownRoute } from "../../data/clientRoutes.js";

const CUSTOM = "__custom__";

/**
 * Picks a destination for a button or CTA.
 *
 * Admins should not have to remember that the commission page lives at
 * `/custom-order`, so the storefront's routes are offered by name. An
 * external URL (a booking form, a social profile) is still possible via the
 * "Custom link" escape hatch, which reveals a plain text field.
 */
const LinkPicker = ({ value = "", onChange, id, allowEmpty = true, emptyLabel = "No link" }) => {
  // An existing value that is not a known route must already be a custom one.
  const [custom, setCustom] = useState(() => Boolean(value) && !isKnownRoute(value));

  const options = [
    ...(allowEmpty ? [{ value: "", label: emptyLabel, group: "None" }] : []),
    ...CLIENT_ROUTES,
    { value: CUSTOM, label: "Custom link…", hint: "External URL", group: "Other" },
  ];

  const handleSelect = (next) => {
    if (next === CUSTOM) {
      setCustom(true);
      return;
    }
    setCustom(false);
    onChange?.(next);
  };

  return (
    <div className="flex flex-col gap-2">
      <Select
        id={id}
        value={custom ? CUSTOM : value}
        onChange={handleSelect}
        options={options}
        placeholder="Choose a page…"
      />
      {custom && (
        <input
          className="field"
          value={value}
          placeholder="https://example.com/booking"
          aria-label="Custom link"
          onChange={(e) => onChange?.(e.target.value)}
        />
      )}
    </div>
  );
};

export default LinkPicker;
