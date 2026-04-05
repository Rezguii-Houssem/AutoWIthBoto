import React, { useState } from 'react';

const SecOpsForm = ({ onScan, title, actions }) => {
  const [params, setParams] = useState({
    region: 'eu-west-3',
    action: 'scan'
  });

  const handleChange = (e) => {
    setParams({ ...params, [e.target.name]: e.target.value });
  };


  return (
    <div className="form-card secops-card">
      <h3>{title}</h3>
      <div className="field">
        <label>Region:</label>
        <input name="region" value={params.region} onChange={handleChange} />
      </div>
      <div className="field">
        <label>Action:</label>
        <select name="action" value={params.action} onChange={handleChange}>
          <option value="scan">Scan Only</option>
          {actions.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button className="scan-btn" onClick={() => onScan(params)}>Run {title}</button>
      </div>
    </div>
  );
};

export default SecOpsForm;
