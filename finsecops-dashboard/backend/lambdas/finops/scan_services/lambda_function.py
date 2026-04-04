import os
from datetime import datetime, timedelta, timezone
from shared.logger_setup import setup_logger, upload_logs_to_s3, reset_log_file
from shared.utils import respond, get_boto_session

logger = setup_logger()

def lambda_handler(event, context):
    """
    Scans the AWS account for running EC2 resources, 
    calculates their uptime, and attempts to fetch cost data from Cost Explorer.
    """
    try:
        reset_log_file()
        query_params = event.get('queryStringParameters', {}) or {}
        region = query_params.get('region', 'eu-west-3')
        # Time window for Cost Explorer (default 7 days)
        days = int(query_params.get('days', 7))
        log_bucket = os.environ.get('LOG_BUCKET', 'autowithboto-logs')
        
        logger.info(f"Scanning services in region {region} for the past {days} days.")

        session = get_boto_session(query_params)
        ec2 = session.client('ec2')
        ce = session.client('ce', region_name='us-east-1') # CE is always us-east-1

        end_date = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        start_date = (datetime.now(timezone.utc) - timedelta(days=days)).strftime('%Y-%m-%d')

        # 1. Fetch running EC2 instances and calculate Uptime
        instances = ec2.describe_instances(
            Filters=[{'Name': 'instance-state-name', 'Values': ['running']}]
        )
        
        resource_data = {}
        now = datetime.now(timezone.utc)
        
        for reservation in instances['Reservations']:
            for inst in reservation['Instances']:
                inst_id = inst['InstanceId']
                launch_time = inst['LaunchTime']
                
                # Calculate uptime in hours
                uptime_duration = now - launch_time
                uptime_hours = uptime_duration.total_seconds() / 3600.0
                
                # Get Name tag if exists
                name = inst_id
                for tag in inst.get('Tags', []):
                    if tag['Key'] == 'Name':
                        name = tag['Value']
                        break
                        
                resource_data[inst_id] = {
                    'ResourceId': inst_id,
                    'Name': name,
                    'Type': 'EC2 Instance',
                    'UptimeHours': round(uptime_hours, 2),
                    'Cost': 0.0, # Default, will update if CE has data
                    'Currency': 'USD'
                }

        # 2. Try fetching cost from Cost Explorer
        # Note: Granular resource cost requires "Hourly and Resource Level Data" enabled in billing.
        try:
            logger.info("Fetching cost data from Cost Explorer...")
            cost_response = ce.get_cost_and_usage_with_resources(
                TimePeriod={'Start': start_date, 'End': end_date},
                Granularity='DAILY',
                Filter={
                    'Dimensions': {
                        'Key': 'SERVICE',
                        'Values': ['Amazon Elastic Compute Cloud - Compute']
                    }
                },
                Metrics=['UnblendedCost'],
                GroupBy=[{'Type': 'DIMENSION', 'Key': 'RESOURCE_ID'}]
            )
            
            # CE groups by daily, we need to aggregate over the timeframe
            for result_by_time in cost_response.get('ResultsByTime', []):
                for group in result_by_time.get('Groups', []):
                    # Group keys are [Resource_ID] string
                    ce_resource_id = group['Keys'][0] if group.get('Keys') else ''
                    
                    # Clean up arn strings (e.g. arn:aws:ec2:eu-west-3:acc:instance/i-1234 -> i-1234)
                    if '/' in ce_resource_id:
                        ce_resource_id = ce_resource_id.split('/')[-1]
                        
                    amount = float(group['Metrics']['UnblendedCost']['Amount'])
                    
                    # Only append to active resources we just found
                    if ce_resource_id in resource_data:
                        resource_data[ce_resource_id]['Cost'] += amount
                        
        except Exception as ce_err:
            logger.warning(f"Cost Explorer error fetching resource details. Make sure Resource Level data is enabled in Billing. {str(ce_err)}")

        # Format final list
        final_list = list(resource_data.values())

        # Upload logs
        try:
            upload_logs_to_s3(log_bucket, session)
        except Exception as e:
            logger.error(f"Failed to upload logs to S3: {str(e)}")

        return respond(200, {
            'resources': final_list,
            'count': len(final_list),
            'cost_window_days': days
        })

    except Exception as e:
        logger.error(f"Error in scan_services: {str(e)}")
        return respond(500, {'error': str(e)})
