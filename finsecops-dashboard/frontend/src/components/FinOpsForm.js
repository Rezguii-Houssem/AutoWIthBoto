import React, { useState } from 'react';

const FinOpsForm = ({ onScan, title, actions }) => {
  const [params, setParams] = useState({
    region: 'eu-west-1',
    tag_key: '',
    tag_value: '',
    cpu_threshold: 5,
    hours: 6,
    action: 'scan'
  });

  const handleChange = (e) => {
    setParams({ ...params, [e.target.name]: e.target.value });
  };

  return (
    <div className="form-card">
      <h3>{title}</h3>
      <div className="field">
        <label>Region:</label>
        <input name="region" value={params.region} onChange={handleChange} />
      </div>
      <div className="field">
        <label>Tag Key:</label>
        <input name="tag_key" value={params.tag_key} onChange={handleChange} placeholder="env" />
      </div>
      <div className="field">
        <label>Tag Value:</label>
        <input name="tag_value" value={params.tag_value} onChange={handleChange} placeholder="dev" />
      </div>
      {title.includes("EC2") && (
        <>
          <div className="field">
            <label>CPU Threshold (%):</label>
            <input type="number" name="cpu_threshold" value={params.cpu_threshold} onChange={handleChange} />
          </div>
          <div className="field">
            <label>Time Window (hours):</label>
            <input type="number" name="hours" value={params.hours} onChange={handleChange} />
          </div>
        </>
      )}
      <div className="field">
        <label>Action:</label>
        <select name="action" value={params.action} onChange={handleChange}>
          <option value="scan">Scan Only</option>
          {actions.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
      </div>
      <button className="scan-btn" onClick={() => onScan(params)}>Run {title}</button>
    </div>
  );
};

export default FinOpsForm;
