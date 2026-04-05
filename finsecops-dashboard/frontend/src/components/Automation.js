import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import Terminal from './Terminal';
import { handleAuthError } from '../lib/auth';

const API_ENDPOINT = process.env.REACT_APP_API_URL || "https://your-api-id.execute-api.eu-west-1.amazonaws.com/dev";

const Automation = ({ token }) => {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [history, setHistory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [formData, setFormData] = useState({
    scanType: 'getIdleEC2',
    frequency: 'daily',
    time: '12:00',
    minute: '0',
    region: 'eu-west-3',
    action: 'scan'
  });

  const fetchSchedules = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    
    try {
      const response = await axios.get(`${API_ENDPOINT}/automation/schedules`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSchedules(response.data || []);
      if (isManual) addLog('INFO', "Schedules refreshed successfully.");
    } catch (error) {
      if (handleAuthError(error)) return;
      console.error("Failed to fetch schedules", error);
      addLog('ERROR', "Persistence Error: Could not retrieve active automations.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchSchedules();
    }
  }, [token, fetchSchedules]);

  const scanOptions = [
    { value: 'getIdleEC2', label: 'Idle EC2 Instances' },
    { value: 'getUnattachedEBS', label: 'Unattached EBS Volumes' },
    { value: 'checkS3Public', label: 'S3 Public Access' },
    { value: 'checkSGOpen', label: 'Security Groups Open' },
  ];

  const actionOptions = {
    getIdleEC2: [{ value: 'scan', label: 'Scan Only' }, { value: 'stop', label: 'Stop Idle Instances' }],
    getUnattachedEBS: [{ value: 'scan', label: 'Scan Only' }, { value: 'delete', label: 'Delete Volumes' }],
    checkS3Public: [{ value: 'scan', label: 'Scan Only' }, { value: 'secure', label: 'Apply Public Block' }],
    checkSGOpen: [{ value: 'scan', label: 'Scan Only' }, { value: 'restrict', label: 'Remove Public Rules' }],
  };

  const getScanLabel = (val) => scanOptions.find(o => o.value === val)?.label || val;
  const getActionLabel = (scanType, val) => actionOptions[scanType]?.find(o => o.value === val)?.label || val;

  const addLog = (type, message) => {
    setLogs(prev => [...prev, { type, message: `[${new Date().toLocaleTimeString([], { hour12: false })}] ${message}` }]);
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFrequencyChange = (frequency) => {
    setFormData(prev => ({ ...prev, frequency }));
  };

  const convertLocalToUTC = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    const d = new Date();
    d.setHours(hours, minutes, 0, 0);
    return `${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}`;
  };

  const handleSaveAutomation = async () => {
    setLoading(true);
    let timePayload = formData.frequency === 'daily' 
      ? convertLocalToUTC(formData.time) 
      : formData.minute;

    const label = getScanLabel(formData.scanType);
    const actionLabel = getActionLabel(formData.scanType, formData.action);
    const scheduleTxt = formData.frequency === 'daily' ? `daily at ${formData.time}` : `hourly at minute ${formData.minute}`;

    addLog('RUN', `Initiating ${actionLabel} for ${label.toUpperCase()} (${scheduleTxt})...`);
    try {
      await axios.post(`${API_ENDPOINT}/automation/schedules`, {
        action: 'enable',
        lambda_name: formData.scanType,
        frequency: formData.frequency,
        time: timePayload,
        params: {
          region: formData.region,
          action: formData.action
        }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      addLog('DONE', `Successfully scheduled ${label} automation in ${formData.region}.`);
      
      // Update history
      const historyItem = {
        id: Date.now(),
        type: 'SCHEDULE',
        label: label,
        action: actionLabel,
        details: scheduleTxt,
        timestamp: new Date().toISOString(),
        status: 'SUCCESS'
      };
      setHistory(prev => [historyItem, ...prev].slice(0, 10));
      
      // Add or update local state
      const newSchedule = {
        scanType: formData.scanType,
        frequency: formData.frequency,
        time: formData.time, // store local time for display
        minute: formData.minute,
        status: 'ENABLED'
      };
      setSchedules(prev => {
        const existing = prev.findIndex(s => s.scanType === newSchedule.scanType);
        if (existing !== -1) {
          const updated = [...prev];
          updated[existing] = newSchedule;
          return updated;
        }
        return [...prev, newSchedule];
      });

    } catch (error) {
      if (handleAuthError(error)) return;
      console.error("Automation setup failed", error);
      addLog('ERROR', `Automation setup failed: ${error.message}`);
    }
    setLoading(false);
  };

  const handleToggleState = async (scanType, currentStatus) => {
    setLoading(true);
    const newStatus = currentStatus === 'ENABLED' ? 'DISABLED' : 'ENABLED';
    const label = getScanLabel(scanType);
    const statusLabel = newStatus === 'ENABLED' ? 'ACTIVATING' : 'DEACTIVATING';
    addLog('RUN', `${statusLabel}: Updating schedule state for ${label}...`);
    
    // Find existing schedule info to preserve it during re-enable
    const existing = schedules.find(s => s.scanType === scanType);
    
    try {
      const payload = {
        action: newStatus === 'ENABLED' ? 'enable' : 'disable',
        lambda_name: scanType
      };

      if (newStatus === 'ENABLED' && existing) {
        payload.frequency = existing.frequency;
        payload.time = existing.frequency === 'daily' 
          ? convertLocalToUTC(existing.time) 
          : existing.minute;
      }

      await axios.post(`${API_ENDPOINT}/automation/schedules`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      addLog('DONE', `${newStatus} applied to ${scanType}`);
      
      setSchedules(prev => prev.map(s => 
        s.scanType === scanType ? { ...s, status: newStatus } : s
      ));
    } catch (error) {
      if (handleAuthError(error)) {
        return;
      }
      addLog('ERROR', `Authorization or network failure: ${error.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="dashboard" style={{ textAlign: 'left', padding: '20px' }}>
      <div className="dashboard-header">
        <h2>Automation Module</h2>
        <p>Configure recurring background scans and automated remediation actions.</p>
      </div>

      <div className="main-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '20px', marginTop: '20px' }}>
        
        {/* Left Column: Form */}
        <div className="form-card" style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '20px', borderRadius: '12px' }}>
          <h3>Create Automation Rule</h3>
          
          <div className="field" style={{ marginBottom: '15px' }}>
            <label htmlFor="scanType" style={{ display: 'block', marginBottom: '5px', opacity: 0.8 }}>Target Scan:</label>
            <select id="scanType" name="scanType" value={formData.scanType} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#222', color: '#fff', border: '1px solid #444' }}>
              {scanOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>

          <div className="field" style={{ marginBottom: '15px' }}>
            <label htmlFor="action" style={{ display: 'block', marginBottom: '5px', opacity: 0.8 }}>Action:</label>
            <select id="action" name="action" value={formData.action} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#222', color: '#fff', border: '1px solid #444' }}>
              {actionOptions[formData.scanType].map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>

          <div className="field" style={{ marginBottom: '15px' }}>
            <label htmlFor="region" style={{ display: 'block', marginBottom: '5px', opacity: 0.8 }}>Region:</label>
            <input id="region" name="region" value={formData.region} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#222', color: '#fff', border: '1px solid #444' }} />
          </div>

          <div className="field" style={{ marginBottom: '15px' }}>
            <span style={{ display: 'block', marginBottom: '5px', opacity: 0.8 }}>Frequency:</span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => handleFrequencyChange('daily')}
                style={{ flex: 1, padding: '10px', borderRadius: '6px', cursor: 'pointer', border: formData.frequency === 'daily' ? '2px solid #3b82f6' : '1px solid #444', background: formData.frequency === 'daily' ? 'rgba(59, 130, 246, 0.2)' : '#222', color: '#fff' }}
              >
                Daily
              </button>
              <button 
                onClick={() => handleFrequencyChange('hourly')}
                style={{ flex: 1, padding: '10px', borderRadius: '6px', cursor: 'pointer', border: formData.frequency === 'hourly' ? '2px solid #3b82f6' : '1px solid #444', background: formData.frequency === 'hourly' ? 'rgba(59, 130, 246, 0.2)' : '#222', color: '#fff' }}
              >
                Hourly
              </button>
            </div>
          </div>

          {formData.frequency === 'daily' ? (
             <div className="field" style={{ marginBottom: '20px' }}>
               <label htmlFor="time" style={{ display: 'block', marginBottom: '5px', opacity: 0.8 }}>Local Time:</label>
               <input id="time" type="time" name="time" value={formData.time} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#222', color: '#fff', border: '1px solid #444' }} />
               <small style={{ color: '#aaa', display: 'block', marginTop: '5px' }}>Time is automatically converted to UTC for AWS.</small>
             </div>
          ) : (
             <div className="field" style={{ marginBottom: '20px' }}>
               <label htmlFor="minute" style={{ display: 'block', marginBottom: '5px', opacity: 0.8 }}>Minute of the hour (0-59):</label>
               <input id="minute" type="number" min="0" max="59" name="minute" value={formData.minute} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#222', color: '#fff', border: '1px solid #444' }} />
             </div>
          )}

          <button 
            className="scan-btn" 
            onClick={handleSaveAutomation} 
            disabled={loading}
            style={{ width: '100%', padding: '12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {loading ? 'Saving...' : 'Save Automation'}
          </button>
        </div>

        {/* Right Column: List & Logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '20px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>Active Automations</h3>
              <button 
                onClick={() => fetchSchedules(true)} 
                disabled={refreshing || loading}
                style={{ 
                  background: 'none', 
                  border: '1px solid #444', 
                  color: '#aaa', 
                  padding: '5px 12px', 
                  borderRadius: '4px', 
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                {refreshing ? 'Refreshing...' : '↻ Refresh'}
              </button>
            </div>
             {schedules.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'left' }}>
                      <th style={{ padding: '12px' }}>Scan Type</th>
                      <th style={{ padding: '12px' }}>Schedule</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map((res, idx) => {
                      const scheduleTxt = res.frequency === 'daily' ? `Daily at ${res.time} (Local)` : `Hourly at minute ${res.minute}`;
                      const label = scanOptions.find(o => o.value === res.scanType)?.label || res.scanType;
                      return (
                        <tr key={res.scanType} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '12px', fontWeight: 'bold' }}>{label}</td>
                          <td style={{ padding: '12px', opacity: 0.8 }}>{scheduleTxt}</td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            <button 
                              onClick={() => handleToggleState(res.scanType, res.status)}
                              style={{ 
                                padding: '6px 12px', 
                                borderRadius: '20px', 
                                border: 'none', 
                                cursor: 'pointer',
                                background: res.status === 'ENABLED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                color: res.status === 'ENABLED' ? '#10b981' : '#ef4444',
                                fontWeight: 'bold'
                              }}
                            >
                              {res.status}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
             ) : (
                <p style={{ color: 'rgba(255, 255, 255, 0.5)', padding: '20px 0' }}>No automations configured yet.</p>
             )}
          </div>

          <Terminal logs={logs} />

          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '20px', borderRadius: '12px' }}>
            <h3>Automation History</h3>
            {history.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {history.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', borderLeft: `4px solid ${item.status === 'SUCCESS' ? '#10b981' : '#ef4444'}` }}>
                    <div>
                      <span style={{ fontWeight: 'bold', display: 'block' }}>{item.label}: {item.action}</span>
                      <small style={{ opacity: 0.6 }}>{item.details}</small>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.75rem', display: 'block', opacity: 0.5 }}>{new Date(item.timestamp).toLocaleTimeString()}</span>
                      <span style={{ fontSize: '0.75rem', color: item.status === 'SUCCESS' ? '#10b981' : '#ef4444' }}>{item.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.9rem' }}>No recent activities logged.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

Automation.propTypes = {
  token: PropTypes.string,
};

export default Automation;
