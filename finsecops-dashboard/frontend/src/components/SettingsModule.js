import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import Terminal from './Terminal';
import { handleAuthError } from '../lib/auth';

const API_ENDPOINT = process.env.REACT_APP_API_URL || "https://your-api-id.execute-api.eu-west-1.amazonaws.com/dev";

const SettingsModule = ({ token }) => {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [schedules, setSchedules] = useState([]);
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
    } catch (error) {
      if (handleAuthError(error)) return;
      console.error("Fetch failed", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const addLog = (type, message) => {
    setLogs(prev => [...prev, { type, message: `[${new Date().toLocaleTimeString([], { hour12: false })}] ${message}` }]);
  };

  const handleSaveAutomation = async () => {
    setLoading(true);
    const timePayload = formData.frequency === 'daily' ? formData.time : formData.minute;
    addLog('RUN', `Updating System Schedule: ${formData.scanType}...`);
    try {
      await axios.post(`${API_ENDPOINT}/automation/schedules`, {
        action: 'enable',
        lambda_name: formData.scanType,
        frequency: formData.frequency,
        time: timePayload,
        params: { region: formData.region, action: formData.action }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      addLog('DONE', `Schedule persisted for ${formData.scanType}.`);
      fetchSchedules();
    } catch (error) {
      if (handleAuthError(error)) return;
      addLog('ERROR', `Save failed: ${error.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="module-container">
      <div className="module-header">
        <div className="title-group">
          <h2>Application Settings</h2>
          <p>Global Configuration & Automation Schedules</p>
        </div>
        <div className="module-nav">
          <button className="active">Automation Rules</button>
          <button disabled style={{ opacity: 0.5 }}>Identity (IAM)</button>
          <button disabled style={{ opacity: 0.5 }}>Billing Alerts</button>
        </div>
      </div>

      <div className="module-content">
        <div className="grid-2">
          {/* Rule Creator */}
          <div className="card">
            <h3>Configuration Wizard</h3>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="automation-target">Automation Target</label>
                <select id="automation-target" name="scanType" value={formData.scanType} onChange={(e) => setFormData({...formData, scanType: e.target.value})}>
                  <option value="getIdleEC2">EC2 Idle Instances</option>
                  <option value="getUnattachedEBS">Unattached EBS Volumes</option>
                  <option value="checkS3Public">S3 Public Buckets</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="remediation-action">Remediation Action</label>
                <select id="remediation-action" name="action" value={formData.action} onChange={(e) => setFormData({...formData, action: e.target.value})}>
                  <option value="scan">Scan Only (Notification)</option>
                  <option value="stop">Auto-Stop / Auto-Remediate</option>
                </select>
              </div>
              <fieldset className="field no-border">
                <legend className="label">Frequency</legend>
                <div className="toggle-group">
                  <button type="button" className={formData.frequency === 'daily' ? 'active' : ''} onClick={() => setFormData({...formData, frequency: 'daily'})}>Daily</button>
                  <button type="button" className={formData.frequency === 'hourly' ? 'active' : ''} onClick={() => setFormData({...formData, frequency: 'hourly'})}>Hourly</button>
                </div>
              </fieldset>
              <button className="primary-btn" onClick={handleSaveAutomation} disabled={loading}>
                {loading ? 'Processing...' : 'Deploy Schedule'}
              </button>
            </div>
          </div>

          {/* Active Rules */}
          <div className="card">
            <div className="flex-between">
              <h3>Active System Rules</h3>
              <button className="text-btn" onClick={() => fetchSchedules(true)} disabled={refreshing}>
                {refreshing ? '...' : 'Refresh'}
              </button>
            </div>
            <div className="rules-list">
              {schedules.length > 0 ? schedules.map((s) => (
                <div key={s.lambda_name || s.rule_name || s.scanType} className="rule-item">
                  <div className="rule-info">
                    <span className="bold">{s.scanType}</span>
                    <span className="dim">{s.frequency} @ {s.time || s.minute}</span>
                  </div>
                  <span className={`status-pill ${s.status === 'ENABLED' ? 'active' : 'inactive'}`}>
                    {s.status}
                  </span>
                </div>
              )) : <p className="dim">No active automation rules found.</p>}
            </div>
          </div>
        </div>
      </div>

      <Terminal logs={logs} />
    </div>
  );
};

SettingsModule.propTypes = {
  token: PropTypes.string.isRequired,
};

export default SettingsModule;
