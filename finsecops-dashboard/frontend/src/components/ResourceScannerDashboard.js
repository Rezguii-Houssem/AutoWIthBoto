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
  const [days, setDays] = useState(7);
  const [region, setRegion] = useState('eu-west-3');

  const handleScan = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_ENDPOINT}/finops/scan`, {
        params: { days, region },
        headers: { Authorization: `Bearer ${token}` }
      });
      setResources(response.data.resources || []);
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

  return (
    <div className="dashboard" style={{ textAlign: 'left', padding: '20px' }}>
      <div className="dashboard-header">
        <h2>Resource Scanner</h2>
        <p>Aggregate EC2 instances, calculate uptime, and fetch unblended costs from AWS Cost Explorer.</p>
      </div>

      <div className="form-card" style={{ maxWidth: '600px', marginBottom: '20px' }}>
        <h3>Scan Parameters</h3>
        <div className="field">
          <label>Region:</label>
          <input value={region} onChange={(e) => setRegion(e.target.value)} />
        </div>
        <div className="field">
          <label>Cost Window (Days):</label>
          <input type="number" value={days} onChange={(e) => setDays(e.target.value)} />
        </div>
        <button className="scan-btn" onClick={handleScan} disabled={loading}>
          {loading ? 'Scanning...' : 'Run Account Scan'}
        </button>
      </div>

      {error && <div style={{ color: '#ff6b6b', marginBottom: '20px' }}>{error}</div>}

      <div style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', padding: '20px' }}>
        <h3>Scan Results ({resources.length} resources)</h3>
        {resources.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'left' }}>
                <th style={{ padding: '10px' }}>Resource ID</th>
                <th style={{ padding: '10px' }}>Name</th>
                <th style={{ padding: '10px' }}>Type</th>
                <th style={{ padding: '10px' }}>Uptime (Hours)</th>
                <th style={{ padding: '10px' }}>Cost Data</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((res, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '10px', fontFamily: 'monospace' }}>{res.ResourceId}</td>
                  <td style={{ padding: '10px' }}>{res.Name}</td>
                  <td style={{ padding: '10px' }}>{res.Type}</td>
                  <td style={{ padding: '10px' }}>{res.UptimeHours}</td>
                  <td style={{ padding: '10px' }}>
                    {res.Cost > 0 ? `$${res.Cost.toFixed(2)}` : 'N/A or $0'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: 'rgba(255, 255, 255, 0.5)' }}>No data available. Run a scan to see resources.</p>
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
