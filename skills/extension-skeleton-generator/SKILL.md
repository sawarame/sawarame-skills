---
name: extension-skeleton-generator
description: WebpackとTypeScriptを使用したChrome拡張機能のスケルトンプロジェクトを生成するスキルです。
---

# 拡張機能スケルトンジェネレーター (extension-skeleton-generator)

このスキルは、WebpackとTypeScriptをベースとしたモダンなChrome拡張機能の開発環境（スケルトンプロジェクト）を自動生成するためのものです。

## 目的
新規Chrome拡張機能の開発を迅速に開始できるように、必要な設定ファイルやディレクトリ構成、ボイラープレートコードを構築します。

## 必須要件
プロジェクトを生成する際、以下の要件を必ず満たすようにファイルを構築してください。

1. **技術スタック**
   - **TypeScript**: すべてのスクリプトは TypeScript で記述する。
   - **Webpack**: モジュールバンドラーとして Webpack を使用し、`ts-loader` を用いてビルドを行う。
2. **ディレクトリ構成**
   - `src/`: TypeScript のソースコードを配置するディレクトリ。
   - `package/`: Chrome 拡張機能として読み込ませる（アンパックして読み込む）ルートディレクトリ。
   - `package/manifest.json`: Manifest V3 形式で拡張機能の設定を記述する。国際化（i18n）に対応させるため `"default_locale"` を指定する。
   - `package/js/`: Webpack によってビルドされた JavaScript ファイルの出力先ディレクトリ。
   - `package/_locales/`: 多言語対応（日本語・英語）のリソースファイルを配置するディレクトリ。
3. **ビルド設定 (`package.json`)**
   - `rimraf` で古いビルドファイル (`package/js` や `package.zip`) を削除し、Webpackでビルドを行い、最後に `zip` コマンドで `package.zip` を生成するフローを `"build"` スクリプトとして定義する。
     （例: `"build": "rimraf ./package/js && rimraf package.zip && npx webpack && (cd package && zip -r ../package.zip .)"`）
   - 開発用の watch モードスクリプト (`"dev": "webpack --mode development --watch"`) も含めること。

## 生成する標準ファイル

ユーザーの要望に応じて構成は調整しますが、原則として以下のファイルを生成してください。

### 1. `package.json`
- 必要な依存関係 (`devDependencies`): `webpack`, `webpack-cli`, `typescript`, `ts-loader`, `@types/chrome`, `rimraf`
- `build` （削除→ビルド→zip化のフロー）および `dev` などの npm scripts の定義。

### 2. `webpack.config.js`
- 複数エントリーポイント（例: `content`, `background`, `popup` など）への対応。
- `output.path` をプロジェクトルート内の `package/js` に設定し、`output.filename` を `[name].js` とする。
- `.ts` ファイルを `ts-loader` で処理するルールの記述。

### 3. `tsconfig.json`
- `compilerOptions` として `target` (例: `ES2022`), `module` (例: `ESNext`), `strict`, `esModuleInterop` などを適切に設定。

### 4. `package/manifest.json`
- Manifest V3 に準拠した最小限の雛形。
- Webpackで出力される `js/xxx.js` (相対パス) を適宜バックグラウンドやコンテンツスクリプトとして読み込む設定にする。
- 国際化（i18n）対応のため、`"default_locale": "en"` (または "ja") を記述し、拡張機能名や説明文に `__MSG_appName__` のような変数を指定する。

### 5. `src/` 内のソースコードおよび UI の雛形
- 拡張機能の用途に合わせて以下の雛形を作成する。
  - `src/content.ts` (コンテンツスクリプト用)
  - `src/background.ts` (サービスワーカー用)
  - `src/popup.ts` と `package/popup.html` (ポップアップ用)

### 6. `.gitignore`
- バージョン管理から除外すべきファイルやディレクトリを指定する。
- 少なくとも `node_modules/`、`package/js/`、`package.zip`、`.DS_Store` などを除外するよう記述する。

### 7. 多言語対応ファイル (`_locales/`)
- 日本語と英語に対応するための i18n メッセージファイルを生成する。
- `package/_locales/en/messages.json` (英語版)
- `package/_locales/ja/messages.json` (日本語版)
- それぞれに `appName` や `appDesc` などの基本キーを含める。

## 実行ステップ

1. **要件の確認**: ユーザーがどのような拡張機能（Popupがあるか、Content Scriptsが必要かなど）を作りたいかをプロンプトから読み取る。不足している情報があれば質問する。
2. **ファイルの生成**: ファイル作成ツールを用いて、必要な設定ファイルと雛形ソースコードを生成する。
3. **セットアップの提案**: ファイル生成後、`npm install` と `npm run build` を実行して初期セットアップを行うようユーザーに促す（または許可を得てコマンドを実行する）。
