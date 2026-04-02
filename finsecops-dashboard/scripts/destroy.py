import subprocess
import os
import sys
import shutil

def run_command(command, cwd=None):
    print(f"Running: {' '.join(command)}")
    result = subprocess.run(command, cwd=cwd, text=True)
    if result.returncode != 0:
        print(f"Error: Command failed with exit code {result.returncode}")
        sys.exit(result.returncode)

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    terraform_dir = os.path.join(root_dir, "terraform", "env", "dev")
    build_dir = os.path.join(root_dir, "builds")

    # 1. Terraform Destroy
    print("\n--- Step 1: Terraform Destroy ---")
    run_command(["terraform", "destroy", "-auto-approve"], cwd=terraform_dir)

    # 2. Cleanup Builds
    print("\n--- Step 2: Cleanup Builds ---")
    if os.path.exists(build_dir):
        print(f"Removing {build_dir}...")
        shutil.rmtree(build_dir)

    print("\n--- Destruction & Cleanup Complete! ---")

if __name__ == "__main__":
    main()
