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
        region = query_params.get('region', 'eu-west-1')
        action = query_params.get('action', 'scan')  # scan or restrict
        log_bucket = os.environ.get('LOG_BUCKET', 'autowithboto-logs')

        logger.info(f"Scanning for open security groups in region {region}.")

        session = get_boto_session(query_params)
        ec2 = session.client('ec2')

        sgs = ec2.describe_security_groups()
        open_sgs = []

        for sg in sgs['SecurityGroups']:
            sg_id = sg['GroupId']
            is_open = False
            
            for permission in sg.get('IpPermissions', []):
                open_cidrs = [ip_range for ip_range in permission.get('IpRanges', []) 
                              if ip_range.get('CidrIp') == '0.0.0.0/0']
                
                if open_cidrs:
                    is_open = True
                    
                    if action == 'restrict':
                        logger.warning(f"Restricting SG {sg_id} | Removing 0.0.0.0/0 rule")
                        # Revoke only the 0.0.0.0/0 from this permission
                        ec2.revoke_security_group_ingress(
                            GroupId=sg_id,
                            IpPermissions=[{
                                'IpProtocol': permission['IpProtocol'],
                                'FromPort': permission.get('FromPort'),
                                'ToPort': permission.get('ToPort'),
                                'IpRanges': open_cidrs
                            }]
                        )

            if is_open:
                open_sgs.append({
                    'GroupId': sg_id,
                    'GroupName': sg.get('GroupName'),
                    'Description': sg.get('Description')
                })

        # Upload logs
        try:
            upload_logs_to_s3(log_bucket, session)
        except Exception as e:
            logger.error(f"Failed to upload logs to S3: {str(e)}")

        return respond(200, {'open_security_groups': open_sgs, 'count': len(open_sgs)})

    except Exception as e:
        logger.error(f"Error in check_sg_open: {str(e)}")
        return respond(500, {'error': str(e)})