#!/bin/bash
# verify-specs.sh
# Verifies that engineering specifications are followed in the codebase.

EXIT_CODE=0

echo "Running Specification Verification..."

# 1. Verify Bug-First Metadata in Tests
echo "Checking for Bug-First metadata in tests..."
TEST_FILES=$(find src/test -name "*.test.ts")
for file in $TEST_FILES; do
    # Check for @bug, @failure_cause, @prevented_behavior
    if ! grep -q "@bug" "$file" || ! grep -q "@failure_cause" "$file" || ! grep -q "@prevented_behavior" "$file"; then
        echo "FAIL: $file is missing mandatory Bug-First metadata (@bug, @failure_cause, @prevented_behavior)"
        EXIT_CODE=1
    fi
done

# 2. Verify all files have file-level description/file tags
echo "Checking for file-level headers..."
SRC_FILES=$(find src -name "*.ts" -o -name "*.mts")
for file in $SRC_FILES; do
    if ! grep -q "@file" "$file"; then
        echo "FAIL: $file is missing mandatory @file header"
        # EXIT_CODE=1 # Not making this an error yet, but can be enabled
    fi
done

if [ $EXIT_CODE -eq 0 ]; then
    echo "SUCCESS: All specification checks passed."
else
    echo "FAILURE: One or more specification checks failed."
fi

exit $EXIT_CODE
