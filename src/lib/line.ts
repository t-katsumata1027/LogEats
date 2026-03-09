import * as line from '@line/bot-sdk';

export const lineConfig = {
    channelSecret: process.env.LINE_CHANNEL_SECRET || '',
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
};

export const lineClient = new line.messagingApi.MessagingApiClient({
    channelAccessToken: lineConfig.channelAccessToken,
});

export const lineBlobClient = new line.messagingApi.MessagingApiBlobClient({
    channelAccessToken: lineConfig.channelAccessToken,
});
