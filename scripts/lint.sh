#!/bin/bash
set -euo pipefail

# Cline-Init Linting Script
# Description: Runs linting tools for code quality assurance
# Version: 2.03
# Timestamp: 2025-08-26 16:24 CET

# Default values
ISORT=false
BLACK=false
FLAKE8=false
MYPY=false
PYLINT=false
BASH_LINT=false
ALL=false
FILES="src main.py"
FIX=false

# Color definitions
# RED='\033[0;31m'  # Unused in this script
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Function to detect file types and filter files
detect_file_types() {
    local target_files="${1}"
    local python_files=()
    local bash_files=()

    # Expand file patterns and collect actual files
    local all_files=()
    read -ra file_patterns <<< "${target_files}"

    for pattern in "${file_patterns[@]}"; do
        if [[ -f "${pattern}" ]]; then
            # Single file
            all_files+=("${pattern}")
        elif [[ -d "${pattern}" ]]; then
            # Directory - find relevant files
            while IFS= read -r -d '' file; do
                all_files+=("${file}")
            done < <(find "${pattern}" -type f \( -name "*.py" -o -name "*.sh" -o -name "*.bash" \) -print0 2>/dev/null)
        else
            # Pattern matching
            for file in ${pattern}; do
                [[ -f "${file}" ]] && all_files+=("${file}")
            done
        fi
    done

    # Categorize files by type
    for file in "${all_files[@]}"; do
        if [[ "${file}" =~ \.(py)$ ]]; then
            python_files+=("${file}")
        elif [[ "${file}" =~ \.(sh|bash)$ ]] || [[ "$(head -n1 "${file}" 2>/dev/null)" =~ ^#!/.*bash ]]; then
            bash_files+=("${file}")
        fi
    done

    # Export results
    PYTHON_FILES="${python_files[*]}"
    BASH_FILES="${bash_files[*]}"
}

# Function to run bash linting
run_bash_linting() {
    local files="${1}"

    if [[ -z "${files}" ]]; then
        echo -e "${YELLOW}No bash files found for linting.${NC}"
        return 0
    fi

    echo -e "\n${MAGENTA}[bash-lint] Shell script checking${NC}"

    local script_dir
    script_dir="$(dirname "${BASH_SOURCE[0]}")"
    local bash_lint_script="${script_dir}/bash-lint.sh"

    if [[ ! -f "${bash_lint_script}" ]]; then
        echo -e "${YELLOW}Warning: bash-lint.sh not found at ${bash_lint_script}${NC}"
        return 1
    fi

    local success=true
    for file in ${files}; do
        echo "Linting: ${file}"
        if ! "${bash_lint_script}" "${file}"; then
            success=false
        fi
    done

    if [[ "${success}" == true ]]; then
        echo -e "${GREEN}bash-lint completed successfully.${NC}"
        return 0
    else
        echo -e "${YELLOW}Warning: bash-lint found issues.${NC}"
        return 1
    fi
}

# Function to display usage
show_usage() {
    echo "Usage: ${0} [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --isort         Run isort for import sorting"
    echo "  --black         Run black for code formatting"
    echo "  --flake8        Run flake8 for style checking"
    echo "  --mypy          Run mypy for type checking"
    echo "  --pylint        Run pylint for comprehensive code analysis"
    echo "  --bash          Run bash-lint for shell script checking"
    echo "  --all           Run all linting tools (auto-detects file types)"
    echo "  --files FILES   Target files or directories (default: 'src main.py')"
    echo "  --fix           Enable fix mode for tools that support automatic fixes"
    echo "  --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  ${0} --all                    # Run all tools with auto-detection"
    echo "  ${0} --black --isort --fix    # Run black and isort with fixes"
    echo "  ${0} --bash --files '*.sh'    # Run bash linting on shell scripts"
    echo "  ${0} --files 'src tests'      # Run on specific directories"
}

# Parse command line arguments
while [[ ${#} -gt 0 ]]; do
    case ${1} in
        --isort)
            ISORT=true
            shift
            ;;
        --black)
            BLACK=true
            shift
            ;;
        --flake8)
            FLAKE8=true
            shift
            ;;
        --mypy)
            MYPY=true
            shift
            ;;
        --pylint)
            PYLINT=true
            shift
            ;;
        --bash)
            BASH_LINT=true
            shift
            ;;
        --all)
            ALL=true
            shift
            ;;
        --files)
            FILES="${2}"
            shift 2
            ;;
        --fix)
            FIX=true
            shift
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            echo "Unknown option: ${1}"
            show_usage
            exit 1
            ;;
    esac
done

# If no specific tools specified, run all
if [[ "${ISORT}" == false && "${BLACK}" == false && "${FLAKE8}" == false && "${MYPY}" == false && "${PYLINT}" == false && "${ALL}" == false ]]; then
    ALL=true
fi

