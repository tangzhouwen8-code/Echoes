export type MediaRef = {
  filename: string;
  mimeType: string;
};

export type Moment = {
  id: string;
  content: string;
  image?: MediaRef;
  audio?: MediaRef;
  createdAt: string;
};

export type Echo = {
  id: string;
  /** ISO timestamp of Monday 00:00 local week boundary */
  weekStart: string;
  poem: string;
  illustration?: MediaRef;
  momentIds: string[];
  createdAt: string;
};
