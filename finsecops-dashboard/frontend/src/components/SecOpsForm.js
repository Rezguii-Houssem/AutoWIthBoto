import React, { useState } from 'react';

const SecOpsForm = ({ onScan, title, actions, onSchedule }) => {
  const [params, setParams] = useState({
    region: 'eu-west-3',
    action: 'scan'
  });

  const handleChange = (e) => {
    setParams({ ...params, [e.target.name]: e.target.value });
  };

  const [isScheduled, setIsScheduled] = useState(false);

  const toggleSchedule = () => {
    const newStatus = !isScheduled;
    setIsScheduled(newStatus);
    if (onSchedule) onSchedule(newStatus, params);
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
        {onSchedule && (
          <button 
            className="schedule-btn" 
            onClick={toggleSchedule}
            style={{ padding: '10px 20px', background: isScheduled ? '#ef4444' : '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            {isScheduled ? 'Disable Schedule' : 'Schedule Daily'}
          </button>
        )}
      </div>
    </div>
  );
};

export default SecOpsForm;
