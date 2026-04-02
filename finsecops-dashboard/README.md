# AutoWithBoto - AWS FinOps + SecOps Platform

🚀 A powerful automation engine for AWS resource management and security auditing.

## Features
- **FinOps**: Identify and stop idle EC2 instances, delete unattached EBS volumes.
- **SecOps**: Audit S3 buckets for public access, scan for open security group ports.
- **Dynamic Configuration**: Filter by region, tags, and custom thresholds.
- **Automation**: One-click remediation (`stop`, `delete`, `secure`).
- **Secure Architecture**: Cognito Auth + API Gateway + Lambda + Terraform.

## Project Structure
- `frontend/`: React-based dashboard.
- `backend/lambdas/`: Python logic for AWS automation.
- `terraform/`: Infrastructure-as-Code.
- `scripts/`: Deployment utilities.

## Setup
1. **Infrastructure**:
   ```bash
   cd terraform/env/dev
   terraform init
   terraform apply
   ```
2. **Backend**:
   - Package lambdas using the provided `scripts/package.sh`.
   - Update API endpoint in `frontend/src/components/Dashboard.js`.
3. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run build
   aws s3 sync build/ s3://autowithboto-frontend-xxxx
   ```

## Variables Layer
The platform supports dynamic input via the frontend:
- `region`: Specify the AWS region to scan.
- `tag_key`/`tag_value`: Filter resources by tags.
- `cpu_threshold`: Custom threshold for idle detection.
- `hours`: Time window for CloudWatch metric analysis.
- `action`: `scan` for reporting, or remediation actions (`stop`, `delete`, etc.).

---
Built with ❤️
