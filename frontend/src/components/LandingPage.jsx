import React, { useState, useRef, useEffect, useCallback } from 'react';
import './LandingPage.css';
import { FaBolt, FaRobot, FaSearch, FaFileInvoice, FaShieldAlt, FaChartLine, FaArrowRight, FaPlay, FaPause, FaVolumeUp, FaVolumeMute, FaExpand, FaCompress, FaTimes, FaTachometerAlt } from 'react-icons/fa';

/* ── CUSTOM VIDEO PLAYER MODAL ── */
function VideoPlayerModal({ src, onClose }) {
    const videoRef = useRef(null);
    const progressRef = useRef(null);
    const containerRef = useRef(null);
    const hideTimer = useRef(null);

    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [speed, setSpeed] = useState(1);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [controlsVisible, setControlsVisible] = useState(true);

    const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

    // Auto-hide controls after 3 seconds of no mouse activity
    const resetHideTimer = useCallback(() => {
        setControlsVisible(true);
        clearTimeout(hideTimer.current);
        if (playing) {
            hideTimer.current = setTimeout(() => setControlsVisible(false), 3000);
        }
    }, [playing]);

    useEffect(() => {
        resetHideTimer();
        return () => clearTimeout(hideTimer.current);
    }, [playing, resetHideTimer]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'Escape') { onClose(); return; }
            const v = videoRef.current;
            if (!v) return;
            switch (e.key) {
                case ' ':
                case 'k': e.preventDefault(); togglePlay(); break;
                case 'ArrowLeft': e.preventDefault(); v.currentTime = Math.max(0, v.currentTime - 5); break;
                case 'ArrowRight': e.preventDefault(); v.currentTime = Math.min(v.duration, v.currentTime + 5); break;
                case 'ArrowUp': e.preventDefault(); changeVolume(Math.min(1, volume + 0.1)); break;
                case 'ArrowDown': e.preventDefault(); changeVolume(Math.max(0, volume - 0.1)); break;
                case 'm': toggleMute(); break;
                case 'f': toggleFullscreen(); break;
                default: break;
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    });

    const togglePlay = () => {
        const v = videoRef.current;
        if (!v) return;
        if (v.paused) { v.play(); setPlaying(true); }
        else { v.pause(); setPlaying(false); }
    };

    const changeVolume = (val) => {
        const v = videoRef.current;
        if (!v) return;
        const clamped = Math.max(0, Math.min(1, val));
        v.volume = clamped;
        setVolume(clamped);
        if (clamped > 0 && muted) { v.muted = false; setMuted(false); }
    };

    const toggleMute = () => {
        const v = videoRef.current;
        if (!v) return;
        v.muted = !v.muted;
        setMuted(v.muted);
    };

    const changeSpeed = (s) => {
        const v = videoRef.current;
        if (!v) return;
        v.playbackRate = s;
        setSpeed(s);
        setShowSpeedMenu(false);
    };

    const toggleFullscreen = () => {
        const el = containerRef.current;
        if (!el) return;
        if (!document.fullscreenElement) {
            el.requestFullscreen?.();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen?.();
            setIsFullscreen(false);
        }
    };

    useEffect(() => {
        const onFSChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', onFSChange);
        return () => document.removeEventListener('fullscreenchange', onFSChange);
    }, []);

    const handleTimeUpdate = () => {
        const v = videoRef.current;
        if (v) setCurrentTime(v.currentTime);
    };

    const handleLoadedMetadata = () => {
        const v = videoRef.current;
        if (v) setDuration(v.duration);
    };

    const handleSeek = (e) => {
        const rect = progressRef.current.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const v = videoRef.current;
        if (v) v.currentTime = pct * v.duration;
    };

    const formatTime = (s) => {
        if (!s || isNaN(s)) return '0:00';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const progress = duration ? (currentTime / duration) * 100 : 0;

    return (
        <div className="vp-overlay" onClick={onClose}>
            <div
                className="vp-container"
                ref={containerRef}
                onClick={(e) => e.stopPropagation()}
                onMouseMove={resetHideTimer}
            >
                {/* Close Button */}
                <button className="vp-close-btn" onClick={onClose} title="Close (Esc)">
                    <FaTimes />
                </button>

                {/* Video Element */}
                <video
                    ref={videoRef}
                    src={src}
                    className="vp-video"
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={() => setPlaying(false)}
                    onClick={togglePlay}
                />

                {/* Big Center Play when Paused */}
                {!playing && (
                    <div className="vp-big-play" onClick={togglePlay}>
                        <FaPlay />
                    </div>
                )}

                {/* Controls Bar */}
                <div className={`vp-controls ${controlsVisible ? 'visible' : ''}`}>
                    {/* Progress Bar */}
                    <div className="vp-progress-wrap" ref={progressRef} onClick={handleSeek}>
                        <div className="vp-progress-bg">
                            <div className="vp-progress-fill" style={{ width: `${progress}%` }} />
                            <div className="vp-progress-thumb" style={{ left: `${progress}%` }} />
                        </div>
                    </div>

                    <div className="vp-controls-row">
                        {/* Left: Play + Time */}
                        <div className="vp-controls-left">
                            <button className="vp-ctrl-btn" onClick={togglePlay} title={playing ? 'Pause (K)' : 'Play (K)'}>
                                {playing ? <FaPause /> : <FaPlay />}
                            </button>

                            <div className="vp-volume-group">
                                <button className="vp-ctrl-btn" onClick={toggleMute} title="Mute (M)">
                                    {muted || volume === 0 ? <FaVolumeMute /> : <FaVolumeUp />}
                                </button>
                                <input
                                    type="range"
                                    className="vp-volume-slider"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    value={muted ? 0 : volume}
                                    onChange={(e) => changeVolume(parseFloat(e.target.value))}
                                />
                            </div>

                            <span className="vp-time">
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </span>
                        </div>

                        {/* Right: Speed + Fullscreen */}
                        <div className="vp-controls-right">
                            <div className="vp-speed-wrap">
                                <button
                                    className="vp-ctrl-btn vp-speed-btn"
                                    onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                                    title="Playback Speed"
                                >
                                    <FaTachometerAlt />
                                    <span className="vp-speed-label">{speed}x</span>
                                </button>
                                {showSpeedMenu && (
                                    <div className="vp-speed-menu">
                                        {speeds.map((s) => (
                                            <button
                                                key={s}
                                                className={`vp-speed-option ${speed === s ? 'active' : ''}`}
                                                onClick={() => changeSpeed(s)}
                                            >
                                                {s}x
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button className="vp-ctrl-btn" onClick={toggleFullscreen} title="Fullscreen (F)">
                                {isFullscreen ? <FaCompress /> : <FaExpand />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── LANDING PAGE ── */
export function LandingPage({ onGetStarted }) {
    const [showDemo, setShowDemo] = useState(false);

    return (
        <div className="lp-container">
            {/* ── VIDEO PLAYER MODAL ── */}
            {showDemo && (
                <VideoPlayerModal
                    src="/assest/video/Calbuy.mp4"
                    onClose={() => setShowDemo(false)}
                />
            )}

            {/* ── HERO SECTION ── */}
            <header className="lp-hero">
                <div className="lp-hero-bg">
                    <div className="bg-blob blob-1"></div>
                    <div className="bg-blob blob-2"></div>
                </div>
                
                <div className="lp-hero-content">
                    
                    <div className="lp-hero-logo">
                         <div className="cb-brand-circle large">
                            <img src="/assest/images/calbuy-logo.jpeg" alt="Calbuy" className="cb-brand-img" />
                        </div>
                    </div>

                    <h1 className="lp-title">
                        Welcome to <span className="text-gradient">CalBuy</span>
                    </h1>
                    <p className="lp-subtitle">
                        Streamline your entire procurement lifecycle with our intelligent, 
                        AI-driven engine designed for modern engineering teams.
                    </p>
                    
                    <div className="lp-cta-group">
                        <button className="lp-btn-primary" onClick={onGetStarted}>
                            Get Started Now <FaArrowRight />
                        </button>
                        <button className="lp-btn-secondary" onClick={() => setShowDemo(true)}>
                            <FaPlay style={{ fontSize: '0.75rem' }} /> Watch Demo
                        </button>
                    </div>
                </div>
            </header>

            {/* ── KEY FEATURES ── */}
            <section className="lp-section">
                <div className="lp-section-header">
                    <h2 className="lp-section-title">Intelligent Capabilities</h2>
                    <p className="lp-section-desc">Powerful features designed to handle the complexity of industrial procurement.</p>
                </div>

                <div className="lp-feature-grid">
                    <div className="lp-feature-card">
                        <div className="feature-icon-box blue">
                            <FaFileInvoice />
                        </div>
                        <h3>BOM Extraction</h3>
                        <p>Automatically parse and extract line items from complex Bill of Materials with specialized parsing engines.</p>
                    </div>

                    <div className="lp-feature-card">
                        <div className="feature-icon-box purple">
                            <FaRobot />
                        </div>
                        <h3>Vendor Selection</h3>
                        <p>Our neural engine ranks vendors based on cost, lead time, and past performance for every single line item.</p>
                    </div>

                    <div className="lp-feature-card">
                        <div className="feature-icon-box orange">
                            <FaBolt />
                        </div>
                        <h3>RFQ Orchestration</h3>
                        <p>Generate and send bulk RFQs in seconds. Let vendors provide quotes through an integrated portal.</p>
                    </div>

                    <div className="lp-feature-card">
                        <div className="feature-icon-box green">
                            <FaSearch />
                        </div>
                        <h3>Deep-Search Analytics</h3>
                        <p>Historical price tracking and vendor reliability scores to ensure you always get the best deal.</p>
                    </div>
                </div>
            </section>

            {/* ── PROS / VALUES ── */}
            <section className="lp-section lp-values-bg">
                <div className="lp-value-split">
                    <div className="lp-value-text">
                        <h2 className="lp-section-title text-left">Why Industry Leaders <br/>Choose CalBuy?</h2>
                        
                        <div className="lp-value-list">
                            <div className="lp-value-item">
                                <div className="value-check"><FaShieldAlt /></div>
                                <div>
                                    <h4>Unmatched Transparency</h4>
                                    <p>Full audit trails for every quotation and purchase order issued.</p>
                                </div>
                            </div>
                            <div className="lp-value-item">
                                <div className="value-check"><FaChartLine /></div>
                                <div>
                                    <h4>85% Efficiency GAIN</h4>
                                    <p>Reduce procurement cycle time from weeks to hours through automation.</p>
                                </div>
                            </div>
                            <div className="lp-value-item">
                                <div className="value-check"><FaBolt /></div>
                                <div>
                                    <h4>Real-time Coordination</h4>
                                    <p>Instant status updates on vendor confirmations and PO issuance.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="lp-value-image">
                        <div className="lp-glass-mockup">
                             <div className="mockup-header">
                                <div className="m-dot red"></div>
                                <div className="m-dot yellow"></div>
                                <div className="m-dot green"></div>
                             </div>
                             <div className="mockup-body">
                                <div className="mockup-line w80"></div>
                                <div className="mockup-line w60"></div>
                                <div className="mockup-line w90"></div>
                                <div className="mockup-line w40"></div>
                             </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── FOOTER CTA ── */}
            <footer className="lp-final-cta">
                <div className="final-cta-card">
                    <h2>Ready to revolutionize your procurement?</h2>
                    <p>Join waitlists of over 50 leading engineering firms globally.</p>
                    <button className="lp-btn-primary white" onClick={onGetStarted}>
                        Join CalBuy Today
                    </button>
                </div>
                <div className="lp-copy">
                    &copy; 2026 Caldim Engineering Pvt Ltd. All rights reserved.
                </div>
            </footer>
        </div>
    );
}
