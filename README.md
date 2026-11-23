# sawarame-skills

AIコーディングエージェント（Antigravity / Gemini）向けの開発支援スキルをまとめたプラグインです。  
日常的な Git ワークフロー（ブランチ作成・コミットメッセージ生成・PR 作成）、コミット履歴からの仕様書生成、および Chrome 拡張機能開発（プロジェクト雛形構築・ストア説明文作成・ストア画像生成）を効率化します。  
また、**Spec Kit (`spec-kit`)** や **Kiro / `cc-sdd`**、**OpenSpec** などの仕様駆動開発（SDD: Spec-Driven Development）フレームワークを導入しているプロジェクトや、**GitHub Issue / PR** 上で仕様・要件を管理する開発フローにも対応しており、必要に応じて各仕様書・規約や Issue / PR の内容を参照して動作します。

## 概要（収録スキル一覧）

本プラグインには以下の 7 つのスキルが含まれています。

| スキル名 | 概要 |
| :--- | :--- |
| **`branch-name-generator`** | 作業目的や仕様駆動開発フレームワークの規約から Git ブランチ名を生成し、ブランチを作成します。 |
| **`commit-message-generator`** | ステージ済みの変更差分と関連仕様から Conventional Commits 形式の日本語コミットメッセージを生成します。 |
| **`pr-creator`** | 現在のブランチの変更を読み取り、必要に応じたコミット・プッシュと分岐元ブランチをベースとした通常 PR の作成を自動で行います。 |
| **`spec-generator`** | プロジェクトのコミット履歴を分析し、各フレームワークやプロジェクト構成に適した仕様書を生成・差分更新します。 |
| **`extension-skeleton-generator`** | Webpack と TypeScript をベースとした Chrome 拡張機能（Manifest V3）の初期プロジェクト構成（`src/`、`package/`、`_locales/`、ビルド設定）を一括生成します。 |
| **`extension-description-generator`** | プロジェクト内の `_locales` 構成から対応言語を自動判定（見つからない場合は英語・日本語）して Chrome ウェブストア公開用の説明文を言語別ファイル（`store_description.<lang>.md`）として生成・更新し、審査提出用の権限使用理由も `store_permissions_justification.md` にまとめます。 |
| **`extension-image-generator`** | プロジェクト内の `_locales` 構成から対応言語を自動判定（見つからない場合は英語・日本語）し、HTML/CSS テンプレートと自動操作ブラウザ（Playwright 等）を用いた再利用可能な生成スクリプトを `scripts/` に保存・実行して、Chrome ウェブストア用の多言語スクリーンショット画像（`1280x800` または `640x400`、各言語最大 5 枚）を `images/` 直下に一括生成・更新します。 |

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
要件に基づき、`feat/` や `fix/` などのプレフィックスとケバブケース（小文字・ハイフン区切り）を組み合わせた適切な Git ブランチ名を提案します。Spec Kit（`specs/<NNN-feature-name>/`）や Kiro / `cc-sdd`、OpenSpec などの仕様駆動開発フレームワークが使われている場合は、フレームワーク固有のブランチ命名規則・機能名を優先し、必要に応じて関連する GitHub Issue / PR の内容も参照します。ユーザーの承認後、`git checkout -b` によるブランチ作成まで行います。

- **プロンプト例:**
  - 「ユーザープロフィール画面を追加するためのブランチを作って」
  - 「決済ボタンのエラーを修正するブランチ名を考えて」

### `commit-message-generator`（コミットメッセージ生成）
`git diff --staged` でステージされた変更差分を解析し、Conventional Commits（または仕様駆動開発フレームワーク内の規約）に従った日本語のコミットメッセージを生成します。関連する仕様書・タスクリストや、必要に応じて GitHub Issue / PR の内容が存在する場合は変更の背景を参照します。勝手に `git add` や `git push` は行わず、ユーザーの確認を得てから `git commit` を実行します。

- **プロンプト例:**
  - 「ステージした変更からコミットメッセージを作成して」
  - 「今の変更をコミットして」

### `pr-creator`（プルリクエスト自動作成）
現在の作業ブランチの変更内容を読み取り、確認を挟まずに通常 PR を作成します。`main` / `master` ブランチ上では中断し、未コミットの変更がある場合は `commit-message-generator` スキルに従ってコミットを作成します。ブランチやコミットが未プッシュであれば自動でプッシュを行い、そのブランチの分岐元をベースブランチとして指定したうえで、関連する仕様書や必要に応じて GitHub Issue / 先行 PR の内容も参照しつつ、プロジェクトのルール（または基本日本語）に沿ったタイトル・本文で PR を作成します。

- **プロンプト例:**
  - 「現在のブランチの変更からプルリクを作成して」
  - 「このブランチをまとめて PR を出して」

### `spec-generator`（仕様書生成・更新）
プロジェクトの `git log`（および必要に応じて関連する GitHub Issue / PR の内容）を分析し、仕様書をマークダウン形式で生成・更新します。Spec Kit（`specs/*/spec.md`）、Kiro / `cc-sdd`（`.kiro/specs/*/requirements.md`）、OpenSpec（`openspec/specs/`）などの仕様駆動開発フレームワークが使用されている場合はその構成・フォーマットに従い、未導入の場合は `SPEC.md` や `docs/spec.md` などを対象とします。既に仕様書が存在する場合は、最終更新コミット以降の履歴から変更点を抽出し、差分アップデートを提案します。

