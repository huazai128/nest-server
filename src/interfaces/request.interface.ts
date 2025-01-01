import { PipelineStage } from 'mongoose';

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      isLogin: boolean;
    }

    interface AuthenticatedRequest extends Request {
      user: User;
    }

    interface UnauthenticatedRequest extends Request {
      user?: undefined;
    }
  }
}

export interface User {
  account: string;
  userId: number;
}

export interface TimeInfo {
  startTime?: number;
  endTime?: number;
}

export interface TimeMatch {
  dMatch: PipelineStage.Match['$match'];
  yMatch: PipelineStage.Match['$match'];
  lMatch: PipelineStage.Match['$match'];
}
