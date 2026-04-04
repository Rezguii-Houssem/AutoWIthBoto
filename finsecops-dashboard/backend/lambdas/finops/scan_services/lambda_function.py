import os
from datetime import datetime, timedelta, timezone
from shared.logger_setup import setup_logger, upload_logs_to_s3, reset_log_file
from shared.utils import respond, get_boto_session

logger = setup_logger()

def lambda_handler(event, context):
    """
    Performs a comprehensive account-wide sweep for all resources using:
    1. Resource Groups Tagging API (for live discovery)
    2. Cost Explorer (for historical cost analysis)
    """
    try:
        reset_log_file()
        query_params = event.get('queryStringParameters', {}) or {}
        region = query_params.get('region', 'eu-west-3')
        # Time window: Default to 24h, allow 7d override
        days = int(query_params.get('days', 1))
        log_bucket = os.environ.get('LOG_BUCKET', 'autowithboto-logs')
        
        logger.info(f"Initiating Account-Wide Sweep in {region} for the past {days} days.")

        session = get_boto_session(query_params)
        tagging = session.client('resourcegroupstaggingapi')
        ce = session.client('ce', region_name='us-east-1')

        end_date = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        start_date = (datetime.now(timezone.utc) - timedelta(days=days)).strftime('%Y-%m-%d')

        resource_data = {}

        # 1. LIVE SWEEP: Discover every resource in the region via Tagging API
        try:
            logger.info("Scanning for live resources via Tagging API...")
            paginator = tagging.get_paginator('get_resources')
            for page in paginator.paginate():
                for res in page['ResourceTagMappingList']:
                    arn = res['ResourceARN']
                    # Parse ARN for generic ID and type
                    # example: arn:aws:ec2:region:account:instance/i-123
                    parts = arn.split(':')
                    service = parts[2] if len(parts) > 2 else 'Unknown'
                    resource_type = parts[5].split('/')[0] if len(parts) > 5 and '/' in parts[5] else parts[2]
                    
                    # Try to find a Name tag
                    name = arn
                    for tag in res.get('Tags', []):
                        if tag['Key'].lower() == 'name':
                            name = tag['Value']
                            break
                    
                    resource_data[arn] = {
                        'ResourceId': arn, # Use ARN as unique key
                        'Name': name,
                        'Service': service.upper(),
                        'Type': resource_type,
                        'Cost': 0.0,
                        'Currency': 'USD',
                        'Status': 'Active (Live)'
                    }
            logger.info(f"Discovered {len(resource_data)} live resources.")
        except Exception as tag_err:
            logger.error(f"Tagging API error: {str(tag_err)}")

        # 2. COST SWEEP: Fetch cost data for ALL resources
        try:
            logger.info(f"Fetching account-wide cost data from Cost Explorer ({start_date} to {end_date})...")
            # We use resource-level grouping. 
            # Note: Hourly/Resource data must be enabled in billing console.
            cost_response = ce.get_cost_and_usage_with_resources(
                TimePeriod={'Start': start_date, 'End': end_date},
                Granularity='DAILY',
                Metrics=['UnblendedCost'],
                GroupBy=[{'Type': 'DIMENSION', 'Key': 'RESOURCE_ID'}]
            )
            
            for result_by_time in cost_response.get('ResultsByTime', []):
                for group in result_by_time.get('Groups', []):
                    # Group keys are [Resource_ID] string (often the ARN or Instance ID)
                    ce_ref = group['Keys'][0] if group.get('Keys') else ''
                    amount = float(group['Metrics']['UnblendedCost']['Amount'])
                    
                    if not ce_ref or amount <= 0:
                        continue

                    # If resource exists in live sweep, update it
                    if ce_ref in resource_data:
                        resource_data[ce_ref]['Cost'] += amount
                        resource_data[ce_ref]['Status'] = 'Active'
                    else:
                        # If resource wasn't found in live sweep (e.g. deleted recently or not taggable)
                        # but still generated cost, add it to results
                        parts = ce_ref.split(':')
                        service = parts[2] if len(parts) > 2 else 'Unknown'
                        
                        resource_data[ce_ref] = {
                            'ResourceId': ce_ref,
                            'Name': ce_ref.split('/')[-1] if '/' in ce_ref else ce_ref,
                            'Service': service.upper(),
                            'Type': 'Unknown/Deleted',
                            'Cost': amount,
                            'Currency': 'USD',
                            'Status': 'Historical (Cost Only)'
                        }
        except Exception as ce_err:
            logger.warning(f"Cost Explorer error: {str(ce_err)}. (Resource-level data might be disabled)")

        # Format final list sorted by cost descending
        final_list = sorted(resource_data.values(), key=lambda x: x['Cost'], reverse=True)

        # Upload logs
        try:
            upload_logs_to_s3(log_bucket, session)
        except Exception as e:
            logger.error(f"Failed to upload logs to S3: {str(e)}")

        return respond(200, {
            'resources': final_list,
            'count': len(final_list),
            'cost_window_days': days,
            'scan_time': datetime.now(timezone.utc).isoformat()
        })

    except Exception as e:
        logger.error(f"Error in account-wide sweep: {str(e)}")
        return respond(500, {'error': str(e)})
