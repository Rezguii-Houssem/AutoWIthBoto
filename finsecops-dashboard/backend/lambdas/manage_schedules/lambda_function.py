import json
import boto3
import os

from botocore.config import Config

# Standardizing timeout for reliability
config = Config(
    connect_timeout=5, 
    read_timeout=10,
    retries={'max_attempts': 3}
)

events_client = boto3.client('events', config=config)
lambda_client = boto3.client('lambda', config=config)

def get_cron_expression(body):
    frequency = body.get('frequency')
    if frequency == 'daily':
        time_val = body.get('time', '12:00') # HH:MM UTC
        try:
            h, m = time_val.split(':')
            return f"cron({m} {h} * * ? *)"
        except Exception:
            return "cron(0 12 * * ? *)"
    elif frequency == 'hourly':
        minute = body.get('minute', '0')
        return f"cron({minute} * * * ? *)"
    return body.get('schedule_expression', 'rate(1 day)')

def lambda_handler(event, context):
    # Handle preflight CORS requests
    request_context = event.get('requestContext', {})
    http_method = request_context.get('http', {}).get('method') or event.get('httpMethod')
    
    if http_method == 'OPTIONS':
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
                "Access-Control-Max-Age": "3600"
            },
            "body": ""
        }
    
    try:
        body = json.loads(event.get('body', '{}'))
        action = body.get('action') # 'enable' or 'disable'
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
                Targets=[
                    {
                        'Id': '1',
                        'Arn': target_arn,
                        'Input': json.dumps({"queryStringParameters": params})
                    }
                ]
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
            status = f"Scheduled {lambda_name} successfully."
            
        elif action == 'disable':
            try:
                events_client.remove_targets(
                    Rule=rule_name,
                    Ids=['1']
                )
            except Exception:
                pass
            try:
                events_client.delete_rule(Name=rule_name)
            except Exception:
                pass
            try:
                lambda_client.remove_permission(
                    FunctionName=lambda_name,
                    StatementId=f"EventBridge-{rule_name}"
                )
            except Exception:
                pass
            status = f"Schedule disabled for {lambda_name}."
        else:
            raise ValueError("Action must be 'enable' or 'disable'")
            
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "ANY,OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type,Authorization"
            },
            "body": json.dumps({
                "status": "success",
                "message": status
            })
        }
    except Exception as e:
        import traceback
        return {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "ANY,OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type,Authorization"
            },
            "body": json.dumps({"status": "error", "message": str(e), "trace": traceback.format_exc()})
        }
