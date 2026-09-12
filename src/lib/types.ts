export type Language = "zh" | "en";
export type CatStatus = "pending" | "approved" | "rejected" | "under_re_review" | "removed";

export type Cat = {
  id: string;
  imageUrl: string;
  sourceUrl?: string | null;
  sourceLabel?: string | null;
  sourceAuthor?: string | null;
  licenseName?: string | null;
  isMyCat: boolean;
  isVisible?: boolean;
  status: CatStatus;
  createdAt: string;
  reviewCount?: number;
  drawingCount?: number;
  repeat?: boolean;
};

export type Drawing = {
  id: string;
  imageUrl: string;
  nickname: string;
  createdAt: string;
  isMine: boolean;
  moderationStatus?: "visible" | "under_review" | "hidden";
};
