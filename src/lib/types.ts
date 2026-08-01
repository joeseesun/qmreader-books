export type BookRecord = {
  id: string;
  title: string;
  format: "epub" | "azw3" | "mobi";
  size: number;
  createdAt: string;
  status: "ready" | "failed";
  error?: string;
};

export type Highlight = {
  id: string;
  cfi: string;
  text: string;
  note?: string;
  chapter?: string;
  createdAt: string;
};
