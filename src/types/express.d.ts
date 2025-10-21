
import { Request } from 'express';
import { IUserPayload } from './user/types';
import { Server } from 'socket.io';

declare global {
    namespace Express {
        export interface Request {
            user?: IUserPayload;
            io?: Server;
        }
    }
}

