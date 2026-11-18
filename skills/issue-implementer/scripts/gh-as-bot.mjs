#!/usr/bin/env node

import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * 文字列内のホームディレクトリ表現（`~`, `$HOME`, `${HOME}`）を展開します。
 * @param rawPath - 展開対象のパス文字列
 * @returns 展開後のパス文字列
 */
function expandHome(rawPath) {
  const home = os.homedir();
  let expanded = rawPath.trim();
  if (expanded === '~') {
    return home;
  }
  if (expanded.startsWith('~/')) {
    expanded = path.join(home, expanded.slice(2));
  }
  return expanded.replace(/\$\{HOME\}|\$HOME/g, home);
}

/**
 * `.env` 形式のファイルを読み込み、キーと値のマップを返します。
 * クォートや `export ` プレフィックス、`#` コメント行を適切に処理します。
 * @param filePath - 読み込む `.env` ファイルの絶対パス
 * @returns パースされた環境変数マップ
 */
function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const result = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const line = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed;
    const eqIndex = line.indexOf('=');
    if (eqIndex <= 0) {
      continue;
    }

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    } else {
      // クォート外の行末コメントを除去する
      const commentIdx = value.indexOf(' #');
      if (commentIdx !== -1) {
        value = value.slice(0, commentIdx).trim();
      }
    }

    result[key] = value;
  }

  return result;
}

/**
 * バイナリまたは文字列データを Base64URL 形式へエンコードします。
 * @param input - エンコード対象のデータ
 * @returns Base64URL エンコード済み文字列
 */
function toBase64Url(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf8');
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

/**
 * GitHub App 認証用の短命な RS256 JWT を生成します。
 * @param appId - GitHub App の App ID
 * @param privateKeyPem - PEM 形式の秘密鍵文字列
 * @returns 署名済み JWT 文字列
 */
function createAppJwt(appId, privateKeyPem) {
  const nowSec = Math.floor(Date.now() / 1000);
  const header = toBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  // クロックスキューを考慮し iat は 60 秒前、exp は 9 分後（上限 10 分未満）に設定する
  const payload = toBase64Url(
    JSON.stringify({
      iat: nowSec - 60,
      exp: nowSec + 540,
      iss: String(appId)
    })
  );

  const signingInput = `${header}.${payload}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  const signature = toBase64Url(signer.sign(privateKeyPem));

  return `${signingInput}.${signature}`;
}

/**
 * GitHub のリポジトリ URL または `owner/repo` 表記から `owner/repo` 部分を抽出します。
 * @param value - リポジトリ指定文字列またはリモート URL
 * @returns 抽出された `{ owner, repo }`、解析不能時は `null`
 */
function parseOwnerAndRepo(value) {
  if (!value) return null;
  const trimmed = value.trim().replace(/\.git$/i, '');

  // `owner/repo` 直接指定形式
  if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(trimmed)) {
    const [owner, repo] = trimmed.split('/');
    return { owner, repo };
  }

  // HTTPS / SSH リモート URL 形式
  const match = trimmed.match(/github\.com[:/]([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\/|$)/i);
  if (match) {
    return { owner: match[1], repo: match[2] };
  }

  return null;
}

/**
 * コマンドライン引数および現在の Git リポジトリから対象の `owner/repo` を解決します。
 * @param args - `gh` に渡される CLI 引数配列
 * @returns 解決された `{ owner, repo }`、特定できない場合は `null`
 */
function resolveTargetRepository(args) {
  // 1. CLI 引数の `-R` / `--repo` 指定を優先して確認する
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if ((arg === '-R' || arg === '--repo') && args[i + 1]) {
      const parsed = parseOwnerAndRepo(args[i + 1]);
      if (parsed) return parsed;
    } else if (arg.startsWith('--repo=')) {
      const parsed = parseOwnerAndRepo(arg.slice(7));
      if (parsed) return parsed;
    }
  }

  // 2. カレントディレクトリの `origin` リモート URL から取得する
  const remoteOrigin = spawnSync('git', ['remote', 'get-url', 'origin'], {
    encoding: 'utf8'
  });
  if (remoteOrigin.status === 0 && remoteOrigin.stdout) {
    const parsed = parseOwnerAndRepo(remoteOrigin.stdout);
    if (parsed) return parsed;
  }

  // 3. `origin` 以外の最初のリモート URL にフォールバックする
  const remotes = spawnSync('git', ['remote'], { encoding: 'utf8' });
  if (remotes.status === 0 && remotes.stdout) {
    const firstRemote = remotes.stdout
      .split(/\r?\n/)
      .map(line => line.trim())
      .find(Boolean);
    if (firstRemote) {
      const remoteUrl = spawnSync('git', ['remote', 'get-url', firstRemote], {
        encoding: 'utf8'
      });
      if (remoteUrl.status === 0 && remoteUrl.stdout) {
        const parsed = parseOwnerAndRepo(remoteUrl.stdout);
        if (parsed) return parsed;
      }
    }
  }

  return null;
}

/**
 * GitHub REST API へリクエストを送信し、JSON レスポンスを返します。
 * @param url - リクエスト先 URL
 * @param method - HTTP メソッド
 * @param jwt - GitHub App 認証用 JWT
 * @returns レスポンス JSON オブジェクト
 */
async function callGitHubAppApi(url, method, jwt) {
  const response = await fetch(url, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${jwt}`,
      'User-Agent': 'sawarame-skills-gh-as-bot',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');
    throw new Error(`GitHub API エラー (${response.status} ${response.statusText}): ${bodyText}`);
  }

  return response.json();
}

