export class BadRequest extends Error {
    errorCode = 400;
    constructor(message) {
        super(message);
    }
}
export class Unauthorized extends Error {
    errorCode = 401;
    constructor(message) {
        super(message);
    }
}
export class Forbidden extends Error {
    errorCode = 403;
    constructor(message) {
        super(message);
    }
}
export class NotFound extends Error {
    errorCode = 404;
    constructor(message) {
        super(message);
    }
}
