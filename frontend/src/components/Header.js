import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Header.css';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isProjectsActive = location.pathname === '/' || location.pathname === '/projects';
  const isProjectBoardActive = location.pathname.startsWith('/projects/');

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleBrandClick = () => {
    navigate('/');
    setIsMobileMenuOpen(false);
  };

  const handleNavClick = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <div className="header-brand">
            <button onClick={handleBrandClick} className="brand-link">
              <h1 className="brand-title">TaskFlow</h1>
              <span className="brand-subtitle">Project Management</span>
            </button>
          </div>
          
          {/* Mobile menu button */}
          <button 
            className="mobile-menu-button"
            onClick={toggleMobileMenu}
            aria-label="Toggle navigation menu"
          >
            <span className={`hamburger ${isMobileMenuOpen ? 'open' : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>

          {/* Navigation */}
          <nav className={`header-nav ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
            <Link 
              to="/projects" 
              className={`nav-link ${isProjectsActive ? 'active' : ''}`}
              onClick={handleNavClick}
            >
              Projects
            </Link>
            
            {/* Show current project name if on project board */}
            {isProjectBoardActive && (
              <span className="nav-breadcrumb">
                <span className="breadcrumb-separator">/</span>
                <span className="breadcrumb-current">Project Board</span>
              </span>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;