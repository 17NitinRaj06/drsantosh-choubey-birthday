import React from "react";

export default function Footer() {
  return (
    <footer
      className="chapter-stone"
      role="contentinfo"
      data-testid="footer"
      style={{ paddingTop: "96px", paddingBottom: "64px" }}
    >
      <div className="max-w-5xl mx-auto px-6 md:px-12">
        {/* Two-column layout: tribute left, credit right */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
          {/* Left: tribute */}
          <div>
            <p
              className="font-display italic"
              style={{ fontSize: "1.25rem", color: "var(--ink)" }}
            >
              A tribute to Santosh Choubey
            </p>
            <p
              className="font-body mt-1"
              style={{ fontSize: "0.75rem", color: "var(--dhundh)" }}
            >
              Founder and Chairman, AISECT Group. 1955 to 2026.
            </p>
          </div>

          {/* Right: credit */}
          <p
            className="font-body md:text-right"
            style={{ fontSize: "0.75rem", color: "var(--dhundh)" }}
          >
            A tribute website. Photographs: santoshchoubey.com.
          </p>
        </div>

        {/* Hairline rule */}
        <hr style={{ border: "none", height: "1px", backgroundColor: "var(--ink)", opacity: 0.1 }} />

        {/* Bottom row: copyright */}
        <div className="mt-6">
          <p
            className="font-body"
            style={{ fontSize: "0.75rem", color: "var(--dhundh)" }}
          >
            &copy; 2026 Department of CS &amp; IT, AISECT University. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
