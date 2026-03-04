function getClientId(): string {
  return process.env.KAKAO_CLIENT_ID || '';
}

function getRedirectUri(): string {
  return process.env.KAKAO_REDIRECT_URI || 'http://localhost:3001/api/auth/kakao/callback';
}

export function getKakaoAuthUrl(): string {
  return `https://kauth.kakao.com/oauth/authorize?client_id=${getClientId()}&redirect_uri=${encodeURIComponent(getRedirectUri())}&response_type=code`;
}

export async function getKakaoToken(code: string): Promise<string> {
  const clientId = getClientId();
  const redirectUri = getRedirectUri();
  console.log('Kakao token request - clientId:', clientId ? clientId.substring(0, 6) + '...' : 'EMPTY');
  console.log('Kakao token request - redirectUri:', redirectUri);

  const params: Record<string, string> = {
    grant_type: 'authorization_code',
    client_id: clientId,
    redirect_uri: redirectUri,
    code,
  };
  const clientSecret = process.env.KAKAO_CLIENT_SECRET;
  if (clientSecret) {
    params.client_secret = clientSecret;
  }

  const res = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });
  const data: any = await res.json();
  if (!data.access_token) {
    console.error('Kakao token error response:', JSON.stringify(data));
    throw new Error(`Failed to get Kakao token: ${data.error || data.error_code || 'unknown'}`);
  }
  return data.access_token;
}

export interface KakaoUserInfo {
  id: number;
  kakao_account?: {
    email?: string;
    profile?: {
      nickname?: string;
    };
  };
}

export async function getKakaoUserInfo(accessToken: string): Promise<KakaoUserInfo> {
  const res = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.json() as Promise<KakaoUserInfo>;
}
