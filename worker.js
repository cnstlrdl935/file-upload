export default {

    async fetch(request, env) {

        const allowedOrigin =
            env.UPLOAD_ORIGIN || "*";


        // CORS
        if (request.method === "OPTIONS") {

            return new Response(null, {
                status: 204,

                headers: {
                    "Access-Control-Allow-Origin":
                        allowedOrigin,

                    "Access-Control-Allow-Methods":
                        "POST, OPTIONS",

                    "Access-Control-Allow-Headers":
                        "Content-Type"
                }
            });

        }


        const url =
            new URL(request.url);


        // POST /upload만 허용
        if (
            request.method !== "POST" ||
            url.pathname !== "/upload"
        ) {

            return json(
                {
                    error: "잘못된 요청입니다."
                },
                404,
                allowedOrigin
            );

        }


        try {

            const data =
                await request.json();


            const fileName =
                data.fileName;

            const content =
                data.content;


            if (!fileName || !content) {

                return json(
                    {
                        error:
                            "파일 정보가 없습니다."
                    },
                    400,
                    allowedOrigin
                );

            }


            // Base64 약 15 MB 제한
            const MAX_BASE64_LENGTH =
                15 * 1024 * 1024;


            if (
                content.length >
                MAX_BASE64_LENGTH
            ) {

                return json(
                    {
                        error:
                            "파일 크기가 너무 큽니다."
                    },
                    413,
                    allowedOrigin
                );

            }


            // 파일명에서 경로 제거
            const originalName =
                fileName
                    .split("/")
                    .pop()
                    .split("\\")
                    .pop();


            // 안전한 파일명
            const safeName =
                originalName.replace(
                    /[^a-zA-Z0-9가-힣._-]/g,
                    "_"
                );


            if (!safeName) {

                return json(
                    {
                        error:
                            "올바른 파일 이름이 아닙니다."
                    },
                    400,
                    allowedOrigin
                );

            }


            // 중복 방지용 이름
            const timestamp =
                new Date()
                    .toISOString()
                    .replace(/[:.]/g, "-");


            const random =
                crypto.randomUUID()
                    .split("-")[0];


            const finalFileName =
                `${timestamp}_${random}_${safeName}`;


            // ★ GitHub의 uploads 폴더
            const path =
                `uploads/${finalFileName}`;


            const githubUrl =
                `https://api.github.com/repos/` +
                `${env.GITHUB_OWNER}/` +
                `${env.GITHUB_REPO}/` +
                `/contents/${encodeURIComponent(path)}`;


            const githubResponse =
                await fetch(
                    githubUrl,
                    {
                        method: "PUT",

                        headers: {

                            "Accept":
                                "application/vnd.github+json",

                            "Authorization":
                                `Bearer ${env.GITHUB_TOKEN}`,

                            "X-GitHub-Api-Version":
                                "2026-03-10",

                            "Content-Type":
                                "application/json",

                            "User-Agent":
                                "github-pages-file-uploader"
                        },

                        body: JSON.stringify({

                            message:
                                `Upload ${finalFileName}`,

                            content:
                                content,

                            branch:
                                env.GITHUB_BRANCH

                        })
                    }
                );


            const githubData =
                await githubResponse.json();


            if (!githubResponse.ok) {

                console.error(
                    githubData
                );


                return json(
                    {
                        error:
                            "GitHub 업로드에 실패했습니다.",

                        details:
                            githubData.message ||
                            "Unknown GitHub API error"
                    },
                    githubResponse.status,
                    allowedOrigin
                );

            }


            const fileUrl =
                githubData.content?.html_url ||
                `https://github.com/` +
                `${env.GITHUB_OWNER}/` +
                `${env.GITHUB_REPO}/blob/` +
                `${env.GITHUB_BRANCH}/` +
                path;


            return json(
                {
                    success: true,
                    fileName: finalFileName,
                    path: path,
                    url: fileUrl
                },
                200,
                allowedOrigin
            );


        } catch (error) {

            console.error(error);


            return json(
                {
                    error:
                        "서버에서 오류가 발생했습니다."
                },
                500,
                allowedOrigin
            );

        }

    }

};


function json(
    data,
    status,
    origin
) {

    return new Response(
        JSON.stringify(data),
        {
            status,

            headers: {

                "Content-Type":
                    "application/json; charset=utf-8",

                "Access-Control-Allow-Origin":
                    origin,

                "Access-Control-Allow-Methods":
                    "POST, OPTIONS",

                "Access-Control-Allow-Headers":
                    "Content-Type"

            }
        }
    );

}
