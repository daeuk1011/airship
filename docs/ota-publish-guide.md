# OTA Publish Guide

## 배포 흐름

```
번들 빌드 → publish-update.sh → staging 자동 할당 → 대시보드에서 production promote
```

## 사전 준비

### 필수 도구

- `curl`
- `jq`
- `shasum` (macOS) 또는 `sha256sum` (Linux)

### 환경변수

| 변수 | 설명 | 필수 |
|------|------|------|
| `AIRSHIP_ADMIN_SECRET` | API 인증용 Bearer 토큰 | O |
| `AIRSHIP_SERVER_URL` | Airship 서버 URL | `--server` 미지정 시 |

## 로컬에서 수동 배포

### 1. Expo 번들 생성

```bash
npx expo export --platform ios --output-dir dist
```

### 2. OTA 업데이트 배포

```bash
export AIRSHIP_ADMIN_SECRET="your-admin-secret"

./scripts/publish-update.sh \
  --server https://ota.example.com \
  --app-key my-app \
  --runtime-version 1.0.0 \
  --platform ios \
  --bundle ./dist/bundles/ios-xxxxx.js
```

기본 채널은 `staging`입니다. 다른 채널로 배포하려면 `--channel` 옵션을 사용하세요.

### 3. 대시보드에서 Promote

1. 대시보드 → 앱 → 업데이트 상세 페이지 이동
2. 현재 할당된 채널이 뱃지로 표시됨
3. Promote 섹션에서 staging → production 선택 후 Promote 클릭

## 앱 레포 CI 연동

앱 레포의 GitHub Actions에서 번들 빌드 후 `publish-update.sh`를 직접 호출합니다.

### 1. Secrets 설정

앱 레포의 Settings → Secrets and variables → Actions에서 추가:

- `AIRSHIP_ADMIN_SECRET` — API 인증 토큰
- `AIRSHIP_SERVER_URL` — Airship 서버 URL

### 2. Workflow 예시

```yaml
# .github/workflows/ota-publish.yml (앱 레포에 추가)
name: OTA Publish
on:
  push:
    branches: [main]

jobs:
  publish:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        platform: [ios, android]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install & Export
        run: |
          npm ci
          npx expo export \
            --platform ${{ matrix.platform }} \
            --output-dir dist

      - name: Download publish script
        run: |
          curl -sfO ${{ secrets.AIRSHIP_SERVER_URL }}/publish-update.sh \
            || curl -sfO https://raw.githubusercontent.com/<org>/airship/main/scripts/publish-update.sh
          chmod +x publish-update.sh

      - name: Publish OTA
        env:
          AIRSHIP_ADMIN_SECRET: ${{ secrets.AIRSHIP_ADMIN_SECRET }}
          AIRSHIP_SERVER_URL: ${{ secrets.AIRSHIP_SERVER_URL }}
        run: |
          ./publish-update.sh \
            --app-key my-app \
            --runtime-version 1.0.0 \
            --platform ${{ matrix.platform }} \
            --bundle dist/bundles/${{ matrix.platform }}.js
```

matrix 전략으로 iOS/Android가 병렬 실행됩니다. 기본 채널은 `staging`이며, 대시보드에서 production으로 promote하세요.

## 스크립트 옵션

```bash
./scripts/publish-update.sh --help
```

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--server URL` | Airship 서버 URL | `$AIRSHIP_SERVER_URL` |
| `--app-key KEY` | 앱 키 | (필수) |
| `--runtime-version VER` | 런타임 버전 | (필수) |
| `--platform PLATFORM` | ios 또는 android | (필수) |
| `--bundle PATH` | 번들 파일 경로 | (필수) |
| `--channel NAME` | 대상 채널 | staging |
