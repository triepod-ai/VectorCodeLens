# VectorCodeLens Git Repository Cleanup Plan

## Overview

This document outlines the plan for cleaning up and reorganizing the VectorCodeLens Git repository to ensure proper structure, organization, and code quality before pushing to a public or shared repository.

## Goals

1. Improve repository organization and structure
2. Remove unnecessary/temporary files
3. Ensure consistent code style and documentation
4. Manage dependencies properly
5. Establish proper branching strategy
6. Prepare for version control best practices

## Cleanup Tasks

### 1. Documentation Organization

- ✅ Move all documentation to the `/docs` folder
- ✅ Create a centralized index.md for documentation navigation
- ✅ Update README.md links to point to new documentation locations
- [ ] Add proper LICENSE file to the repository root
- [ ] Add CONTRIBUTING.md to establish contribution guidelines
- [ ] Create CHANGELOG.md to track version changes

### 2. Source Code Organization

- [ ] Review src/ directory structure for consistency
- [ ] Ensure proper import paths in all files
- [ ] Remove any redundant or deprecated code
- [ ] Fix any TODOs that should be addressed before public release
- [ ] Add appropriate type definitions where missing
- [ ] Update any outdated code comments

### 3. Configuration Files

- [ ] Review and update tsconfig.json
- [ ] Create proper .npmignore file if planning npm distribution
- [ ] Update .gitignore for thoroughness
- [ ] Ensure build scripts are properly documented and working
- [ ] Create sample configuration files for different environments

### 4. Testing and Quality Assurance

- [ ] Organize test files into a consistent structure
- [ ] Ensure test coverage for core functionality
- [ ] Add linting with ESLint/TSLint
- [ ] Configure Prettier for code formatting
- [ ] Add pre-commit hooks for code quality
- [ ] Consider adding GitHub Actions for CI/CD

### 5. Remove Unnecessary Files

- [ ] Remove redundant files (e.g., README.md.new)
- [ ] Clean up debug logs and temporary files
- [ ] Archive or remove deprecated test files
- [ ] Consolidate similar utility scripts
- [ ] Review test_files directory for necessary content

### 6. Dependency Management

- [ ] Review package.json for outdated or unused dependencies
- [ ] Document required external dependencies (Qdrant, LLM service)
- [ ] Lock versions appropriately in package.json
- [ ] Consider organizing dev dependencies separately
- [ ] Document setup for external services

### 7. Version Control Strategy

- [ ] Establish branch naming conventions
- [ ] Define release branch model (e.g., GitFlow, trunk-based)
- [ ] Document PR process for future contributions
- [ ] Define semantic versioning strategy
- [ ] Establish tag naming convention

### 8. Docker & Deployment

- [ ] Review docker-compose files for completeness
- [ ] Add proper dockerignore file
- [ ] Create comprehensive Docker setup for easy deployment
- [ ] Document deployment process
- [ ] Consider creating startup scripts for different environments

## Implementation Plan

### Phase 1: Initial Cleanup

1. Documentation reorganization (completed)
2. Remove unnecessary files
3. Update configuration files
4. Fix obvious code issues

### Phase 2: Code Quality

1. Implement linting and code formatting
2. Add/update type definitions
3. Review import structures
4. Add missing tests

### Phase 3: Dependency and Deployment

1. Update dependencies
2. Improve Docker configuration
3. Document deployment process
4. Test installation from clean environment

### Phase 4: Final Review

1. Full repository review
2. Version tagging
3. Update CHANGELOG.md
4. Final documentation review

## File Inventory

Current files to review for organization:

```
.env.example
.gitignore
build.bat
check-dependencies.js
check_ports.bat
check_ports.js
debug_run.bat
debug_run.log
debug_vector_code_lens.js
diagnose.js
dist/
file-scan-test.js
install-service.js
logs/
mcp_test.js
mock_services.js
node_modules/
package-install.bat
package-lock.json
package.json
quick_test.bat
quick_test.js
README.md
run_diagnosis.bat
run_inspector.bat
run_mcp_test.bat
run_server.bat
run_tests.bat
run_with_mocks.bat
simple_test.js
src/
test/
test-docker-compose.yml
tests/
test_code_analysis.bat
test_code_analysis.js
test_dependencies.bat
test_files/
test_file_scanner.js
test_import.bat
test_import.js
test_ollama.bat
test_ollama.js
test_ollama_models.bat
test_ollama_models.js
test_vector_code_lens.js
tsconfig.json
```

## Suggested Directory Structure After Cleanup

```
VectorCodeLens/
├── .github/                  # GitHub configuration (actions, templates)
├── docs/                     # Documentation
├── scripts/                  # Utility scripts
│   ├── build/                # Build scripts
│   └── test/                 # Test scripts
├── src/                      # Source code
│   ├── analysis/             # Analysis modules
│   ├── claude/               # Claude integration
│   ├── scanner/              # Code scanner
│   ├── services/             # Service modules
│   ├── storage/              # Storage modules
│   ├── tools/                # MCP tools
│   └── utils/                # Utility functions
├── test/                     # Unit tests
├── .dockerignore             # Docker ignore file
├── .eslintrc.js              # ESLint configuration
├── .gitignore                # Git ignore file
├── .npmignore                # NPM ignore file
├── .prettierrc               # Prettier configuration
├── CHANGELOG.md              # Version history
├── CONTRIBUTING.md           # Contribution guidelines
├── docker-compose.yml        # Docker configuration
├── Dockerfile                # Docker build file
├── LICENSE                   # License file
├── package.json              # Package configuration
├── README.md                 # Main readme
└── tsconfig.json             # TypeScript configuration
```

## Success Criteria

- Repository is well-organized and follows industry standards
- Documentation is comprehensive and accessible
- Code is maintainable and follows consistent conventions
- Tests provide adequate coverage
- Build and deployment are properly documented
- Contribution process is clearly defined

## Conclusion

Following this cleanup plan will ensure that the VectorCodeLens repository is well-organized, maintainable, and follows Git best practices. The improved structure will make it easier for contributors to understand the codebase and for users to get started with the project.
