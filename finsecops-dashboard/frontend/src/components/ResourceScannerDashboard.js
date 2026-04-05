import React, { useState } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import Terminal from './Terminal';

const API_ENDPOINT = process.env.REACT_APP_API_URL || "https://your-api-id.execute-api.eu-west-1.amazonaws.com/dev";

const ResourceScannerDashboard = ({ token }) => {
  const [resources, setResources] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(1); // Default to 24h as requested
  const [region, setRegion] = useState('eu-west-3');

  const handleScan = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_ENDPOINT}/finops/scan`, {
        params: { days, region },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const resData = response.data.resources || [];
      setResources(resData);
      
      if (response.data.logs) {
        setLogs(response.data.logs);
      }
    } catch (err) {
      console.error("Scan failed", err);
      setError(err.message || "Failed to scan resources.");
      if (err.response && err.response.data && err.response.data.logs) {
        setLogs(err.response.data.logs);
      }
    }
    setLoading(false);
  };

  const totalCost = resources.reduce((acc, res) => acc + (res.Cost || 0), 0);

  return (
    <div className="dashboard" style={{ textAlign: 'left', padding: '20px' }}>
      <div className="dashboard-header">
        <h2>Account-Wide Resource Scanner</h2>
        <p>A comprehensive sweep of all AWS resources in your account. Finds "forgotten" items using Tagging and Cost Explorer APIs.</p>
      </div>

      <div className="summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
        <div className="summary-card" style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '20px', borderRadius: '12px' }}>
          <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>Total Resources Found</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{resources.length}</div>
        </div>
        <div className="summary-card" style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '20px', borderRadius: '12px' }}>
          <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>Total Cost ({days === 1 ? 'Last 24h' : 'Last 7d'})</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4fd1c5' }}>${totalCost.toFixed(2)}</div>
        </div>
      </div>

      <div className="form-card" style={{ maxWidth: '800px', marginBottom: '20px', display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="field">
          <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '5px' }}>Region:</label>
          <input value={region} onChange={(e) => setRegion(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #444', background: '#222', color: '#fff' }} />
        </div>
        <div className="field">
          <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '5px' }}>Time Window:</label>
          <select 
            value={days} 
            onChange={(e) => setDays(parseInt(e.target.value))}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #444', background: '#222', color: '#fff' }}
          >
            <option value={1}>Last 24 Hours</option>
            <option value={7}>Last 7 Days</option>
          </select>
        </div>
        <button 
          className="scan-btn" 
          onClick={handleScan} 
          disabled={loading}
          style={{ padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          {loading ? 'Performing Multi-Service Sweep...' : 'Run Whole Account Scan'}
        </button>
      </div>

      {error && <div style={{ color: '#ff6b6b', background: 'rgba(255, 107, 107, 0.1)', padding: '10px', borderRadius: '4px', marginBottom: '20px' }}>{error}</div>}

      <div style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '20px', overflowX: 'auto' }}>
        <h3>Scan Results</h3>
        {resources.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'left' }}>
                <th style={{ padding: '12px' }}>Service</th>
                <th style={{ padding: '12px' }}>Resource Type</th>
                <th style={{ padding: '12px' }}>Name / ARN</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Cost</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((res, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.9rem' }}>
                  <td style={{ padding: '12px' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>{res.Service}</span>
                  </td>
                  <td style={{ padding: '12px' }}>{res.Type}</td>
                  <td style={{ padding: '12px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span title={res.ResourceId} style={{ fontFamily: 'monospace' }}>{res.Name}</span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ color: res.Status.includes('Live') ? '#48bb78' : '#a0aec0' }}>{res.Status}</span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>
                    {res.Cost > 0 ? `$${res.Cost.toFixed(2)}` : '--'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: 'rgba(255, 255, 255, 0.5)', padding: '20px' }}>No resources found. Run a scan for a complete sweep.</p>
        )}
      </div>

      <Terminal logs={logs} />
    </div>
  );
};

ResourceScannerDashboard.propTypes = {
  token: PropTypes.string,
};

export default ResourceScannerDashboard;
