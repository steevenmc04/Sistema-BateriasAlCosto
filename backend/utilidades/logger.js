/**
 * @class Logger
 * @description Centralized logging utility. Controls output based on DEBUG environment variable.
 * Prevents debug logs in production while maintaining full audit trail.
 * @author OpenCode Senior Engineer
 * @version 1.0.0
 */
class Logger {
  static isDevelopment() {
    return process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development';
  }

  /**
   * Debug level - Only logged in development mode
   * @param {string} module - Module or component name
   * @param {string} message - Log message
   * @param {object} data - Additional context data
   */
  static debug(module, message, data = {}) {
    if (this.isDevelopment()) {
      console.log(
        `[DEBUG] [${new Date().toISOString()}] [${module}] ${message}`,
        Object.keys(data).length > 0 ? data : ''
      );
    }
  }

  /**
   * Info level - Always logged
   * @param {string} module - Module or component name
   * @param {string} message - Log message
   * @param {object} data - Additional context data
   */
  static info(module, message, data = {}) {
    console.log(
      `[INFO] [${new Date().toISOString()}] [${module}] ${message}`,
      Object.keys(data).length > 0 ? data : ''
    );
  }

  /**
   * Warning level - Always logged
   * @param {string} module - Module or component name
   * @param {string} message - Log message
   * @param {object} data - Additional context data
   */
  static warn(module, message, data = {}) {
    console.warn(
      `[WARN] [${new Date().toISOString()}] [${module}] ${message}`,
      Object.keys(data).length > 0 ? data : ''
    );
  }

  /**
   * Error level - Always logged
   * @param {string} module - Module or component name
   * @param {string} message - Log message
   * @param {object|Error} error - Error object or error data
   */
  static error(module, message, error = {}) {
    let errorData = error;
    if (error instanceof Error) {
      errorData = {
        name: error.name,
        message: error.message,
        stack: this.isDevelopment() ? error.stack : undefined
      };
    }

    console.error(
      `[ERROR] [${new Date().toISOString()}] [${module}] ${message}`,
      Object.keys(errorData).length > 0 ? errorData : ''
    );
  }

  /**
   * Audit level - Critical business events, always logged
   * @param {string} module - Module or component name
   * @param {string} message - Log message
   * @param {object} data - Additional context data (usuario_id, accion, etc)
   */
  static audit(module, message, data = {}) {
    console.log(
      `[AUDIT] [${new Date().toISOString()}] [${module}] ${message}`,
      Object.keys(data).length > 0 ? data : ''
    );
  }
}

export default Logger;
