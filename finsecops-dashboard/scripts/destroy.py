import subprocess
import os
import sys
import shutil
import zipfile

def run_command(command, cwd=None):
    print(f"Running: {' '.join(command)}")
    shell = os.name == 'nt'
    result = subprocess.run(command, cwd=cwd, text=True, shell=shell)
    if result.returncode != 0:
        print(f"Error: Command failed with exit code {result.returncode}")
        sys.exit(result.returncode)

def ensure_dummy_zips(builds_dir):
    """Create dummy zip files so Terraform can compute filebase64sha256 during destroy."""
    zip_names = [
        "get_idle_ec2.zip",
        "get_unattached_ebs.zip",
        "check_s3_public.zip",
        "check_sg_open.zip",
        "ses_notifier.zip",
        "manage_schedules.zip",
        "scan_services.zip",
    ]
    os.makedirs(builds_dir, exist_ok=True)
    for name in zip_names:
        path = os.path.join(builds_dir, name)
        if not os.path.exists(path):
            print(f"  Creating dummy zip: {name}")
            with zipfile.ZipFile(path, 'w') as zf:
                zf.writestr("placeholder.txt", "dummy")

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    # 1. Empty S3 Bucket (Optional if force_destroy is true, but safer)
    print("\n--- Step 1: Emptying S3 Bucket ---")
    # Need to get the bucket name first
    terraform_dir = os.path.join(root_dir, "terraform", "env", "dev")
    shell = os.name == 'nt'
    result = subprocess.run(
        ["terraform", "output", "-raw", "s3_frontend_bucket_id"],
        cwd=terraform_dir,
        text=True,
        capture_output=True,
        shell=shell
    )
    if result.returncode == 0:
        bucket_id = result.stdout.strip()
        if bucket_id and not bucket_id.startswith("Warning"):
            run_command(["aws", "s3", "rm", f"s3://{bucket_id}", "--recursive"])

    # 2. Create dummy zips if missing (Terraform needs them for hash computation)
    print("\n--- Step 2: Ensuring build artifacts exist for Terraform ---")
    builds_dir = os.path.join(root_dir, "builds")
    ensure_dummy_zips(builds_dir)

    # 3. Terraform Destroy
    print("\n--- Step 3: Terraform Destroy ---")
    run_command(["terraform", "destroy", "-auto-approve"], cwd=terraform_dir)

    # 4. Cleanup builds and artifacts
    print("\n--- Step 4: Cleanup ---")
    for d in ["builds", os.path.join("frontend", "build")]:
        path = os.path.join(root_dir, d)
        if os.path.exists(path):
            print(f"Removing {path}...")
            shutil.rmtree(path)

    print("\n--- Destruction & Cleanup Complete! ---")

if __name__ == "__main__":
    main()
