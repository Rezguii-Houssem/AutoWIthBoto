import json
import boto3
import os
from datetime import datetime

lambda_client = boto3.client('lambda')
ses_client = boto3.client('ses')

SCAN_FUNCTIONS = [
    'getIdleEC2',
    'getUnattachedEBS',
    'checkS3Public',
    'checkSGOpen'
]

def lambda_handler(event, context):
    all_findings = {}
    
    for func_name in SCAN_FUNCTIONS:
        try:
            response = lambda_client.invoke(
                FunctionName=func_name,
                InvocationType='RequestResponse'
            )
            payload = json.loads(response['Payload'].read())
            all_findings[func_name] = payload
        except Exception as e:
            all_findings[func_name] = {"error": str(e)}

    # Format the report
    email_body = format_html_report(all_findings)
    
    # Send email
    try:
        ses_client.send_email(
            Source='rezguii.houssem@gmail.com',
            Destination={'ToAddresses': ['rezguii.houssem@gmail.com']},
            Message={
                'Subject': {'Data': f'FinSecOps Daily Report - {datetime.now().strftime("%Y-%m-%d")}'},
                'Body': {
                    'Html': {'Data': email_body}
                }
            }
        )
        return {"status": "success", "message": "Email sent"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def format_html_report(findings):
    html = f"""
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .header {{ background-color: #232f3e; color: white; padding: 20px; text-align: center; }}
            .section {{ margin: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }}
            .section-title {{ color: #ff9900; font-size: 18px; border-bottom: 2px solid #ff9900; margin-bottom: 10px; }}
            .finding {{ margin-bottom: 10px; padding: 10px; background-color: #f9f9f9; }}
            .alert {{ color: #d13212; font-weight: bold; }}
            .good {{ color: #1d8102; font-weight: bold; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>FinSecOps Daily Scan Report</h1>
            <p>Generated on {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</p>
        </div>
    """
    
    for name, data in findings.items():
        html += f'<div class="section"><div class="section-title">{name}</div>'
        if "error" in data:
            html += f'<p class="alert">Error running scan: {data["error"]}</p>'
        elif isinstance(data, list) and len(data) > 0:
            for item in data:
                html += f'<div class="finding">{json.dumps(item)}</div>'
        elif isinstance(data, list) and len(data) == 0:
            html += '<p class="good">No issues found.</p>'
        else:
            html += f'<div class="finding">{json.dumps(data)}</div>'
        html += '</div>'
        
    html += "</body></html>"
    return html
