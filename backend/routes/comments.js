const fetch = require('node-fetch');
const express = require('express');
const Comment = require('../models/Comment');
const User = require('../models/User');
const router = express.Router();

// Helper function to check NSFW using Google Perspective API
async function checkNSFW(text) {
  const apiKey = process.env.PERSPECTIVE_API_KEY;
  if (!apiKey) return false;
  const url = `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${apiKey}`;
  const body = {
    comment: { text },
    requestedAttributes: { TOXICITY: {}, SEVERE_TOXICITY: {}, SEXUALLY_EXPLICIT: {}, INSULT: {}, PROFANITY: {} },
    doNotStore: true
  };
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const result = await response.json();
    console.log('Perspective API raw result:', result);
    // You can adjust the threshold as needed
    const toxicity = result.attributeScores?.TOXICITY?.summaryScore?.value || 0;
    const severeToxicity = result.attributeScores?.SEVERE_TOXICITY?.summaryScore?.value || 0;
    const sexuallyExplicit = result.attributeScores?.SEXUALLY_EXPLICIT?.summaryScore?.value || 0;
    const insult = result.attributeScores?.INSULT?.summaryScore?.value || 0;
    const profanity = result.attributeScores?.PROFANITY?.summaryScore?.value || 0;
    console.log('Perspective scores:', {
      toxicity, severeToxicity, sexuallyExplicit, insult, profanity
    });
    // If any score is above 0.7, mark as NSFW
    return (toxicity > 0.7 || severeToxicity > 0.7 || sexuallyExplicit > 0.7 || insult > 0.7 || profanity > 0.7);
  } catch (e) {
    console.error('Perspective API error:', e);
    return false;
  }
}

// Helper function to classify spoiler using LLM (async, non-blocking)
async function classifySpoilerLLM(commentText, bookTitle, page, pageRange) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.log('OPENROUTER_API_KEY not set, skipping LLM spoiler classification');
    return null;
  }

  const pageInfo = pageRange ? `pages ${pageRange}` : page ? `page ${page}` : 'unknown page';
  const bookInfo = bookTitle ? ` for the book "${bookTitle}"` : '';
  
  const prompt = `You are analyzing a comment${bookInfo} at ${pageInfo}. Determine if this comment reveals future plot information beyond the referenced page range.

Comment: "${commentText}"

Classification criteria:
- A spoiler is any information that reveals events, character outcomes, or plot developments occurring after the referenced page range
- General opinions, emotions, or themes are NOT spoilers
- Only classify as spoiler if it clearly reveals future plot points

Return ONLY valid JSON in this exact format:
{
  "isSpoiler": true or false,
  "confidence": 0.0 to 1.0
}`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a spoiler detection assistant. Always return valid JSON only, no additional text.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 150,
        temperature: 0.3,
      })
    });

    if (!response.ok) {
      console.error('LLM API error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      console.error('LLM returned empty content');
      return null;
    }

    // Try to extract JSON from the response (handle cases where LLM adds extra text)
    let jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('LLM response does not contain JSON:', content);
      return null;
    }

    const result = JSON.parse(jsonMatch[0]);
    
    // Validate result structure
    if (typeof result.isSpoiler !== 'boolean' || typeof result.confidence !== 'number') {
      console.error('LLM returned invalid structure:', result);
      return null;
    }

    return {
      isSpoiler: result.isSpoiler,
      confidence: Math.max(0, Math.min(1, result.confidence)) // Clamp between 0 and 1
    };
  } catch (e) {
    console.error('LLM spoiler classification error:', e);
    return null;
  }
}

