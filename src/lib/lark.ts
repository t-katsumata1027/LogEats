export async function sendLarkNotification(title: string, message: string) {
    const webhookUrl = process.env.LARK_WEBHOOK_URL;
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
