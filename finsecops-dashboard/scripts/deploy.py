import subprocess
import os
import sys

def run_command(command, cwd=None):
    print(f"Running: {' '.join(command)}")
    # Use shell=True on Windows for npm/terraform if needed, but subprocess.run with list is usually safer
    # However, npm is a cmd/ps1 on Windows.
    shell = os.name == 'nt'
    result = subprocess.run(command, cwd=cwd, text=True, shell=shell)
    if result.returncode != 0:
        print(f"Error: Command failed with exit code {result.returncode}")
        sys.exit(result.returncode)

def get_terraform_output(output_name, terraform_dir):
    shell = os.name == 'nt'
    result = subprocess.run(
        ["terraform", "output", "-raw", output_name],
        cwd=terraform_dir,
        text=True,
        capture_output=True,
        shell=shell
    )
    if result.returncode != 0:
        print(f"Error: Failed to get terraform output {output_name}")
        return None
    return result.stdout.strip()

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    # For Windows reliability, use absolute paths
    scripts_dir = os.path.join(root_dir, "scripts")
    terraform_dir = os.path.join(root_dir, "terraform", "env", "dev")
    frontend_dir = os.path.join(root_dir, "frontend")

    # 1. Package Lambdas
    print("\n--- Step 1: Packaging Lambdas ---")
    run_command([sys.executable, os.path.join(scripts_dir, "package_lambdas.py")])

    # 2. Terraform Init
    print("\n--- Step 2: Terraform Init ---")
    run_command(["terraform", "init"], cwd=terraform_dir)

    # 3. Terraform Apply
    print("\n--- Step 3: Terraform Apply ---")
    run_command(["terraform", "apply", "-auto-approve"], cwd=terraform_dir)

    # 4. Generate Frontend .env
    print("\n--- Step 4: Generating Frontend Configuration ---")
    user_pool_id = get_terraform_output("cognito_user_pool_id", terraform_dir)
    client_id = get_terraform_output("cognito_client_id", terraform_dir)
    api_url = get_terraform_output("api_gateway_url", terraform_dir)

    env_content = [
        f"REACT_APP_COGNITO_USER_POOL_ID={user_pool_id}",
        f"REACT_APP_COGNITO_CLIENT_ID={client_id}",
        f"REACT_APP_API_URL={api_url}"
    ]
    
    with open(os.path.join(frontend_dir, ".env"), "w") as f:
        f.write("\n".join(env_content))
    print(f"Generated {os.path.join(frontend_dir, '.env')} with new resource IDs.")

    # 5. Build Frontend
    print("\n--- Step 5: Building Frontend ---")
    run_command(["npm", "install"], cwd=frontend_dir)
    run_command(["npm", "run", "build"], cwd=frontend_dir)

    # 6. Sync Frontend to S3
    print("\n--- Step 6: Syncing Frontend to S3 ---")
    bucket_id = get_terraform_output("s3_frontend_bucket_id", terraform_dir)
    if bucket_id:
        build_dir = os.path.join(frontend_dir, "build")
        run_command(["aws", "s3", "sync", build_dir, f"s3://{bucket_id}", "--delete"])
    else:
        print("Error: Could not determine S3 bucket ID from terraform outputs.")
        sys.exit(1)

    print("\n--- Deployment Complete! ---")
    print(f"API URL: {api_url}")

if __name__ == "__main__":
    main()