# If --all specified, enable all tools and auto-detect file types
if [[ "${ALL}" == true ]]; then
    # Detect file types first
    detect_file_types "${FILES}"

    # Enable Python tools only if Python files found
    if [[ -n "${PYTHON_FILES}" ]]; then
        ISORT=true
        BLACK=true
        FLAKE8=true
        MYPY=true
        PYLINT=true
        echo -e "${CYAN}Python files detected: ${PYTHON_FILES}${NC}"
    fi

    # Enable Bash tools only if Bash files found
    if [[ -n "${BASH_FILES}" ]]; then
        BASH_LINT=true
        echo -e "${CYAN}Bash files detected: ${BASH_FILES}${NC}"
    fi

    # If no files detected, fall back to original behavior
    if [[ -z "${PYTHON_FILES}" && -z "${BASH_FILES}" ]]; then
        echo -e "${YELLOW}No Python or Bash files detected, running Python tools on original targets${NC}"
        ISORT=true
        BLACK=true
        FLAKE8=true
        MYPY=true
        PYLINT=true
    fi
fi

# Function to run a linting tool
run_linting_tool() {
    local name="${1}"
    # local command="${2}"  # Unused parameter, kept for API compatibility
    local description="${3}"
    # local can_fix="${4}"  # Unused parameter, kept for API compatibility

    echo -e "\n${MAGENTA}[${name}] ${description}${NC}"

    # Determine target files - use filtered Python files if available and in ALL mode
    local target_files="${FILES}"
    if [[ "${ALL}" == true && -n "${PYTHON_FILES}" ]]; then
        target_files="${PYTHON_FILES}"
    fi

    # Build command arguments
    local cmd_args=()
    if [[ "${name}" == "isort" ]]; then
        cmd_args=("-m" "isort")
        if [[ "${FIX}" == false ]]; then
            cmd_args+=("--check-only" "--diff")
        fi
    elif [[ "${name}" == "black" ]]; then
        cmd_args=("-m" "black")
        if [[ "${FIX}" == false ]]; then
            cmd_args+=("--check" "--diff")
        fi
    elif [[ "${name}" == "flake8" ]]; then
        cmd_args=("-m" "flake8")
    elif [[ "${name}" == "mypy" ]]; then
        cmd_args=("-m" "mypy")
    elif [[ "${name}" == "pylint" ]]; then
        cmd_args=("-m" "pylint")
    fi

    # Add target files
    read -ra files_array <<< "${target_files}"
    cmd_args+=("${files_array[@]}")

    # Run the command
    if python "${cmd_args[@]}" 2>&1; then
        echo -e "${GREEN}${name} completed successfully.${NC}"
        return 0
    else
        local exit_code=$?
        if [[ "${name}" == "isort" || "${name}" == "black" ]] && [[ "${FIX}" == true ]]; then
            echo -e "${YELLOW}Changes applied by ${name}.${NC}"
        else
            echo -e "${YELLOW}Warning: ${name} found issues.${NC}"
        fi
        return ${exit_code}
    fi
}

# Display header
echo -e "${MAGENTA}===== Cline-Init Linting Process =====${NC}"
echo -e "${CYAN}Target files: ${FILES}${NC}"
if [[ "${FIX}" == true ]]; then
    echo -e "${YELLOW}Fix mode: Enabled${NC}"
fi

# Track overall success
overall_success=true

# 1. isort - Import sorting
if [[ "${ISORT}" == true ]]; then
    if ! run_linting_tool "isort" "python" "Import sorting" true; then
        overall_success=false
    fi
fi

# 2. black - Code formatting
if [[ "${BLACK}" == true ]]; then
    if ! run_linting_tool "black" "python" "Code formatting" true; then
        overall_success=false
    fi
fi

# 3. flake8 - Style checking
if [[ "${FLAKE8}" == true ]]; then
    if ! run_linting_tool "flake8" "python" "Style checking" false; then
        overall_success=false
    fi
fi

# 4. mypy - Type checking
if [[ "${MYPY}" == true ]]; then
    if ! run_linting_tool "mypy" "python" "Type checking" false; then
        overall_success=false
    fi
fi

# 5. pylint - Comprehensive code analysis
if [[ "${PYLINT}" == true ]]; then
    if ! run_linting_tool "pylint" "python" "Comprehensive code analysis" false; then
        overall_success=false
    fi
fi

# 6. bash-lint - Shell script checking
if [[ "${BASH_LINT}" == true ]]; then
    if [[ "${ALL}" == true && -n "${BASH_FILES}" ]]; then
        # Use detected bash files
        if ! run_bash_linting "${BASH_FILES}"; then
            overall_success=false
        fi
    else
        # Use original FILES parameter
        if ! run_bash_linting "${FILES}"; then
            overall_success=false
        fi
    fi
fi

echo -e "\n${MAGENTA}===== Linting Process Completed =====${NC}"

# Exit with appropriate code
if [[ "${overall_success}" == true ]]; then
    echo -e "${GREEN}All linting checks passed!${NC}"
    exit 0
else
    echo -e "${YELLOW}Some linting issues were found. Review the output above.${NC}"
    exit 1
fi
