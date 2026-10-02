import { MessageRole, MessageStatus, conversationMarkdown, type ConversationView, type MessageView } from "@spring/shared";

export function markdownFromThread(conversation: ConversationView, messages: MessageView[]): string {
  const turns = messages
    .filter(
      (item) =>
        (item.role === MessageRole.USER || item.role === MessageRole.ASSISTANT) && item.status === MessageStatus.COMPLETED,
    )
    .map((item) => ({
      role: item.role,
      content: item.content,
      imageUrl: item.imageUrl,
      attachments: item.attachments?.map((file) => ({ url: file.url })),
    }));
  return conversationMarkdown(conversation.title, turns);
}
