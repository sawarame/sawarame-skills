# `issue-implementer` スキル ドキュメント

GitHub の Issue 番号を起点に、**要件・不明点の精査 → 仕様／技術要件コメント投稿（または確認事項コメント投稿で終了）→ `git worktree` 上での実装・検証 → PR 作成 → 元のブランチ復帰** までを非対話で自律実行するスキルです。

同梱のラッパースクリプト [`scripts/gh-as-bot.mjs`](./scripts/gh-as-bot.mjs) により、**`~/.config/github-app/.env` が配置されている場合は専用の GitHub App（`<app-name>[bot]`）として**、未配置の場合は**従来通りローカルでログイン中の GitHub ユーザーとして** Issue コメント投稿および PR 作成を行います。

---

## 動作仕様（認証の切り替えルール）

| 条件 | 使用される認証主体 |
| :--- | :--- |
| `~/.config/github-app/.env` が **存在する** | `.env` で指定された GitHub App（`<app-name>[bot]`）の Installation Access Token |
| `~/.config/github-app/.env` が **存在しない** | ローカルの `gh` CLI にログインしているユーザー（`gh auth status`） |

> [!IMPORTANT]
> **意図しない個人アカウント投稿の防止**
> `~/.config/github-app/.env` が存在する状態で設定値不足・`.pem` 不在・API 認証エラーが発生した場合、`gh-as-bot.mjs` は個人アカウントへサイレントフォールバックせずエラーで停止します。

---

## 前提条件

- **Node.js**（v18 以降推奨。標準モジュールのみ使用するため `npm install` は不要です）
- **GitHub CLI（`gh`）**
  - GitHub App を使わない場合は `gh auth login` 済みであること
- **Git**（`git worktree` が利用可能な環境）

---

## GitHub App（Bot）の作成手順

AI による Issue コメントや PR 作成を個人アカウントと分離して `[bot]` バッジ付きで投稿したい場合は、以下の手順で自分用の GitHub App を 1 つ作成します。

1. GitHub にログインし、右上のアイコンから **Settings** → 左メニュー最下部の **Developer settings** → **GitHub Apps** → **New GitHub App** を開きます。
2. 基本情報を入力します。
   - **GitHub App name**: 任意の一意な名前を入力します（ここに入力した名前が `<アプリ名>[bot]` として表示されます。例: `yourname-ai-agent`）。
   - **Homepage URL**（必須）: 有効な `https://...` 形式の URL を入力します（Web サーバーが稼働している必要はありません。ご自身の GitHub プロフィール `https://github.com/<username>` やリポジトリ URL などで問題ありません）。
   - **Identifying and authorizing users（Callback URL など）**: すべて**空欄**のままで構いません。
3. **Webhook** セクションで **Active のチェックを外します**（ローカル実行のみであり Webhook 受信サーバーを使用しないため）。
4. **Permissions** → **Repository permissions** で以下の権限を設定します。
   - **Issues**: `Read and write`（Issue の参照・コメント投稿に必須）
   - **Pull requests**: `Read and write`（PR の作成・更新に必須）
   - **Contents**: `Read and write`（将来 `git push` も Bot トークンで行う場合に必要。通常の `git` 認証で Push する場合は `Read-only` でも可）
   - **Metadata**: 自動で `Read-only` になります。
5. **Where can this GitHub App be installed?** で **Only on this account** を選択し、**Create GitHub App** をクリックします。
6. 作成されたアプリ設定ページの **About** セクションに表示されている **App ID**（数字）を控えます。
7. 同じページ下部の **Private keys** セクションで **Generate a private key** をクリックし、`.pem` ファイルをダウンロードします。
8. 左メニューの **Install App** を開き、自分のアカウントの **Install** ボタンを押して、利用したいリポジトリ（または **All repositories**）へインストールします。

---

## `.pem` ファイルと `.env` の設置方法

### 1. `.pem` ファイルを安全な場所へ移動する

秘密鍵（`.pem`）は Git リポジトリ内やクラウド同期対象フォルダ（iCloud 等）には置かず、`~/.config/github-app/` 配下に保存してパーミッションを絞ります。

```bash
mkdir -p ~/.config/github-app
chmod 700 ~/.config/github-app

# ダウンロードした .pem ファイルを移動し、所有者のみ読み書き可能にする
mv ~/Downloads/<ダウンロードしたファイル名>.pem ~/.config/github-app/<アプリ名>.pem
chmod 600 ~/.config/github-app/<アプリ名>.pem
```

