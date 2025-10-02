
import { Request } from 'express';
import { IUserPayload } from './user/types';

declare global {
    namespace Express {
        export interface Request {
            user?: IUserPayload;
        }
    }
}
