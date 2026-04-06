import json
import boto3
import os
import traceback
from botocore.config import Config

# Standardizing timeout for reliability
config = Config(
    connect_timeout=5, 
    read_timeout=10,
    retries={'max_attempts': 3}
)

events_client = boto3.client('events', config=config)
lambda_client = boto3.client('lambda', config=config)

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization"
}

def get_cron_expression(body):
    frequency = body.get('frequency')
    if frequency == 'daily':
        time_val = body.get('time', '12:00')
        try:
            h, m = time_val.split(':')
            return f"cron({m} {h} * * ? *)"
        except (ValueError, AttributeError):
            return "cron(0 12 * * ? *)"
    elif frequency == 'hourly':
        minute = body.get('minute', '0')
        return f"cron({minute} * * * ? *)"
    return body.get('schedule_expression', 'rate(1 day)')

def handle_get_request():
    rules_resp = events_client.list_rules(NamePrefix='auto-schedule-')
    schedules = []
    for rule in rules_resp.get('Rules', []):
        rule_name = rule['Name']
        lambda_name = rule_name.replace('auto-schedule-', '')
        
        targets_resp = events_client.list_targets_by_rule(Rule=rule_name)
        params = {}
        if targets_resp.get('Targets'):
            try:
                target_input = json.loads(targets_resp['Targets'][0].get('Input', '{}'))
                params = target_input.get('queryStringParameters', {})
            except (json.JSONDecodeError, KeyError):
                pass

        expr = rule.get('ScheduleExpression', '')
        parts = expr.replace('cron(', '').replace(')', '').split(' ')
        
        frequency = 'daily'
        time_val = '12:00'
        minute_val = '0'
        
        if len(parts) >= 2:
            if parts[1] == '*':
                frequency = 'hourly'
                minute_val = parts[0]
            else:
                frequency = 'daily'
                time_val = f"{parts[1].zfill(2)}:{parts[0].zfill(2)}"

        schedules.append({
            "scanType": lambda_name,
            "frequency": frequency,
            "time": time_val,
            "minute": minute_val,
            "status": rule.get('State', 'ENABLED'),
            "params": params
        })
    return {
        "statusCode": 200,
        "headers": CORS_HEADERS,
        "body": json.dumps(schedules)
    }

def handle_post_request(event, context):
    body = json.loads(event.get('body', '{}'))
    action = body.get('action')
    lambda_name = body.get('lambda_name')
    schedule_expression = get_cron_expression(body)
    params = body.get('params', {})
    
    region = params.get('region', os.environ.get('AWS_REGION', 'eu-west-3'))
    account_id = context.invoked_function_arn.split(":")[4]

    if not lambda_name:
        raise ValueError("lambda_name is required")
        
    rule_name = f"auto-schedule-{lambda_name}"
    target_arn = f"arn:aws:lambda:{region}:{account_id}:function:{lambda_name}"
    
    if action == 'enable':
        events_client.put_rule(
            Name=rule_name,
            ScheduleExpression=schedule_expression,
            State='ENABLED',
            Description=f"Automated schedule for {lambda_name}"
        )
        events_client.put_targets(
            Rule=rule_name,
            Targets=[{
                'Id': '1',
                'Arn': target_arn,
                'Input': json.dumps({"queryStringParameters": params})
            }]
        )
        try:
            lambda_client.add_permission(
                FunctionName=lambda_name,
                StatementId=f"EventBridge-{rule_name}",
                Action='lambda:InvokeFunction',
                Principal='events.amazonaws.com',
                SourceArn=f"arn:aws:events:{region}:{account_id}:rule/{rule_name}"
            )
        except lambda_client.exceptions.ResourceConflictException:
            pass
        msg = f"Scheduled {lambda_name} successfully."
        
    elif action == 'disable':
        for attempt in range(2): # Simple retry for eventual consistency
            try:
                events_client.remove_targets(Rule=rule_name, Ids=['1'])
                events_client.delete_rule(Name=rule_name)
                lambda_client.remove_permission(FunctionName=lambda_name, StatementId=f"EventBridge-{rule_name}")
                break
            except Exception:
                if attempt == 1: pass
        msg = f"Schedule disabled for {lambda_name}."
    else:
        raise ValueError("Action must be 'enable' or 'disable'")
        
    return {
        "statusCode": 200,
        "headers": CORS_HEADERS,
        "body": json.dumps({"status": "success", "message": msg})
    }

def lambda_handler(event, context):
    request_context = event.get('requestContext', {})
    http_method = (request_context.get('http', {}).get('method') or 
                   event.get('httpMethod') or '').upper()
    
    if http_method == 'OPTIONS':
        return {
            "statusCode": 200,
            "headers": {
                **CORS_HEADERS,
                "Access-Control-Max-Age": "3600"
            },
            "body": ""
        }
    
    try:
        if http_method == 'GET':
            return handle_get_request()
        return handle_post_request(event, context)
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({
                "status": "error", 
                "message": str(e), 
                "trace": traceback.format_exc() if os.environ.get('DEBUG') else None
            })
        }
