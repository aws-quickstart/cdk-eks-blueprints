import { Logger } from "tslog";

/**
 * User log is a logger for user info. Does not display callstack
 */
export const userLog = new Logger({
    stylePrettyLogs: true,
    name: "user",
    hideLogPositionForProduction: true,
    prettyLogTemplate: "{{logLevelName}} ",
    minLevel: 2 // info
});

/**
 * Standard developer logger for troubleshooting. Will leverage sourcemap support.
 */
export const logger = new Logger({
    stylePrettyLogs: true,
    type: "pretty",
    name: "main",
    minLevel: 3 // info 
});
