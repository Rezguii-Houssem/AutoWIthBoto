import subprocess
import os
import sys
import shutil

def run_command(command, cwd=None):
    print(f"Running: {' '.join(command)}")
    shell = os.name == 'nt'
    result = subprocess.run(command, cwd=cwd, text=True, shell=shell)
    if result.returncode != 0:
        print(f"Error: Command failed with exit code {result.returncode}")
        sys.exit(result.returncode)

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

    # 2. Terraform Destroy
    print("\n--- Step 2: Terraform Destroy ---")
    run_command(["terraform", "destroy", "-auto-approve"], cwd=terraform_dir)

    # 3. Cleanup builds and artifacts
    print("\n--- Step 3: Cleanup ---")
    for d in ["builds", os.path.join("frontend", "build")]:
        path = os.path.join(root_dir, d)
        if os.path.exists(path):
            print(f"Removing {path}...")
            shutil.rmtree(path)

    print("\n--- Destruction & Cleanup Complete! ---")

if __name__ == "__main__":
    main()
