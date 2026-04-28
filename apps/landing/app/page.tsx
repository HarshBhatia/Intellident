"use client";

import { useState, useEffect } from "react";

function ToothIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M18.5 2h-13C4.1 2 3 4.1 3 6.5c0 2.5 1.5 4.5 3 6v7c0 1.4 1.1 2.5 2.5 2.5h1c1.1 0 2-.9 2-2v-4h1v4c0 1.1.9 2 2 2h1c1.4 0 2.5-1.1 2.5-2.5v-7c1.5-1.5 3-3.5 3-6 0-2.4-1.1-4.5-2.5-4.5z" />
    </svg>
  );
}

const faqItems = [
  {
    q: "Is my patient data private and secure?",
    a: "Yes. Every clinic's data is kept completely separate. No one else can see your patients or records. Your data stays private and safe at all times.",
  },
  {
    q: "How does the AI clinical notes feature work?",
    a: "Just press record and speak normally. IntelliDent listens and automatically writes a clean clinical note for you. The diagnosis, treatment, and procedure details already filled in. It usually takes 3 seconds.",
  },
  {
    q: "Can I manage multiple clinic locations?",
    a: "Yes. With the Pro plan you can add as many clinics as you want under one login. Each clinic is separate. Different patients, different records, different earnings. Switch between them easily from the top of the screen.",
  },
  {
    q: "Is there a mobile app for patients?",
    a: "Yes. Patients can download the IntelliDent app on their Android or iPhone. They can see their past visits, treatment details, and payment history. Anytime, without calling the clinic.",
  },
  {
    q: "What happens when I hit the free plan's patient limit?",
    a: "We will warn you before you reach the limit. Your existing patient records are safe. Nothing gets deleted. You can upgrade to Pro at any time to add more patients and get all features.",
  },
];

