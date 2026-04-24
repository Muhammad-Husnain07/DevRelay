# Contributing to DevRelay

Thank you for your interest in contributing!

## Branching Strategy

- `main` — Production-ready code, always deployable
- `develop` — Integration branch for features
- `feature/*` — Feature branches (e.g., `feature/webhook-batching`)
- `fix/*` — Bug fix branches (e.g., `fix/login-oauth`)
- `hotfix/*` — Urgent production fixes

## Workflow

1. Fork the repository
2. Create a feature branch from `develop`: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `npm test`
5. Run lint: `npm run lint`
6. Commit with clear messages (use conventional commits)
7. Push to your fork
8. Open a Pull Request to `develop`

## Commit Message Format

```
type(scope): description

types: feat, fix, docs, style, refactor, test, chore
```

Examples:
- `feat(webhook): add batch delivery support`
- `fix(gateway): resolve rate limit header issue`
- `docs(api): update webhook endpoint docs`

## Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How was this tested?

## Checklist
- [ ] Tests pass
- [ ] Lint passes
- [ ] No console.log in src/
- [ ] Environment variables documented
```

## Code Standards

- Use ESLint for code style
- No `console.log` in `src/` (use logger)
- Add tests for new features
- Update Swagger docs for API changes
- Document environment variables in README

## Setting Up Development Environment

```bash
git clone https://github.com/Muhammad-Husnain07/DevRelay.git
cd DevRelay
npm install
cp .env.example .env
docker compose up
npm run dev
```

## Getting Help

- Open an issue for bugs
- Discussions for questions
- Email: muhammad.husnain.dev@gmail.com

## License

By contributing, you agree that your contributions will be licensed under the MIT License.