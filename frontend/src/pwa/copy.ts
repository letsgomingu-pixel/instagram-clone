export function pwaInstallDescription(opts: {
  canInstall: boolean;
  isIos: boolean;
  isInApp: boolean;
}): string {
  if (opts.isInApp) {
    return '카카오톡 같은 앱 안에서는 설치할 수 없습니다. 우측 메뉴에서 Chrome 또는 Safari로 연 다음, 홈 화면에 추가하세요.';
  }
  if (opts.isIos && !opts.canInstall) {
    return '하단 공유 버튼을 누른 뒤 ‘홈 화면에 추가’를 선택하세요.';
  }
  if (!opts.canInstall) {
    return '브라우저 오른쪽 위 메뉴(⋮)에서 ‘홈 화면에 추가’ 또는 ‘앱 설치’를 선택하세요.';
  }
  return '홈 화면에 추가하면 수산물 쇼핑을 앱처럼 바로 열 수 있습니다.';
}
