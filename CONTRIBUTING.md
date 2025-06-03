# Contributing to VectorCodeLens

Thank you for your interest in contributing to VectorCodeLens! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Environment](#development-environment)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please read and follow it to ensure a welcoming and inclusive environment for everyone.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/VectorCodeLens.git
   cd VectorCodeLens
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/original-org/VectorCodeLens.git
   ```
4. **Install dependencies**:
   ```bash
   npm install
   ```

## Development Environment

### Prerequisites

- Node.js (v20.17.25+)
- Qdrant Vector Database (running on port 6333)
- Ollama LLM Service (running on port 11434)

### Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Build the project**:
   ```bash
   npm run build
   ```

3. **Run the service**:
   ```bash
   npm start
   ```

4. **Run tests**:
   ```bash
   npm test
   ```

## Making Changes

1. **Create a branch** for your work:
   ```bash
   git checkout -b feature/your-feature-name
   ```
   
   Use the following branch prefixes:
   - `feature/` - For new features
   - `fix/` - For bug fixes
   - `docs/` - For documentation changes
   - `test/` - For adding or updating tests
   - `refactor/` - For code refactoring

2. **Make your changes**
3. **Add and commit your changes** with meaningful commit messages:
   ```bash
   git add .
   git commit -m "feat: Add new feature X"
   ```
   
   Follow [Conventional Commits](https://www.conventionalcommits.org/) format for commit messages:
   - `feat`: A new feature
   - `fix`: A bug fix
   - `docs`: Documentation only changes
   - `style`: Changes that do not affect the meaning of the code
   - `refactor`: A code change that neither fixes a bug nor adds a feature
   - `test`: Adding missing tests or correcting existing tests
   - `chore`: Changes to the build process or auxiliary tools

4. **Keep your branch updated** with the upstream repository:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

## Pull Request Process

1. **Push your changes** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request** from your branch to the original repository's `main` branch

3. **Fill in the Pull Request template** with all necessary information

4. **Wait for a review** - maintainers will review your PR and may request changes

5. **Make any requested changes** and update your PR

6. Once approved, your PR will be merged by a maintainer

## Coding Standards

- Follow TypeScript's strict mode guidelines
- Use consistent naming conventions
- Include proper error handling
- Document complex algorithms
- Follow the existing code style in the project
- Use ESLint and Prettier for linting and formatting

## Testing Guidelines

- Write tests for all new features and bug fixes
- Maintain or improve code coverage
- Test edge cases and error conditions
- Mock external dependencies in unit tests
- Use integration tests for critical paths

## Documentation

- Update documentation for any changes you make
- Document public APIs and interfaces
- Add comments for complex logic
- Update the README.md if needed
- Include examples when appropriate

## Community

- Join our discussions on GitHub Issues
- Help answer questions from other contributors
- Participate in code reviews
- Suggest improvements

Thank you for contributing to VectorCodeLens!
