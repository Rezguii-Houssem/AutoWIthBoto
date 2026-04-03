import os
import zipfile
import shutil
import hashlib

def get_dir_hash(directory):
    sha256_hash = hashlib.sha256()
    for root, dirs, files in os.walk(directory):
        for names in sorted(files):
            filepath = os.path.join(root, names)
            with open(filepath, "rb") as f:
                while True:
                    data = f.read(65536)
                    if not data:
                        break
                    sha256_hash.update(data)
    return sha256_hash.hexdigest()

def package_lambda(src_dir, dest_file, shared_dir=None):
    with zipfile.ZipFile(dest_file, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(src_dir):
            for file in files:
                abs_path = os.path.join(root, file)
                rel_path = os.path.relpath(abs_path, src_dir)
                zipf.write(abs_path, rel_path)
                
        if shared_dir and os.path.exists(shared_dir):
            for root, dirs, files in os.walk(shared_dir):
                for file in files:
                    abs_path = os.path.join(root, file)
                    rel_path = os.path.join("shared", os.path.relpath(abs_path, shared_dir))
                    zipf.write(abs_path, rel_path)

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    lambdas_src = os.path.join(root_dir, "backend", "lambdas")
    build_dir = os.path.join(root_dir, "builds")

    if not os.path.exists(build_dir):
        os.makedirs(build_dir)

    lambda_configs = [
        ("finops/get_idle_ec2", "get_idle_ec2.zip"),
        ("finops/get_unattached_ebs", "get_unattached_ebs.zip"),
        ("secops/check_s3_public", "check_s3_public.zip"),
        ("secops/check_sg_open", "check_sg_open.zip"),
        ("ses_notifier", "ses_notifier.zip"),
        ("toggle_scheduler", "toggle_scheduler.zip"),
    ]

    shared_dir = os.path.join(lambdas_src, "shared")
    
    print("--- Packaging Lambdas ---")
    for src_rel, zip_name in lambda_configs:
        src_path = os.path.join(lambdas_src, src_rel)
        dest_path = os.path.join(build_dir, zip_name)
        
        if os.path.exists(src_path):
            print(f"Packaging {src_rel} -> {zip_name}...")
            package_lambda(src_path, dest_path, shared_dir=shared_dir)
        else:
            print(f"WARNING: Source path {src_path} not found!")

    print("Success! All Lambdas packaged in /builds directory.")

if __name__ == "__main__":
    main()
