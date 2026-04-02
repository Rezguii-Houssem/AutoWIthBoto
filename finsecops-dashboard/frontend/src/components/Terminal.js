import React from 'react';

const Terminal = ({ logs }) => {
  return (
    <div className="terminal-container">
      <div className="terminal-header">
        <span>Scan Results Terminal</span>
      </div>
      <div className="terminal-body">
        {logs.map((log, index) => (
          <div key={index} className="log-line">
            <span className={`log-type ${log.type}`}>[{log.type}]</span>
            <span className="log-message">{log.message}</span>
          </div>
        ))}
        <div className="cursor">_</div>
      </div>
    </div>
  );
};

export default Terminal;
