export default {
    async fetch(request, env) {

        const origin =
            request.headers.get("Origin") || "";

        const allowedOrigin =
            env.UPLOAD_ORIGIN;

        const headers = {
            "Access-Control-Allow-Origin": allowedOrigin,
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key",
            "Access-Control-Max-Age": "86400",
            "Content-Type": "application/json; charset=UTF-8"
        };


        // CORS 테스트
        if (request.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers
            });
        }


        const url = new URL(request.url);


        // 기본 테스트
        if (
            request.method === "GET" &&
            url.pathname === "/"
        ) {
            return new Response(
                JSON.stringify({
                    success: true,
                    message: "Worker is working",
                    origin: origin,
                    allowedOrigin: allowedOrigin
                }),
                {
                    status: 200,
                    headers
                }
            );
        }


        // 업로드 테스트
        if (
            request.method === "POST" &&
            url.pathname === "/upload"
        ) {

            try {

                const data =
                    await request.json();


                return new Response(
                    JSON.stringify({
                        success: true,
                        message: "Worker received the request",
                        fileName: data.fileName || null
                    }),
                    {
                        status: 200,
                        headers
                    }
                );

            } catch (error) {

                return new Response(
                    JSON.stringify({
                        success: false,
                        error: error.message
                    }),
                    {
                        status: 400,
                        headers
                    }
                );

            }
        }


        return new Response(
            JSON.stringify({
                error: "Not Found"
            }),
            {
                status: 404,
                headers
            }
        );
    }
};
