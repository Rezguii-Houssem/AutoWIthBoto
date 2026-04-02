#!/bin/bash

# Function to package a lambda
package_lambda() {
    local dir=$1
    local name=$2
    echo "Packaging $name..."
    cd $dir
    # Copy shared files
    cp -r ../../shared/*.py .
    # Install requirements
    if [ -f "requirements.txt" ]; then
        pip install -r requirements.txt -t .
    fi
    # Zip everything
    zip -r ../../../terraform/modules/lambda/$name.zip .
    # Cleanup shared files from lambda dir to keep it clean
    rm logger_setup.py utils.py
}

package_lambda "backend/lambdas/finops/get_idle_ec2" "getIdleEC2"
package_lambda "backend/lambdas/finops/get_unattached_ebs" "getUnattachedEBS"
package_lambda "backend/lambdas/secops/check_s3_public" "checkS3Public"
package_lambda "backend/lambdas/secops/check_sg_open" "checkSGOpen"

echo "All lambdas packaged in terraform/modules/lambda/"
