"use strict";
/**
 * Observability module - Centralized monitoring, logging, and tracing
 *
 * This module provides:
 * - Sentry integration for error tracking
 * - Prometheus metrics for performance monitoring
 * - Distributed tracing for request tracking
 * - Structured logging with context
 */
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMemoryChecker = exports.createHealthCheck = exports.createExternalServiceChecker = exports.createDatabaseChecker = void 0;
__exportStar(require("./logger"), exports);
__exportStar(require("./metrics"), exports);
__exportStar(require("./sentry"), exports);
__exportStar(require("./tracing"), exports);
// Health check utilities
var health_1 = require("./health");
Object.defineProperty(exports, "createDatabaseChecker", { enumerable: true, get: function () { return health_1.createDatabaseChecker; } });
Object.defineProperty(exports, "createExternalServiceChecker", { enumerable: true, get: function () { return health_1.createExternalServiceChecker; } });
Object.defineProperty(exports, "createHealthCheck", { enumerable: true, get: function () { return health_1.createHealthCheck; } });
Object.defineProperty(exports, "createMemoryChecker", { enumerable: true, get: function () { return health_1.createMemoryChecker; } });
//# sourceMappingURL=index.js.map