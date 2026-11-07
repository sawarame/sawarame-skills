# sawarame-skills

AIコーディングエージェント（Antigravity / Gemini）向けの開発支援スキルをまとめたプラグインです。  
日常的な Git ワークフロー（ブランチ作成・コミットメッセージ生成）、コミット履歴からの仕様書生成、および Chrome 拡張機能開発（プロジェクト雛形構築・ストア説明文作成）を効率化します。  
また、**Spec Kit (`spec-kit`)** や **Kiro / `cc-sdd`**、**OpenSpec** などの仕様駆動開発（SDD: Spec-Driven Development）フレームワークを導入しているプロジェクトにも対応しており、各フレームワークの仕様書・規約を参照して動作します。

## 概要（収録スキル一覧）

本プラグインには以下の 5 つのスキルが含まれています。

| スキル名 | 概要 |
| :--- | :--- |
| **`branch-name-generator`** | 作業目的や仕様駆動開発フレームワークの規約から Git ブランチ名を生成し、ブランチを作成します。 |
| **`commit-message-generator`** | ステージ済みの変更差分と関連仕様から Conventional Commits 形式の日本語コミットメッセージを生成します。 |
| **`spec-generator`** | プロジェクトのコミット履歴を分析し、各フレームワークやプロジェクト構成に適した仕様書を生成・差分更新します。 |
| **`extension-skeleton-generator`** | Webpack + TypeScript（Manifest V3・日英 i18n 対応）による Chrome 拡張機能の雛形を仕様書に基づき生成します。 |
| **`extension-description-generator`** | Chrome ウェブストア公開用の説明文（英語・日本語）を `store_description.md` に生成・更新します。 |

---

## 使い方

### 1. インストール手順

`~/.gemini/config/plugins` ディレクトリ配下に本リポジトリを `git clone` することで、グローバルプラグインとして自動的に認識・有効化されます。

```bash
# プラグイン配置用ディレクトリを作成（未作成の場合）
mkdir -p ~/.gemini/config/plugins

# ディレクトリへ移動してリポジトリをクローン
cd ~/.gemini/config/plugins
git clone https://github.com/sawarame/sawarame-skills.git
```

SSH を使用してクローンする場合は、以下のコマンドを実行してください。

```bash
cd ~/.gemini/config/plugins
git clone git@github.com:sawarame/sawarame-skills.git
```

> **更新する場合**  
> 最新のスキルを取り込む際は、クローンしたディレクトリ内で `git pull` を実行してください。
> ```bash
> cd ~/.gemini/config/plugins/sawarame-skills
> git pull
> ```

### 2. スキルの呼び出し方法

インストール後、エージェントとのチャットで実行したい作業を自然言語で依頼すると、依頼内容に応じて該当するスキルが自動的に読み込まれ、ガイドラインに沿った手順で実行されます（スキル名を明示して指示することも可能です）。

---

## 各スキルの詳細とプロンプト例

### `branch-name-generator`（ブランチ名生成）
要件に基づき、`feat/` や `fix/` などのプレフィックスとケバブケース（小文字・ハイフン区切り）を組み合わせた適切な Git ブランチ名を提案します。Spec Kit（`specs/<NNN-feature-name>/`）や Kiro / `cc-sdd`、OpenSpec などの仕様駆動開発フレームワークが使われている場合は、フレームワーク固有のブランチ命名規則・機能名を優先します。ユーザーの承認後、`git checkout -b` によるブランチ作成まで行います。

- **プロンプト例:**
  - 「ユーザープロフィール画面を追加するためのブランチを作って」
  - 「決済ボタンのエラーを修正するブランチ名を考えて」

### `commit-message-generator`（コミットメッセージ生成）
`git diff --staged` でステージされた変更差分を解析し、Conventional Commits（または仕様駆動開発フレームワーク内の規約）に従った日本語のコミットメッセージを生成します。関連する仕様書・タスクリストが存在する場合は変更の背景を参照します。勝手に `git add` や `git push` は行わず、ユーザーの確認を得てから `git commit` を実行します。

- **プロンプト例:**
  - 「ステージした変更からコミットメッセージを作成して」
  - 「今の変更をコミットして」

### `spec-generator`（仕様書生成・更新）
プロジェクトの `git log` を分析し、仕様書をマークダウン形式で生成・更新します。Spec Kit（`specs/*/spec.md`）、Kiro / `cc-sdd`（`.kiro/specs/*/requirements.md`）、OpenSpec（`openspec/specs/`）などの仕様駆動開発フレームワークが使用されている場合はその構成・フォーマットに従い、未導入の場合は `SPEC.md` や `docs/spec.md` などを対象とします。既に仕様書が存在する場合は、最終更新コミット以降の履歴から変更点を抽出し、差分アップデートを提案します。

- **プロンプト例:**
  - 「コミット履歴からプロジェクトの仕様書を作成して」
  - 「最新のコミット内容を仕様書に反映して」

### `extension-skeleton-generator`（Chrome 拡張機能スケルトン生成）
Webpack と TypeScript をベースとした Chrome 拡張機能（Manifest V3）の初期プロジェクトを構築します。事前に Spec Kit などの仕様駆動開発フレームワークや `SPEC.md` 等で仕様が作成されている場合は、その要件・設計を読み取って `src/` 配下の TypeScript 雛形、`package/manifest.json`、日英の多言語ファイル（`_locales/`）、およびビルドから ZIP パッケージ作成まで行う `package.json` スクリプトを一括生成します。

- **プロンプト例:**
  - 「ポップアップとバックグラウンドスクリプトを持つ Chrome 拡張機能の雛形を作って」
  - 「既存の仕様書に基づいて新しい Chrome 拡張プロジェクトのスケルトンを作成して」

### `extension-description-generator`（Chrome ウェブストア説明文生成）
`manifest.json`、`package.json`、ソースコード、および各仕様駆動開発フレームワークの仕様書（または `SPEC.md` / `docs/spec.md` 等）を分析し、Chrome ウェブストアの入稿仕様（本文の Markdown 非対応、文字数制限、客観的な表現など）に準拠した英語・日本語の説明文を `store_description.md` に出力します。既存ファイルがある場合はコミット履歴や仕様書の更新から未反映の変更点のみを更新します。

- **プロンプト例:**
  - 「現在の manifest と仕様を基に、Chrome ウェブストア用の説明文を生成して」
  - 「新しく追加したショートカット機能を含めて `store_description.md` を更新して」

---

## ディレクトリ構成

```text
sawarame-skills/
├── plugin.json                              # プラグイン定義ファイル
├── README.md                                # 本ドキュメント
└── skills/                                  # 収録スキルディレクトリ
    ├── branch-name-generator/
    │   └── SKILL.md
    ├── commit-message-generator/
    │   └── SKILL.md
    ├── extension-description-generator/
    │   └── SKILL.md
    ├── extension-skeleton-generator/
    │   └── SKILL.md
    └── spec-generator/
        └── SKILL.md
```

