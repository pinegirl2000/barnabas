export default function LoginPage() {
  const kakaoLoginUrl = '/api/auth/kakao';

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
        <div className="mb-8">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <span className="text-3xl font-bold text-primary-700">B</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">바나바</h1>
          <p className="text-gray-500 mt-2">새가족 관리 시스템</p>
        </div>

        <a
          href={kakaoLoginUrl}
          className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-[#FEE500] hover:bg-[#FDD800] text-[#191919] font-medium rounded-xl transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 3C5.58 3 2 5.82 2 9.28c0 2.2 1.47 4.13 3.68 5.23-.16.56-.58 2.04-.66 2.36-.1.4.15.39.31.28.13-.08 2.04-1.37 2.86-1.93.57.08 1.16.13 1.81.13 4.42 0 8-2.82 8-6.28C18 5.82 14.42 3 10 3Z"
              fill="#191919"
            />
          </svg>
          카카오 로그인
        </a>

        <p className="mt-6 text-xs text-gray-400">
          새가족팀 담당자만 이용 가능합니다
        </p>
      </div>
    </div>
  );
}
