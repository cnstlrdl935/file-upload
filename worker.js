export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");

    const corsHeaders = {
      "Access-Control-Allow-Origin": env.UPLOAD_ORIGIN,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // CORS 사전 요청
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // GitHub Pages에서 온 요청인지 확인
    if (origin && origin !== env.UPLOAD_ORIGIN) {
      return json(
        {
          success: false,
          error: "허용되지 않은 사이트입니다.",
        },
        403,
        corsHeaders
      );
    }

    const url = new URL(request.url);

    // 서버 상태 확인
    if (url.pathname === "/" && request.method === "GET") {
      return json(
        {
          success: true,
          message: "파일 업로드 서버가 정상적으로 작동합니다.",
        },
        200,
        corsHeaders
      );
    }

    // 파일 업로드
    if (url.pathname === "/upload" && request.method === "POST") {
      try {
        const data = await request.json();

        if (!data.fileName || !data.fileData) {
          return json(
            {
              success: false,
              error: "파일 정보가 없습니다.",
            },
            400,
            corsHeaders
          );
        }

        const originalName = String(data.fileName);

        // 파일명 안전하게 처리
        const safeName = originalName
          .replace(/[^a-zA-Z0-9가-힣._()\- ]/g, "_")
          .replace(/\.\./g, "_")
          .trim();

        if (!safeName) {
          return json(
            {
              success: false,
              error: "올바르지 않은 파일 이름입니다.",
            },
            400,
            corsHeaders
          );
        }

        // uploads 폴더에 저장
        const filePath =
          `uploads/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

        const githubUrl =
          `https://api.github.com/repos/` +
          `${env.GITHUB_OWNER}/` +
          `${env.GITHUB_REPO}/contents/` +
          `${filePath}`;

        const githubResponse = await fetch(githubUrl, {
          method: "PUT",

          headers: {
            "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json",
            "User-Agent": "Cloudflare-File-Upload",
          },

          body: JSON.stringify({
            message: `Upload ${safeName}`,
            content: data.fileData,
            branch: env.GITHUB_BRANCH,
          }),
        });

        const result = await githubResponse.json();

        if (!githubResponse.ok) {
          return json(
            {
              success: false,
              error: "GitHub 업로드에 실패했습니다.",
              details: result,
            },
            githubResponse.status,
            corsHeaders
          );
        }

        return json(
          {
            success: true,
            message: "업로드 성공",
            fileName: safeName,
            path: filePath,
            url: result.content?.html_url || null,
          },
          200,
          corsHeaders
        );
      } catch (error) {
        return json(
          {
            success: false,
            error: error.message || "알 수 없는 오류",
          },
          500,
          corsHeaders
        );
      }
    }

    return json(
      {
        success: false,
        error: "존재하지 않는 주소입니다.",
      },
      404,
      corsHeaders
    );
  },
};

function json(data, status, corsHeaders) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=UTF-8",
    },
  });
}
