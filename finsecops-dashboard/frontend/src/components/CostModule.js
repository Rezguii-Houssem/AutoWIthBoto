import React, { useState } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import FinOpsForm from './FinOpsForm';
import Terminal from './Terminal';
import { handleAuthError } from '../lib/auth';

const API_ENDPOINT = process.env.REACT_APP_API_URL || "https://your-api-id.execute-api.eu-west-1.amazonaws.com/dev";

const CostModule = ({ token }) => {
  const [resources, setResources] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('insights');

  const addLogs = (newLogs) => {
    if (!newLogs) return;
    setLogs(prev => [...prev, ...newLogs]);
  };

  const handleGlobalScan = async (params) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_ENDPOINT}/finops/scan`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      setResources(response.data.resources || []);
      addLogs(response.data.logs);
    } catch (err) {
      if (handleAuthError(err)) return;
      addLogs([{ type: 'ERROR', message: `Global scan failed: ${err.message}` }]);
    }
    setLoading(false);
  };

  const handleAction = async (path, params) => {
    setLoading(true);
    addLogs([{ type: 'RUN', message: `Executing action on ${path}...` }]);
    try {
      const response = await axios.get(`${API_ENDPOINT}${path}`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      addLogs(response.data.logs);
    } catch (err) {
      if (handleAuthError(err)) return;
      addLogs([{ type: 'ERROR', message: `Action failed: ${err.message}` }]);
    }
    setLoading(false);
  };

  const totalCost = resources.reduce((acc, res) => acc + (res.Cost || 0), 0);

  return (
    <div className="module-container">
      <div className="module-header">
        <div className="title-group">
          <h2>Cost Management</h2>
          <p>Financial Operations & Cloud Cost Optimization</p>
        </div>
        <div className="module-nav">
          <button 
            className={activeSubTab === 'insights' ? 'active' : ''} 
            onClick={() => setActiveSubTab('insights')}
          >
            Insights & Scans
          </button>
          <button 
            className={activeSubTab === 'remediation' ? 'active' : ''} 
            onClick={() => setActiveSubTab('remediation')}
          >
            Remediation Tools
          </button>
        </div>
      </div>

      <div className="module-content">
        {activeSubTab === 'insights' ? (
          <div className="insights-view">
            <div className="summary-grid">
              <div className="summary-card">
                <span className="label">Active Resources Found</span>
                <div className="value">{resources.length}</div>
              </div>
              <div className="summary-card">
                <span className="label">Tracked Monthly Spend</span>
                <div className="value highlight">${totalCost.toFixed(2)}</div>
              </div>
              <div className="summary-card">
                <span className="label">Potential Saving Opportunity</span>
                <div className="value warning">$42.50+</div>
              </div>
            </div>

            <div className="action-bar">
              <button 
                className="primary-btn" 
                onClick={() => handleGlobalScan({ region: 'eu-west-3', days: 1 })}
                disabled={loading}
              >
                {loading ? 'Scanning Infrastructure...' : 'Run Global Account Audit'}
              </button>
            </div>

            <div className="data-display card">
              <h3>Inventory Audit</h3>
              <div className="table-wrapper">
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Type</th>
                      <th>Resource ID</th>
                      <th>Status</th>
                      <th className="text-right">Estimated Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resources.length > 0 ? resources.map((res) => (
                      <tr key={res.Id || res.Name}>
                        <td><span className="badge service">{res.Service}</span></td>
                        <td>{res.Type}</td>
                        <td className="mono">{res.Name}</td>
                        <td><span className={`status-dot ${res.Status.includes('Live') ? 'green' : 'gray'}`}></span> {res.Status}</td>
                        <td className="text-right bold">${(res.Cost || 0).toFixed(2)}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="5" className="empty-state">No scan data available. Click 'Run Global Account Audit' to begin.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="remediation-view">
            <div className="grid-2">
              <FinOpsForm 
                onScan={(params) => handleAction("/finops/ec2/idle", params)} 
                title="EC2 Instance Right-Sizing" 
                description="Identifies instances with <5% CPU usage over the last 24h."
                actions={[{ value: 'stop', label: 'Stop Idle Instances' }]}
              />
              <FinOpsForm 
                onScan={(params) => handleAction("/finops/ebs/unattached", params)} 
                title="Orphaned EBS Volumes" 
                description="Locates 'Available' volumes and snapshots disconnected from EC2."
                actions={[{ value: 'delete', label: 'Delete Unattached volumes' }]}
              />
            </div>
          </div>
        )}
      </div>

      <Terminal logs={logs} />
    </div>
  );
};

CostModule.propTypes = {
  token: PropTypes.string.isRequired,
};

export default CostModule;
