import winston from "winston";

export const logger = new winston.Logger({
    level: 'debug',
    transports: [
        new winston.transports.Console({
            colorize: true
        }),
    ]
});

export default logger;