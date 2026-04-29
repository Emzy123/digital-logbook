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
exports.User = exports.UserRole = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var UserRole;
(function (UserRole) {
    UserRole["STUDENT"] = "student";
    UserRole["INDUSTRY_SUPERVISOR"] = "industry_supervisor";
    UserRole["SCHOOL_SUPERVISOR"] = "school_supervisor";
    UserRole["COORDINATOR"] = "coordinator";
    UserRole["ITF_ADMIN"] = "itf_admin";
    UserRole["SYSTEM_ADMIN"] = "system_admin";
})(UserRole || (exports.UserRole = UserRole = {}));
const UserSchema = new mongoose_1.Schema({
    email: { type: String, required: true, unique: true, index: true },
    password_hash: { type: String, required: true },
    role: {
        type: String,
        enum: Object.values(UserRole),
        required: true,
        index: true
    },
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    phone: { type: String },
    avatar_url: { type: String },
    is_active: { type: Boolean, default: true },
    last_login: { type: Date },
    failed_login_attempts: { type: Number, default: 0 },
    locked_until: { type: Date },
    created_by: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    establishment_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Establishment' }
}, {
    timestamps: true
});
exports.User = mongoose_1.default.model('User', UserSchema);
