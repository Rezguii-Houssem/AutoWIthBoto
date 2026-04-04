import os
from datetime import datetime, timedelta, timezone
from shared.logger_setup import setup_logger, upload_logs_to_s3, reset_log_file
from shared.utils import respond, get_boto_session

logger = setup_logger()

def get_average_cpu(cw_client, instance_id, start_time, end_time):
    metrics = cw_client.get_metric_statistics(
        Namespace='AWS/EC2',
        MetricName='CPUUtilization',
        Dimensions=[{'Name': 'InstanceId', 'Value': instance_id}],
        StartTime=start_time,
        EndTime=end_time,
        Period=3600,
        Statistics=['Average']
    )
    if not metrics['Datapoints']:
        return None
    return sum(d['Average'] for d in metrics['Datapoints']) / len(metrics['Datapoints'])

def lambda_handler(event, context):
    try:
        reset_log_file()
        query_params = event.get('queryStringParameters', {})
        region = query_params.get('region', 'eu-west-3')
        tag_key = query_params.get('tag_key')
        tag_value = query_params.get('tag_value')
        threshold = float(query_params.get('cpu_threshold', 5.0))
        hours = int(query_params.get('hours', 5))
        action = query_params.get('action', 'scan')
        log_bucket = os.environ.get('LOG_BUCKET', 'autowithboto-logs')

        logger.info(f"Scanning for idle EC2 in region {region} with threshold {threshold}% over {hours} hours.")

        session = get_boto_session(query_params)
        ec2 = session.client('ec2')
        cw = session.client('cloudwatch')

        filters = [{'Name': 'instance-state-name', 'Values': ['running']}]
        if tag_key and tag_value:
            filters.append({'Name': f'tag:{tag_key}', 'Values': [tag_value]})

        instances = ec2.describe_instances(Filters=filters)
        idle_instances = []

        end_time = datetime.now(timezone.utc)
        start_time = end_time - timedelta(hours=hours)

        for reservation in instances['Reservations']:
            for instance in reservation['Instances']:
                instance_id = instance['InstanceId']
                
                avg_cpu = get_average_cpu(cw, instance_id, start_time, end_time)
                if avg_cpu is None:
                    logger.warning(f"No CPU data found for instance: {instance_id}")
                    continue

                if avg_cpu < threshold:
                    idle_instances.append({
                        'InstanceId': instance_id,
                        'AverageCPU': avg_cpu,
                        'Tags': instance.get('Tags', [])
                    })
                    
                    if action == 'stop':
                        logger.warning(f"Stopping idle instance: {instance_id}")
                        ec2.stop_instances(InstanceIds=[instance_id])

        # Upload logs to S3 before finishing
        try:
            upload_logs_to_s3(log_bucket, session)
        except Exception as e:
            logger.error(f"Failed to upload logs to S3: {str(e)}")

        return respond(200, {'idle_instances': idle_instances, 'count': len(idle_instances)})

    except Exception as e:
        logger.error(f"Error in get_idle_ec2: {str(e)}")
        return respond(500, {'error': str(e)})