/**
 * 対象リポジトリ向けの GitHub App Installation Access Token を取得します。
 * @param params - App 設定情報
 * @param params.appId - GitHub App ID
 * @param params.privateKeyPath - 秘密鍵ファイルのパス
 * @param params.installationId - 固定の Installation ID（省略時はリポジトリから自動取得）
 * @param params.args - `gh` コマンドの引数配列
 * @returns 取得した Installation Access Token
 */
async function fetchInstallationToken({ appId, privateKeyPath, installationId, args }) {
  if (!fs.existsSync(privateKeyPath)) {
    throw new Error(`秘密鍵ファイルが見つかりません: ${privateKeyPath}`);
  }

  const privateKeyPem = fs.readFileSync(privateKeyPath, 'utf8');
  const jwt = createAppJwt(appId, privateKeyPem);

  let resolvedInstallationId = installationId;
  if (!resolvedInstallationId) {
    const targetRepo = resolveTargetRepository(args);
    if (!targetRepo) {
      throw new Error(
        '対象リポジトリ（owner/repo）を特定できませんでした。リポジトリ内で実行するか `-R owner/repo` を指定してください。'
      );
    }

    const installUrl = `https://api.github.com/repos/${targetRepo.owner}/${targetRepo.repo}/installation`;
    try {
      const installInfo = await callGitHubAppApi(installUrl, 'GET', jwt);
      resolvedInstallationId = installInfo?.id ? String(installInfo.id) : '';
    } catch (err) {
      throw new Error(
        `リポジトリ ${targetRepo.owner}/${targetRepo.repo} の GitHub App インストール情報取得に失敗しました（アプリがリポジトリにインストールされているか確認してください）。詳細: ${err.message}`
      );
    }
  }

  if (!resolvedInstallationId) {
    throw new Error('Installation ID を解決できませんでした。');
  }

  const tokenUrl = `https://api.github.com/app/installations/${resolvedInstallationId}/access_tokens`;
  const tokenData = await callGitHubAppApi(tokenUrl, 'POST', jwt);
  if (!tokenData?.token) {
    throw new Error('Installation Access Token の取得レスポンスに token が含まれていません。');
  }

  return tokenData.token;
}

