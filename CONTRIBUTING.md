# Contributing to CryptP

Thank you for your interest in contributing to CryptP! We welcome contributions from developers of all skill levels. This guide will help you get started.

## Code of Conduct

Please be respectful and constructive in all interactions. We're committed to providing a welcoming environment for all contributors.

## Getting Started

### 1. Fork the Repository

1. Go to [https://github.com/Assassin859/cryptp](https://github.com/Assassin859/cryptp)
2. Click "Fork" in the top-right corner
3. This creates your own copy of the project

### 2. Clone Your Fork

```bash
# Replace YOUR_USERNAME with your GitHub username
git clone https://github.com/YOUR_USERNAME/cryptp.git
cd cryptp
```

### 3. Add Upstream Remote

```bash
# This allows you to sync with the original project
git remote add upstream https://github.com/Assassin859/cryptp.git
```

### 4. Create a Feature Branch

```bash
# Create and switch to a new branch
git checkout -b feature/your-feature-name

# Branch naming conventions:
# - feature/description - for new features
# - fix/description - for bug fixes
# - docs/description - for documentation
# - improve/description - for improvements
```

## Development Workflow

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

### Run Linting

```bash
npm run lint
```

### Build Project

```bash
npm run build
```

## Making Changes

### What to Work On

#### Good First Issues
- 🐛 Bug fixes
- 📚 Documentation improvements
- 🎨 UI/UX enhancements
- 💡 Code quality improvements

#### Medium Complexity
- ✨ New components
- 🔧 Configuration improvements
- 🧪 Test additions

#### Advanced
- 🚀 Major features
- 🔗 Multi-chain support
- 📊 Analytics dashboard

### Before Starting

1. Check existing [Issues](https://github.com/Assassin859/cryptp/issues)
2. Check existing [Pull Requests](https://github.com/Assassin859/cryptp/pulls)
3. Discuss major changes in an issue first
4. For bug fixes, reference the related issue

### Code Style

#### Naming Conventions

```typescript
// Components - PascalCase
const DeploymentGuide = () => { ... }

// Functions - camelCase
const calculateGasPrice = () => { ... }

// Constants - UPPER_SNAKE_CASE
const MAX_TOKEN_SUPPLY = 1000000;

// Variables - camelCase
let userAddress = "";

// React hooks - usePrefix
const useWalletConnection = () => { ... }
```

#### TypeScript

```typescript
// Always use types
const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
  // ...
}

// Use interfaces for objects
interface TokenDetails {
  name: string;
  symbol: string;
  decimals: number;
}
```

#### Formatting

```typescript
// Always use semicolons
const x = 1;

// Use single quotes for strings
const message = 'Hello, world';

// Use template literals for interpolation
const greeting = `Hello, ${name}`;

// Proper indentation (2 spaces)
function example() {
  if (condition) {
    doSomething();
  }
}
```

### Best Practices

- Write clear, descriptive variable names
- Add comments for complex logic
- Keep functions small and focused
- Use meaningful commit messages
- Test your changes before submitting

## Commit Guidelines

### Commit Message Format

```
type(scope): description

Longer description if needed.

Fixes #123
```

#### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation change
- `style`: Code style change (formatting, semicolons, etc)
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Test addition/update
- `chore`: Dependency update, build change

#### Examples

```
feat(token): add burn functionality to ERC-20 contract
fix(ui): resolve deployment guide button alignment issue
docs(readme): update installation instructions
improve(performance): optimize component rendering
```

### Writing Good Commits

✅ Do:
- Keep commits small and focused
- Use present tense ("add feature" not "added feature")
- Reference issues in commit messages
- Explain *why* not just *what*

❌ Don't:
- Mix multiple unrelated changes
- Have vague messages ("update stuff")
- Commit directly to main branch

## Testing

### Manual Testing Checklist

Before submitting a PR, test:

- [ ] Feature works as expected
- [ ] No console errors
- [ ] Responsive on mobile
- [ ] Works in Chrome, Firefox, Safari
- [ ] Linting passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)

### Adding Tests

For new features, please add tests:

```typescript
// Example test structure
describe('DeploymentGuide', () => {
  it('should render step 1', () => {
    render(<DeploymentGuide />);
    expect(screen.getByText('Step 1: Remix Setup')).toBeInTheDocument();
  });
});
```

## Submitting a Pull Request

### 1. Prepare Your Branch

```bash
# Fetch latest changes from upstream
git fetch upstream

# Rebase on main
git rebase upstream/main

# Force push your branch
git push origin your-branch-name -f
```

### 2. Create the Pull Request

1. Go to your fork on GitHub
2. Click "Compare & pull request"
3. Ensure base is `upstream/main`
4. Fill out the PR template:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Fixes #123

## Testing
Describe testing performed

## Screenshots (if applicable)
Include before/after screenshots

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added where needed
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated
- [ ] Build succeeds
```

### 3. Review Process

- Maintainers will review your PR
- Address any feedback or requested changes
- Push new commits to the same branch
- PR will be merged once approved

## Code Review Guidelines

### For Authors

- Be open to feedback
- Respond to comments promptly
- Don't take criticism personally
- Ask questions if unclear

### For Reviewers

- Be constructive and respectful
- Explain *why* you're asking for changes
- Acknowledge good work
- Ask clarifying questions

## Project Structure

```
cryptp/
├── src/
│   ├── components/     # React components
│   ├── pages/         # Page components
│   ├── styles/        # CSS/styling
│   ├── types/         # TypeScript types
│   ├── utils/         # Utility functions
│   ├── App.tsx
│   └── main.tsx
├── contracts/         # Solidity contracts
├── docs/             # Documentation
├── tests/            # Test files
└── public/           # Static assets
```

## Common Contribution Types

### Bug Fix

1. Create issue describing the bug
2. Create branch `fix/issue-description`
3. Fix the bug with tests
4. Submit PR with "Fixes #123"

### New Feature

1. Create issue describing the feature
2. Get feedback from maintainers
3. Create branch `feature/feature-name`
4. Implement with tests
5. Update documentation
6. Submit PR

### Documentation

1. Create branch `docs/description`
2. Edit files in `/docs`
3. Submit PR

### Contract Improvement

1. Create issue for discussion
2. Create branch `improve/contract-description`
3. Update Solidity files
4. Test thoroughly
5. Submit PR with detailed explanation

## Reporting Bugs

When reporting bugs:

1. **Check existing issues** - avoid duplicates
2. **Be specific** - describe exactly what happens
3. **Include environment** - OS, browser, Node version
4. **Provide steps to reproduce** - clear instructions
5. **Include error messages** - copy full error text
6. **Add screenshots** - visual issues need screenshots

**Bug Report Template:**

```markdown
## Description
Brief description of the bug

## Steps to Reproduce
1. Go to...
2. Click...
3. See error...

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: 
- Browser:
- Node version:
- npm version:

## Error Message
```
Error text here
```

## Screenshots
[if applicable]
```

## Feature Requests

When requesting features:

1. Explain the use case
2. Describe desired behavior
3. Suggest implementation (if known)
4. Note if it's a breaking change

## Getting Help

- 💬 **Questions**: Open a discussion
- 🐛 **Bugs**: Open an issue
- 📚 **Docs**: Check existing documentation
- 🤝 **Help**: Tag maintainers for assistance

## Additional Resources

- [GitHub Guides](https://guides.github.com/)
- [Git Documentation](https://git-scm.com/doc)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [Solidity Docs](https://docs.soliditylang.org/)

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- GitHub contributors page

## Questions?

- 📧 Open an issue with your question
- 💬 Start a discussion
- 🤝 Ask in pull request comments

---

**Thank you for contributing to CryptP!** 🎉

