# AGENTS.md

## ⚙️ Coding Instructions

### General

- Check and remove unused imports.
- Always check for missing imports in classes.

### Frontend

- Use SCSS with nested styles.
- Place global CSS in `styled/globals.scss`.
- Reuse existing code where possible.
- Avoid Sass deprecation warnings: place declarations before nested rules or wrap them in `& {}` when overriding mixins.
- UI components that use SCSS modules must live in `components/{name}` with `index.tsx` for the component and `{name}.module.scss` for styling.
- Page folders must use slugified names. For any component used only by one page, create a Capitalized folder directly inside that page containing `index.tsx` and `{Component}.module.scss`. Never create a `components` subfolder inside a page.

### Pre-Commit

```bash
npx prettier --write .
npm run lint
```
