import os
import json
import boto3
from shared.logger_setup import setup_logger, upload_logs_to_s3, reset_log_file
from shared.utils import respond, get_boto_session

logger = setup_logger()

def lambda_handler(event, context):
    try:
        reset_log_file()
        query_params = event.get('queryStringParameters', {})
        region = query_params.get('region', 'eu-west-3')
        action = query_params.get('action', 'scan')
        log_bucket = os.environ.get('LOG_BUCKET', 'autowithboto-logs')

        logger.info(f"Scanning for public S3 buckets in region {region}.")

        session = get_boto_session(query_params)
        s3 = session.client('s3')

        buckets = s3.list_buckets()
        public_buckets = []

        for bucket in buckets['Buckets']:
            bucket_name = bucket['Name']
            is_public = False
            
            try:
                # Check Public Access Block
                pab = s3.get_public_access_block(Bucket=bucket_name)
                conf = pab['PublicAccessBlockConfiguration']
                if not all([conf['BlockPublicAcls'], conf['IgnorePublicAcls'], conf['BlockPublicPolicy'], conf['RestrictPublicBuckets']]):
                    is_public = True
            except:
                is_public = True # If no PAB, assume it could be public

            if is_public:
                public_buckets.append({'BucketName': bucket_name})
                if action == 'secure':
                    logger.warning(f"Enforcing public access block on bucket: {bucket_name}")
                    s3.put_public_access_block(
                        Bucket=bucket_name,
                        PublicAccessBlockConfiguration={
                            'BlockPublicAcls': True,
                            'IgnorePublicAcls': True,
                            'BlockPublicPolicy': True,
                            'RestrictPublicBuckets': True
                        }
                    )

        # Explicitly log findings
        if public_buckets:
            logger.warning(f"Scan complete: Found {len(public_buckets)} public S3 buckets: {', '.join([b['BucketName'] for b in public_buckets])}")
        else:
            logger.info(f"Scan complete: No public S3 buckets found in region {region}.")

        try:
            upload_logs_to_s3(log_bucket, session)
        except Exception as e:
            logger.error(f"Failed to upload logs to S3: {str(e)}")

        return respond(200, {'public_buckets': public_buckets, 'count': len(public_buckets)})

    except Exception as e:
        logger.error(f"Error in check_s3_public: {str(e)}")
        return respond(500, {'error': str(e)})
