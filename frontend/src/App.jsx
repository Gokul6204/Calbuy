import { useState, useEffect } from 'react'
import { HomePage } from './components/HomePage'
import { LoginPage } from './components/LoginPage'
import { RegisterPage } from './components/RegisterPage'
import { ProfilePage } from './components/ProfilePage'
import { BOMPage } from './components/BOMPage'
import { MatchingVendorsPanel } from './components/MatchingVendorsPanel'
import { VendorPage } from './components/VendorPage'
import { MaterialManagementPage } from './components/MaterialManagementPage'
import { RFQPage } from './components/RFQPage'
import { QuotationPage } from './components/QuotationPage'
import { VendorSelectionPage } from './components/VendorSelectionPage'
import { PurchaseOrderPage } from './components/PurchaseOrderPage'
import { ProjectPage } from './components/ProjectPage'
import { VendorPortal } from './components/VendorPortal'
import { fetchBOMList } from './api/bom'
import { updateProject } from './api/project'
import { ProfileMenu } from './components/ProfileMenu'
import { FaHome, FaIndustry, FaBoxOpen, FaHandshake, FaEnvelopeOpenText, FaFileAlt, FaProjectDiagram, FaFileInvoice } from 'react-icons/fa'
import { FaRankingStar } from "react-icons/fa6";
import { useAuth } from './context/AuthContext'
import './App.css'

