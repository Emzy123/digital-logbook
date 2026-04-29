"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupervisorComment = exports.CommentType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var CommentType;
(function (CommentType) {
    CommentType["SUPERVISOR_REVIEW"] = "supervisor_review";
    CommentType["STUDENT_RESPONSE"] = "student_response";
    CommentType["SCHOOL_SUPERVISOR_NOTE"] = "school_supervisor_note";
    CommentType["COORDINATOR_NOTE"] = "coordinator_note";
})(CommentType || (exports.CommentType = CommentType = {}));
const SupervisorCommentSchema = new mongoose_1.Schema({
    log_entry_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'LogEntry', required: true, index: true },
    author_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    author_role: { type: String, required: true },
    comment_type: {
        type: String,
        enum: Object.values(CommentType),
        required: true,
        index: true
    },
    content: { type: String, required: true },
    parent_comment_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'SupervisorComment' },
    is_threaded: { type: Boolean, default: false },
    is_internal: { type: Boolean, default: false },
    attachments: [{
            url: { type: String, required: true },
            filename: { type: String, required: true },
            mime_type: { type: String, required: true },
            size: { type: Number, required: true }
        }],
    mentions: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    created_at: { type: Date, default: Date.now, index: true },
    updated_at: { type: Date, default: Date.now },
    is_edited: { type: Boolean, default: false },
    edited_at: { type: Date }
}, {
    timestamps: true
});
// Indexes for efficient querying
SupervisorCommentSchema.index({ log_entry_id: 1, created_at: 1 });
SupervisorCommentSchema.index({ author_id: 1, created_at: -1 });
SupervisorCommentSchema.index({ parent_comment_id: 1, created_at: 1 });
exports.SupervisorComment = mongoose_1.default.model('SupervisorComment', SupervisorCommentSchema);
