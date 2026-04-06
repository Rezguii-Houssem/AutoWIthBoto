import json
import boto3
from shared.logger_setup import setup_logger, upload_logs_to_s3, reset_log_file
from shared.utils import respond

logger = setup_logger()

# Assuming a consistent prefix for all rules created by this app
RULE_PREFIX = 'FinSecOps-Auto-'

def lambda_handler(event, context):
    try:
        reset_log_file()
        http_method = event.get('httpMethod', 'GET')
        events_client = boto3.client('events')
        lambda_client = boto3.client('lambda')
        
        region = 'eu-west-3' # Default region for clients if needed, though EventBridge is typically regional
        
        if http_method == 'GET':
            # List all rules
            rules_response = events_client.list_rules(NamePrefix=RULE_PREFIX)
            schedules = []
            
            for rule in rules_response.get('Rules', []):
                targets_response = events_client.list_targets_by_rule(Rule=rule['Name'])
                targets = targets_response.get('Targets', [])
                
                schedules.append({
                    'Name': rule['Name'],
                    'ScheduleExpression': rule.get('ScheduleExpression', ''),
                    'State': rule['State'],
                    'Targets': targets
                })
            
            return respond(200, {'schedules': schedules})
            
        elif http_method == 'POST':
            # Create a new schedule
            body = json.loads(event.get('body', '{}'))
            target_lambda = body.get('target_lambda')
            schedule_expr = body.get('schedule_expression') # e.g., 'rate(1 day)' or 'cron(0 12 * * ? *)'
            payload = body.get('payload', {})
            rule_name = body.get('rule_name', f"{RULE_PREFIX}{target_lambda}")

            # Ensure the scheduled flag is added so the target lambda knows it's automated
            payload['scheduled'] = True

            # 1. Create the rule
            rule_res = events_client.put_rule(
                Name=rule_name,
                ScheduleExpression=schedule_expr,
                State='ENABLED',
                Description=f'Automated schedule for {target_lambda}'
            )
            
            # 2. Get the ARN of the target lambda
            # To do this safely, we describe the lambda function
            func_info = lambda_client.get_function(FunctionName=target_lambda)
            func_arn = func_info['Configuration']['FunctionArn']
            
            # 3. Add permission for EventBridge to invoke the lambda
            # We add a generic permission or try-except it if it already exists
            try:
                lambda_client.add_permission(
                    FunctionName=target_lambda,
                    StatementId=f'EventBridgeInvoke-{rule_name}',
                    Action='lambda:InvokeFunction',
                    Principal='events.amazonaws.com',
                    SourceArn=rule_res['RuleArn']
                )
            except lambda_client.exceptions.ResourceConflictException:
                pass # Permission already exists

            # 4. Add the target to the rule
            events_client.put_targets(
                Rule=rule_name,
                Targets=[
                    {
                        'Id': 'TargetLambda',
                        'Arn': func_arn,
                        'Input': json.dumps(payload)
                    }
                ]
            )
            
            return respond(200, {'message': f'Schedule {rule_name} created successfully.'})
            
        elif http_method == 'DELETE':
            # Delete a schedule
            body = json.loads(event.get('body', '{}'))
            rule_name = body.get('rule_name')
            
            if not rule_name:
                return respond(400, {'error': 'rule_name is required'})
                
            # First remove targets
            try:
                events_client.remove_targets(
                    Rule=rule_name,
                    Ids=['TargetLambda'] # Assuming we always name it 'TargetLambda'
                )
            except Exception as e:
                logger.warning(f"Failed to remove targets from rule {rule_name}: {e}")
                
            # Then delete rule
            events_client.delete_rule(Name=rule_name)
            
            return respond(200, {'message': f'Schedule {rule_name} deleted successfully.'})
            
        else:
            return respond(405, {'error': 'Method not allowed'})
            
    except Exception as e:
        logger.error(f"Error in manage_schedules: {str(e)}")
        return respond(500, {'error': str(e)})