function App() {
  const { isAuthenticated } = useAuth()
  const [view, setView] = useState('home')
  const isPortalView = window.location.pathname.startsWith('/portal/')
  const portalProjectId = isPortalView ? window.location.pathname.split('/')[2] : null
  const [selectedProject, setSelectedProject] = useState(null)
  const [matchedVendors, setMatchedVendors] = useState(null)
  const [rfqVendors, setRfqVendors] = useState([])
  const [bomList, setBomList] = useState([])

  useEffect(() => {
    if (selectedProject) {
      loadProjectBOMs()
      setMatchedVendors(selectedProject.last_matched_vendors || null)
      setRfqVendors(selectedProject.last_rfq_vendors || [])
    } else {
      setBomList([])
      setMatchedVendors(null)
      setRfqVendors([])
    }
  }, [selectedProject])

  const persistProcessState = async (updates) => {
    if (!selectedProject?.id) return
    try {
      await updateProject(selectedProject.id, updates)
      setSelectedProject(prev => prev ? ({ ...prev, ...updates }) : null)
    } catch (err) {
      console.error("Failed to persist process state:", err)
    }
  }

  const handleSetMatchedVendors = (vendors) => {
    setMatchedVendors(vendors)
    persistProcessState({ last_matched_vendors: vendors })
  }

  const handleSetRfqVendors = (vendors) => {
    setRfqVendors(vendors)
    persistProcessState({ last_rfq_vendors: vendors })
  }

  const loadProjectBOMs = async () => {
    try {
      const data = await fetchBOMList({ project_id: selectedProject.id })
      setBomList(data)
    } catch (err) {
      console.error("Failed to load project BOMs:", err)
    }
  }

  const handleSendMail = (vendors) => {
    handleSetRfqVendors(vendors)
    setNavView('rfq')
  }

  const handleSelectProject = (project) => {
    setSelectedProject(project)
    setNavView('bom')
  }

  const setNavView = (newView) => {
    const globalViews = ['home', 'projects', 'vendor', 'material', 'profile']
    if (globalViews.includes(newView)) {
      setSelectedProject(null)
    }
    setView(newView)
  }

  if (isPortalView) {
    return <VendorPortal initialProjectId={portalProjectId} />
  }

  const showNavbar = isAuthenticated && !['login', 'register'].includes(view)

  return (
    <div className="app">
      <header className="app-header sticky top-0 z-50">
        <div className="header-logo" onClick={() => setNavView('home')} style={{ cursor: 'pointer' }}>
          <img src="/assest/images/calbuy-logo.jpeg" alt="Calbuy Logo" className="logo-img" />
          <div className="header-text">
            <h1>Calbuy</h1>
            <p className="tagline">Procurement Hub</p>
          </div>
        </div>

        {showNavbar && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <nav className="header-nav">
              <button
                className={`nav-btn ${view === 'home' ? 'active' : ''}`}
                onClick={() => setNavView('home')}
              >
                <FaHome /> <span>Home</span>
              </button>
              <button
                className={`nav-btn ${view === 'projects' ? 'active' : ''}`}
                onClick={() => setNavView('projects')}
              >
                <FaProjectDiagram /> <span>Project</span>
              </button>
              <button
                className={`nav-btn ${view === 'vendor' ? 'active' : ''}`}
                onClick={() => setNavView('vendor')}
              >
                <FaIndustry /> <span>Vendors</span>
              </button>
              <button
                className={`nav-btn ${view === 'material' ? 'active' : ''}`}
                onClick={() => setNavView('material')}
              >
                <FaBoxOpen /> <span>Materials</span>
              </button>
            </nav>

            <ProfileMenu onProfileClick={() => setNavView('profile')} onLogout={() => setNavView('home')} />
          </div>
        )}
      </header>

      {selectedProject && showNavbar && (
        <div className="project-toolbar">
          <div className="toolbar-left">
            <div className="project-brand">
              <FaProjectDiagram />
              <span>Project Name:</span>
              <span>{selectedProject.name}</span>
            </div>
            <nav className="toolbar-nav">
              <button
                className={`toolbar-btn ${view === 'bom' ? 'active' : ''}`}
                onClick={() => setNavView('bom')}
              >
                <FaFileAlt /> <span>BOM</span>
              </button>
              <button
                className={`toolbar-btn ${view === 'matching-vendor' ? 'active' : ''}`}
                onClick={() => setNavView('matching-vendor')}
              >
                <FaHandshake /> <span>Matching Vendor</span>
              </button>
              <button
                className={`toolbar-btn ${view === 'rfq' ? 'active' : ''}`}
                onClick={() => setNavView('rfq')}
              >
                <FaEnvelopeOpenText /> <span>RFQ</span>
              </button>
              <button
                className={`toolbar-btn ${view === 'quotation' ? 'active' : ''}`}
                onClick={() => setNavView('quotation')}
              >
                <FaHandshake /> <span>Quotation Portal</span>
              </button>
              <button
                className={`toolbar-btn ${view === 'vendor selection' ? 'active' : ''}`}
                onClick={() => setNavView('vendor selection')}
              >
                <FaRankingStar /> <span>Vendor Selection</span>
              </button>
              <button
                className={`toolbar-btn ${view === 'purchase-order' ? 'active' : ''}`}
                onClick={() => setNavView('purchase-order')}
              >
                <FaFileInvoice /> <span>Purchase Order</span>
              </button>
            </nav>
          </div>
          <div className="toolbar-right">
             <button className="btn-exit-project" onClick={() => setNavView('projects')}>
               Exit Project
             </button>
          </div>
        </div>
      )}

      <main className="app-main">
        {view === 'home' && <HomePage onGetStarted={() => setNavView(isAuthenticated ? 'projects' : 'login')} />}
        {view === 'login' && <LoginPage onLoginSuccess={() => setNavView('projects')} onGoToRegister={() => setNavView('register')} />}
        {view === 'register' && <RegisterPage onRegisterSuccess={() => setNavView('login')} onGoToLogin={() => setNavView('login')} />}
        {view === 'profile' && <ProfilePage />}
        
        {isAuthenticated ? (
          <>
            {view === 'projects' && <ProjectPage onSelectProject={handleSelectProject} />}
            {view === 'bom' && <BOMPage project={selectedProject} bomList={bomList} setBomList={setBomList} setMatchedVendors={handleSetMatchedVendors} setView={setNavView} />}
            {view === 'vendor' && <VendorPage />}
            {view === 'material' && <MaterialManagementPage />}
            {view === 'rfq' && <RFQPage project={selectedProject} vendors={rfqVendors} setView={setNavView} />}
            {view === 'quotation' && <QuotationPage project={selectedProject} onSelectVendor={() => setNavView('vendor selection')} />}
            {view === 'vendor selection' && <VendorSelectionPage project={selectedProject} bomList={bomList} setView={setNavView} />}
            {view === 'purchase-order' && <PurchaseOrderPage project={selectedProject} />}
            {view === 'matching-vendor' && (
              <div className="view-container">
                <MatchingVendorsPanel
                  vendors={matchedVendors}
                  onClose={() => setNavView('bom')}
                  isPageView={true}
                  onSendMail={handleSendMail}
                />
              </div>
            )}
          </>
        ) : (
          !['home', 'login', 'register'].includes(view) && setNavView('login')
        )}
      </main>
    </div>
  )
}

export default App
