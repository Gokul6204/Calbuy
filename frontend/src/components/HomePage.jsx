import React from 'react'

export function HomePage({ onGetStarted }) {
    return (
        <div className="view-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', gap: '1rem', textAlign: 'center' }}>
            <img src="/assest/images/calbuy-logo.jpeg" alt="Calbuy Logo" style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', marginBottom: '1rem' }} />
            <h1 style={{ fontSize: '3rem', fontWeight: '800', margin: 0 }}>Welcome to <span style={{ color: 'var(--accent)' }}>Calbuy</span></h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.25rem', marginBottom: '2rem' }}>Your Intelligent Procurement Hub</p>
            <button className="btn btn-primary btn-lg" onClick={onGetStarted} style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }}>
                Get Started
            </button>
        </div>
    )
}
