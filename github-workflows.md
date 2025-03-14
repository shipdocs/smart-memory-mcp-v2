# GitHub Workflows

## 1. Rust Core Pipeline (`rust-ci.yml`)
```yaml
name: Rust CI

on:
  push:
    branches: [ main, develop ]
    paths:
      - 'core/**'
      - '.github/workflows/rust-ci.yml'
  pull_request:
    paths:
      - 'core/**'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - uses: Swatinem/rust-cache@v2
      - name: Build
        run: cd core && cargo build --verbose
      - name: Run tests
        run: cd core && cargo test --verbose
      - name: Run clippy
        run: cd core && cargo clippy -- -D warnings
      - name: Check formatting
        run: cd core && cargo fmt --check

  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - name: Install cargo-tarpaulin
        run: cargo install cargo-tarpaulin
      - name: Generate coverage
        run: cd core && cargo tarpaulin --out Xml
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## 2. VS Code Extension Pipeline (`extension-ci.yml`)
```yaml
name: Extension CI

on:
  push:
    branches: [ main, develop ]
    paths:
      - 'extension/**'
      - '.github/workflows/extension-ci.yml'
  pull_request:
    paths:
      - 'extension/**'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install dependencies
        run: cd extension && npm ci
      - name: Build
        run: cd extension && npm run build
      - name: Run tests
        run: cd extension && npm test
      - name: Lint
        run: cd extension && npm run lint

  package:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install dependencies
        run: cd extension && npm ci
      - name: Package
        run: cd extension && npm run package
```

## 3. Documentation Pipeline (`docs-ci.yml`)
```yaml
name: Documentation CI

on:
  push:
    branches: [ main, develop ]
    paths:
      - 'docs/**'
      - '.github/workflows/docs-ci.yml'
  pull_request:
    paths:
      - 'docs/**'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install mdbook
        run: cargo install mdbook
      - name: Build documentation
        run: cd docs && mdbook build
      - name: Deploy to GitHub Pages
        if: github.ref == 'refs/heads/main'
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs/book
```

## 4. Release Pipeline (`release.yml`)
```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  create-release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Create Release
        id: create_release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          draft: false
          prerelease: false

  build-core:
    needs: create-release
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - name: Build release
        run: cd core && cargo build --release
      - name: Upload core binary
        uses: actions/upload-release-asset@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          upload_url: ${{ needs.create-release.outputs.upload_url }}
          asset_path: ./core/target/release/smart-memory-mcp
          asset_name: smart-memory-mcp-${{ runner.os }}
          asset_content_type: application/octet-stream

  build-extension:
    needs: create-release
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Package extension
        run: cd extension && npm ci && npm run package
      - name: Upload extension
        uses: actions/upload-release-asset@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          upload_url: ${{ needs.create-release.outputs.upload_url }}
          asset_path: ./extension/smart-memory-mcp.vsix
          asset_name: smart-memory-mcp.vsix
          asset_content_type: application/octet-stream