- **プロンプト例:**
  - 「コミット履歴からプロジェクトの仕様書を作成して」
  - 「最新のコミット内容を仕様書に反映して」

### `extension-skeleton-generator`（Chrome 拡張機能スケルトン生成）
Webpack と TypeScript をベースとした Chrome 拡張機能（Manifest V3）の初期プロジェクトを構築します。事前に Spec Kit などの仕様駆動開発フレームワークや `SPEC.md` 等、あるいは GitHub Issue / PR に仕様が記載されている場合は、必要に応じてその要件・設計を読み取って `src/` 配下の TypeScript 雛形、`package/manifest.json`、日英の多言語ファイル（`_locales/`）、およびビルドから ZIP パッケージ作成まで行う `package.json` スクリプトを一括生成します。

- **プロンプト例:**
  - 「ポップアップとバックグラウンドスクリプトを持つ Chrome 拡張機能の雛形を作って」
  - 「既存の仕様書に基づいて新しい Chrome 拡張プロジェクトのスケルトンを作成して」

### `extension-description-generator`（Chrome ウェブストア説明文・権限使用理由生成）
`manifest.json`、`package.json`、`_locales/*/messages.json`、ソースコード、各仕様駆動開発フレームワークの仕様書（または `SPEC.md` / `docs/spec.md` 等）、および必要に応じて関連する GitHub Issue / PR の内容を分析し、Chrome ウェブストアの入稿仕様（本文の Markdown 非対応、文字数制限、客観的な表現など）に準拠した説明文を言語別ファイル（`store_description.<lang>.md`）として出力します。対象言語は `package/_locales/` を最優先にプロジェクト内の `_locales` ディレクトリ（`messages.json` を含む有効な言語フォルダ）から自動判定し、フォルダ名の `_` を `-` に変換したファイル名（例: `en` → `store_description.en.md`、`zh_CN` → `store_description.zh-CN.md`、`fr` → `store_description.fr.md`）で生成します（`_locales` が見つからない場合は英語・日本語の 2 言語にフォールバックし、ユーザーから言語が明示指定された場合はその指定を優先します）。また、`manifest.json` の権限宣言と実際の実装に基づき、ストア審査（プライバシー）提出用の権限使用理由・単一用途の説明・リモートコード使用有無を `store_permissions_justification.md`（英語［審査提出用］・日本語［確認用］併記）にまとめます。既存ファイルがある場合はコミット履歴や仕様書の更新から未反映の変更点のみを更新し（対象外となった既存言語ファイルは自動削除せず未更新報告・削除確認を実施）、旧形式の単一ファイル `store_description.md` のみがある場合は内容を引き継いで必要な対象言語ファイルへ分割移行します。

- **プロンプト例:**
  - 「現在の manifest と `_locales` の構成を基に、Chrome ウェブストア用の説明文と権限の使用理由を生成して」
  - 「新しく追加したショートカット機能を含めて対応言語のストア説明文を更新して」
  - 「拡張機能の機能に応じて権限の使用理由を `store_permissions_justification.md` にまとめて」

### `extension-image-generator`（Chrome ウェブストア多言語画像生成）
`manifest.json`、`package.json`、`_locales/*/messages.json`、既存の `store_description.<lang>.md`、ソースコード・スタイル・アイコン画像、仕様書（Spec Kit / Kiro / OpenSpec / `SPEC.md` 等）、および必要に応じて関連する GitHub Issue / PR を分析し、Chrome ウェブストア用の多言語スクリーンショット画像を生成・更新します。対象言語は `extension-description-generator` と同様に `package/_locales/` を最優先として `_locales` 内の有効な言語フォルダ（`messages.json` を含むフォルダ、`_` を `-` に変換）から自動判定し、見つからない場合は英語・日本語にフォールバックします（ユーザー明示指定を最優先）。HTML/CSS テンプレートと自動操作ブラウザ（Playwright 等）を用いた再利用可能な Node.js 生成スクリプト（サイズ `1280x800` / `640x400` や対象言語の切り替えに対応）を `scripts/` に保存・差分更新し、各言語 1〜5 枚・透過なし 24-bit PNG の画像を `images/` 直下にフラット出力（`store-<NN>.<lang>.png`）したうえで、出力サイズ・透過有無・目視によるレイアウト崩れ検証まで一貫して実施します（対象外となった既存画像は自動削除せずユーザーへ削除可否を確認します）。

- **プロンプト例:**
  - 「現在の `_locales` 構成と `store_description` に合わせて、Chrome ウェブストア用の多言語スクリーンショット画像と生成スクリプトを作成して」
  - 「新機能の UI を反映して、既存の画像生成スクリプトを更新し日本語と英語のストア画像を再生成して」
  - 「`640x400` サイズで韓国語のストア用スクリーンショット画像を追加生成して」

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
    ├── extension-image-generator/
    │   └── SKILL.md
    ├── extension-skeleton-generator/
    │   └── SKILL.md
    ├── pr-creator/
    │   └── SKILL.md
    └── spec-generator/
        └── SKILL.md
```

