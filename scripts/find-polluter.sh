#!/usr/bin/env bash
# Bisection script to isolate which test creates unwanted files/state.
# Usage: bash scripts/find-polluter.sh <file_or_dir_to_check> <test_pattern>
set -e

if [ $# -ne 2 ]; then
  echo "Usage: $0 <file_to_check> <test_pattern>"
  exit 1
fi

POLLUTION_CHECK="$1"
TEST_PATTERN="${2#./}"
RUNNER="${NTA_TEST_CMD:-bun test}"

TEST_FILES=$(find . \( -path "./$TEST_PATTERN" -o -path "./${TEST_PATTERN//\*\*\//}" \) | sort -u)
if [ -z "$TEST_FILES" ]; then
  TOTAL=0
else
  TOTAL=$(printf '%s\n' "$TEST_FILES" | wc -l | tr -d ' ')
fi

echo "Searching for test that creates: $POLLUTION_CHECK ($TOTAL files)"

COUNT=0
for TEST_FILE in $TEST_FILES; do
  COUNT=$((COUNT + 1))
  if [ -e "$POLLUTION_CHECK" ]; then
    echo "Pollution already exists before test $COUNT/$TOTAL ($TEST_FILE)"
    continue
  fi

  $RUNNER "$TEST_FILE" > /dev/null 2>&1 || true

  if [ -e "$POLLUTION_CHECK" ]; then
    echo "FOUND POLLUTER!"
    echo "  Test: $TEST_FILE"
    echo "  Created: $POLLUTION_CHECK"
    exit 1
  fi
done

echo "No polluter found - all tests clean!"
exit 0
