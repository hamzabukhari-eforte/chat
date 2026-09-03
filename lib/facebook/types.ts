export interface FacebookPost {
  id: string;
  imageUrl: string;
  caption: string;
  likes: number;
  comments: number;
  shares: number;
  /** ISO timestamp */
  createdAt: string;
}

/** Agent who claimed / replied to a customer Facebook comment. */
export interface FacebookCommentAgentReply {
  agentId: string;
  agentName: string;
}

/** One message in a comment reply thread (customer or agent). */
export interface FacebookThreadReply {
  id: string;
  /**
   * `null` = reply to the root customer comment.
   * Otherwise id of the thread message this replies to.
   */
  inReplyToId: string | null;
  inReplyToAuthorName?: string;
  /** Short preview of the message being replied to. */
  inReplyToText?: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  isFromAgent: boolean;
  agentId?: string;
  text: string;
  likes: number;
  createdAt: string;
}

export interface FacebookComment {
  id: string;
  postId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  text: string;
  likes: number;
  repliesCount: number;
  /** ISO timestamp */
  createdAt: string;
  /**
   * Active claim while the comment is open.
   * Only that agent may continue replying until closed.
   */
  repliedBy?: FacebookCommentAgentReply | null;
  /** When true, any agent may reopen; reply composer is disabled until reopen. */
  isClosed?: boolean;
  /** Last agent who worked this comment (shown when closed). */
  lastRepliedBy?: FacebookCommentAgentReply | null;
  /** Conversation under this comment. */
  thread: FacebookThreadReply[];
}
