# QR業務登録デモ — GitHub Pages公開用

アカウント登録・ログイン不要のスマホ対応デモです。HTML/CSS/JavaScriptだけで動作し、サーバーやRenderは不要です。カメラ映像はアップロードせず、デモの登録データは端末のブラウザに保存します。

本番用GAS、スプレッドシートID、Google認証設定、秘密鍵、既存データ、バックアップはこのフォルダーに含めていません。このフォルダーだけをGitHubへ公開してください。

## 公開する順番

1. GitHubで公開用リポジトリを新規作成する（例：qr-work-demo）。GitHub Freeの場合はPublicを選びます。
2. このフォルダーの中身をリポジトリの一番上へアップロードします。フォルダーをもう一段入れず、index.htmlが直下になるようにしてください。vendorフォルダーも必要です。
3. Settings → Pages → Build and deploymentでSourceを「Deploy from a branch」にします。
4. Branchはmain、Folderは / (root) を選び、Save。
5. デプロイ完了後、Pages画面に表示されたHTTPSのURLを開きます。実際に発行されたURLを使用してください。
6. スマホで同じURLを開き、「QR登録を体験する」→「カメラを開始」→カメラを許可。

表示URLの例は `https://ユーザー名.github.io/リポジトリ名/` です。これは例で、今回の公開URLはまだ発行されていません。

## ページ

- index.html：ポートフォリオ紹介
- app.html：ログイン不要のデモ
- qr.html：PCに表示してスマホで読む撮影用QR
- test-qr.png：撮影用のQR画像
- VIDEO-GUIDE.md：約60秒の動画構成・撮影手順・掲載手順

## デモでできること

- スマホカメラのライブQR読み取り
- サンプル入力、内容確認、端末内への登録、履歴
- 通信失敗を模した未送信保存、個別・一括の手動再送

「通信失敗を体験する」はデモ用の模擬スイッチです。Google Sheetsへの実通信試験ではありません。機内モードにする必要はありません。デモの全登録はブラウザ内のみで、GASやGoogle Sheetsには送信しません。

カメラはHTTPSまたはPCのlocalhostで使用します。スマホ内蔵ブラウザではなくSafari / Chromeで開いてください。端末によってはGoogleアプリ・SNS内ブラウザからのカメラ起動が制限されることがあります。

## 動画を載せる

スマホで実際の操作を画面収録し、出来上がった動画をこの会話へ添付してください。動画に合わせて紹介ページと字幕・見出しを整えます。現時点では動画自体は未撮影・未作成です。サイトには「掲載予定」と表示しています。

## ライセンス

QRライブラリ：html5-qrcode 2.3.8。html5-qrcode-LICENSE.txtを同梱。配布元：https://github.com/mebjas/html5-qrcode

## 公式手順

- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