// POST /comments
router.post('/', async (req, res) => {
  console.log('POST /comments hit', req.body);
  const nsfw = await checkNSFW(req.body.text);
  console.log('NSFW result:', nsfw, 'for text:', req.body.text);
  
  try {
    // Handle spoiler field based on userMarkedSpoiler flag
    let spoilerData = {
      isSpoiler: false,
      source: "none"
    };

    if (req.body.userMarkedSpoiler === true) {
      // User explicitly marked as spoiler - override any LLM results
      spoilerData = {
        isSpoiler: true,
        source: "user"
      };
    } else if (req.body.userMarkedSpoiler === false) {
      // User explicitly marked as NOT spoiler
      spoilerData = {
        isSpoiler: false,
        source: "none"
      };
    }
    // If userMarkedSpoiler is undefined/null, default to "none" (will be classified by LLM if needed)

    const comment = new Comment({ 
      ...req.body, 
      nsfw,
      spoiler: spoilerData
    });
    await comment.save();
    
    // Populate user information before sending response
    const populatedComment = await Comment.findById(comment._id).populate('userId', 'name picture email');
    
    // Trigger async LLM classification if user didn't mark it as spoiler
    // Only classify if userMarkedSpoiler is false or undefined (not true)
    if (req.body.userMarkedSpoiler !== true) {
      // Run LLM classification in background (non-blocking)
      setImmediate(async () => {
        try {
          const bookTitle = req.body.bookTitle || null;
          const page = req.body.page || null;
          const pageRange = req.body.pageRange || null;
          
          const llmResult = await classifySpoilerLLM(
            req.body.text,
            bookTitle,
            page,
            pageRange
          );

          if (llmResult) {
            // Update comment with LLM results
            const updatedComment = await Comment.findById(comment._id);
            if (updatedComment) {
              // Only update if source is not "user" (user input always overrides)
              if (updatedComment.spoiler.source !== "user") {
                updatedComment.spoiler.isSpoiler = llmResult.isSpoiler;
                updatedComment.spoiler.source = "llm";
                updatedComment.spoiler.confidence = llmResult.confidence;
                await updatedComment.save();
                console.log('Updated comment with LLM spoiler classification:', {
                  commentId: comment._id,
                  isSpoiler: llmResult.isSpoiler,
                  confidence: llmResult.confidence
                });
              }
            }
          }
        } catch (err) {
          console.error('Error in async LLM spoiler classification:', err);
          // Don't throw - this is background processing
        }
      });
    }
    
    res.status(201).json(populatedComment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /comments?bookId=xyz&page=40&userId=abc
router.get('/', async (req, res) => {
  const { bookId, page, userId } = req.query;
  const query = {};
  if (bookId) query.bookId = bookId;
  if (page) query.page = Number(page);
  if (userId) query.userId = userId;
  try {
    const comments = await Comment.find(query)
      .populate('userId', 'name picture email')
      .sort({ createdAt: -1 }); // Most recent first
    res.json(comments);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /comments/:id/like
router.patch('/:id/like', async (req, res) => {
  try {
    const { userId } = req.body; // Get userId from request body
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check if user already liked - if so, remove the like
    // Convert to string for comparison since userId comes as string and likedBy contains ObjectIds
    const hasLiked = comment.likedBy.some(id => id.toString() === userId);
    if (hasLiked) {
      comment.likedBy = comment.likedBy.filter(id => id.toString() !== userId);
      comment.likes = Math.max(0, comment.likes - 1);
    } else {
      // Remove from dislikedBy if user previously disliked
      const hasDisliked = comment.dislikedBy.some(id => id.toString() === userId);
      if (hasDisliked) {
        comment.dislikedBy = comment.dislikedBy.filter(id => id.toString() !== userId);
        comment.dislikes = Math.max(0, comment.dislikes - 1);
      }

      // Add to likedBy and increment likes
      comment.likedBy.push(userId);
      comment.likes += 1;
    }

    await comment.save();
    
    const populatedComment = await Comment.findById(comment._id).populate('userId', 'name picture email');
    res.json(populatedComment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /comments/:id/dislike
router.patch('/:id/dislike', async (req, res) => {
  try {
    const { userId } = req.body; // Get userId from request body
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check if user already disliked - if so, remove the dislike
    // Convert to string for comparison since userId comes as string and dislikedBy contains ObjectIds
    const hasDisliked = comment.dislikedBy.some(id => id.toString() === userId);
    if (hasDisliked) {
      comment.dislikedBy = comment.dislikedBy.filter(id => id.toString() !== userId);
      comment.dislikes = Math.max(0, comment.dislikes - 1);
    } else {
      // Remove from likedBy if user previously liked
      const hasLiked = comment.likedBy.some(id => id.toString() === userId);
      if (hasLiked) {
        comment.likedBy = comment.likedBy.filter(id => id.toString() !== userId);
        comment.likes = Math.max(0, comment.likes - 1);
      }

      // Add to dislikedBy and increment dislikes
      comment.dislikedBy.push(userId);
      comment.dislikes += 1;
    }

    await comment.save();
    
    const populatedComment = await Comment.findById(comment._id).populate('userId', 'name picture email');
    res.json(populatedComment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /comments/:id/vote-status - Get user's vote status for a comment
router.get('/:id/vote-status', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Convert to string for comparison since userId comes as string and arrays contain ObjectIds
    const hasLiked = comment.likedBy.some(id => id.toString() === userId);
    const hasDisliked = comment.dislikedBy.some(id => id.toString() === userId);

    res.json({
      hasLiked,
      hasDisliked
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /comments/:id - Delete a comment (only by the comment owner)
router.delete('/:id', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check if the user is the owner of the comment
    if (comment.userId.toString() !== userId) {
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }

    await Comment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Comment deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
