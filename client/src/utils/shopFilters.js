export const PRODUCT_FILTERS = {
  "All Products": [
    "Paintings",
    "Holiday gifts",
    "Landscapes",
    "Modern art",
    "Name sign",
    "Limited editions",
    "Pencil sketches",
    { label: "Digital prints", disabled: true },
  ],
  "Indian Products": [
    "Indian god paintings",
    "Musical Art paintings",
    {
      label: "Return gifts",
      children: [
        "Kolam coasters",
        "Kolam peetham",
        "Traditional magnets",
        "Trays",
        "Diya holders"
      ]
    }
  ]
};

export const MAIN_CATEGORIES = Object.keys(PRODUCT_FILTERS);