/**
 * Bot 用設定（`.env` または環境変数）を読み込みます。
 * デフォルトの `.env` が存在しない場合は `null` を返し、通常の `gh` 実行へフォールバックさせます。
 * @returns 設定オブジェクト、または未設定時は `null`
 */
function loadBotConfig() {
  const defaultEnvPath = path.join(os.homedir(), '.config', 'github-app', '.env');
  const envFilePath = process.env.GITHUB_APP_ENV_FILE
    ? expandHome(process.env.GITHUB_APP_ENV_FILE)
    : defaultEnvPath;

  const envFileExists = fs.existsSync(envFilePath);
  const fileVars = envFileExists ? parseEnvFile(envFilePath) : {};

  // `.env` が存在せず環境変数も揃っていない場合は従来通りローカルの gh ログインユーザーで実行する
  if (
    !envFileExists &&
    !(process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY_PATH)
  ) {
    return null;
  }

  const appId = (fileVars.GITHUB_APP_ID || process.env.GITHUB_APP_ID || '').trim();
  const rawKeyPath = (
    fileVars.GITHUB_APP_PRIVATE_KEY_PATH ||
    process.env.GITHUB_APP_PRIVATE_KEY_PATH ||
    ''
  ).trim();
  const installationId = (
    fileVars.GITHUB_APP_INSTALLATION_ID ||
    process.env.GITHUB_APP_INSTALLATION_ID ||
    ''
  ).trim();

  if (!appId || !rawKeyPath) {
    throw new Error(
      `GitHub App 設定ファイル（${envFilePath}）が存在しますが、GITHUB_APP_ID または GITHUB_APP_PRIVATE_KEY_PATH が設定されていません。`
    );
  }

  const expandedKeyPath = expandHome(rawKeyPath);
  const baseDir = envFileExists ? path.dirname(envFilePath) : process.cwd();
  const privateKeyPath = path.isAbsolute(expandedKeyPath)
    ? expandedKeyPath
    : path.resolve(baseDir, expandedKeyPath);

  return {
    appId,
    privateKeyPath,
    installationId
  };
}

/**
 * 指定された引数で `gh` CLI を実行し、終了コードを呼び出し元へ伝播します。
 * @param args - `gh` に渡す引数配列
 * @param botToken - Bot 認証トークン（通常実行時は未指定）
 * @returns `gh` プロセスの終了コード
 */
function runGhCommand(args, botToken) {
  const childEnv = { ...process.env };
  if (botToken) {
    // 既存の環境変数トークンによる上書きを防ぎ、確実に Bot トークンで実行する
    delete childEnv.GITHUB_TOKEN;
    childEnv.GH_TOKEN = botToken;
  }

  const result = spawnSync('gh', args, {
    stdio: 'inherit',
    env: childEnv
  });

  if (result.error) {
    console.error(`[gh-as-bot] gh コマンドの起動に失敗しました: ${result.error.message}`);
    return 1;
  }

  return typeof result.status === 'number' ? result.status : 1;
}

/**
 * エントリーポイントです。Bot 設定の有無に応じて認証方法を切り替え、`gh` コマンドを実行します。
 * @returns 処理完了を示す Promise
 */
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('使用方法: node gh-as-bot.mjs <ghサブコマンドと引数...>');
    process.exit(1);
  }

  let botConfig = null;
  try {
    botConfig = loadBotConfig();
  } catch (err) {
    console.error(`[gh-as-bot] 設定エラー: ${err.message}`);
    process.exit(1);
  }

  if (!botConfig) {
    // `.env` 未設定時はローカルでログインしている GitHub ユーザーのまま実行する
    const exitCode = runGhCommand(args, undefined);
    process.exit(exitCode);
  }

  try {
    const token = await fetchInstallationToken({ ...botConfig, args });
    const exitCode = runGhCommand(args, token);
    process.exit(exitCode);
  } catch (err) {
    console.error(`[gh-as-bot] Bot 認証エラー: ${err.message}`);
    process.exit(1);
  }
}

main();
