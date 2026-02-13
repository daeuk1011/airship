import { Card } from "@/shared/ui/card";

export default function GuidePage() {
  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">OTA Publish Guide</h1>

      <div className="space-y-6">
        <Card>
          <h2 className="text-sm font-semibold text-foreground/50 mb-3 uppercase tracking-wider">
            배포 흐름
          </h2>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <Step>번들 빌드</Step>
            <Arrow />
            <Step>publish-update.sh</Step>
            <Arrow />
            <Step>staging 자동 할당</Step>
            <Arrow />
            <Step>대시보드에서 production promote</Step>
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-foreground/50 mb-3 uppercase tracking-wider">
            사전 준비
          </h2>
          <div className="space-y-3 text-sm">
            <div>
              <h3 className="font-medium mb-1">필수 도구</h3>
              <p className="text-foreground/70">
                <code className="bg-foreground/5 px-1.5 py-0.5 rounded text-xs font-mono">curl</code>{" "}
                <code className="bg-foreground/5 px-1.5 py-0.5 rounded text-xs font-mono">jq</code>{" "}
                <code className="bg-foreground/5 px-1.5 py-0.5 rounded text-xs font-mono">shasum</code>
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-1">환경변수</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-foreground/10">
                    <th className="text-left py-1.5 font-medium">변수</th>
                    <th className="text-left py-1.5 font-medium">설명</th>
                    <th className="text-left py-1.5 font-medium">필수</th>
                  </tr>
                </thead>
                <tbody className="text-foreground/70">
                  <tr className="border-b border-foreground/5">
                    <td className="py-1.5 font-mono">AIRSHIP_ADMIN_SECRET</td>
                    <td className="py-1.5">API 인증용 Bearer 토큰</td>
                    <td className="py-1.5">O</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 font-mono">AIRSHIP_SERVER_URL</td>
                    <td className="py-1.5">Airship 서버 URL</td>
                    <td className="py-1.5">--server 미지정 시</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-foreground/50 mb-3 uppercase tracking-wider">
            로컬에서 수동 배포
          </h2>
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-medium mb-2">1. Expo 번들 생성</h3>
              <CodeBlock>{`npx expo export --platform ios --output-dir dist`}</CodeBlock>
            </div>
            <div>
              <h3 className="font-medium mb-2">2. OTA 업데이트 배포</h3>
              <CodeBlock>{`export AIRSHIP_ADMIN_SECRET="your-admin-secret"

./scripts/publish-update.sh \\
  --server https://ota.example.com \\
  --app-key my-app \\
  --runtime-version 1.0.0 \\
  --platform ios \\
  --bundle ./dist/bundles/ios-xxxxx.js`}</CodeBlock>
              <p className="text-foreground/60 mt-2">
                기본 채널은 <code className="bg-foreground/5 px-1 py-0.5 rounded text-xs font-mono">staging</code>입니다.
                다른 채널로 배포하려면 <code className="bg-foreground/5 px-1 py-0.5 rounded text-xs font-mono">--channel</code> 옵션을 사용하세요.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">3. 대시보드에서 Promote</h3>
              <ol className="list-decimal list-inside text-foreground/70 space-y-1">
                <li>대시보드 → 앱 → 업데이트 상세 페이지 이동</li>
                <li>현재 할당된 채널이 뱃지로 표시됨</li>
                <li>Promote 섹션에서 staging → production 선택 후 Promote 클릭</li>
              </ol>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-foreground/50 mb-3 uppercase tracking-wider">
            앱 레포 CI 연동
          </h2>
          <div className="space-y-4 text-sm">
            <p className="text-foreground/70">
              앱 레포의 GitHub Actions에서 번들 빌드 후{" "}
              <code className="bg-foreground/5 px-1 py-0.5 rounded text-xs font-mono">publish-update.sh</code>를
              직접 호출합니다.
            </p>
            <div>
              <h3 className="font-medium mb-1">1. Secrets 설정</h3>
              <p className="text-foreground/70 mb-2">
                앱 레포의 Settings → Secrets and variables → Actions에서 추가:
              </p>
              <ul className="text-foreground/70 space-y-1">
                <li>
                  <code className="bg-foreground/5 px-1 py-0.5 rounded text-xs font-mono">AIRSHIP_ADMIN_SECRET</code> — API 인증 토큰
                </li>
                <li>
                  <code className="bg-foreground/5 px-1 py-0.5 rounded text-xs font-mono">AIRSHIP_SERVER_URL</code> — Airship 서버 URL
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-1">2. Workflow 예시</h3>
              <CodeBlock>{`# .github/workflows/ota-publish.yml (앱 레포에 추가)
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
          npx expo export \\
            --platform \${{ matrix.platform }} \\
            --output-dir dist

      - name: Download publish script
        run: |
          curl -sfO \${{ secrets.AIRSHIP_SERVER_URL }}/publish-update.sh \\
            || curl -sfO https://raw.githubusercontent.com/\\
               <org>/airship/main/scripts/publish-update.sh
          chmod +x publish-update.sh

      - name: Publish OTA
        env:
          AIRSHIP_ADMIN_SECRET: \${{ secrets.AIRSHIP_ADMIN_SECRET }}
          AIRSHIP_SERVER_URL: \${{ secrets.AIRSHIP_SERVER_URL }}
        run: |
          ./publish-update.sh \\
            --app-key my-app \\
            --runtime-version 1.0.0 \\
            --platform \${{ matrix.platform }} \\
            --bundle dist/bundles/\${{ matrix.platform }}.js`}</CodeBlock>
              <p className="text-foreground/60 mt-2">
                matrix 전략으로 iOS/Android가 병렬 실행됩니다.
                기본 채널은{" "}
                <code className="bg-foreground/5 px-1 py-0.5 rounded text-xs font-mono">staging</code>이며,
                대시보드에서 production으로 promote하세요.
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-foreground/50 mb-3 uppercase tracking-wider">
            스크립트 옵션
          </h2>
          <CodeBlock>./scripts/publish-update.sh --help</CodeBlock>
          <table className="w-full text-xs mt-3">
            <thead>
              <tr className="border-b border-foreground/10">
                <th className="text-left py-1.5 font-medium">옵션</th>
                <th className="text-left py-1.5 font-medium">설명</th>
                <th className="text-left py-1.5 font-medium">기본값</th>
              </tr>
            </thead>
            <tbody className="text-foreground/70">
              <tr className="border-b border-foreground/5">
                <td className="py-1.5 font-mono">--server URL</td>
                <td className="py-1.5">Airship 서버 URL</td>
                <td className="py-1.5 font-mono">$AIRSHIP_SERVER_URL</td>
              </tr>
              <tr className="border-b border-foreground/5">
                <td className="py-1.5 font-mono">--app-key KEY</td>
                <td className="py-1.5">앱 키</td>
                <td className="py-1.5">(필수)</td>
              </tr>
              <tr className="border-b border-foreground/5">
                <td className="py-1.5 font-mono">--runtime-version VER</td>
                <td className="py-1.5">런타임 버전</td>
                <td className="py-1.5">(필수)</td>
              </tr>
              <tr className="border-b border-foreground/5">
                <td className="py-1.5 font-mono">--platform PLATFORM</td>
                <td className="py-1.5">ios 또는 android</td>
                <td className="py-1.5">(필수)</td>
              </tr>
              <tr className="border-b border-foreground/5">
                <td className="py-1.5 font-mono">--bundle PATH</td>
                <td className="py-1.5">번들 파일 경로</td>
                <td className="py-1.5">(필수)</td>
              </tr>
              <tr>
                <td className="py-1.5 font-mono">--channel NAME</td>
                <td className="py-1.5">대상 채널</td>
                <td className="py-1.5 font-mono">staging</td>
              </tr>
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

function Step({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-foreground/10 px-3 py-1 text-xs font-medium">
      {children}
    </span>
  );
}

function Arrow() {
  return <span className="text-foreground/30">&rarr;</span>;
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="bg-foreground/5 rounded-lg p-3 text-xs overflow-x-auto font-mono text-foreground/80">
      {children}
    </pre>
  );
}
