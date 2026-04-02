import json
import boto3
import os

events_client = boto3.client('events')
RULE_NAME = os.environ.get('RULE_NAME', 'finsecops-daily-scan')

def lambda_handler(event, context):
    try:
        body = json.loads(event.get('body', '{}'))
        enabled = body.get('enabled', True)
        
        if enabled:
            events_client.enable_rule(Name=RULE_NAME)
            status = "ENABLED"
        else:
            events_client.disable_rule(Name=RULE_NAME)
            status = "DISABLED"
            
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST,OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            "body": json.dumps({
                "status": "success",
                "rule_status": status
            })
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"status": "error", "message": str(e)})
        }
    
