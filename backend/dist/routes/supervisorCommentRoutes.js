"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supervisorCommentController_1 = require("../controllers/supervisorCommentController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(authMiddleware_1.authenticate);
// Add comment to log entry
router.post('/', supervisorCommentController_1.addComment);
// Get comments for log entry
router.get('/log/:log_entry_id', supervisorCommentController_1.getComments);
// Get threaded comments for log entry
router.get('/log/:log_entry_id/threads', supervisorCommentController_1.getCommentThreads);
// Edit comment
router.patch('/:id', supervisorCommentController_1.editComment);
// Delete comment
router.delete('/:id', supervisorCommentController_1.deleteComment);
exports.default = router;
