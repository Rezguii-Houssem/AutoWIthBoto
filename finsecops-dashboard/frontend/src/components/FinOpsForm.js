import React, { useState } from 'react';
import PropTypes from 'prop-types';

const FinOpsForm = ({ onScan, title, actions, onSchedule, isScheduled, toggleSchedule }) => {
  const [params, setParams] = useState({
    region: 'eu-west-3',
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
        <label htmlFor={`region-${title}`}>Region:</label>
        <input id={`region-${title}`} name="region" value={params.region} onChange={handleChange} />
      </div>
      <div className="field">
        <label htmlFor={`tag-key-${title}`}>Tag Key:</label>
        <input id={`tag-key-${title}`} name="tag_key" value={params.tag_key} onChange={handleChange} placeholder="env" />
      </div>
      <div className="field">
        <label htmlFor={`tag-value-${title}`}>Tag Value:</label>
        <input id={`tag-value-${title}`} name="tag_value" value={params.tag_value} onChange={handleChange} placeholder="dev" />
      </div>
      {title.includes("EC2") && (
        <>
          <div className="field">
            <label htmlFor={`cpu-${title}`}>CPU Threshold (%):</label>
            <input id={`cpu-${title}`} type="number" name="cpu_threshold" value={params.cpu_threshold} onChange={handleChange} />
          </div>
          <div className="field">
            <label htmlFor={`hours-${title}`}>Time Window (hours):</label>
            <input id={`hours-${title}`} type="number" name="hours" value={params.hours} onChange={handleChange} />
          </div>
        </>
      )}
      <div className="field">
        <label htmlFor={`action-${title}`}>Action:</label>
        <select id={`action-${title}`} name="action" value={params.action} onChange={handleChange}>
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

FinOpsForm.propTypes = {
  onScan: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  actions: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.string,
    label: PropTypes.string
  })),
  onSchedule: PropTypes.bool,
  isScheduled: PropTypes.bool,
  toggleSchedule: PropTypes.func
};

export default FinOpsForm;
