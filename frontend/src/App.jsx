import { useState, useEffect } from 'react'
import { HomePage } from './components/HomePage'
import { BOMPage } from './components/BOMPage'
import { MatchingVendorsPanel } from './components/MatchingVendorsPanel'
import { VendorPage } from './components/VendorPage'
import { MaterialManagementPage } from './components/MaterialManagementPage'
import { RFQPage } from './components/RFQPage'
import { QuotationPage } from './components/QuotationPage'
import { VendorSelectionPage } from './components/VendorSelectionPage'
import { ProjectPage } from './components/ProjectPage'
import { VendorPortal } from './components/VendorPortal'
import { fetchBOMList } from './api/bom'
import { updateProject } from './api/project'
import { ProfileMenu } from './components/ProfileMenu'
import { FaHome, FaIndustry, FaBoxOpen, FaHandshake, FaEnvelopeOpenText, FaFileAlt, FaProjectDiagram } from 'react-icons/fa'
import { FaRankingStar } from "react-icons/fa6";
import './App.css'

function App() {
  const [view, setView] = useState('home') // 'home', 'projects', 'vendor', 'material', 'matching-vendor', or 'rfq'
  const isPortalView = window.location.pathname.startsWith('/portal/')
  const portalProjectId = isPortalView ? window.location.pathname.split('/')[2] : null
  const [selectedProject, setSelectedProject] = useState(null)
  const [matchedVendors, setMatchedVendors] = useState(null)
  const [rfqVendors, setRfqVendors] = useState([])
  const [bomList, setBomList] = useState([])

  useEffect(() => {
    if (selectedProject) {
      loadProjectBOMs()
      // Restore previously saved flow states from the project object
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
      // Update local object to keep it in sync
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
    setNavView('bom') // Proceed to BOM after selecting a project
  }

  const setNavView = (newView) => {
    const globalViews = ['home', 'projects', 'vendor', 'material']
    if (globalViews.includes(newView)) {
      setSelectedProject(null)
    }
    setView(newView)
  }

  if (isPortalView) {
    return <VendorPortal initialProjectId={portalProjectId} />
  }

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

          <ProfileMenu />
        </div>
      </header>

      {selectedProject && (
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
        {view === 'home' && <HomePage onGetStarted={() => setNavView('projects')} />}
        {view === 'projects' && <ProjectPage onSelectProject={handleSelectProject} />}
        {view === 'bom' && <BOMPage project={selectedProject} bomList={bomList} setBomList={setBomList} setMatchedVendors={handleSetMatchedVendors} setView={setNavView} />}
        {view === 'vendor' && <VendorPage />}
        {view === 'material' && <MaterialManagementPage />}
        {view === 'rfq' && <RFQPage project={selectedProject} vendors={rfqVendors} setView={setNavView} />}
        {view === 'quotation' && <QuotationPage project={selectedProject} />}
        {view === 'vendor selection' && <VendorSelectionPage />}
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
      </main>
    </div>
  )
}

export default App
