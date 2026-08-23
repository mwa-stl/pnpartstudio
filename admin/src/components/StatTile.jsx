import React from "react";

/** A small bordered number tile for a page's stats strip — icon, mono label, big serif value. */
const StatTile = ({ icon: Icon, label, value, accent }) => (
  <div className="panel panel-pad flex items-center gap-3.5">
    <div className={`w-9 h-9 flex items-center justify-center border shrink-0 ${accent ? "border-vermillion text-vermillion" : "border-rule-strong text-graphite"}`}>
      <Icon size={16} strokeWidth={1.8} />
    </div>
    <div className="min-w-0">
      <div className="label-mono truncate">{label}</div>
      <div className="text-[1.3rem] text-ink leading-tight mt-0.5" style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>
        {value}
      </div>
    </div>
  </div>
);

export default StatTile;
