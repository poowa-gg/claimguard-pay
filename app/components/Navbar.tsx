'use client';

import { useState } from 'react';

function PPLogo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path
        d="M7.076 21.337H4.72c-.41 0-.745-.25-.825-.617l-2.85-18.1A.521.521 0 0 1 1.5 2h5.27c2.807 0 5.2 1.074 5.993 4.065.54 2.04-.147 3.98-1.71 5.218 1.218.887 1.883 2.3 1.69 3.97-.372 3.2-2.77 6.084-5.667 6.084zm.44-13.6c-.352 1.321-1.397 1.983-2.808 1.983H3.65l.81-5.14h1.058c1.41 0 2.296.635 2.296 1.904 0 .405-.075.816-.3 1.253zm.5 7.283c-.38 1.413-1.52 2.123-3.034 2.123H3.3l.875-5.566h1.683c1.514 0 2.444.68 2.444 1.99 0 .49-.1.97-.287 1.453z"
        fill="#009cde"
      />
      <path
        d="M21.07 7.565c-.94 4.384-3.88 6.87-8.03 6.87h-1.61l-1.27 8.07c-.07.42-.44.73-.87.73H6.85c-.41 0-.72-.33-.67-.73l2.85-18.1c.07-.44.45-.74.88-.74h6.2c3.34 0 5.56 1.59 5.56 4.71 0 .4-.05.8-.13 1.19h-.47z"
        fill="#003087"
      />
    </svg>
  );
}

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <nav className="nav">
      <div className="nav-container">
        <a href="/" className="nav-logo" onClick={closeMenu}>
          <PPLogo />
          <span>ClaimGuard Pay</span>
        </a>

        {/* Desktop Links */}
        <div className="nav-desktop">
          <div className="nav-links">
            <a href="#demo">Live Demo</a>
            <a href="#how">How It Works</a>
            <a href="#engine">Detection Engine</a>
            <a href="#evidence">Evidence</a>
            <span className="nav-badge">PayPal AI Hackathon 2026</span>
          </div>
          <a
            href="https://github.com/poowa-gg/claimguard-pay"
            target="_blank"
            rel="noreferrer"
            className="nav-btn"
          >
            ★ Source on GitHub
          </a>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          className="nav-mobile-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? (
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          ) : (
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="nav-mobile-menu">
          <div className="nav-mobile-badge-wrap">
            <span className="nav-badge">PayPal AI Hackathon 2026</span>
          </div>
          <a href="#demo" onClick={closeMenu} className="nav-mobile-link">
            ⚡ Live Demo
          </a>
          <a href="#how" onClick={closeMenu} className="nav-mobile-link">
            🔍 How It Works
          </a>
          <a href="#engine" onClick={closeMenu} className="nav-mobile-link">
            🛡️ Detection Engine
          </a>
          <a href="#evidence" onClick={closeMenu} className="nav-mobile-link">
            📊 Evidence
          </a>
          <a
            href="https://github.com/poowa-gg/claimguard-pay"
            target="_blank"
            rel="noreferrer"
            className="nav-mobile-btn"
            onClick={closeMenu}
          >
            ★ Source on GitHub ↗
          </a>
        </div>
      )}
    </nav>
  );
}
