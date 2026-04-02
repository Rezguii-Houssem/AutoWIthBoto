import subprocess
import os
import sys

def run_command(command, cwd=None):
    print(f"Running: {' '.join(command)}")
    result = subprocess.run(command, cwd=cwd, text=True)
    if result.returncode != 0:
        print(f"Error: Command failed with exit code {result.returncode}")
        sys.exit(result.returncode)

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    scripts_dir = os.path.join(root_dir, "scripts")
    terraform_dir = os.path.join(root_dir, "terraform", "env", "dev")

    # 1. Package Lambdas
    print("\n--- Step 1: Packaging Lambdas ---")
    run_command([sys.executable, os.path.join(scripts_dir, "package_lambdas.py")])

    # 2. Terraform Init
    print("\n--- Step 2: Terraform Init ---")
    run_command(["terraform", "init"], cwd=terraform_dir)

    # 3. Terraform Apply
    print("\n--- Step 3: Terraform Apply ---")
    run_command(["terraform", "apply", "-auto-approve"], cwd=terraform_dir)

    print("\n--- Deployment Complete! ---")

if __name__ == "__main__":
    main()
