export interface ChatMessageRole {
  role: 'user' | 'assistant';
}

export function endsWithUserMessage(
  messages: readonly ChatMessageRole[]
): boolean {
  return messages.length > 0 && messages[messages.length - 1].role === 'user';
}
