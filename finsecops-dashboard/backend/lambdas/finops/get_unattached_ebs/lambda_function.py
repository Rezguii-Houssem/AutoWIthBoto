import os
from datetime import datetime, timezone, timedelta
from shared.logger_setup import setup_logger, upload_logs_to_s3, reset_log_file
from shared.utils import respond, get_boto_session

logger = setup_logger()


def lambda_handler(event, context):
    try:
        reset_log_file()
        query_params = event.get('queryStringParameters', {})

        region = query_params.get('region', 'eu-west-3')
        action = query_params.get('action', 'scan')
        age_days = int(query_params.get('age_days', 7))

        log_bucket = os.environ.get('LOG_BUCKET', 'autowithboto-logs')

        logger.info(f"Scanning unattached EBS volumes | age > {age_days} days")

        session = get_boto_session(query_params)
        ec2 = session.client('ec2')

        volumes = ec2.describe_volumes(
            Filters=[{'Name': 'status', 'Values': ['available']}]
        )

        now = datetime.now(timezone.utc)
        old_volumes = []

        for volume in volumes['Volumes']:

            volume_id = volume['VolumeId']
            create_time = volume['CreateTime']
            size = volume['Size']

            age = now - create_time

            if age < timedelta(days=age_days):
                continue

            volume_info = {
                'VolumeId': volume_id,
                'Size': size,
                'AgeDays': age.days
            }

            old_volumes.append(volume_info)

            if action == 'delete':
                logger.warning(f"Deleting volume: {volume_id}")
                ec2.delete_volume(VolumeId=volume_id)
        try:
            upload_logs_to_s3(log_bucket, session)
        except Exception as e:
            logger.error(f"Log upload failed: {str(e)}")

        return respond(200, {
            'old_unattached_volumes': old_volumes,
            'count': len(old_volumes)
        })

    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return respond(500, {'error': str(e)})