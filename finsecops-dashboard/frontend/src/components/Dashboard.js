import React, { useState } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import FinOpsForm from './FinOpsForm';
import SecOpsForm from './SecOpsForm';
import Terminal from './Terminal';

const API_ENDPOINT = process.env.REACT_APP_API_URL || "https://your-api-id.execute-api.eu-west-1.amazonaws.com/dev";

const Dashboard = ({ token, activeTab }) => {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);

  const addLog = (type, message) => {
    setLogs(prev => [...prev, { type, message }]);
  };

  const handleScan = async (path, params) => {
    setLoading(true);
    addLog('RUN', `Scanning ${path} in ${params.region}...`);
    try {
      const response = await axios.get(`${API_ENDPOINT}${path}`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      setResults(response.data);
      if (response.data.logs) {
        // Filter out existing logs if we want a fresh view, or append
        setLogs(prev => [...prev, ...response.data.logs]);
      } else {
        addLog('DONE', `Scan complete. Found ${response.data.count} items.`);
      }
      
      if (response.data.estimated_savings) {
        addLog('COST', `Potential Monthly Savings: $${response.data.estimated_savings}`);
      }
    } catch (error) {
      console.error("Scan failed", error);
      addLog('ERROR', `Scan failed: ${error.message}`);
      if (error.response && error.response.data && error.response.data.logs) {
        setLogs(prev => [...prev, ...error.response.data.logs]);
      }
    }
    setLoading(false);
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>AWS Automation Hub</h2>
        <p>Overview | AutoWithBoto Dashboard</p>
      </div>
      <div className="forms-container" style={{ opacity: loading ? 0.7 : 1, pointerEvents: loading ? 'none' : 'auto' }}>
        <FinOpsForm 
          onScan={(params) => handleScan("/finops/ec2/idle", params)} 
          title="FinOps | EC2 Optimization" 
          actions={[{ value: 'stop', label: 'Stop Idle Instances' }]}
        />
        <FinOpsForm 
          onScan={(params) => handleScan("/finops/ebs/unattached", params)} 
          title="FinOps - EBS Volume Cleanup" 
          actions={[{ value: 'delete', label: 'Delete Unattached Volumes' }]}
        />
        <SecOpsForm 
          onScan={(params) => handleScan("/secops/s3", params)} 
          title="SecOps - S3 Public Access" 
          actions={[{ value: 'secure', label: 'Apply Public Access Block' }]}
        />
        <SecOpsForm 
          onScan={(params) => handleScan("/secops/sg", params)} 
          title="SecOps - Security Groups" 
          actions={[{ value: 'restrict', label: 'Remove Public Rules' }]}
        />
      </div>

      {results && (
        <div className="results-summary">
          <h3>Last Scan Results: {results.count} items found</h3>
          {/* Detailed results can be mapped here if needed */}
        </div>
      )}

      <Terminal logs={logs} />
    </div>
  );
};

Dashboard.propTypes = {
  token: PropTypes.string,
  activeTab: PropTypes.string,
};

export default Dashboard;
