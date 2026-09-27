import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAppState } from '../store/appState';
import './NavBar.css';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: '⬡' },
  { path: '/simulate', label: 'Simulate', icon: '◉' },
  { path: '/impact-map', label: 'Impact Map', icon: '◈' },
  { path: '/approve', label: 'Approve', icon: '◎' },
  { path: '/repair', label: 'Repair', icon: '◆' },
  { path: '/validate', label: 'Validate', icon: '✓' },
];

export default function NavBar() {
  const { state } = useAppState();

  function phaseLabel() {
    switch (state.phase) {
      case 'IDLE': return null;
      case 'SIMULATING': return { text: 'ANALYZING', cls: 'status-warn' };
      case 'SIMULATED': return { text: 'AWAITING APPROVAL', cls: 'status-warn' };
      case 'APPROVED': return { text: 'APPROVED', cls: 'status-pass' };
      case 'REPAIRING': return { text: 'REPAIRING', cls: 'status-warn' };
      case 'REPAIRED': return { text: 'REPAIRED', cls: 'status-pass' };
      case 'VALIDATING': return { text: 'VALIDATING', cls: 'status-warn' };
      case 'VALIDATED': return { text: 'READY FOR REVIEW', cls: 'status-pass' };
    }
  }

  const phase = phaseLabel();

  return (
    <nav className="navbar" aria-label="Primary navigation">
      <div className="navbar__brand">
        <span className="navbar__logo" aria-hidden="true">◈</span>
        <span className="navbar__name">ContractShield AI</span>
      </div>
      <ul className="navbar__links">
        {NAV_ITEMS.map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `navbar__link${isActive ? ' navbar__link--active' : ''}`
              }
            >
              <span className="navbar__icon" aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
      {phase && (
        <div className={`navbar__phase ${phase.cls}`}>
          <span className="navbar__phase-dot" />
          {phase.text}
        </div>
      )}
    </nav>
  );
}