export default function LandingPage() {
  const [isDark, setIsDark] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [navShadow, setNavShadow] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("intellident-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = stored ? stored === "dark" : prefersDark;
    setIsDark(dark);
    if (dark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, []);

  useEffect(() => {
    const onScroll = () => setNavShadow(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("intellident-theme", next ? "dark" : "light");
    if (next) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }

  function toggleFaq(i: number) {
    setOpenFaq(openFaq === i ? null : i);
  }

  return (
    <>
      {/* Nav */}
      <nav id="main-nav" style={navShadow ? { boxShadow: "0 1px 20px rgba(0,0,0,0.08)" } : {}}>
        <div className="nav-inner">
          <a href="#" className="logo">
            <div className="logo-icon">
              <ToothIcon size={18} color="#fff" />
            </div>
            <span className="logo-text">IntelliDent</span>
          </a>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="nav-actions">
            <button className="theme-btn" onClick={toggleTheme} title="Toggle theme">
              {isDark ? (
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h1M4 12H3m15.364-6.364l.707-.707M6.343 17.657l-.707.707M16.95 16.95l.707.707M7.05 7.05l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            <a href="https://dashboard.intellident.app/sign-in" className="btn btn-ghost">Sign in</a>
            <a href="https://dashboard.intellident.app/sign-up" className="btn btn-primary">Start free →</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section id="hero">
        <div className="hero-inner">
          <div className="hero-text">
            <div className="hero-eyebrow">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Made for dental clinics in India
            </div>
            <h1 className="hero-title">
              Manage your clinic.<br /><span>The simple way.</span>
            </h1>
            <p className="hero-sub">Keep patient records, track payments, and write notes with your voice. All in one place. No training needed. Start in minutes.</p>
            <div className="hero-actions">
              <a href="https://dashboard.intellident.app/sign-up" className="btn btn-primary btn-primary-lg">Start for free</a>
              <a href="#how" className="btn btn-outline-dark-lg">See how it works</a>
            </div>
            <div className="hero-social">
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20" style={{ color: "#16a34a" }}>
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              No credit card required · Free forever plan available
            </div>
          </div>

          {/* Dashboard mockup */}
          <div className="hero-mockup">
            <div className="mockup-browser">
              <div className="mockup-bar">
                <div className="dot dot-r" />
                <div className="dot dot-y" />
                <div className="dot dot-g" />
                <div className="mockup-url">
                  <span className="mockup-url-text">dashboard.intellident.app</span>
                </div>
              </div>
              <div>
                <div className="mock-nav">
                  <div className="mock-logo">
                    <div className="mock-logo-icon">
                      <ToothIcon size={14} color="white" />
                    </div>
                    <span className="mock-logo-text">IntelliDent</span>
                    <span className="mock-nav-sep">|</span>
                    <span className="mock-nav-page">Dashboard</span>
                  </div>
                  <div className="mock-nav-right">
                    <span className="mock-nav-link">Earnings</span>
                    <span className="mock-nav-link">Expenses</span>
                    <span className="mock-nav-link">Settings</span>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#374151" }} />
                  </div>
                </div>
                <div className="mock-body">
                  <div className="mock-stats">
                    <div className="mock-stat">
                      <div className="mock-stat-icon blue">
                        <svg width="16" height="16" fill="none" stroke="#3b82f6" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      </div>
                      <div>
                        <div className="mock-stat-label">Total Patients</div>
                        <div className="mock-stat-val">247</div>
                      </div>
                    </div>
                    <div className="mock-stat">
                      <div className="mock-stat-icon green">
                        <svg width="16" height="16" fill="none" stroke="#4ade80" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <div>
                        <div className="mock-stat-label">Today&apos;s Visits</div>
                        <div className="mock-stat-val">12</div>
                      </div>
                    </div>
                    <div className="mock-stat">
                      <div className="mock-stat-icon purple">
                        <svg width="16" height="16" fill="none" stroke="#a78bfa" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      </div>
                      <div>
                        <div className="mock-stat-label">Doctors</div>
                        <div className="mock-stat-val">4</div>
                      </div>
                    </div>
                  </div>
                  <div className="mock-section-title">Patient Records</div>
                  <div className="mock-section-sub">Welcome, Dr. Sharma · Managing Bright Smiles Clinic</div>
                  <div className="mock-table">
                    <div className="mock-table-header">
                      <span className="mock-th">Actions</span>
                      <span className="mock-th">ID</span>
                      <span className="mock-th">Name</span>
                      <span className="mock-th">Age</span>
                      <span className="mock-th">Phone</span>
                      <span className="mock-th">Last Visit</span>
                    </div>
                    {[
                      { id: "PID-24", name: "Priya Malhotra", age: 28, phone: "+91 98765 43210", date: "25 Apr 2026" },
                      { id: "PID-23", name: "Arjun Mehta", age: 34, phone: "+91 87654 32109", date: "24 Apr 2026" },
                      { id: "PID-22", name: "Sunita Rao", age: 45, phone: "+91 76543 21098", date: "22 Apr 2026" },
                    ].map((row) => (
                      <div key={row.id} className="mock-table-row">
                        <span className="mock-td mock-chat-icon">
                          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        </span>
                        <span className="mock-td" style={{ color: "rgba(255,255,255,0.4)" }}>{row.id}</span>
                        <span className="mock-td" style={{ fontWeight: 600, color: "#fff" }}>{row.name}</span>
                        <span className="mock-td">{row.age}</span>
                        <span className="mock-td">{row.phone}</span>
                        <span className="mock-td">{row.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <div className="stats-strip">
        <div className="stats-strip-inner">
          {[
            { num: "500+", label: "Patients managed" },
            { num: "3 sec", label: "Avg. note generation" },
            { num: "100%", label: "Multi-tenant isolation" },
            { num: "iOS + Android", label: "Mobile app included" },
          ].map((s) => (
            <div key={s.label} className="stat-item">
              <div className="stat-num">{s.num}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <section id="features">
        <div className="section-inner">
          <div className="center">
            <div className="section-label">Features</div>
            <h2 className="section-title">One app. Everything your clinic needs.</h2>
            <p className="section-sub">From patient files to daily earnings. IntelliDent keeps it all organised so you can focus on your patients.</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon fi-blue">
                <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <div className="feature-title">Patient Records</div>
              <div className="feature-desc">Save each patient&apos;s details, visits, tooth notes, and treatment history. Find any patient in seconds. No paper files needed.</div>
              <span className="feature-tag">Core</span>
            </div>
            <div className="feature-card">
              <div className="feature-icon fi-purple">
                <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              </div>
              <div className="feature-title">Voice Notes with AI</div>
              <div className="feature-desc">Just speak. IntelliDent writes the clinical notes for you. Talk in any language, and the AI will create a clean, ready-to-save note automatically.</div>
              <span className="feature-tag">AI-powered</span>
            </div>
            <div className="feature-card">
              <div className="feature-icon fi-green">
                <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              </div>
              <div className="feature-title">Earnings Tracker</div>
              <div className="feature-desc">See how much money came in today, this week, or this month. Know which patients have paid and which ones still owe. All in one screen.</div>
              <span className="feature-tag">Finance</span>
            </div>
            <div className="feature-card">
              <div className="feature-icon fi-rose">
                <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div className="feature-title">Expense Tracker</div>
              <div className="feature-desc">Record what you spend on supplies, rent, and equipment. See your actual profit, not just what came in.</div>
              <span className="feature-tag">Finance</span>
            </div>
            <div className="feature-card">
              <div className="feature-icon fi-amber">
                <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2a2 2 0 002 2zM12 3C9.239 3 7 5.239 7 8c0 2.197 1.33 4.085 3.24 4.753L12 15l1.76-2.247C15.67 12.085 17 10.197 17 8c0-2.761-2.239-5-5-5z" /></svg>
              </div>
              <div className="feature-title">Mobile App</div>
              <div className="feature-desc">Your patients can check their visit history and records on their phone. Works on both Android and iPhone. Nothing to install on your side.</div>
              <span className="feature-tag">Mobile</span>
            </div>
            <div className="feature-card">
              <div className="feature-icon fi-teal">
                <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              </div>
              <div className="feature-title">Multiple Clinics</div>
              <div className="feature-desc">Running more than one clinic? Manage all of them from one login. Each clinic&apos;s patients and records stay completely separate.</div>
              <span className="feature-tag">Multi-location</span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how">
        <div className="section-inner">
          <div className="center">
            <div className="section-label">How it works</div>
            <h2 className="section-title">Ready in 3 simple steps.</h2>
            <p className="section-sub">No installation. No long setup. Open the app and you are ready to go.</p>
          </div>
          <div className="steps">
            <div className="step">
              <div className="step-num">1</div>
              <div className="step-title">Create your clinic</div>
              <div className="step-desc">Sign up with your email and set up your clinic. Add your doctors. Takes less than 2 minutes.</div>
            </div>
            <div className="step">
              <div className="step-num">2</div>
              <div className="step-title">Add your patients</div>
              <div className="step-desc">Add a patient, record their visit, mark the treatment and payment. Simple forms. No confusing fields.</div>
            </div>
            <div className="step">
              <div className="step-num">3</div>
              <div className="step-title">Speak your notes</div>
              <div className="step-desc">Press record and talk. IntelliDent writes the notes for you automatically. No typing during the consultation.</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing">
        <div className="section-inner">
          <div className="center">
            <div className="section-label">Pricing</div>
            <h2 className="section-title">Simple, honest pricing.</h2>
            <p className="section-sub">Start free. Upgrade when you&apos;re ready. No hidden fees, no per-seat surprises.</p>
          </div>
          <div className="pricing-grid">
            <div className="pricing-card">
              <div className="pricing-tier">Free</div>
              <div className="pricing-price">
                <span className="price-amt">₹0</span>
                <span className="price-period">/ month</span>
              </div>
              <p className="pricing-desc">Good for small clinics just getting started. Free to use, no card needed.</p>
              <ul className="pricing-features">
                {["1 clinic location", "Up to 100 patients", "Patient records & visit history", "Basic financial tracking", "Mobile app access"].map((f) => (
                  <li key={f}>
                    <CheckIcon /> {f}
                  </li>
                ))}
                {["AI clinical notes", "Multiple clinic locations"].map((f) => (
                  <li key={f}>
                    <CrossIcon /> <span style={{ color: "var(--fg3)" }}>{f}</span>
                  </li>
                ))}
              </ul>
              <a href="https://dashboard.intellident.app/sign-up" className="btn btn-ghost btn-pricing">Get started free</a>
            </div>
            <div className="pricing-card featured">
              <div className="pricing-badge">Most popular</div>
              <div className="pricing-tier">Pro</div>
              <div className="pricing-price">
                <span className="price-amt">₹999</span>
                <span className="price-period">/ month</span>
              </div>
              <p className="pricing-desc">For busier clinics. Get AI voice notes, unlimited patients, and all locations in one place.</p>
              <ul className="pricing-features">
                {[
                  "Unlimited clinic locations",
                  "Unlimited patients",
                  "Patient records & visit history",
                  "Full financial & expense tracking",
                  "Mobile app access",
                ].map((f) => (
                  <li key={f}><CheckIcon /> {f}</li>
                ))}
                <li><CheckIcon /> <strong>AI clinical notes (Gemini)</strong></li>
                <li><CheckIcon /> Priority support</li>
              </ul>
              <a href="https://dashboard.intellident.app/sign-up" className="btn btn-primary btn-pricing">Start Pro free for 14 days</a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq">
        <div className="section-inner">
          <div className="center">
            <div className="section-label">FAQ</div>
            <h2 className="section-title">Common questions.</h2>
          </div>
          <div className="faq-list">
            {faqItems.map((item, i) => (
              <div key={i} className={`faq-item${openFaq === i ? " open" : ""}`}>
                <button className="faq-q" onClick={() => toggleFaq(i)}>
                  {item.q}
                  <svg className="faq-chevron" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="faq-a">{item.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section id="cta-banner">
        <div className="cta-banner-inner">
          <h2 className="cta-title">Give your clinic a fresh start.</h2>
          <p className="cta-sub">Free to try. No card needed. Set up in minutes and see how easy managing a clinic can be.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="https://dashboard.intellident.app/sign-up" className="btn btn-white btn-primary-lg">Start for free →</a>
            <a href="#pricing" className="btn btn-white-outline btn-primary-lg">See pricing</a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <a href="#" className="logo">
                <div className="logo-icon">
                  <ToothIcon size={16} color="#fff" />
                </div>
                <span className="logo-text">IntelliDent</span>
              </a>
              <p>Simple clinic management for Indian dentists. Patient records, payments, and AI notes. All in one place.</p>
            </div>
            <div className="footer-col">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <a href="#how">How it works</a>
            </div>
            <div className="footer-col">
              <h4>Legal</h4>
              <a href="https://dashboard.intellident.app/privacy">Privacy Policy</a>
              <a href="https://dashboard.intellident.app/terms">Terms of Service</a>
            </div>
            <div className="footer-col">
              <h4>Account</h4>
              <a href="https://dashboard.intellident.app/sign-in">Sign in</a>
              <a href="https://dashboard.intellident.app/sign-up">Sign up free</a>
            </div>
          </div>
          <div className="footer-bottom">
            <span className="footer-copy">© 2026 IntelliDent. All rights reserved.</span>
            <span className="footer-copy">Made with care for dentists everywhere.</span>
          </div>
        </div>
      </footer>
    </>
  );
}

function CheckIcon() {
  return (
    <svg className="check" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg className="cross" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
