import { Logger, LoggerWithoutCallSite } from "tslog";

/**
 * User log is a logger for user info. Does not display callstack
 */
export const userLog = new LoggerWithoutCallSite({
    colorizePrettyLogs: true,
    displayLogLevel: true,
    name: "user",
    exposeStack: false,
    displayFilePath: "hidden",
    displayFunctionName: false,
    displayDateTime: false,
    displayLoggerName: false

});

/**
 * Standard developer logger for troubleshooting. Will leverage sourcemap support.
 */
export const logger = new Logger({
    colorizePrettyLogs: true,
    displayLogLevel: true,
    name: "main",
    overwriteConsole: true,
    minLevel: "info"
});
