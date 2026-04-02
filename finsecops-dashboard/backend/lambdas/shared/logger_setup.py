import logging
import os
import boto3
from datetime import datetime

def setup_logger():
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    
    # CloudWatch is automatic, but we can add more handles if needed
    # For AutoWithBoto, we'll log to /tmp/app.log as requested
    file_handler = logging.FileHandler('/tmp/app.log')
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
    
    return logger

def upload_logs_to_s3(bucket_name, session=None):
    if not session:
        session = boto3.Session()
    s3 = session.client('s3')
    timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
    log_file = '/tmp/app.log'
    if os.path.exists(log_file):
        s3.put_object(
            Bucket=bucket_name,
            Key=f"logs/{timestamp}.log",
            Body=open(log_file, 'r').read()
        )
