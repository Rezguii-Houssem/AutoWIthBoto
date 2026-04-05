import logging
import os
import boto3
from datetime import datetime
import os

LOG_FILE_PATH = '/tmp/app.log'


def setup_logger():
    # Set the root logger to WARNING to avoid seeing all library INFO logs
    logging.getLogger().setLevel(logging.WARNING)
    
    # Create or get our specific app logger
    logger = logging.getLogger('AutoWithBoto')
    logger.setLevel(logging.INFO)
    
    # Silence botocore and boto3 specifically just in case
    logging.getLogger('botocore').setLevel(logging.WARNING)
    logging.getLogger('boto3').setLevel(logging.WARNING)
    logging.getLogger('urllib3').setLevel(logging.WARNING)

    # CloudWatch is automatic, but we can add more handles if needed
    # For AutoWithBoto, we'll log to /tmp/app.log as requested
    file_handler = logging.FileHandler(LOG_FILE_PATH)
    formatter = logging.Formatter('%(levelname)s: %(message)s') # Simplified for dashboard
    file_handler.setFormatter(formatter)
    
    # Avoid adding multiple handlers if already present
    if not logger.handlers:
        logger.addHandler(file_handler)
    
    return logger


def reset_log_file():
    """Truncates log file to clear logs for a new request."""
    try:
        with open(LOG_FILE_PATH, 'w') as f:
            f.write('')
    except Exception:
        pass

def get_current_logs():
    """Reads log file and returns a list of formatted log objects."""
    logs = []
    if os.path.exists(LOG_FILE_PATH):
        try:
            with open(LOG_FILE_PATH, 'r') as f:
                for line in f:
                    # Simple parsing: 2026-04-04 14:00:00,000 - root - INFO - message
                    parts = line.split(' - ')
                    if len(parts) >= 4:
                        logs.append({
                            'timestamp': parts[0].strip(),
                            'name': parts[1].strip(),
                            'type': parts[2].strip(),
                            'message': ' - '.join(parts[3:]).strip()
                        })
                    else:
                        logs.append({
                            'type': 'INFO',
                            'message': line.strip()
                        })
        except Exception as e:
            logs.append({'type': 'ERROR', 'message': f"Failed to read log file: {str(e)}"})
    return logs

def upload_logs_to_s3(bucket_name, session=None):
    if not session:
        session = boto3.Session()
    s3 = session.client('s3')
    timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
    if os.path.exists(LOG_FILE_PATH):
        s3.put_object(
            Bucket=bucket_name,
            Key=f"logs/{timestamp}.log",
            Body=open(LOG_FILE_PATH, 'r').read()
        )
