import React, { useState } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import SecOpsForm from './SecOpsForm';
import Terminal from './Terminal';
import { handleAuthError } from '../lib/auth';

const API_ENDPOINT = process.env.REACT_APP_API_URL || "https://your-api-id.execute-api.eu-west-1.amazonaws.com/dev";

const SecurityModule = ({ token }) => {
  const [logs, setLogs] = useState([]);
  const securityScore = 82;

  const addLogs = (newLogs) => {
    if (!newLogs) return;
    setLogs(prev => [...prev, ...newLogs]);
  };

  const handleAction = async (path, params) => {
    addLogs([{ type: 'RUN', message: `Executing Security Audit: ${path}...` }]);
    try {
      const response = await axios.get(`${API_ENDPOINT}${path}`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      addLogs(response.data.logs);
    } catch (err) {
      if (handleAuthError(err)) return;
      addLogs([{ type: 'ERROR', message: `Security Action failed: ${err.message}` }]);
    }
  };

  return (
    <div className="module-container">
      <div className="module-header">
        <div className="title-group">
          <h2>Security Operations</h2>
          <p>Managed Security & Compliance Auditing</p>
        </div>
        <div className="module-nav">
          <button className="active">Security Hardening</button>
          <button disabled style={{ opacity: 0.5 }}>Compliance Mapping (PRO)</button>
        </div>
      </div>

      <div className="module-content">
        <div className="security-view">
          <div className="summary-grid">
            <div className="summary-card">
              <span className="label">Encryption at Rest</span>
              <div className="value highlight">98%</div>
            </div>
            <div className="summary-card">
              <span className="label">Open Ports (Public)</span>
              <div className="value warning">12</div>
            </div>
            <div className="summary-card">
              <span className="label">Overall Security Posture</span>
              <div className="value" style={{ color: securityScore > 80 ? '#48bb78' : '#f6ad55' }}>
                {securityScore}%
              </div>
            </div>
          </div>

          <div className="action-bar">
            <button className="primary-btn secondary" onClick={() => handleAction("/secops/scan-all", { region: 'eu-west-3' })}>
              Run Full Security Audit
            </button>
          </div>

          <div className="grid-2">
            <SecOpsForm 
              onScan={(params) => handleAction("/secops/s3", params)} 
              title="S3 Public Access Blocks" 
              description="Ensures all non-public buckets have Block Public Access enabled."
              actions={[{ value: 'secure', label: 'Apply Public Access Block' }]}
            />
            <SecOpsForm 
              onScan={(params) => handleAction("/secops/sg", params)} 
              title="Restricted Inbound Rules" 
              description="Identifies Security Groups with ports (22, 3389) open to 0.0.0.0/0."
              actions={[{ value: 'restrict', label: 'Remove Public Rules' }]}
            />
          </div>

          <div className="data-display card">
            <h3>Recent Compliance Policy Violations</h3>
            <div className="table-wrapper">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Severity</th>
                    <th>Policy</th>
                    <th>Affected Resource</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><span className="badge error">HIGH</span></td>
                    <td>S3 Public Access Policy</td>
                    <td className="mono">finance-reports-staging-02</td>
                    <td><span className="status-dot green"></span> REMEDIATED</td>
                  </tr>
                  <tr>
                    <td><span className="badge warning">MEDIUM</span></td>
                    <td>Open Port (22) Policy</td>
                    <td className="mono">sg-09ae42bf901c</td>
                    <td><span className="status-dot gray"></span> DETECTED</td>
                  </tr>
                  <tr>
                    <td colSpan="4" className="empty-state">No other active violations found in your account.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <Terminal logs={logs} />
    </div>
  );
};

SecurityModule.propTypes = {
  token: PropTypes.string.isRequired,
};

export default SecurityModule;
