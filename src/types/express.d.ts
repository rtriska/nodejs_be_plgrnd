import { JwtPayload } from 'jsonwebtoken';

declare global {
	namespace Express {
		interface Request {
			user?: JwtPayload & {
				userId: number;
				email: string;
				jti: string;
			};
		}
	}
}
