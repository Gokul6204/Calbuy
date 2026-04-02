import { useState, useEffect } from "react";
import { fetchProjects, createProject, deleteProject } from "../api/project";
import { FaPlus, FaFolder, FaTrash, FaArrowRight, FaProjectDiagram } from "react-icons/fa";
import "./ProjectPage.css";

export function ProjectPage({ onSelectProject }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await fetchProjects();
      setProjects(data);
    } catch (err) {
      console.error("Failed to load projects:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      await createProject({ name: newProjectName, description: newProjectDesc });
      setNewProjectName("");
      setNewProjectDesc("");
      setShowAddModal(false);
      loadProjects();
    } catch (err) {
      console.error("Failed to create project:", err);
    }
  };

  const handleDeleteProject = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    try {
      await deleteProject(id);
      loadProjects();
    } catch (err) {
      console.error("Failed to delete project:", err);
    }
  };

  return (
    <div className="project-page view-container">
      <header className="project-header">
        <div className="header-left">
          <div className="header-icon">
            <FaProjectDiagram />
          </div>
          <div className="header-text">
            <h2>Projects</h2>
            <p>Manage and select your procurement projects</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <FaPlus /> Create New Project
        </button>
      </header>

      <div className="project-grid">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <FaFolder size={48} color="var(--text-muted)" />
            <h3>No Projects Yet</h3>
            <p>Create your first project to start the procurement flow.</p>
            <button className="btn btn-primary mt-4" onClick={() => setShowAddModal(true)}>
              Get Started
            </button>
          </div>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className="project-card glow effect-hover"
              onClick={() => onSelectProject(project)}
            >
              <div className="project-card-header">
                <div className="project-icon">
                  <FaFolder />
                </div>
                <div className="project-actions">
                  <button
                    className="btn-icon-danger"
                    onClick={(e) => handleDeleteProject(project.id, e)}
                    title="Delete Project"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
              <div className="project-card-body">
                <h3>{project.name}</h3>
                <p>{project.description || "No description provided."}</p>
              </div>
              <div className="project-card-footer">
                <span className="date">Created: {new Date(project.created_at).toLocaleDateString()}</span>
                <span className="enter-link">
                  Open Project <FaArrowRight />
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Project</h3>
              <button className="btn-close" onClick={() => setShowAddModal(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateProject}>
              <div className="modal-body">
                <div className="form-group mb-4">
                  <label>Project Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g., Terminal Expansion 2026"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label>Description (Optional)</label>
                  <textarea
                    className="form-control"
                    placeholder="Briefly describe the project goals..."
                    rows={4}
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={!newProjectName.trim()}>
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
