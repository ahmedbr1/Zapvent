import { Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware";
import * as forumService from "../services/forumService";

function getAuthorInfo(
  req: AuthRequest
): { id: string; type: "User" | "Vendor" | "Admin"; name: string } | null {
  if (!req.user) return null;

  const role = req.user.role;
  let type: "User" | "Vendor" | "Admin";

  if (role === "Admin" || req.user.adminType === "EventOffice") {
    type = "Admin";
  } else if (role === "Vendor") {
    type = "Vendor";
  } else {
    type = "User";
  }

  // Name should come from the token or be fetched - using email as fallback
  const name = req.user.email.split("@")[0];

  return { id: req.user.id, type, name };
}

export class ForumController {
  // ============ Posts ============

  async createPost(req: AuthRequest, res: Response) {
    const author = getAuthorInfo(req);
    if (!author) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required." });
    }

    // Get proper author name from request body or use default
    const authorName = req.body.authorName || author.name;

    const result = await forumService.createPost(
      author.id,
      author.type,
      authorName,
      {
        title: req.body.title,
        content: req.body.content,
        tags: req.body.tags,
      }
    );

    return res
      .status(result.statusCode || (result.success ? 201 : 400))
      .json(result);
  }

  async getPosts(req: AuthRequest, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const sortBy =
      (req.query.sortBy as "recent" | "votes" | "unanswered") || "recent";
    const tag = req.query.tag as string;
    const search = req.query.search as string;

    const result = await forumService.getPosts(
      page,
      limit,
      sortBy,
      tag,
      search
    );
    return res.status(result.success ? 200 : 400).json(result);
  }

  async getPost(req: AuthRequest, res: Response) {
    const { postId } = req.params;
    const author = getAuthorInfo(req);

    const result = await forumService.getPostById(
      postId,
      author?.id,
      author?.type
    );
    return res
      .status(result.statusCode || (result.success ? 200 : 400))
      .json(result);
  }

  async deletePost(req: AuthRequest, res: Response) {
    const author = getAuthorInfo(req);
    if (!author) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required." });
    }

    const { postId } = req.params;
    const isAdmin = author.type === "Admin";

    const result = await forumService.deletePost(
      postId,
      author.id,
      author.type,
      isAdmin
    );
    return res
      .status(result.statusCode || (result.success ? 200 : 400))
      .json(result);
  }

  // ============ Voting ============

  async voteOnPost(req: AuthRequest, res: Response) {
    const author = getAuthorInfo(req);
    if (!author) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required." });
    }

    const { postId } = req.params;
    const vote = req.body.vote as 1 | -1;

    if (vote !== 1 && vote !== -1) {
      return res
        .status(400)
        .json({ success: false, message: "Vote must be 1 or -1." });
    }

    const result = await forumService.voteOnPost(
      postId,
      author.id,
      author.type,
      vote
    );
    return res
      .status(result.statusCode || (result.success ? 200 : 400))
      .json(result);
  }

  async voteOnAnswer(req: AuthRequest, res: Response) {
    const author = getAuthorInfo(req);
    if (!author) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required." });
    }

    const { postId, answerId } = req.params;
    const vote = req.body.vote as 1 | -1;

    if (vote !== 1 && vote !== -1) {
      return res
        .status(400)
        .json({ success: false, message: "Vote must be 1 or -1." });
    }

    const result = await forumService.voteOnAnswer(
      postId,
      answerId,
      author.id,
      author.type,
      vote
    );
    return res
      .status(result.statusCode || (result.success ? 200 : 400))
      .json(result);
  }

  // ============ Answers ============

  async createAnswer(req: AuthRequest, res: Response) {
    const author = getAuthorInfo(req);
    if (!author) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required." });
    }

    const { postId } = req.params;
    const authorName = req.body.authorName || author.name;

    const result = await forumService.createAnswer(
      postId,
      author.id,
      author.type,
      authorName,
      { content: req.body.content }
    );

    return res
      .status(result.statusCode || (result.success ? 201 : 400))
      .json(result);
  }

  async acceptAnswer(req: AuthRequest, res: Response) {
    const author = getAuthorInfo(req);
    if (!author) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required." });
    }

    const { postId, answerId } = req.params;

    const result = await forumService.acceptAnswer(
      postId,
      answerId,
      author.id,
      author.type
    );
    return res
      .status(result.statusCode || (result.success ? 200 : 400))
      .json(result);
  }

  async deleteAnswer(req: AuthRequest, res: Response) {
    const author = getAuthorInfo(req);
    if (!author) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required." });
    }

    const { postId, answerId } = req.params;
    const isAdmin = author.type === "Admin";

    const result = await forumService.deleteAnswer(
      postId,
      answerId,
      author.id,
      author.type,
      isAdmin
    );
    return res
      .status(result.statusCode || (result.success ? 200 : 400))
      .json(result);
  }

  // ============ Comments ============

  async createComment(req: AuthRequest, res: Response) {
    const author = getAuthorInfo(req);
    if (!author) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required." });
    }

    const { postId, answerId } = req.params;
    const authorName = req.body.authorName || author.name;

    const result = await forumService.createComment(
      postId,
      answerId,
      author.id,
      author.type,
      authorName,
      { content: req.body.content }
    );

    return res
      .status(result.statusCode || (result.success ? 201 : 400))
      .json(result);
  }

  async deleteComment(req: AuthRequest, res: Response) {
    const author = getAuthorInfo(req);
    if (!author) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required." });
    }

    const { postId, answerId, commentId } = req.params;
    const isAdmin = author.type === "Admin";

    const result = await forumService.deleteComment(
      postId,
      answerId,
      commentId,
      author.id,
      author.type,
      isAdmin
    );
    return res
      .status(result.statusCode || (result.success ? 200 : 400))
      .json(result);
  }

  // ============ Moderation ============

  async pinPost(req: AuthRequest, res: Response) {
    const { postId } = req.params;
    const result = await forumService.pinPost(postId);
    return res
      .status(result.statusCode || (result.success ? 200 : 400))
      .json(result);
  }

  async closePost(req: AuthRequest, res: Response) {
    const { postId } = req.params;
    const result = await forumService.closePost(postId);
    return res
      .status(result.statusCode || (result.success ? 200 : 400))
      .json(result);
  }

  async reopenPost(req: AuthRequest, res: Response) {
    const { postId } = req.params;
    const result = await forumService.reopenPost(postId);
    return res
      .status(result.statusCode || (result.success ? 200 : 400))
      .json(result);
  }

  // ============ Tags ============

  async getPopularTags(_req: AuthRequest, res: Response) {
    const result = await forumService.getPopularTags();
    return res.status(result.success ? 200 : 400).json(result);
  }
}

const forumController = new ForumController();
export default forumController;
