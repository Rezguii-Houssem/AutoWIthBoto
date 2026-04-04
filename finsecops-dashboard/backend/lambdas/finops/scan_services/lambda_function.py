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
        # Time window: Default to 1 day (24h), allow 7 days
        days = int(query_params.get('days', 1))
        log_bucket = os.environ.get('LOG_BUCKET')
        
        logger.info(f"Initiating Account-Wide Sweep in {region} for the past {days} days.")

        session = get_boto_session(query_params)
        tagging = session.client('resourcegroupstaggingapi', region_name=region)
        ce = session.client('ce', region_name='us-east-1')
        s3 = session.client('s3')

        # Cost Explorer dates: End is exclusive
        end_date = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        start_date = (datetime.now(timezone.utc) - timedelta(days=days)).strftime('%Y-%m-%d')
        
        # Adjust if start == end (same day)
        if start_date == end_date:
            start_date = (datetime.now(timezone.utc) - timedelta(days=1)).strftime('%Y-%m-%d')

        resource_data = {}

        # 1. LIVE SWEEP: Discover every resource in the region via Tagging API
        try:
            logger.info("Scanning for live resources via Tagging API...")
            paginator = tagging.get_paginator('get_resources')
            # Fetch all resources that are taggable
            for page in paginator.paginate():
                for res in page['ResourceTagMappingList']:
                    arn = res['ResourceARN']
                    parts = arn.split(':')
                    service = parts[2] if len(parts) > 2 else 'Unknown'
                    
                    # More robust type extraction from ARN
                    res_type = 'Resource'
                    if len(parts) > 5:
                        res_part = parts[5]
                        if '/' in res_part:
                            res_type = res_part.split('/')[0]
                        elif ':' in res_part:
                            res_type = res_part.split(':')[0]
                        else:
                            res_type = res_part
                    
                    # Find Name tag
                    name = arn.split('/')[-1] if '/' in arn else arn
                    for tag in res.get('Tags', []):
                        if tag['Key'].lower() == 'name':
                            name = tag['Value']
                            break
                    
                    resource_data[arn] = {
                        'ResourceId': arn,
                        'Name': name,
                        'Service': service.upper(),
                        'Type': res_type,
                        'Cost': 0.0,
                        'Currency': 'USD',
                        'Status': 'Live'
                    }
            logger.info(f"Discovered {len(resource_data)} taggable live resources.")
        except Exception as tag_err:
            logger.error(f"Tagging API error: {str(tag_err)}")

        # 2. COST SWEEP: Fetch cost data with Resource ID grouping
        try:
            logger.info(f"Fetching account-wide cost data from Cost Explorer ({start_date} to {end_date})...")
            
            # Use a helper to execute the query with fallback
            def get_ce_data(group_by_resource=True):
                group_by = [{'Type': 'DIMENSION', 'Key': 'SERVICE'}]
                if group_by_resource:
                    group_by.append({'Type': 'DIMENSION', 'Key': 'RESOURCE_ID'})
                
                return ce.get_cost_and_usage(
                    TimePeriod={'Start': start_date, 'End': end_date},
                    Granularity='DAILY',
                    Metrics=['UnblendedCost'],
                    GroupBy=group_by,
                    Filter={
                        'Not': {
                            'Dimensions': {
                                'Key': 'RECORD_TYPE',
                                'Values': ['Credit', 'Refund']
                            }
                        }
                    }
                )

            try:
                cost_response = get_ce_data(group_by_resource=True)
            except ce.exceptions.ValidationException as val_err:
                if "RESOURCE_ID" in str(val_err) or "dimension is invalid" in str(val_err):
                    logger.warning("RESOURCE_ID dimension is currently unavailable (likely pending 24h activation). Falling back to Service-level grouping.")
                    cost_response = get_ce_data(group_by_resource=False)
                else:
                    raise val_err

            groups_found = 0
            for result_by_time in cost_response.get('ResultsByTime', []):
                for group in result_by_time.get('Groups', []):
                    # Keys are [Service] or [Service, ResourceID]
                    service_name = group['Keys'][0]
                    resource_id = group['Keys'][1] if len(group['Keys']) > 1 else f"Service:{service_name}"
                    amount = float(group['Metrics']['UnblendedCost']['Amount'])
                    
                    if amount <= 0 or resource_id == "NoResourceId":
                        continue

                    groups_found += 1
                    # Match by Resource ID or ARN
                    target_key = None
                    if resource_id in resource_data:
                        target_key = resource_id
                    else:
                        for arn_info in resource_data:
                            if resource_id in arn_info:
                                target_key = arn_info
                                break
                    
                    if target_key:
                        resource_data[target_key]['Cost'] += amount
                        resource_data[target_key]['Status'] = 'Active'
                    else:
                        # Resource found in billing but not in live sweep
                        resource_data[resource_id] = {
                            'ResourceId': resource_id,
                            'Name': resource_id if not resource_id.startswith("Service:") else service_name,
                            'Service': service_name.upper(),
                            'Type': 'AWS Resource' if not resource_id.startswith("Service:") else 'Service Group',
                            'Cost': amount,
                            'Currency': 'USD',
                            'Status': 'Historical/Untagged'
                        }
            logger.info(f"Processed {groups_found} cost groups from Cost Explorer.")
        except Exception as ce_err:
            logger.warning(f"Cost Explorer error: {str(ce_err)}")

        # Filter and sort
        final_list = [res for res in resource_data.values() if res['Cost'] > 0 or res['Status'] == 'Live']
        final_list = sorted(final_list, key=lambda x: x['Cost'], reverse=True)

        # Final Log upload
        if log_bucket:
            try:
                # Check if bucket exists
                s3.head_bucket(Bucket=log_bucket)
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
        logger.error(f"Critical error in sweep: {str(e)}")
        # Attempt one last log upload before failing
        try:
            if 'log_bucket' in locals() and 'session' in locals():
                upload_logs_to_s3(log_bucket, session)
        except Exception:
            pass
        return respond(500, {'error': str(e)})