### 2. `~/.config/github-app/.env` を作成する

以下の内容で `~/.config/github-app/.env` を作成し、同じくパーミッションを `600` に設定します。

```dotenv
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY_PATH=~/.config/github-app/<アプリ名>.pem
```

```bash
chmod 600 ~/.config/github-app/.env
```

#### 設定可能な変数一覧

| 変数名 | 必須 | 説明 |
| :--- | :---: | :--- |
| `GITHUB_APP_ID` | 必須 | GitHub App 設定画面の **App ID**（数値） |
| `GITHUB_APP_PRIVATE_KEY_PATH` | 必須 | `.pem` ファイルのパス。`~`、`$HOME`、`${HOME}`、または `.env` からの相対パスが利用可能 |
| `GITHUB_APP_INSTALLATION_ID` | 任意 | 特定の Installation ID を固定したい場合のみ指定（未指定時は対象リポジトリから自動取得） |
| `GITHUB_APP_ENV_FILE` | 任意 | 環境変数として指定した場合、デフォルトの `~/.config/github-app/.env` の代わりに参照する `.env` パス |

---

## 動作確認方法

GitHub にインストール済みのリポジトリディレクトリ内で以下を実行し、動作を確認できます（読み取り専用コマンドのため Issue や PR は変更されません）。

### Bot 認証が機能しているか確認

```bash
# Bot としてアクセス可能なリポジトリ件数が数値で返れば成功
node ~/.gemini/config/plugins/sawarame-skills/skills/issue-implementer/scripts/gh-as-bot.mjs api /installation/repositories --jq '.repositories | length'

# 特定の Issue 情報の取得テスト
node ~/.gemini/config/plugins/sawarame-skills/skills/issue-implementer/scripts/gh-as-bot.mjs issue view <Issue番号> --json number,title
```

> [!NOTE]
> Bot の Installation Access Token で `api /user` を叩くと `HTTP 403: Resource not accessible by integration` が返りますが、これは個人ユーザーではなく GitHub App（Installation Token）として認証されている正常な挙動です。

### `.env` 不在時のフォールバック確認

```bash
# 存在しないパスを一時指定すると、ローカルログイン中の gh ユーザー名が表示される
GITHUB_APP_ENV_FILE=/tmp/nonexistent-gh-bot.env \
  node ~/.gemini/config/plugins/sawarame-skills/skills/issue-implementer/scripts/gh-as-bot.mjs api /user --jq .login
```

---

## セキュリティ設計と運用上の注意点

- **秘密鍵とトークンを AI コンテキストに露出させない設計**
  `gh-as-bot.mjs` は内部で `.env` と `.pem` を読み込み、取得した Installation Access Token をメモリ上でのみ `GH_TOKEN` 環境変数として `gh` 子プロセスへ渡します（ディスクへのトークンキャッシュや標準出力への鍵・トークン出力は行いません）。[SKILL.md](./SKILL.md) でも AI エージェントが `.env` や `.pem` を直接読み取らないよう規定しています。
- **`git push` 時の認証について**
  Bot 認証は `gh` CLI による GitHub API 操作（Issue 参照・コメント投稿・PR 作成）に適用されます。`git push` は通常通りローカルの Git 認証（SSH / HTTPS 資格情報）で実行されます。
  ※ PR の作成者を Bot 名義にしておくことで、「自分のアカウントで PR をレビュー・Approve できる」というメリットもあります。

---

## トラブルシューティング

- **`リポジトリ owner/repo の GitHub App インストール情報取得に失敗しました`（HTTP 404）**
  - 対象リポジトリに対して GitHub App がインストールされていません。GitHub App 設定の **Install App** から対象リポジトリを追加してください。
- **`Resource not accessible by integration`（HTTP 403）**
  - GitHub App の **Repository permissions** で `Issues: Read and write` または `Pull requests: Read and write` が付与されていない可能性があります。権限変更後は GitHub 上のインストール先ページで権限更新の承認（Accept new permissions）が必要になる場合があります。
- **コメントや PR が個人アカウントのまま投稿されてしまう**
  - `~/.config/github-app/.env` のファイルパス・ファイル名に誤りがないか確認してください。
  - エージェントが `gh-as-bot.mjs` ではなく直接 `gh` コマンドや GitHub MCP ツールを呼んでいないか確認してください（[SKILL.md](./SKILL.md) で `gh-as-bot.mjs` の優先使用を指定しています）。
