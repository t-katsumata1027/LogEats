export async function sendLarkNotification(webhookUrl: string | undefined, title: string, message: string) {
    if (!webhookUrl) return;

    try {
        const payload = {
            msg_type: "post",
            content: {
                post: {
                    ja_jp: {
                        title: title,
                        content: [
                            [
                                {
                                    tag: "text",
                                    text: message,
                                },
                            ],
                        ],
                    },
                },
            },
        };

        await fetch(webhookUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });
    } catch (error) {
        console.error("Failed to send Lark notification:", error);
    }
}
